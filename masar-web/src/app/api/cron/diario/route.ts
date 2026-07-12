import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendEmail } from '@/lib/resend';
import { calcularFluxoCaixaProjetado } from '@/lib/cashFlowService';

const CRON_SECRET = process.env.CRON_SECRET;

const formatBRL = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

// Destinatários extras do relatório diário, além dos usuários ADMIN/FINANCEIRO do app.
// (só recebem e-mail; não há notificação in-app pois não têm conta.)
const EXTRA_ALERT_EMAILS = ['cevsouza74@gmail.com'];

export async function GET(request: NextRequest) {
  try {
    if (!CRON_SECRET) {
      console.error('CRON_SECRET não configurado.');
      return NextResponse.json({ error: 'Serviço não configurado' }, { status: 500 });
    }

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

    // 3.6 Buscar Atividades de Cronograma (obra) atrasadas
    const atividadesAtivas = await db.atividadeCronograma.findMany({
      where: { status: { not: 'CONCLUIDA' } },
      include: {
        empreendimento: true,
        casa: true
      }
    });

    const atividadesAtrasadas = atividadesAtivas.filter(a => new Date(a.dataFimPrevista) < today);

    // 3.7 CRÍTICOS FINANCEIROS (comunicados ao sócio / financeiro)
    // a) Ruptura de caixa projetada (runway negativo nos próximos meses)
    const fluxo = await calcularFluxoCaixaProjetado();
    const rupturaCaixa = fluxo.runwayAlert; // string | null

    // b) Medições reprovadas/glosadas pela Caixa (retêm liberação de recursos)
    const medicoesGlosadas = await db.medicaoCaixa.findMany({
      where: { status: 'GLOSADA_REPROVADA' },
      include: { casa: { include: { empreendimento: true } } }
    });

    // c) Casas ativas estourando o orçamento (regime de competência)
    const casasBudget = await db.casa.findMany({
      where: { statusObra: { notIn: ['CONCLUIDA'] } },
      include: {
        empreendimento: true,
        orcamento: { include: { itens: true } },
        transacoes: { where: { natureza: 'DESPESA' } }
      }
    });
    const casasEstouradas = casasBudget
      .map(c => {
        const orcado = c.orcamento?.itens.reduce((acc, it) => acc + it.quantidadePlanejada * it.custoUnitarioPrevisto, 0) || 0;
        const gasto = c.transacoes.reduce((acc, t) => acc + t.valor, 0);
        return { casa: c, orcado, gasto, excedente: gasto - orcado };
      })
      .filter(x => x.orcado > 0 && x.gasto > x.orcado);

    const totalCriticosFinanceiros = (rupturaCaixa ? 1 : 0) + medicoesGlosadas.length + casasEstouradas.length;

    const totalAlertas = documentosExpirando.length + marcosAtrasados.length + milestonesAtrasados.length + milestonesProximos.length + atividadesAtrasadas.length + totalCriticosFinanceiros;

    if (totalAlertas > 0) {
      // 4. Carregar administradores (ADMIN) e o público financeiro (ADMIN + FINANCEIRO)
      const admins = await db.user.findMany({
        where: { role: 'ADMIN' }
      });
      // Sócios/financeiro recebem os críticos financeiros; superset dos admins.
      const financeiroUsers = await db.user.findMany({
        where: { role: { in: ['ADMIN', 'FINANCEIRO'] } }
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

      for (const a of atividadesAtrasadas) {
        const localInfo = a.casa ? `Lote Qd ${a.casa.quadra}, Casa ${a.casa.numero}` : `Proj. ${a.empreendimento.nome}`;
        const msg = `🚨 Atividade de Cronograma ATRASADA: [${a.titulo}] - ${localInfo}. Prazo era: ${new Date(a.dataFimPrevista).toLocaleDateString('pt-BR')}`;
        await db.notificacao.createMany({
          data: admins.map(admin => ({
            usuarioId: admin.id,
            mensagem: msg,
            lida: false
          }))
        });
      }

      // 5.5 Notificações in-app dos CRÍTICOS FINANCEIROS (ADMIN + FINANCEIRO)
      if (rupturaCaixa) {
        await db.notificacao.createMany({
          data: financeiroUsers.map(u => ({
            usuarioId: u.id,
            mensagem: `🔴 Caixa: ${rupturaCaixa}`,
            lida: false
          }))
        });
      }

      for (const m of medicoesGlosadas) {
        const msg = `🔴 Glosa CEF: Casa ${m.casa.numero} Qd ${m.casa.quadra} (${m.casa.empreendimento.nome}) — ${formatBRL(m.valorLiberado)} retido pela Caixa.`;
        await db.notificacao.createMany({
          data: financeiroUsers.map(u => ({
            usuarioId: u.id,
            mensagem: msg,
            lida: false
          }))
        });
      }

      for (const x of casasEstouradas) {
        const msg = `🔴 Orçamento estourado: Casa ${x.casa.numero} Qd ${x.casa.quadra} (${x.casa.empreendimento.nome}) — gasto ${formatBRL(x.gasto)} vs orçado ${formatBRL(x.orcado)} (excedente ${formatBRL(x.excedente)}).`;
        await db.notificacao.createMany({
          data: financeiroUsers.map(u => ({
            usuarioId: u.id,
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

      const atividadeListHtml = atividadesAtrasadas.map(a =>
        `<li><strong>${a.titulo}</strong> - ${a.casa ? `Lote Qd ${a.casa.quadra}, Casa ${a.casa.numero}` : `Proj. ${a.empreendimento.nome}`} (Prazo: ${new Date(a.dataFimPrevista).toLocaleDateString('pt-BR')}, Status: ${a.status})</li>`
      ).join('');

      const glosaListHtml = medicoesGlosadas.map(m =>
        `<li><strong>Casa ${m.casa.numero} - Qd ${m.casa.quadra}</strong> (${m.casa.empreendimento.nome}) — <strong style="color:#dc2626;">${formatBRL(m.valorLiberado)}</strong> retido/reprovado</li>`
      ).join('');

      const orcamentoListHtml = casasEstouradas.map(x =>
        `<li><strong>Casa ${x.casa.numero} - Qd ${x.casa.quadra}</strong> (${x.casa.empreendimento.nome}) — gasto <strong style="color:#dc2626;">${formatBRL(x.gasto)}</strong> vs orçado ${formatBRL(x.orcado)} (excedente ${formatBRL(x.excedente)})</li>`
      ).join('');

      const financeiroHtml = `
        ${rupturaCaixa ? `<p style="margin: 6px 0;"><strong style="color:#dc2626;">💸 Ruptura de Caixa:</strong> ${rupturaCaixa}</p>` : ''}
        ${medicoesGlosadas.length > 0 ? `<p style="margin: 8px 0 2px;"><strong style="color:#dc2626;">🏦 Glosas da Caixa (recursos retidos):</strong></p><ul>${glosaListHtml}</ul>` : ''}
        ${casasEstouradas.length > 0 ? `<p style="margin: 8px 0 2px;"><strong style="color:#dc2626;">📈 Casas acima do orçamento:</strong></p><ul>${orcamentoListHtml}</ul>` : ''}
      `;

      const emailHtml = `
        <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #ef4444; border-bottom: 2px solid #ef4444; padding-bottom: 8px;">Relatório Diário de Alertas - Masar ERP</h2>
          <p>Prezado Sócio/Gestor,</p>
          <p>Identificamos ocorrências críticas que demandam atenção imediata:</p>

          ${totalCriticosFinanceiros > 0 ? `
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px 16px; margin: 12px 0;">
              <h3 style="color: #b91c1c; margin: 0 0 6px;">🔴 Críticos Financeiros (Sócios)</h3>
              ${financeiroHtml}
            </div>
          ` : ''}

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

          ${atividadesAtrasadas.length > 0 ? `
            <h3 style="color: #dc2626;">🚨 Atividades de Cronograma Atrasadas:</h3>
            <ul>${atividadeListHtml}</ul>
          ` : ''}

          <p style="margin-top: 20px;">Por favor, acesse o painel administrativo para regularizar as pendências.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 11px; color: #9ca3af;">Masar Construtora ERP - Mensageria Integrada</p>
        </div>
      `;

      // Envia para ADMIN + FINANCEIRO + destinatários extras (deduplicado por e-mail)
      const recipientEmails = Array.from(new Set([
        ...financeiroUsers.map(u => u.email),
        ...EXTRA_ALERT_EMAILS
      ]));
      for (const email of recipientEmails) {
        await sendEmail({
          to: email,
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
      atividadesCronogramaAtrasadas: atividadesAtrasadas.length,
      rupturaCaixa: rupturaCaixa ? 1 : 0,
      medicoesGlosadas: medicoesGlosadas.length,
      casasAcimaOrcamento: casasEstouradas.length,
      alertasGerados: totalAlertas
    });
  } catch (error: any) {
    console.error('Erro no cron job:', error);
    return NextResponse.json({ error: 'Erro interno do servidor', message: error.message }, { status: 500 });
  }
}
