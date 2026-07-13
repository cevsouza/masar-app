import { db } from '@/lib/db';

/**
 * Eficiência de material — Previsto × Realizado por INSUMO (Fase 6.1).
 *
 * Reconcilia as DUAS lentes que a gestão de obra precisa cruzar:
 *  - física (quantidade): quanto foi PLANEJADO (ItemOrcamento.quantidadePlanejada)
 *    versus quanto de fato SAIU do estoque para a(s) casa(s) (MovimentacaoEstoque
 *    SAIDA) — é isso que revela sobra (saldo a consumir) e escassez/desperdício
 *    (consumo acima do planejado);
 *  - financeira (custo): custo previsto (qtd × custo unitário previsto) versus
 *    custo realizado lançado na casa (TransacaoFinanceira DESPESA do insumo).
 *
 * O gasto usa o MESMO critério do resto do sistema (competência: toda DESPESA
 * do insumo na casa, paga ou não — ver custos-por-casa e HouseDetails).
 *
 * PERDA entra separada como desperdício (não é consumo produtivo, mas baixa
 * estoque). Purely read-only: não muta nada.
 */

export type StatusInsumoEficiencia = 'ESTOURO' | 'NAO_ORCADO' | 'NAO_INICIADO' | 'OK';

export interface LinhaInsumoEficiencia {
  insumoId: string;
  insumoNome: string;
  categoria: string;
  unidadeMedida: string;
  qtdPlanejada: number;      // Σ ItemOrcamento.quantidadePlanejada nas casas do filtro
  qtdConsumida: number;      // Σ MovimentacaoEstoque SAIDA (casa+insumo)
  qtdPerda: number;          // Σ MovimentacaoEstoque PERDA (desperdício)
  qtdSaldoAConsumir: number; // planejada − consumida (negativo = consumido além do previsto)
  percentConsumidoFisico: number; // consumida / planejada × 100
  custoPrevisto: number;     // Σ qtd planejada × custo unitário previsto
  custoRealizado: number;    // Σ DESPESA do insumo na(s) casa(s)
  desvioCusto: number;       // realizado − previsto (positivo = estouro de custo)
  orcado: boolean;           // havia item de orçamento para o insumo?
  status: StatusInsumoEficiencia;
}

export interface ResumoEficiencia {
  totalCasas: number;
  totalInsumos: number;
  totalCustoPrevisto: number;
  totalCustoRealizado: number;
  desvioCusto: number;
  percentConsumidoCusto: number;   // realizado / previsto × 100
  insumosEstouro: number;          // consumo físico acima do planejado
  insumosNaoOrcado: number;        // consumido/gasto sem estar no orçamento
  insumosNaoIniciado: number;      // planejado mas nada consumido nem gasto
}

interface FiltroEficiencia {
  empreendimentoId?: string | null;
  casaId?: string | null;
}

// Tolerância sobre o planejado antes de marcar ESTOURO físico (5%).
const TOLERANCIA_ESTOURO = 1.05;

export async function calcularEficienciaMaterial(
  filtro: FiltroEficiencia = {}
): Promise<{ linhas: LinhaInsumoEficiencia[]; resumo: ResumoEficiencia }> {
  const casaWhere: any = {};
  if (filtro.casaId) casaWhere.id = filtro.casaId;
  if (filtro.empreendimentoId) casaWhere.empreendimentoId = filtro.empreendimentoId;

  const casas = await db.casa.findMany({ where: casaWhere, select: { id: true } });
  const casaIds = casas.map((c) => c.id);

  const vazio: ResumoEficiencia = {
    totalCasas: 0,
    totalInsumos: 0,
    totalCustoPrevisto: 0,
    totalCustoRealizado: 0,
    desvioCusto: 0,
    percentConsumidoCusto: 0,
    insumosEstouro: 0,
    insumosNaoOrcado: 0,
    insumosNaoIniciado: 0,
  };
  if (casaIds.length === 0) return { linhas: [], resumo: vazio };

  const [orcamentos, movimentacoes, despesas] = await Promise.all([
    db.orcamentoCasa.findMany({
      where: { casaId: { in: casaIds } },
      include: {
        itens: {
          include: { insumo: { select: { id: true, nome: true, unidadeMedida: true, categoria: true } } },
        },
      },
    }),
    db.movimentacaoEstoque.groupBy({
      by: ['insumoId', 'tipo'],
      where: { casaId: { in: casaIds }, tipo: { in: ['SAIDA', 'PERDA'] } },
      _sum: { quantidade: true },
    }),
    db.transacaoFinanceira.groupBy({
      by: ['insumoId'],
      where: { casaId: { in: casaIds }, natureza: 'DESPESA', insumoId: { not: null } },
      _sum: { valor: true },
    }),
  ]);

  interface Acc {
    insumoId: string;
    insumoNome: string;
    categoria: string;
    unidadeMedida: string;
    qtdPlanejada: number;
    qtdConsumida: number;
    qtdPerda: number;
    custoPrevisto: number;
    custoRealizado: number;
    orcado: boolean;
  }
  const map = new Map<string, Acc>();
  const ensure = (id: string): Acc => {
    let a = map.get(id);
    if (!a) {
      a = {
        insumoId: id,
        insumoNome: '',
        categoria: '',
        unidadeMedida: '',
        qtdPlanejada: 0,
        qtdConsumida: 0,
        qtdPerda: 0,
        custoPrevisto: 0,
        custoRealizado: 0,
        orcado: false,
      };
      map.set(id, a);
    }
    return a;
  };

  // Planejado (orçamento).
  for (const orc of orcamentos) {
    for (const item of orc.itens) {
      const a = ensure(item.insumoId);
      a.orcado = true;
      a.insumoNome = item.insumo.nome;
      a.categoria = item.insumo.categoria;
      a.unidadeMedida = item.insumo.unidadeMedida;
      a.qtdPlanejada += item.quantidadePlanejada;
      a.custoPrevisto += item.quantidadePlanejada * item.custoUnitarioPrevisto;
    }
  }

  // Consumo físico (estoque).
  for (const mov of movimentacoes) {
    const a = ensure(mov.insumoId);
    const qtd = mov._sum.quantidade || 0;
    if (mov.tipo === 'SAIDA') a.qtdConsumida += qtd;
    else if (mov.tipo === 'PERDA') a.qtdPerda += qtd;
  }

  // Custo realizado (despesas).
  for (const d of despesas) {
    if (!d.insumoId) continue;
    const a = ensure(d.insumoId);
    a.custoRealizado += d._sum.valor || 0;
  }

  // Completa nome/unidade/categoria de insumos que só apareceram em mov/despesa.
  const semMeta = [...map.values()].filter((a) => !a.insumoNome).map((a) => a.insumoId);
  if (semMeta.length > 0) {
    const insumos = await db.insumoPadrao.findMany({
      where: { id: { in: semMeta } },
      select: { id: true, nome: true, unidadeMedida: true, categoria: true },
    });
    for (const i of insumos) {
      const a = map.get(i.id);
      if (a) {
        a.insumoNome = i.nome;
        a.categoria = i.categoria;
        a.unidadeMedida = i.unidadeMedida;
      }
    }
  }

  const linhas: LinhaInsumoEficiencia[] = [...map.values()].map((a) => {
    const qtdSaldoAConsumir = a.qtdPlanejada - a.qtdConsumida;
    const percentConsumidoFisico = a.qtdPlanejada > 0 ? (a.qtdConsumida / a.qtdPlanejada) * 100 : 0;
    const desvioCusto = a.custoRealizado - a.custoPrevisto;

    let status: StatusInsumoEficiencia;
    if (!a.orcado && (a.qtdConsumida > 0 || a.custoRealizado > 0)) {
      status = 'NAO_ORCADO';
    } else if (a.orcado && a.qtdPlanejada > 0 && a.qtdConsumida > a.qtdPlanejada * TOLERANCIA_ESTOURO) {
      status = 'ESTOURO';
    } else if (a.orcado && a.qtdConsumida === 0 && a.custoRealizado === 0) {
      status = 'NAO_INICIADO';
    } else {
      status = 'OK';
    }

    return {
      insumoId: a.insumoId,
      insumoNome: a.insumoNome || a.insumoId,
      categoria: a.categoria,
      unidadeMedida: a.unidadeMedida,
      qtdPlanejada: a.qtdPlanejada,
      qtdConsumida: a.qtdConsumida,
      qtdPerda: a.qtdPerda,
      qtdSaldoAConsumir,
      percentConsumidoFisico,
      custoPrevisto: a.custoPrevisto,
      custoRealizado: a.custoRealizado,
      desvioCusto,
      orcado: a.orcado,
      status,
    };
  });

  // Ordena por maior custo realizado (curva A no topo), depois por desvio.
  linhas.sort((x, y) => y.custoRealizado - x.custoRealizado || y.desvioCusto - x.desvioCusto);

  const totalCustoPrevisto = linhas.reduce((s, l) => s + l.custoPrevisto, 0);
  const totalCustoRealizado = linhas.reduce((s, l) => s + l.custoRealizado, 0);

  const resumo: ResumoEficiencia = {
    totalCasas: casaIds.length,
    totalInsumos: linhas.length,
    totalCustoPrevisto,
    totalCustoRealizado,
    desvioCusto: totalCustoRealizado - totalCustoPrevisto,
    percentConsumidoCusto: totalCustoPrevisto > 0 ? (totalCustoRealizado / totalCustoPrevisto) * 100 : 0,
    insumosEstouro: linhas.filter((l) => l.status === 'ESTOURO').length,
    insumosNaoOrcado: linhas.filter((l) => l.status === 'NAO_ORCADO').length,
    insumosNaoIniciado: linhas.filter((l) => l.status === 'NAO_INICIADO').length,
  };

  return { linhas, resumo };
}
