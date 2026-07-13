import { db } from '@/lib/db';
import { calcularCaixaLivre } from '@/lib/caixa';

/**
 * Fluxo de caixa projetado — CALENDÁRIO semanal de obrigações datadas (Fase 6.4).
 *
 * Complementa o cockpit mensal (lib/cashFlowService, com heurística do ciclo CEF):
 * aqui a projeção é 100% baseada em obrigações REAIS com data — todas as contas a
 * pagar/receber PENDENTE/ATRASADO por dataVencimento (inclusive as com casaId, que
 * o cockpit mensal ignorava) — para responder "vou ter caixa para pagar as contas
 * nas próximas semanas?". Sem heurística, sem risco de dupla contagem.
 *
 * Além do calendário datado, expõe o compromisso do PLANO ainda fora do calendário:
 * o orçado das obras ativas que ainda não virou despesa (custoAIncorrer) — dinheiro
 * que vai sair, mas ainda sem conta a pagar emitida.
 */

export interface SemanaFluxo {
  indice: number;
  inicio: string;   // ISO
  fim: string;      // ISO
  label: string;    // "dd/MM"
  entradas: number;
  saidas: number;
  saldoSemana: number;
  saldoAcumulado: number;
  qtdPagar: number;
  qtdReceber: number;
}

export interface FluxoProjetadoResult {
  saldoInicial: number;
  semanas: SemanaFluxo[];
  resumo: {
    totalEntradas: number;
    totalSaidas: number;
    menorSaldo: number;
    semanaRuptura: string | null;
    vencidoPagar: number;         // contas a pagar já vencidas (entram na 1ª semana)
    vencidoReceber: number;
    pagarAlemHorizonte: number;   // vencem depois do horizonte
    receberAlemHorizonte: number;
    compromissoOrcadoNaoIncorrido: number; // orçado das obras ativas ainda não gasto
  };
}

function ymd(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export async function calcularFluxoCaixaSemanal(
  filtro: { empreendimentoId?: string | null; semanas?: number } = {}
): Promise<FluxoProjetadoResult> {
  const empreendimentoId = filtro.empreendimentoId || undefined;
  const nSemanas = filtro.semanas && filtro.semanas > 0 ? Math.min(filtro.semanas, 26) : 12;

  const snapshot = await calcularCaixaLivre(empreendimentoId);
  const saldoInicial = snapshot.saldoBancario;

  // Janela semanal a partir de hoje (00:00). Semana i = [hoje+7i, hoje+7(i+1)).
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const inicioJanela = hoje;
  const fimJanela = new Date(hoje.getTime() + nSemanas * 7 * 86400000);

  const semanas: SemanaFluxo[] = [];
  for (let i = 0; i < nSemanas; i++) {
    const inicio = new Date(hoje.getTime() + i * 7 * 86400000);
    const fim = new Date(hoje.getTime() + (i + 1) * 7 * 86400000);
    semanas.push({
      indice: i,
      inicio: inicio.toISOString(),
      fim: fim.toISOString(),
      label: ymd(inicio),
      entradas: 0,
      saidas: 0,
      saldoSemana: 0,
      saldoAcumulado: 0,
      qtdPagar: 0,
      qtdReceber: 0,
    });
  }

  // Todas as obrigações em aberto (a pagar e a receber).
  const where: any = { status: { in: ['PENDENTE', 'ATRASADO'] } };
  if (empreendimentoId) where.empreendimentoId = empreendimentoId;
  const obrigacoes = await db.transacaoFinanceira.findMany({
    where,
    select: { natureza: true, valor: true, dataVencimento: true },
  });

  let vencidoPagar = 0;
  let vencidoReceber = 0;
  let pagarAlemHorizonte = 0;
  let receberAlemHorizonte = 0;

  for (const o of obrigacoes) {
    const venc = new Date(o.dataVencimento);
    const isReceita = o.natureza === 'RECEITA';

    // Vencidas ou a vencer nesta semana -> caem na semana 0 (é o que precisa ser tratado agora).
    let idx: number;
    if (venc < inicioJanela) {
      idx = 0;
      if (isReceita) vencidoReceber += o.valor; else vencidoPagar += o.valor;
    } else if (venc >= fimJanela) {
      if (isReceita) receberAlemHorizonte += o.valor; else pagarAlemHorizonte += o.valor;
      continue; // fora do horizonte: não entra no acumulado
    } else {
      idx = Math.floor((venc.getTime() - inicioJanela.getTime()) / (7 * 86400000));
      if (idx < 0) idx = 0;
      if (idx > nSemanas - 1) idx = nSemanas - 1;
    }

    const s = semanas[idx];
    if (isReceita) {
      s.entradas += o.valor;
      s.qtdReceber += 1;
    } else {
      s.saidas += o.valor;
      s.qtdPagar += 1;
    }
  }

  // Acumula o saldo semana a semana.
  let running = saldoInicial;
  let menorSaldo = saldoInicial;
  let semanaRuptura: string | null = null;
  for (const s of semanas) {
    s.saldoSemana = s.entradas - s.saidas;
    running += s.saldoSemana;
    s.saldoAcumulado = running;
    if (running < menorSaldo) menorSaldo = running;
    if (semanaRuptura === null && running < 0) semanaRuptura = s.label;
  }

  const totalEntradas = semanas.reduce((a, s) => a + s.entradas, 0);
  const totalSaidas = semanas.reduce((a, s) => a + s.saidas, 0);

  return {
    saldoInicial,
    semanas,
    resumo: {
      totalEntradas,
      totalSaidas,
      menorSaldo,
      semanaRuptura,
      vencidoPagar,
      vencidoReceber,
      pagarAlemHorizonte,
      receberAlemHorizonte,
      compromissoOrcadoNaoIncorrido: snapshot.custoAIncorrer,
    },
  };
}
