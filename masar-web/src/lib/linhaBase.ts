import { db } from '@/lib/db';

/**
 * Linha de base congelada da obra (Fase 6.2b).
 *
 * "Congelar" tira um snapshot do plano atual (orçado total + janela de prazo +
 * itens do orçamento) e guarda em LinhaBaseObra. Depois, o DRIFT compara o plano
 * ATUAL contra esse snapshot — quanto o orçamento cresceu e quanto o prazo
 * escorregou desde o congelamento. Não altera o motor EVM.
 */

const DIA = 86400000;

interface Atividade { dataInicioPrevista: Date; dataFimPrevista: Date }

// Janela planejada (início/fim) do plano atual: das atividades se houver,
// senão dataCriacao -> prazoFisico.
function janelaAtual(atividades: Atividade[], dataCriacao: Date, prazoFisico: Date | null): { inicio: Date | null; fim: Date | null } {
  if (atividades.length > 0) {
    const inicios = atividades.map((a) => new Date(a.dataInicioPrevista).getTime());
    const fins = atividades.map((a) => new Date(a.dataFimPrevista).getTime());
    return { inicio: new Date(Math.min(...inicios)), fim: new Date(Math.max(...fins)) };
  }
  return { inicio: dataCriacao, fim: prazoFisico };
}

function orcadoDaCasa(itens: { quantidadePlanejada: number; custoUnitarioPrevisto: number }[]): number {
  return itens.reduce((a, it) => a + it.quantidadePlanejada * it.custoUnitarioPrevisto, 0);
}

// Congela (cria ou atualiza) a linha de base de uma casa a partir do plano atual.
export async function congelarLinhaBase(casaId: string) {
  const casa = await db.casa.findUnique({
    where: { id: casaId },
    include: {
      orcamento: { include: { itens: { include: { insumo: { select: { nome: true } } } } } },
      atividadesCronograma: { select: { dataInicioPrevista: true, dataFimPrevista: true } },
    },
  });
  if (!casa) throw new Error('Casa não encontrada');

  const itens = casa.orcamento?.itens || [];
  const orcado = orcadoDaCasa(itens);
  const janela = janelaAtual(casa.atividadesCronograma, new Date(casa.dataCriacao), casa.prazoFisico ? new Date(casa.prazoFisico) : null);
  const itensBaseline = itens.map((it) => ({
    insumoId: it.insumoId,
    nome: it.insumo.nome,
    quantidade: it.quantidadePlanejada,
    custoUnitario: it.custoUnitarioPrevisto,
  }));

  return db.linhaBaseObra.upsert({
    where: { casaId },
    create: {
      casaId,
      orcadoBaseline: orcado,
      prazoInicioBaseline: janela.inicio,
      prazoFimBaseline: janela.fim,
      itensBaseline,
      dataSnapshot: new Date(),
    },
    update: {
      orcadoBaseline: orcado,
      prazoInicioBaseline: janela.inicio,
      prazoFimBaseline: janela.fim,
      itensBaseline,
      dataSnapshot: new Date(),
    },
  });
}

// Congela todas as casas com orçamento de um empreendimento.
export async function congelarLinhaBaseEmpreendimento(empreendimentoId: string): Promise<number> {
  const casas = await db.casa.findMany({
    where: { empreendimentoId, orcamento: { isNot: null } },
    select: { id: true },
  });
  let n = 0;
  for (const c of casas) {
    await congelarLinhaBase(c.id);
    n++;
  }
  return n;
}

export interface LinhaDrift {
  casaId: string;
  numero: string;
  quadra: string;
  empreendimentoNome: string;
  statusObra: string;
  temBaseline: boolean;
  dataSnapshot: string | null;
  orcadoAtual: number;
  orcadoBaseline: number | null;
  driftOrcado: number | null;        // atual − baseline (positivo = orçamento cresceu)
  driftOrcadoPercent: number | null;
  prazoFimAtual: string | null;
  prazoFimBaseline: string | null;
  driftPrazoDias: number | null;     // atual − baseline (positivo = prazo escorregou)
}

// Compara o plano atual de cada casa contra sua linha de base.
export async function calcularDriftLinhaBase(
  filtro: { empreendimentoId?: string | null } = {}
): Promise<{ linhas: LinhaDrift[]; resumo: any }> {
  const where: any = {};
  if (filtro.empreendimentoId) where.empreendimentoId = filtro.empreendimentoId;

  const casas = await db.casa.findMany({
    where,
    include: {
      empreendimento: { select: { nome: true } },
      orcamento: { include: { itens: true } },
      atividadesCronograma: { select: { dataInicioPrevista: true, dataFimPrevista: true } },
      linhaBase: true,
    },
    orderBy: [{ quadra: 'asc' }, { numero: 'asc' }],
  });

  const linhas: LinhaDrift[] = casas.map((c) => {
    const orcadoAtual = orcadoDaCasa(c.orcamento?.itens || []);
    const janela = janelaAtual(c.atividadesCronograma, new Date(c.dataCriacao), c.prazoFisico ? new Date(c.prazoFisico) : null);
    const base = c.linhaBase;

    const orcadoBaseline = base ? base.orcadoBaseline : null;
    const driftOrcado = base ? orcadoAtual - base.orcadoBaseline : null;
    const driftOrcadoPercent = base && base.orcadoBaseline > 0 ? ((orcadoAtual - base.orcadoBaseline) / base.orcadoBaseline) * 100 : null;

    const prazoFimBaseline = base?.prazoFimBaseline ? new Date(base.prazoFimBaseline) : null;
    let driftPrazoDias: number | null = null;
    if (janela.fim && prazoFimBaseline) {
      driftPrazoDias = Math.round((janela.fim.getTime() - prazoFimBaseline.getTime()) / DIA);
    }

    return {
      casaId: c.id,
      numero: c.numero,
      quadra: c.quadra,
      empreendimentoNome: c.empreendimento.nome,
      statusObra: c.statusObra,
      temBaseline: !!base,
      dataSnapshot: base ? base.dataSnapshot.toISOString() : null,
      orcadoAtual,
      orcadoBaseline,
      driftOrcado,
      driftOrcadoPercent,
      prazoFimAtual: janela.fim ? janela.fim.toISOString() : null,
      prazoFimBaseline: prazoFimBaseline ? prazoFimBaseline.toISOString() : null,
      driftPrazoDias,
    };
  });

  const comBase = linhas.filter((l) => l.temBaseline);
  const resumo = {
    totalCasas: linhas.length,
    comBaseline: comBase.length,
    semBaseline: linhas.length - comBase.length,
    driftOrcadoTotal: comBase.reduce((a, l) => a + (l.driftOrcado || 0), 0),
    orcadoBaselineTotal: comBase.reduce((a, l) => a + (l.orcadoBaseline || 0), 0),
    orcadoAtualTotal: comBase.reduce((a, l) => a + l.orcadoAtual, 0),
    casasComPrazoEscorregado: comBase.filter((l) => l.driftPrazoDias != null && l.driftPrazoDias > 0).length,
    casasComOrcamentoCrescido: comBase.filter((l) => l.driftOrcado != null && l.driftOrcado > 0).length,
  };

  return { linhas, resumo };
}
