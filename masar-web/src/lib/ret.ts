import { db } from '@/lib/db';

// Apuração do RET (Regime Especial de Tributação) por empreendimento.
// Base: RECEITA recebida (regime de caixa — transações RECEITA com status PAGO),
// agrupada pelo mês do pagamento. RET devido = receita do mês × alíquota%.
// A "guia" gerada é uma conta a pagar (DESPESA categoria IMPOSTOS) cuja descrição
// carrega a competência ("RET MM/YYYY — <emp>"), o que permite saber o já gerado.

export function competenciaLabel(ym: string): string {
  const [y, m] = ym.split('-');
  return `${m}/${y}`;
}

export function descricaoRET(ym: string, empNome: string): string {
  return `RET ${competenciaLabel(ym)} — ${empNome}`;
}

interface MesRET {
  competencia: string; // YYYY-MM
  label: string; // MM/YYYY
  receitaRecebida: number;
  retDevido: number;
  retGerado: number; // já lançado como conta a pagar
  pendente: number;
  jaGerado: boolean;
}

export async function apurarRET(empreendimentoId: string): Promise<{
  empreendimentoNome: string;
  aliquota: number;
  meses: MesRET[];
  totais: { receita: number; retDevido: number; retGerado: number; pendente: number };
} | null> {
  const emp = await db.empreendimento.findUnique({
    where: { id: empreendimentoId },
    select: { nome: true, aliquotaRET: true },
  });
  if (!emp) return null;

  const aliquota = emp.aliquotaRET ?? 4.0;

  // Receita recebida (regime de caixa): RECEITA paga, pelo mês do pagamento.
  const receitas = await db.transacaoFinanceira.findMany({
    where: { empreendimentoId, natureza: 'RECEITA', status: 'PAGO', dataPagamento: { not: null } },
    select: { valor: true, dataPagamento: true },
  });

  // RET já gerado: DESPESA IMPOSTOS cuja descrição começa com "RET ".
  const retLancados = await db.transacaoFinanceira.findMany({
    where: { empreendimentoId, natureza: 'DESPESA', categoria: 'IMPOSTOS', descricao: { startsWith: 'RET ' } },
    select: { valor: true, descricao: true },
  });

  const receitaPorMes: Record<string, number> = {};
  for (const r of receitas) {
    const d = r.dataPagamento as Date;
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    receitaPorMes[ym] = (receitaPorMes[ym] || 0) + r.valor;
  }

  const geradoPorMes: Record<string, number> = {};
  for (const t of retLancados) {
    const m = t.descricao.match(/RET (\d{2})\/(\d{4})/);
    if (!m) continue;
    const ym = `${m[2]}-${m[1]}`;
    geradoPorMes[ym] = (geradoPorMes[ym] || 0) + t.valor;
  }

  // União das competências (meses com receita ou com RET já lançado).
  const competencias = Array.from(new Set([...Object.keys(receitaPorMes), ...Object.keys(geradoPorMes)])).sort().reverse();

  const meses: MesRET[] = competencias.map((ym) => {
    const receitaRecebida = receitaPorMes[ym] || 0;
    const retDevido = (receitaRecebida * aliquota) / 100;
    const retGerado = geradoPorMes[ym] || 0;
    const pendente = Math.max(0, retDevido - retGerado);
    return { competencia: ym, label: competenciaLabel(ym), receitaRecebida, retDevido, retGerado, pendente, jaGerado: retGerado > 0 };
  });

  const totais = meses.reduce(
    (acc, m) => ({
      receita: acc.receita + m.receitaRecebida,
      retDevido: acc.retDevido + m.retDevido,
      retGerado: acc.retGerado + m.retGerado,
      pendente: acc.pendente + m.pendente,
    }),
    { receita: 0, retDevido: 0, retGerado: 0, pendente: 0 }
  );

  return { empreendimentoNome: emp.nome, aliquota, meses, totais };
}
