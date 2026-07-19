import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendEmail, getExtraAlertEmails } from '@/lib/resend';
import { runComEmpresa, runSemEscopoDeEmpresa, exigirEmpresaId } from '@/lib/tenant';
import { identidadeVisualDaEmpresa } from '@/lib/empresaVisual';
import { calcularFluxoCaixaProjetado } from '@/lib/cashFlowService';
import { buscarVencimentosSST } from '@/lib/sst';
import { avaliarMetas } from '@/lib/metaEficiencia';
import { gerarRecomendacoes } from '@/lib/recomendacoes';
import { avaliarConformidade } from '@/lib/mcmv/conformidade';

const CRON_SECRET = process.env.CRON_SECRET;

const formatBRL = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

// Destinatários extras do relatório diário, além dos usuários ADMIN/FINANCEIRO do app.
// (só recebem e-mail; não há notificação in-app pois não têm conta.)
// Vem da env EXTRA_ALERT_EMAILS — ver getExtraAlertEmails() em lib/resend.

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

    // Multi-tenant: o cron atende TODAS as empresas ativas da instancia.
    // Falha de uma nao pode derrubar o alerta das outras — o alerta diario e
    // justamente o que se vende, entao cada empresa roda isolada.
    const empresas = await runSemEscopoDeEmpresa(() =>
      db.empresa.findMany({ where: { ativa: true }, select: { id: true, nome: true } })
    );

    const porEmpresa: any[] = [];
    for (const empresa of empresas) {
      try {
        const resumo = await runComEmpresa(empresa.id, () => processarEmpresa());
        porEmpresa.push({ empresa: empresa.nome, ...resumo });
      } catch (e: any) {
        console.error(`[cron] falha na empresa ${empresa.nome}:`, e);
        porEmpresa.push({ empresa: empresa.nome, erro: String(e?.message || e) });
      }
    }

    return NextResponse.json({ success: true, empresas: porEmpresa.length, porEmpresa });
  } catch (error: any) {
    console.error('Erro no cron job:', error);
    return NextResponse.json({ error: 'Erro interno do servidor', message: error.message }, { status: 500 });
  }
}

// Todo o processamento de um tenant. Roda SEMPRE dentro de runComEmpresa, entao
// cada query aqui ja sai filtrada pela empresa — nao ha filtro manual neste arquivo.
async function processarEmpresa() {
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

    // 3.8 SEGURANÇA DO TRABALHO (SST): ASOs e EPIs vencidos ou a vencer (30 dias)
    const sst = await buscarVencimentosSST();
    const totalSST = sst.asosVencidos.length + sst.asosAVencer.length + sst.episVencidos.length + sst.episAVencer.length;

    // 3.9 EFICIÊNCIA (Fase 6.5): metas de custo/prazo/estoque/caixa fora do alvo.
    const metaAval = await avaliarMetas();
    const totalMetas = metaAval.violacoes.length;

    // 3.10 CONSULTOR DE EFICIÊNCIA (Fase 7.2): plano de ação prescritivo priorizado.
    const { recomendacoes, resumo: resumoRec } = await gerarRecomendacoes();

    // 3.11 CONFORMIDADE MCMV: empreendimentos no regime com pendências obrigatórias
    // (bloqueadores de medição ou itens não conformes).
    const empsMCMV = await db.empreendimento.findMany({
      where: { regimeMCMV: true },
      select: { id: true, nome: true },
    });
    const conformidadeMCMV: { nome: string; percentual: number; naoConformes: number; pendencias: number; bloqueadores: string[] }[] = [];
    for (const e of empsMCMV) {
      const r = await avaliarConformidade(e.id);
      if (r.bloqueadores.length > 0 || r.resumo.naoConformes > 0 || r.resumo.pendencias > 0) {
        conformidadeMCMV.push({
          nome: e.nome,
          percentual: r.resumo.percentual,
          naoConformes: r.resumo.naoConformes,
          pendencias: r.resumo.pendencias,
          bloqueadores: r.bloqueadores,
        });
      }
    }
    const totalMCMV = conformidadeMCMV.length;

    const totalAlertas = documentosExpirando.length + marcosAtrasados.length + milestonesAtrasados.length + milestonesProximos.length + atividadesAtrasadas.length + totalCriticosFinanceiros + totalSST + totalMetas + totalMCMV;

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

      // 5.4 Notificações in-app de SST (ASO/EPI vencidos ou a vencer)
      for (const a of [...sst.asosVencidos, ...sst.asosAVencer]) {
        const venceu = a.status === 'VENCIDO';
        const msg = `${venceu ? '🔴 ASO VENCIDO' : '⚠️ ASO a vencer'}: ${a.trabalhadorNome} — validade ${new Date(a.dataValidade).toLocaleDateString('pt-BR')}`;
        await db.notificacao.createMany({
          data: admins.map(admin => ({ usuarioId: admin.id, mensagem: msg, lida: false }))
        });
      }
      for (const e of [...sst.episVencidos, ...sst.episAVencer]) {
        const venceu = e.status === 'VENCIDO';
        const msg = `${venceu ? '🔴 EPI VENCIDO' : '⚠️ EPI a vencer'}: ${e.equipamento} de ${e.trabalhadorNome} — validade ${e.dataValidade ? new Date(e.dataValidade).toLocaleDateString('pt-BR') : '—'}`;
        await db.notificacao.createMany({
          data: admins.map(admin => ({ usuarioId: admin.id, mensagem: msg, lida: false }))
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

      // 5.6 Metas de eficiência fora do alvo (Fase 6.5)
      for (const v of metaAval.violacoes) {
        const emoji = v.severidade === 'CRITICO' ? '🔴' : '⚠️';
        const msg = `${emoji} Meta de eficiência: ${v.label} — atual ${v.atual} (meta ${v.meta}).`;
        await db.notificacao.createMany({
          data: financeiroUsers.map(u => ({ usuarioId: u.id, mensagem: msg, lida: false }))
        });
      }

      // 5.7 Consultor de Eficiência: uma notificação consolidada apontando o plano (Fase 7.2)
      if (recomendacoes.length > 0) {
        const top = recomendacoes[0];
        const msg = `🧭 Consultor: ${resumoRec.criticos} ação(ões) urgente(s)${resumoRec.valorEmJogo > 0 ? ` (${formatBRL(resumoRec.valorEmJogo)} em jogo)` : ''}. Prioridade: ${top.titulo}`;
        await db.notificacao.createMany({
          data: financeiroUsers.map(u => ({ usuarioId: u.id, mensagem: msg, lida: false }))
        });
      }

      // 5.8 Conformidade MCMV: notifica ADMIN dos empreendimentos com pendências obrigatórias.
      for (const c of conformidadeMCMV) {
        const temBloqueio = c.bloqueadores.length > 0;
        const msg = `${temBloqueio ? '🔴 MCMV (trava medição)' : '⚠️ MCMV pendente'}: ${c.nome} — ${c.percentual}% conforme${temBloqueio ? `; bloqueia medição: ${c.bloqueadores.join('; ')}` : ` (${c.pendencias} pend., ${c.naoConformes} não conf.)`}`;
        await db.notificacao.createMany({
          data: admins.map(admin => ({ usuarioId: admin.id, mensagem: msg.slice(0, 480), lida: false }))
        });
      }

      // 6. Enviar e-mail sumário para cada administrador
      const recListHtml = recomendacoes.slice(0, 6).map(r => {
        const cor = r.severidade === 'CRITICO' ? '#dc2626' : r.severidade === 'ATENCAO' ? '#f59e0b' : '#0284c7';
        return `<li style="margin-bottom:6px;"><strong style="color:${cor};">${r.titulo}</strong>${r.impacto ? ` <span style="color:#111;font-weight:bold;">(${r.impacto})</span>` : ''}<br/><span style="font-size:12px;color:#555;">${r.acao} → ${r.telaLabel}</span></li>`;
      }).join('');

      const consultorHtml = recomendacoes.length > 0 ? `
        <div style="background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 8px; padding: 12px 16px; margin: 12px 0;">
          <h3 style="color: #4338ca; margin: 0 0 6px;">🧭 Plano de Ação Priorizado (Consultor de Eficiência)</h3>
          <p style="margin: 0 0 8px; font-size: 12px; color: #555;">${resumoRec.criticos} urgente(s) · ${resumoRec.atencao} atenção${resumoRec.valorEmJogo > 0 ? ` · <strong>${formatBRL(resumoRec.valorEmJogo)} em jogo</strong>` : ''}</p>
          <ol style="margin: 0; padding-left: 18px;">${recListHtml}</ol>
        </div>
      ` : '';

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

      // A marca do e-mail e a da EMPRESA, nao a nossa: quem recebe e o socio
      // do cliente, e assinatura de outra construtora entrega o white label.
      const marca = await identidadeVisualDaEmpresa(await exigirEmpresaId());

      const emailHtml = `
        <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #ef4444; border-bottom: 2px solid #ef4444; padding-bottom: 8px;">Relatório Diário de Alertas — ${marca.nome}</h2>
          <p>Prezado Sócio/Gestor,</p>
          <p>Identificamos ocorrências críticas que demandam atenção imediata:</p>

          ${consultorHtml}

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

          ${totalMCMV > 0 ? `
            <h3 style="color: #d97706;">🏛️ Conformidade MCMV / Caixa:</h3>
            <ul>${conformidadeMCMV.map(c =>
              `<li><strong>${c.nome}</strong> — ${c.percentual}% conforme${c.bloqueadores.length > 0
                ? `<br/><strong style="color:#dc2626;">Trava medição:</strong> ${c.bloqueadores.join('; ')}`
                : ` (${c.pendencias} pendência(s), ${c.naoConformes} não conforme(s))`}</li>`
            ).join('')}</ul>
          ` : ''}

          ${totalSST > 0 ? `
            <h3 style="color: #dc2626;">🦺 Segurança do Trabalho (ASO / EPI):</h3>
            <ul>${[
              ...sst.asosVencidos.map(a => `<li><strong style="color:#dc2626;">[ASO VENCIDO]</strong> ${a.trabalhadorNome} — validade ${new Date(a.dataValidade).toLocaleDateString('pt-BR')}</li>`),
              ...sst.asosAVencer.map(a => `<li><strong style="color:#f59e0b;">[ASO a vencer]</strong> ${a.trabalhadorNome} — validade ${new Date(a.dataValidade).toLocaleDateString('pt-BR')}</li>`),
              ...sst.episVencidos.map(e => `<li><strong style="color:#dc2626;">[EPI VENCIDO]</strong> ${e.equipamento} de ${e.trabalhadorNome}</li>`),
              ...sst.episAVencer.map(e => `<li><strong style="color:#f59e0b;">[EPI a vencer]</strong> ${e.equipamento} de ${e.trabalhadorNome}</li>`)
            ].join('')}</ul>
          ` : ''}

          <p style="margin-top: 20px;">Por favor, acesse o painel administrativo para regularizar as pendências.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 11px; color: #9ca3af;">${marca.nome} — Mensageria Integrada</p>
        </div>
      `;

      // Envia para ADMIN + FINANCEIRO + destinatários extras (deduplicado por e-mail)
      const recipientEmails = Array.from(new Set([
        ...financeiroUsers.map(u => u.email),
        ...getExtraAlertEmails()
      ]));
      for (const email of recipientEmails) {
        await sendEmail({
          to: email,
          subject: `🚨 ALERTA DIÁRIO: ${totalAlertas} pendências críticas — ${marca.nome}`,
          html: emailHtml
        });
      }
    }

    return {
      documentosExpirando: documentosExpirando.length,
      marcosAtrasados: marcosAtrasados.length,
      milestonesAtrasados: milestonesAtrasados.length,
      milestonesProximos: milestonesProximos.length,
      atividadesCronogramaAtrasadas: atividadesAtrasadas.length,
      rupturaCaixa: rupturaCaixa ? 1 : 0,
      medicoesGlosadas: medicoesGlosadas.length,
      casasAcimaOrcamento: casasEstouradas.length,
      asosVencidos: sst.asosVencidos.length,
      asosAVencer: sst.asosAVencer.length,
      episVencidos: sst.episVencidos.length,
      episAVencer: sst.episAVencer.length,
      metasForaDoAlvo: totalMetas,
      empreendimentosMCMVComPendencia: totalMCMV,
      statusEficiencia: metaAval.status,
      recomendacoes: recomendacoes.length,
      recomendacoesCriticas: resumoRec.criticos,
      valorEmJogo: resumoRec.valorEmJogo,
      alertasGerados: totalAlertas
    };
}
