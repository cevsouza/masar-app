import { db } from '@/lib/db';

/**
 * EVM — Earned Value Management por obra (Fase 6.2).
 *
 * Cruza custo e prazo numa base única (valor agregado) para projetar o FIM:
 *   PV (planned value)  = orçado × % planejado até hoje (do cronograma)
 *   EV (earned value)   = orçado × % físico executado (casa.percentualObra)
 *   AC (actual cost)    = despesas incorridas (competência)
 *   CPI = EV / AC   (<1 gastando mais que entregou)
 *   SPI = EV / PV   (<1 atrasado no cronograma)
 *   EAC = orçado / CPI   (custo final projetado)   ETC = EAC − AC   VAC = orçado − EAC
 *   prazo projetado = duração planejada / SPI
 *
 * Sem linha de base congelada: usa o plano ATUAL (orçamento + cronograma) como
 * referência. Read-only.
 */

export type StatusEvm = 'CRITICO' | 'ATENCAO' | 'ADIANTADO' | 'SAUDAVEL' | 'SEM_BASE';

export interface LinhaEvm {
  id: string;
  numero: string;
  quadra: string;
  empreendimentoNome: string;
  statusObra: string;
  orcado: number;
  ac: number;              // custo real (despesas)
  pvPercent: number | null;
  evPercent: number;       // % físico
  pv: number | null;
  ev: number;
  cpi: number | null;
  spi: number | null;
  eac: number | null;      // custo final projetado
  etc: number | null;      // custo a incorrer projetado
  vac: number | null;      // orçado − EAC (negativo = estouro projetado)
  prazoFimPlanejado: string | null;
  prazoFimProjetado: string | null;
  atrasoDias: number | null;
  status: StatusEvm;
}

const DIA = 86400000;

// % do cronograma que DEVERIA estar concluído hoje (peso por duração das atividades,
// com prorata da atividade em andamento). Fallback: linear início→prazoFísico.
function progressoPlanejado(
  atividades: { dataInicioPrevista: Date; dataFimPrevista: Date }[],
  hoje: Date,
  dataCriacao: Date,
  prazoFisico: Date | null,
): number | null {
  if (atividades.length > 0) {
    let total = 0;
    let feito = 0;
    for (const a of atividades) {
      const ini = new Date(a.dataInicioPrevista).getTime();
      const fim = new Date(a.dataFimPrevista).getTime();
      const dur = Math.max(DIA, fim - ini);
      total += dur;
      if (hoje.getTime() >= fim) feito += dur;
      else if (hoje.getTime() > ini) feito += dur * ((hoje.getTime() - ini) / (fim - ini));
    }
    return total > 0 ? (feito / total) * 100 : null;
  }
  if (prazoFisico && prazoFisico.getTime() > dataCriacao.getTime()) {
    const frac = (hoje.getTime() - dataCriacao.getTime()) / (prazoFisico.getTime() - dataCriacao.getTime());
    return Math.min(1, Math.max(0, frac)) * 100;
  }
  return null;
}

// Janela planejada (início e fim) para projetar prazo.
function janelaPlanejada(
  atividades: { dataInicioPrevista: Date; dataFimPrevista: Date }[],
  dataCriacao: Date,
  prazoFisico: Date | null,
): { inicio: Date; fim: Date } | null {
  if (atividades.length > 0) {
    const inicios = atividades.map((a) => new Date(a.dataInicioPrevista).getTime());
    const fins = atividades.map((a) => new Date(a.dataFimPrevista).getTime());
    return { inicio: new Date(Math.min(...inicios)), fim: new Date(Math.max(...fins)) };
  }
  if (prazoFisico && prazoFisico.getTime() > dataCriacao.getTime()) {
    return { inicio: dataCriacao, fim: prazoFisico };
  }
  return null;
}

export async function calcularEvm(
  filtro: { empreendimentoId?: string | null } = {}
): Promise<{ linhas: LinhaEvm[]; resumo: any }> {
  const where: any = {};
  if (filtro.empreendimentoId) where.empreendimentoId = filtro.empreendimentoId;

  const hoje = new Date();

  const casas = await db.casa.findMany({
    where,
    include: {
      empreendimento: { select: { nome: true } },
      orcamento: { include: { itens: true } },
      transacoes: { where: { natureza: 'DESPESA' }, select: { valor: true } },
      atividadesCronograma: { select: { dataInicioPrevista: true, dataFimPrevista: true } },
    },
    orderBy: [{ quadra: 'asc' }, { numero: 'asc' }],
  });

  const linhas: LinhaEvm[] = casas.map((c) => {
    const orcado = c.orcamento?.itens.reduce((a, it) => a + it.quantidadePlanejada * it.custoUnitarioPrevisto, 0) || 0;
    const ac = c.transacoes.reduce((a, t) => a + t.valor, 0);
    const evPercent = c.percentualObra || 0;
    const pvPercent = progressoPlanejado(c.atividadesCronograma, hoje, new Date(c.dataCriacao), c.prazoFisico ? new Date(c.prazoFisico) : null);

    const ev = orcado * (evPercent / 100);
    const pv = pvPercent != null ? orcado * (pvPercent / 100) : null;
    const cpi = ac > 0 ? ev / ac : null;
    const spi = pv != null && pv > 0 ? ev / pv : null;

    const eac = cpi != null && cpi > 0 ? orcado / cpi : null;
    const etc = eac != null ? eac - ac : null;
    const vac = eac != null ? orcado - eac : null;

    // Projeção de prazo pelo SPI.
    let prazoFimPlanejado: string | null = null;
    let prazoFimProjetado: string | null = null;
    let atrasoDias: number | null = null;
    const janela = janelaPlanejada(c.atividadesCronograma, new Date(c.dataCriacao), c.prazoFisico ? new Date(c.prazoFisico) : null);
    if (janela) {
      prazoFimPlanejado = janela.fim.toISOString();
      if (spi != null && spi > 0) {
        const durPlan = janela.fim.getTime() - janela.inicio.getTime();
        const durProj = durPlan / spi;
        const fimProj = new Date(janela.inicio.getTime() + durProj);
        prazoFimProjetado = fimProj.toISOString();
        atrasoDias = Math.round((fimProj.getTime() - janela.fim.getTime()) / DIA);
      }
    }

    // Classificação de saúde.
    let status: StatusEvm;
    if (orcado === 0 || (cpi == null && spi == null)) {
      status = 'SEM_BASE';
    } else {
      const cpiRuim = cpi != null && cpi < 0.9;
      const spiRuim = spi != null && spi < 0.9;
      const cpiBom = cpi == null || cpi >= 1;
      const spiBom = spi == null || spi >= 1;
      if (cpiRuim && spiRuim) status = 'CRITICO';
      else if (cpiRuim || spiRuim) status = 'ATENCAO';
      else if (cpiBom && spiBom && (cpi != null || spi != null)) status = 'ADIANTADO';
      else status = 'SAUDAVEL';
    }

    return {
      id: c.id, numero: c.numero, quadra: c.quadra,
      empreendimentoNome: c.empreendimento.nome, statusObra: c.statusObra,
      orcado, ac, pvPercent, evPercent, pv, ev, cpi, spi, eac, etc, vac,
      prazoFimPlanejado, prazoFimProjetado, atrasoDias, status,
    };
  });

  const comBase = linhas.filter((l) => l.status !== 'SEM_BASE');
  const totalOrcado = comBase.reduce((a, l) => a + l.orcado, 0);
  const totalAC = comBase.reduce((a, l) => a + l.ac, 0);
  const totalEV = comBase.reduce((a, l) => a + l.ev, 0);
  const totalPV = comBase.reduce((a, l) => a + (l.pv || 0), 0);
  const totalEAC = comBase.reduce((a, l) => a + (l.eac ?? l.orcado), 0);

  const resumo = {
    totalCasas: linhas.length,
    comBase: comBase.length,
    totalOrcado,
    totalAC,
    totalEV,
    totalPV,
    cpiGeral: totalAC > 0 ? totalEV / totalAC : null,
    spiGeral: totalPV > 0 ? totalEV / totalPV : null,
    eacGeral: totalEAC,
    vacGeral: totalOrcado - totalEAC,
    criticas: linhas.filter((l) => l.status === 'CRITICO').length,
    atencao: linhas.filter((l) => l.status === 'ATENCAO').length,
    atrasadas: linhas.filter((l) => l.atrasoDias != null && l.atrasoDias > 0).length,
  };

  return { linhas, resumo };
}
