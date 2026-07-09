import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendEmail } from '@/lib/resend';

const CRON_SECRET = process.env.CRON_SECRET || 'masar_cron_secret_token_123';

export async function GET(request: NextRequest) {
  try {
    // 1. Validar Bearer Token de Segurança
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    if (token !== CRON_SECRET) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 403 });
    }

    const today = new Date();
    const limitDate = new Date();
    limitDate.setDate(today.getDate() + 15);

    // 2. Buscar documentos anexos (GED) a expirar nos próximos 15 dias
    const documentosExpirando = await db.documentoAnexo.findMany({
      where: {
        status: 'ATIVO',
        dataVencimento: {
          gte: today,
          lte: limitDate
        }
      },
      include: {
        casa: true,
        cliente: true,
        empreendimento: true
      }
    });

    // 3. Buscar marcos burocráticos atrasados
    const marcosAtivos = await db.marcoBurocratico.findMany({
      where: {
        dataAprovacaoReal: null
      },
      include: {
        empreendimento: true
      }
    });

    const marcosAtrasados = marcosAtivos.filter(m => {
      const prazoLimite = new Date(m.dataProtocolo);
      prazoLimite.setDate(prazoLimite.getDate() + m.prazoEsperadoDias);
      return prazoLimite < today;
    });

    // 3.5 Buscar Milestones customizados atrasados ou próximos (dentro de 7 dias)
    const milestonesAtivos = await db.milestone.findMany({
      where: { concluido: false },
      include: {
        empreendimento: true,
        casa: true
      }
    });

    const milestonesAtrasados = milestonesAtivos.filter(m => {
      return new Date(m.dataLimite) < today;
    });

    const milestonesProximos = milestonesAtivos.filter(m => {
      const limite = new Date(m.dataLimite);
      const seteDias = new Date();
      seteDias.setDate(today.getDate() + 7);
      return limite >= today && limite <= seteDias;
    });

    const totalAlertas = documentosExpirando.length + marcosAtrasados.length + milestonesAtrasados.length + milestonesProximos.length;

    if (totalAlertas > 0) {
      // 4. Carregar todos os administradores (ADMIN)
      const admins = await db.user.findMany({
        where: { role: 'ADMIN' }
      });

      // 5. Criar notificações in-app e disparar e-mails para cada ADMIN
      for (const doc of documentosExpirando) {
        const msg = `⚠️ Documento GED [${doc.nome}] está próximo do vencimento (${doc.dataVencimento?.toLocaleDateString('pt-BR')})`;
        await db.notificacao.createMany({
          data: admins.map(admin => ({
            usuarioId: admin.id,
            mensagem: msg,
            lida: false
          }))
        });
      }

      for (const marco of marcosAtrasados) {
        const msg = `🚨 Alerta de SLA: O marco burocrático [${marco.tipo}] do empreendimento [${marco.empreendimento.nome}] está ATRASADO!`;
        await db.notificacao.createMany({
          data: admins.map(admin => ({
            usuarioId: admin.id,
            mensagem: msg,
            lida: false
          }))
        });
      }

      for (const m of milestonesAtrasados) {
        const localInfo = m.casa ? `Lote Qd ${m.casa.quadra}, Casa ${m.casa.numero}` : m.empreendimento ? `Proj. ${m.empreendimento.nome}` : 'Geral';
        const msg = `🚨 Milestone ATRASADO: [${m.titulo}] (${m.categoria}) - ${localInfo}. Venceu em: ${new Date(m.dataLimite).toLocaleDateString('pt-BR')}`;
        await db.notificacao.createMany({
          data: admins.map(admin => ({
            usuarioId: admin.id,
            mensagem: msg,
            lida: false
          }))
        });
      }

      for (const m of milestonesProximos) {
        const localInfo = m.casa ? `Lote Qd ${m.casa.quadra}, Casa ${m.casa.numero}` : m.empreendimento ? `Proj. ${m.empreendimento.nome}` : 'Geral';
        const msg = `⚠️ Milestone Próximo: [${m.titulo}] (${m.categoria}) - ${localInfo}. Vence em: ${new Date(m.dataLimite).toLocaleDateString('pt-BR')}`;
        await db.notificacao.createMany({
          data: admins.map(admin => ({
            usuarioId: admin.id,
            mensagem: msg,
            lida: false
          }))
        });
      }

      // 6. Enviar e-mail sumário para cada administrador
      const docListHtml = documentosExpirando.map(doc => 
        `<li><strong>${doc.nome}</strong> (Vence em: ${doc.dataVencimento?.toLocaleDateString('pt-BR')}) - Unidade Qd ${doc.casa?.quadra || ''}, Casa ${doc.casa?.numero || ''}</li>`
      ).join('');

      const marcoListHtml = marcosAtrasados.map(m => 
        `<li><strong>${m.tipo}</strong> - Empreendimento: <em>${m.empreendimento.nome}</em> (Atrasado desde: ${new Date(m.dataProtocolo.getTime() + m.prazoEsperadoDias * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')})</li>`
      ).join('');

      const milestoneListHtml = [
        ...milestonesAtrasados.map(m => `<li><strong style="color: #dc2626;">[ATRASADO]</strong> <strong>${m.titulo}</strong> (${m.categoria}) - ${m.casa ? `Lote Qd ${m.casa.quadra}, Casa ${m.casa.numero}` : m.empreendimento ? `Proj. ${m.empreendimento.nome}` : 'Geral'} - Venceu em: ${new Date(m.dataLimite).toLocaleDateString('pt-BR')}</li>`),
        ...milestonesProximos.map(m => `<li><strong style="color: #f59e0b;">[PRÓXIMO]</strong> <strong>${m.titulo}</strong> (${m.categoria}) - ${m.casa ? `Lote Qd ${m.casa.quadra}, Casa ${m.casa.numero}` : m.empreendimento ? `Proj. ${m.empreendimento.nome}` : 'Geral'} - Vence em: ${new Date(m.dataLimite).toLocaleDateString('pt-BR')}</li>`)
      ].join('');

      const emailHtml = `
        <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #ef4444; border-bottom: 2px solid #ef4444; padding-bottom: 8px;">Relatório Diário de Alertas - Masar ERP</h2>
          <p>Prezado Administrador,</p>
          <p>Identificamos ocorrências críticas no portfólio de obras e documentos que demandam atenção imediata:</p>
          
          ${documentosExpirando.length > 0 ? `
            <h3 style="color: #f59e0b;">⚠️ Documentos GED a expirar (15 dias):</h3>
            <ul>${docListHtml}</ul>
          ` : ''}

          ${marcosAtrasados.length > 0 ? `
            <h3 style="color: #dc2626;">🚨 Marcos Burocráticos Atrasados (SLA Excedido):</h3>
            <ul>${marcoListHtml}</ul>
          ` : ''}

          ${milestonesAtrasados.length + milestonesProximos.length > 0 ? `
            <h3 style="color: #4f46e5;">📅 Agenda de Marcos Críticos (Milestones):</h3>
            <ul>${milestoneListHtml}</ul>
          ` : ''}

          <p style="margin-top: 20px;">Por favor, acesse o painel administrativo para regularizar as pendências.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 11px; color: #9ca3af;">Masar Construtora ERP - Mensageria Integrada</p>
        </div>
      `;

      for (const admin of admins) {
        await sendEmail({
          to: admin.email,
          subject: `🚨 ALERTA DIÁRIO: ${totalAlertas} pendências críticas no Masar ERP`,
          html: emailHtml
        });
      }
    }

    return NextResponse.json({
      success: true,
      documentosExpirando: documentosExpirando.length,
      marcosAtrasados: marcosAtrasados.length,
      milestonesAtrasados: milestonesAtrasados.length,
      milestonesProximos: milestonesProximos.length,
      alertasGerados: totalAlertas
    });
  } catch (error: any) {
    console.error('Erro no cron job:', error);
    return NextResponse.json({ error: 'Erro interno do servidor', message: error.message }, { status: 500 });
  }
}
