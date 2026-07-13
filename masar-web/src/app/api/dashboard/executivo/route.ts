import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/auth';
import { calcularDreConsolidado } from '@/lib/dre';
import { buscarVencimentosSST, statusValidade } from '@/lib/sst';
import { calcularFluxoCaixaProjetado } from '@/lib/cashFlowService';
import { apurarRET } from '@/lib/ret';

export const dynamic = 'force-dynamic';

// Painel Executivo: agrega, num só lugar, a saúde cross-módulo do ERP
// (financeiro, contas, fiscal, SST, estoque, operacional).
export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('masar_session')?.value;
    const session = sessionToken ? await verifySession(sessionToken) : null;
    if (!session || !['ADMIN', 'FINANCEIRO'].includes(session.role || '')) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // 1. Financeiro consolidado (DRE de todos os empreendimentos) + caixa
    const { consolidado } = await calcularDreConsolidado();
    const fluxo = await calcularFluxoCaixaProjetado();
    const saldoAgg = await db.contaBancaria.aggregate({ _sum: { saldoAtual: true } });

    // 2. Contas em aberto (a pagar / a receber) com vencidos
    const titulos = await db.transacaoFinanceira.findMany({
      where: { status: { in: ['PENDENTE', 'ATRASADO'] } },
      select: { natureza: true, valor: true, dataVencimento: true },
    });
    const contas = { aPagar: 0, aPagarVencido: 0, aReceber: 0, aReceberVencido: 0 };
    for (const t of titulos) {
      const vencido = new Date(t.dataVencimento) < hoje;
      if (t.natureza === 'DESPESA') {
        contas.aPagar += t.valor;
        if (vencido) contas.aPagarVencido += t.valor;
      } else {
        contas.aReceber += t.valor;
        if (vencido) contas.aReceberVencido += t.valor;
      }
    }

    // 3. SST — ASO/EPI vencidos ou a vencer
    const sst = await buscarVencimentosSST();

    // 4. GED — documentos vencidos ou a vencer (30 dias)
    const docs = await db.documentoAnexo.findMany({
      where: { dataVencimento: { not: null } },
      select: { dataVencimento: true },
    });
    let docsVencidos = 0;
    let docsAVencer = 0;
    for (const d of docs) {
      const st = statusValidade(d.dataVencimento);
      if (st === 'VENCIDO') docsVencidos += 1;
      else if (st === 'A_VENCER') docsAVencer += 1;
    }

    // 5. Estoque abaixo do mínimo
    const insumos = await db.insumoPadrao.findMany({
      where: { nivelMinimoEstoque: { not: null } },
      select: { saldoEstoque: true, nivelMinimoEstoque: true },
    });
    const estoqueAbaixoMinimo = insumos.filter((i) => i.nivelMinimoEstoque != null && i.saldoEstoque < i.nivelMinimoEstoque).length;

    // 6. RET pendente (soma por empreendimento)
    const emps = await db.empreendimento.findMany({ select: { id: true } });
    let retPendente = 0;
    for (const e of emps) {
      const a = await apurarRET(e.id);
      if (a) retPendente += a.totais.pendente;
    }

    // 7. Operacional
    const totalEmpreendimentos = emps.length;
    const casasEmObra = await db.casa.count({ where: { statusObra: { notIn: ['BACKLOG', 'CONCLUIDA'] } } });
    const medicoesGlosadas = await db.medicaoCaixa.count({ where: { status: 'GLOSADA_REPROVADA' } });

    return NextResponse.json({
      financeiro: {
        vgvRealizado: consolidado.totalVGVRealizado || 0,
        custosRealizados: (consolidado.totalDiretoRealizado || 0) + (consolidado.totalRateioReal || 0) + (consolidado.totalImpostoRealizado || 0) + (consolidado.totalComissaoRealizada || 0),
        lucroRealizado: consolidado.lucroLiquidoRealizado || 0,
        lucroProjetado: consolidado.lucroLiquidoProjetado || 0,
        saldoBancario: saldoAgg._sum.saldoAtual || 0,
        caixaLivre: fluxo.caixaLivreReal ?? 0,
        runwayAlert: fluxo.runwayAlert ?? null,
      },
      contas,
      sst: {
        asosVencidos: sst.asosVencidos.length,
        asosAVencer: sst.asosAVencer.length,
        episVencidos: sst.episVencidos.length,
        episAVencer: sst.episAVencer.length,
      },
      ged: { vencidos: docsVencidos, aVencer: docsAVencer },
      estoque: { abaixoMinimo: estoqueAbaixoMinimo },
      fiscal: { retPendente },
      operacional: { totalEmpreendimentos, casasEmObra, medicoesGlosadas },
    });
  } catch (error: any) {
    console.error('[Dashboard] Erro no painel executivo:', error);
    return NextResponse.json({ error: 'Erro interno do servidor', message: error.message }, { status: 500 });
  }
}
