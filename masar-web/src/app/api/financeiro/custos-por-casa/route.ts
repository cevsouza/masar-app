import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/auth';

// Portfólio de custo por casa: Orçado -> Gasto (regime de competência) -> Falta -> Margem.
// Mesma lógica de "gasto" da ficha da casa (HouseDetails): soma de TODAS as despesas
// da casa (PAGO + PENDENTE + ATRASADO), não só as pagas.
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

  const casas = await db.casa.findMany({
    where,
    include: {
      empreendimento: { select: { nome: true } },
      contrato: true,
      orcamento: { include: { itens: true } },
      transacoes: { where: { natureza: 'DESPESA' } }
    },
    orderBy: [{ quadra: 'asc' }, { numero: 'asc' }]
  });

  const linhas = casas.map(c => {
    const orcado = c.orcamento?.itens.reduce((acc, it) => acc + (it.quantidadePlanejada * it.custoUnitarioPrevisto), 0) || 0;
    const gasto = c.transacoes.reduce((acc, t) => acc + t.valor, 0);
    const custoProjetado = Math.max(orcado, gasto); // se estourou, projeta pelo gasto real
    const valorVenda = c.contrato?.valorVenda != null
      ? Number(c.contrato.valorVenda)
      : Number(c.valorVendaProjetado ?? 0);
    const temVenda = valorVenda > 0;

    return {
      id: c.id,
      numero: c.numero,
      quadra: c.quadra,
      empreendimentoNome: c.empreendimento.nome,
      statusObra: c.statusObra,
      percentualObra: c.percentualObra,
      orcado,
      gasto,
      falta: orcado - gasto, // negativo = estouro
      estourou: orcado > 0 && gasto > orcado,
      percentConsumido: orcado > 0 ? (gasto / orcado) * 100 : 0,
      valorVenda,
      margem: temVenda ? valorVenda - custoProjetado : null,
      margemPercent: temVenda ? ((valorVenda - custoProjetado) / valorVenda) * 100 : null,
      vendida: !!c.contrato
    };
  });

  const totalOrcado = linhas.reduce((acc, l) => acc + l.orcado, 0);
  const totalGasto = linhas.reduce((acc, l) => acc + l.gasto, 0);
  const totalVenda = linhas.reduce((acc, l) => acc + l.valorVenda, 0);
  const totalMargem = linhas.reduce((acc, l) => acc + (l.margem ?? 0), 0);
  const casasComOrcamento = linhas.filter(l => l.orcado > 0).length;
  const casasEstouradas = linhas.filter(l => l.estourou).length;

  return NextResponse.json({
    linhas,
    resumo: {
      totalCasas: linhas.length,
      casasComOrcamento,
      casasEstouradas,
      casasDentro: casasComOrcamento - casasEstouradas,
      totalOrcado,
      totalGasto,
      totalVenda,
      totalMargem,
      percentConsumidoGeral: totalOrcado > 0 ? (totalGasto / totalOrcado) * 100 : 0,
      margemPercentGeral: totalVenda > 0 ? (totalMargem / totalVenda) * 100 : null
    }
  });
}
