import { Prisma } from '@prisma/client';
import { db, type ClienteTransacao } from '@/lib/db';
import { deltaLancamento } from '@/lib/caixaMath';

/**
 * Livro-razão do caixa — fonte ÚNICA de mutação do saldo bancário.
 *
 * Regra de ouro: NINGUÉM altera `ContaBancaria.saldoAtual` na mão. Todo movimento
 * de caixa passa por `postLancamento`, que cria uma linha IMUTÁVEL em
 * `TransacaoBancaria` (CREDITO/DEBITO) e ajusta o saldo em cache na MESMA
 * transação. Assim o saldo é sempre reconstruível como Σcréditos − Σdébitos
 * (ver `saldoDerivado`), e estornos viram lançamentos contrários — nunca some nada.
 *
 * Lançamentos internos nascem `conciliado: true` (são autoritativos). Linhas com
 * `conciliado: false` são extratos importados aguardando conciliação (motor em
 * /api/financeiro/conciliacao), que ao casar vira `true` e credita o saldo.
 */

export type TipoLancamento = 'CREDITO' | 'DEBITO';

interface PostLancamentoInput {
  /** Conta alvo; se omitido, usa a primeira conta (findFirst), como o código legado. */
  contaId?: string;
  valor: number; // sempre positivo
  tipo: TipoLancamento;
  descricao: string;
  origem: string;
  data?: Date;
}

/**
 * Cria o lançamento no razão e ajusta o saldo, atomicamente.
 * DEVE ser chamado dentro de uma transação Prisma (`tx`) para garantir atomicidade.
 * Retorna a conta usada (ou null se não houver conta cadastrada).
 */
export async function postLancamento(
  tx: ClienteTransacao,
  input: PostLancamentoInput
) {
  const conta = input.contaId
    ? await tx.contaBancaria.findUnique({ where: { id: input.contaId } })
    : await tx.contaBancaria.findFirst();

  if (!conta) return null;

  await tx.transacaoBancaria.create({
    data: {
      contaBancariaId: conta.id,
      data: input.data ?? new Date(),
      valor: input.valor,
      descricao: input.descricao,
      tipo: input.tipo,
      conciliado: true,
      origem: input.origem,
    },
  });

  await tx.contaBancaria.update({
    where: { id: conta.id },
    data: { saldoAtual: { increment: deltaLancamento(input.tipo, input.valor) } },
  });

  return conta;
}

/**
 * Saldo reconstruído do razão (Σ créditos − Σ débitos sobre linhas conciliadas).
 * Serve para verificar se o `saldoAtual` em cache não derivou. Opcionalmente por conta.
 */
export async function saldoDerivado(contaId?: string): Promise<number> {
  const where: Prisma.TransacaoBancariaWhereInput = { conciliado: true };
  if (contaId) where.contaBancariaId = contaId;

  const [creditos, debitos] = await Promise.all([
    db.transacaoBancaria.aggregate({ where: { ...where, tipo: 'CREDITO' }, _sum: { valor: true } }),
    db.transacaoBancaria.aggregate({ where: { ...where, tipo: 'DEBITO' }, _sum: { valor: true } }),
  ]);

  return (creditos._sum.valor || 0) - (debitos._sum.valor || 0);
}
