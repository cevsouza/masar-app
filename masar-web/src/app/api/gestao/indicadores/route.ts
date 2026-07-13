import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Indicadores custo x orçado x cronograma por obra (Fase 5.3).
// Cruza o financeiro (orçado vs gasto) com o avanço físico e o cronograma:
//  - EV (valor agregado) = orçado × %físico
//  - CPI = EV / gasto  (>1 eficiente, <1 custo acima do avanço)
//  - desvio custo-físico = %consumido − %físico (positivo = gastando mais rápido que avança)
//  - atividades de cronograma atrasadas por obra
export async function GET(request: NextRequest) {
  const sessionToken = request.cookies.get('masar_session')?.value;
  const session = sessionToken ? await verifySession(sessionToken) : null;
  if (!session || !['ADMIN', 'FINANCEIRO'].includes(session.role)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const empreendimentoId = searchParams.get('empreendimentoId') || undefined;
  const where: any = {};
  if (empreendimentoId) where.empreendimentoId = empreendimentoId;

  const hoje = new Date();

  const casas = await db.casa.findMany({
    where,
    include: {
      empreendimento: { select: { nome: true } },
      orcamento: { include: { itens: true } },
      transacoes: { where: { natureza: 'DESPESA' } },
    },
    orderBy: [{ quadra: 'asc' }, { numero: 'asc' }],
  });

  // Atividades de cronograma atrasadas por casa (não concluídas com fim previsto no passado).
  const atividades = await db.atividadeCronograma.findMany({
    where: { status: { not: 'CONCLUIDA' }, casaId: { not: null }, ...(empreendimentoId ? { empreendimentoId } : {}) },
    select: { casaId: true, dataFimPrevista: true },
  });
  const atrasadasPorCasa: Record<string, number> = {};
  for (const a of atividades) {
    if (a.casaId && new Date(a.dataFimPrevista) < hoje) {
      atrasadasPorCasa[a.casaId] = (atrasadasPorCasa[a.casaId] || 0) + 1;
    }
  }

  const linhas = casas.map((c) => {
    const orcado = c.orcamento?.itens.reduce((acc, it) => acc + it.quantidadePlanejada * it.custoUnitarioPrevisto, 0) || 0;
    const gasto = c.transacoes.reduce((acc, t) => acc + t.valor, 0);
    const percentFisico = c.percentualObra || 0;
    const percentConsumido = orcado > 0 ? (gasto / orcado) * 100 : 0;
    const valorAgregado = orcado * (percentFisico / 100); // EV
    const cpi = gasto > 0 ? valorAgregado / gasto : null;
    const desvio = percentConsumido - percentFisico; // >0 = custo à frente do físico
    const atrasadas = atrasadasPorCasa[c.id] || 0;

    // Classificação de saúde da obra.
    let status: 'ESTOURANDO' | 'CUSTO_ADIANTADO' | 'CRONOGRAMA_ATRASADO' | 'SAUDAVEL';
    if (orcado > 0 && gasto > orcado) status = 'ESTOURANDO';
    else if (orcado > 0 && desvio > 10) status = 'CUSTO_ADIANTADO';
    else if (atrasadas > 0) status = 'CRONOGRAMA_ATRASADO';
    else status = 'SAUDAVEL';

    return {
      id: c.id,
      numero: c.numero,
      quadra: c.quadra,
      empreendimentoNome: c.empreendimento.nome,
      statusObra: c.statusObra,
      orcado,
      gasto,
      percentFisico,
      percentConsumido,
      valorAgregado,
      cpi,
      desvio,
      atividadesAtrasadas: atrasadas,
      status,
    };
  });

  const comOrcamento = linhas.filter((l) => l.orcado > 0);
  const totalOrcado = linhas.reduce((a, l) => a + l.orcado, 0);
  const totalGasto = linhas.reduce((a, l) => a + l.gasto, 0);
  const totalEV = linhas.reduce((a, l) => a + l.valorAgregado, 0);

  return NextResponse.json({
    linhas,
    resumo: {
      totalCasas: linhas.length,
      estourando: linhas.filter((l) => l.status === 'ESTOURANDO').length,
      custoAdiantado: linhas.filter((l) => l.status === 'CUSTO_ADIANTADO').length,
      cronogramaAtrasado: linhas.filter((l) => l.status === 'CRONOGRAMA_ATRASADO').length,
      saudaveis: linhas.filter((l) => l.status === 'SAUDAVEL').length,
      totalOrcado,
      totalGasto,
      totalEV,
      cpiGeral: totalGasto > 0 ? totalEV / totalGasto : null,
      percentFisicoMedio: comOrcamento.length > 0 ? comOrcamento.reduce((a, l) => a + l.percentFisico, 0) / comOrcamento.length : 0,
    },
  });
}
