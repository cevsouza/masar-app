import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';

/**
 * Estoque — fonte ÚNICA de mutação do saldo em cache (InsumoPadrao.saldoEstoque).
 *
 * Mesmo padrão do razão do caixa (ver lib/ledger.postLancamento): NINGUÉM altera
 * `InsumoPadrao.saldoEstoque` na mão. Toda movimentação passa por
 * `registrarMovimentacaoEstoque`, que cria a linha em `MovimentacaoEstoque` e
 * ajusta o saldo em cache na MESMA transação. Assim o saldo é sempre
 * reconstruível como Σ ENTRADA − Σ (SAIDA + PERDA) — ver `saldoEstoqueDerivado`.
 */

export type TipoMovimentacaoEstoque = 'ENTRADA' | 'SAIDA' | 'PERDA';

interface RegistrarMovimentacaoInput {
  insumoId: string;
  quantidade: number; // sempre positivo
  tipo: TipoMovimentacaoEstoque;
  casaId?: string | null;
  data?: Date;
}

// ENTRADA soma no estoque; SAIDA e PERDA subtraem.
function deltaEstoque(tipo: TipoMovimentacaoEstoque, quantidade: number): number {
  return tipo === 'ENTRADA' ? quantidade : -quantidade;
}

/**
 * Cria a movimentação e ajusta o saldo em cache, atomicamente.
 * DEVE ser chamado dentro de uma transação Prisma (`tx`).
 */
export async function registrarMovimentacaoEstoque(
  tx: Prisma.TransactionClient,
  input: RegistrarMovimentacaoInput
) {
  const mov = await tx.movimentacaoEstoque.create({
    data: {
      insumoId: input.insumoId,
      quantidade: input.quantidade,
      tipo: input.tipo,
      casaId: input.casaId ?? null,
      ...(input.data ? { dataMovimentacao: input.data } : {}),
    },
  });

  await tx.insumoPadrao.update({
    where: { id: input.insumoId },
    data: { saldoEstoque: { increment: deltaEstoque(input.tipo, input.quantidade) } },
  });

  return mov;
}

/**
 * Saldo reconstruído das movimentações (Σ ENTRADA − Σ SAIDA/PERDA) de um insumo.
 * Serve para verificar se o `saldoEstoque` em cache não derivou.
 */
export async function saldoEstoqueDerivado(insumoId: string): Promise<number> {
  const [entradas, saidas] = await Promise.all([
    db.movimentacaoEstoque.aggregate({
      where: { insumoId, tipo: 'ENTRADA' },
      _sum: { quantidade: true },
    }),
    db.movimentacaoEstoque.aggregate({
      where: { insumoId, tipo: { in: ['SAIDA', 'PERDA'] } },
      _sum: { quantidade: true },
    }),
  ]);
  return (entradas._sum.quantidade || 0) - (saidas._sum.quantidade || 0);
}
