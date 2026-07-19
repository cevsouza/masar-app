import { type ClienteTransacao } from '@/lib/db';
import { deltaLancamento } from '@/lib/caixaMath';

/**
 * Conciliação bancária — casa linhas do extrato (TransacaoBancaria conciliado=false,
 * tipicamente origem=null/importado) com títulos internos (TransacaoFinanceira PENDENTE).
 *
 * Regra de ouro do saldo: a PRÓPRIA linha bancária É o lançamento do razão. Ao
 * conciliar, marcamos a linha `conciliado=true` e ajustamos ContaBancaria.saldoAtual
 * pelo delta (crédito soma, débito subtrai) — NÃO chamamos postLancamento (que criaria
 * uma segunda linha e contaria em dobro). O título vira PAGO na mesma transação.
 *
 * Direção: CREDITO do extrato casa com RECEITA (a receber); DEBITO casa com DESPESA (a pagar).
 */

// Tipos mínimos para não acoplar ao shape completo do Prisma.
export interface LinhaBancaria {
  id: string;
  contaBancariaId: string;
  data: Date;
  valor: number;
  tipo: string; // CREDITO | DEBITO
}

export interface TituloAberto {
  id: string;
  valor: number;
  natureza: string; // RECEITA | DESPESA
  dataVencimento: Date;
  descricao: string;
}

export function naturezaEsperada(tipoBancario: string): 'RECEITA' | 'DESPESA' {
  return tipoBancario === 'CREDITO' ? 'RECEITA' : 'DESPESA';
}

/**
 * Sugere o melhor título para uma linha bancária: mesma direção, mesmo valor e
 * vencimento dentro de ±toleranciaDias da data do extrato. Escolhe o mais próximo
 * na data. Retorna null se nada casar.
 */
export function sugerirTitulo(
  linha: LinhaBancaria,
  titulos: TituloAberto[],
  toleranciaDias = 7
): TituloAberto | null {
  const natureza = naturezaEsperada(linha.tipo);
  const tolMs = toleranciaDias * 86400000;
  const dataExtrato = linha.data.getTime();

  const candidatos = titulos
    .filter((t) => t.natureza === natureza)
    .filter((t) => Math.abs(t.valor - linha.valor) < 0.005) // valor idêntico (centavos)
    .filter((t) => Math.abs(new Date(t.dataVencimento).getTime() - dataExtrato) <= tolMs)
    .sort(
      (a, b) =>
        Math.abs(new Date(a.dataVencimento).getTime() - dataExtrato) -
        Math.abs(new Date(b.dataVencimento).getTime() - dataExtrato)
    );

  return candidatos[0] ?? null;
}

/**
 * Efetiva a conciliação de UMA linha com UM título, atomicamente.
 * DEVE rodar dentro de uma transação Prisma (`tx`).
 * - título -> PAGO + dataPagamento (= data do extrato)
 * - linha bancária -> conciliado=true
 * - saldo da conta ajustado pelo delta (crédito soma, débito subtrai)
 */
export async function conciliar(
  tx: ClienteTransacao,
  linha: LinhaBancaria,
  titulo: TituloAberto
) {
  await tx.transacaoFinanceira.update({
    where: { id: titulo.id },
    data: { status: 'PAGO', dataPagamento: linha.data },
  });

  await tx.transacaoBancaria.update({
    where: { id: linha.id },
    data: { conciliado: true },
  });

  await tx.contaBancaria.update({
    where: { id: linha.contaBancariaId },
    data: { saldoAtual: { increment: deltaLancamento(linha.tipo, linha.valor) } },
  });
}
