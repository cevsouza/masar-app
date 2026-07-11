import { db } from '@/lib/db';

export async function calcularCaixaLivre(): Promise<{
  caixaLivre: number;
  saldoBancario: number;
  custoAIncorrer: number;
  recebiveisCurtoPrazo: number;
}> {
  const activeHouses = await db.casa.findMany({
    where: {
      statusObra: { notIn: ['CONCLUIDA'] }
    },
    include: {
      orcamento: {
        include: { itens: true }
      },
      transacoes: {
        where: {
          natureza: 'DESPESA',
          status: 'PAGO'
        }
      }
    }
  });

  let totalOrcadoAtivas = 0;
  let totalRealizadoAtivas = 0;

  activeHouses.forEach(h => {
    const orcado = h.orcamento?.itens.reduce((acc, it) => acc + (it.quantidadePlanejada * it.custoUnitarioPrevisto), 0) || 0;
    const real = h.transacoes.filter(t => t.categoria === 'MATERIAL' || t.categoria === 'MAO_DE_OBRA').reduce((acc, t) => acc + t.valor, 0) || 0;
    totalOrcadoAtivas += orcado;
    totalRealizadoAtivas += real;
  });

  const custoAIncorrer = Math.max(0, totalOrcadoAtivas - totalRealizadoAtivas);

  const limit30Days = new Date();
  limit30Days.setDate(limit30Days.getDate() + 30);
  const contasReceberSum = await db.transacaoFinanceira.aggregate({
    where: {
      natureza: 'RECEITA',
      status: 'PENDENTE',
      dataVencimento: { lte: limit30Days }
    },
    _sum: { valor: true }
  });
  const recebiveisCurtoPrazo = contasReceberSum._sum.valor || 0;

  const contasSum = await db.contaBancaria.aggregate({
    _sum: { saldoAtual: true }
  });
  const saldoBancario = contasSum._sum.saldoAtual || 0;

  const caixaLivre = (saldoBancario + recebiveisCurtoPrazo) - custoAIncorrer;

  return { caixaLivre, saldoBancario, custoAIncorrer, recebiveisCurtoPrazo };
}
