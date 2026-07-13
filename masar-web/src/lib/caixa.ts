import { db } from '@/lib/db';
import { orcadoTotal, realizadoObra, custoAIncorrer as calcCustoAIncorrer, caixaLivre as calcCaixaLivre } from '@/lib/caixaMath';

/**
 * Fonte ÚNICA de verdade do "caixa livre" da construtora.
 *
 * Caixa livre = (saldo em conta + recebíveis de curto prazo) − custo de obra ainda a incorrer.
 * - saldo em conta: soma de todas as ContaBancaria (sempre global, independente de empreendimento).
 * - recebíveis de curto prazo: receitas PENDENTE que vencem nos próximos 30 dias.
 * - custo a incorrer: (orçado − realizado pago em MATERIAL/MÃO DE OBRA) das casas ainda em obra, com piso zero.
 *
 * Passe `empreendimentoId` para restringir custo a incorrer e recebíveis a um empreendimento
 * (o saldo bancário permanece global). Sem argumento, calcula para a empresa toda.
 */
export async function calcularCaixaLivre(empreendimentoId?: string): Promise<{
  caixaLivre: number;
  saldoBancario: number;
  custoAIncorrer: number;
  recebiveisCurtoPrazo: number;
}> {
  const casaWhere: any = { statusObra: { notIn: ['CONCLUIDA'] } };
  if (empreendimentoId) casaWhere.empreendimentoId = empreendimentoId;

  const activeHouses = await db.casa.findMany({
    where: casaWhere,
    include: {
      orcamento: { include: { itens: true } },
      transacoes: {
        where: { natureza: 'DESPESA', status: 'PAGO' }
      }
    }
  });

  let totalOrcadoAtivas = 0;
  let totalRealizadoAtivas = 0;

  activeHouses.forEach(h => {
    totalOrcadoAtivas += orcadoTotal(h.orcamento?.itens || []);
    totalRealizadoAtivas += realizadoObra(h.transacoes);
  });

  const custoAIncorrer = calcCustoAIncorrer(totalOrcadoAtivas, totalRealizadoAtivas);

  const limit30Days = new Date();
  limit30Days.setDate(limit30Days.getDate() + 30);
  const receberWhere: any = {
    natureza: 'RECEITA',
    status: 'PENDENTE',
    dataVencimento: { lte: limit30Days }
  };
  if (empreendimentoId) receberWhere.empreendimentoId = empreendimentoId;

  const contasReceberSum = await db.transacaoFinanceira.aggregate({
    where: receberWhere,
    _sum: { valor: true }
  });
  const recebiveisCurtoPrazo = contasReceberSum._sum.valor || 0;

  const contasSum = await db.contaBancaria.aggregate({
    _sum: { saldoAtual: true }
  });
  const saldoBancario = contasSum._sum.saldoAtual || 0;

  const caixaLivre = calcCaixaLivre({ saldoBancario, recebiveisCurtoPrazo, custoAIncorrer });

  return { caixaLivre, saldoBancario, custoAIncorrer, recebiveisCurtoPrazo };
}
