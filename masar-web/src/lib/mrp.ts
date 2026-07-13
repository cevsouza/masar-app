import { db } from '@/lib/db';

/**
 * Necessidade de materiais — MRP leve (Fase 6.3).
 *
 * Objetivo do usuário: comprar o suficiente para NÃO FALTAR, sem gerar SOBRA.
 * Para cada insumo, cruza o plano com o que já existe/está a caminho:
 *
 *   necessidadeRestante = Σ planejado (casas não concluídas) − Σ já consumido
 *   disponívelFuturo    = saldo em estoque + em pedido (OC pendente)
 *   a comprar           = max(0, necessidadeRestante − disponívelFuturo)
 *   sobra (excesso)     = max(0, disponívelFuturo − necessidadeRestante)
 *
 * "em pedido" vem das Ordens de Compra PENDENTE (statusEntrega=PENDENTE) ->
 * cotação -> solicitação (quantidadeSolicitada). Read-only.
 */

export type StatusMrp = 'COMPRAR' | 'EXCESSO' | 'OK';

export interface LinhaMrp {
  insumoId: string;
  insumoNome: string;
  categoria: string;
  unidadeMedida: string;
  necessidadeTotal: number;    // planejado nas casas do escopo (não concluídas)
  jaConsumido: number;         // saídas de estoque para essas casas
  necessidadeRestante: number; // planejado − consumido (>= 0)
  saldoEstoque: number;        // cache global (InsumoPadrao.saldoEstoque)
  emPedido: number;            // Σ quantidadeSolicitada de OC pendente
  aComprar: number;            // gap a cobrir
  sobra: number;               // excesso projetado
  custoUnitario: number;       // custo unitário previsto médio (do orçamento)
  custoCompra: number;         // aComprar × custoUnitario
  valorSobra: number;          // sobra × custoUnitario
  abaixoMinimo: boolean;       // saldo < nível mínimo configurado
  status: StatusMrp;
}

export interface ResumoMrp {
  totalCasas: number;
  totalInsumos: number;
  insumosAComprar: number;
  custoTotalCompra: number;
  insumosExcesso: number;
  valorTotalSobra: number;
}

const EPS = 0.001;

export async function calcularNecessidadeMateriais(
  filtro: { empreendimentoId?: string | null } = {}
): Promise<{ linhas: LinhaMrp[]; resumo: ResumoMrp }> {
  const empreendimentoId = filtro.empreendimentoId || undefined;

  // Escopo de demanda: casas ainda não concluídas (o que falta comprar p/ terminar).
  const casaWhere: any = { statusObra: { not: 'CONCLUIDA' } };
  if (empreendimentoId) casaWhere.empreendimentoId = empreendimentoId;
  const casas = await db.casa.findMany({ where: casaWhere, select: { id: true } });
  const casaIds = casas.map((c) => c.id);

  interface Acc {
    insumoId: string;
    insumoNome: string;
    categoria: string;
    unidadeMedida: string;
    necessidadeTotal: number;
    custoTotalPrevisto: number; // p/ custo unitário médio
    jaConsumido: number;
    saldoEstoque: number;
    nivelMinimo: number | null;
    emPedido: number;
  }
  const map = new Map<string, Acc>();
  const ensure = (id: string): Acc => {
    let a = map.get(id);
    if (!a) {
      a = {
        insumoId: id, insumoNome: '', categoria: '', unidadeMedida: '',
        necessidadeTotal: 0, custoTotalPrevisto: 0, jaConsumido: 0,
        saldoEstoque: 0, nivelMinimo: null, emPedido: 0,
      };
      map.set(id, a);
    }
    return a;
  };

  // Demanda (planejado) e consumo, se há casas no escopo.
  if (casaIds.length > 0) {
    const [orcamentos, consumo] = await Promise.all([
      db.orcamentoCasa.findMany({
        where: { casaId: { in: casaIds } },
        include: { itens: { include: { insumo: { select: { id: true, nome: true, unidadeMedida: true, categoria: true } } } } },
      }),
      db.movimentacaoEstoque.groupBy({
        by: ['insumoId'],
        where: { casaId: { in: casaIds }, tipo: 'SAIDA' },
        _sum: { quantidade: true },
      }),
    ]);
    for (const orc of orcamentos) {
      for (const item of orc.itens) {
        const a = ensure(item.insumoId);
        a.insumoNome = item.insumo.nome;
        a.categoria = item.insumo.categoria;
        a.unidadeMedida = item.insumo.unidadeMedida;
        a.necessidadeTotal += item.quantidadePlanejada;
        a.custoTotalPrevisto += item.quantidadePlanejada * item.custoUnitarioPrevisto;
      }
    }
    for (const c of consumo) {
      ensure(c.insumoId).jaConsumido += c._sum.quantidade || 0;
    }
  }

  // Em pedido: OCs pendentes -> solicitação (quantidade + insumo).
  const ocsPendentes = await db.ordemCompra.findMany({
    where: { statusEntrega: 'PENDENTE' },
    select: { cotacao: { select: { solicitacao: { select: { insumoId: true, quantidadeSolicitada: true, empreendimentoId: true } } } } },
  });
  for (const oc of ocsPendentes) {
    const sol = oc.cotacao?.solicitacao;
    if (!sol) continue;
    // Se filtrado por empreendimento, considera só solicitações desse (ou sem vínculo).
    if (empreendimentoId && sol.empreendimentoId && sol.empreendimentoId !== empreendimentoId) continue;
    ensure(sol.insumoId).emPedido += sol.quantidadeSolicitada;
  }

  // Também traz insumos com saldo em estoque (p/ sinalizar excesso puro, sem demanda).
  const insumosComSaldo = await db.insumoPadrao.findMany({
    where: { saldoEstoque: { gt: 0 } },
    select: { id: true, nome: true, unidadeMedida: true, categoria: true, saldoEstoque: true, nivelMinimoEstoque: true },
  });
  for (const i of insumosComSaldo) {
    const a = ensure(i.id);
    a.saldoEstoque = i.saldoEstoque;
    a.nivelMinimo = i.nivelMinimoEstoque;
    if (!a.insumoNome) { a.insumoNome = i.nome; a.categoria = i.categoria; a.unidadeMedida = i.unidadeMedida; }
  }

  // Completa saldo/mínimo/meta dos insumos restantes (demanda/pedido sem saldo).
  const faltamMeta = [...map.values()].filter((a) => a.saldoEstoque === 0 && (!a.insumoNome || a.nivelMinimo === null)).map((a) => a.insumoId);
  if (faltamMeta.length > 0) {
    const insumos = await db.insumoPadrao.findMany({
      where: { id: { in: faltamMeta } },
      select: { id: true, nome: true, unidadeMedida: true, categoria: true, saldoEstoque: true, nivelMinimoEstoque: true },
    });
    for (const i of insumos) {
      const a = map.get(i.id);
      if (a) {
        a.saldoEstoque = i.saldoEstoque;
        a.nivelMinimo = i.nivelMinimoEstoque;
        if (!a.insumoNome) { a.insumoNome = i.nome; a.categoria = i.categoria; a.unidadeMedida = i.unidadeMedida; }
      }
    }
  }

  const linhas: LinhaMrp[] = [...map.values()].map((a) => {
    const necessidadeRestante = Math.max(0, a.necessidadeTotal - a.jaConsumido);
    const disponivelFuturo = a.saldoEstoque + a.emPedido;
    const aComprar = Math.max(0, necessidadeRestante - disponivelFuturo);
    const sobra = Math.max(0, disponivelFuturo - necessidadeRestante);
    const custoUnitario = a.necessidadeTotal > 0 ? a.custoTotalPrevisto / a.necessidadeTotal : 0;

    let status: StatusMrp;
    if (aComprar > EPS) status = 'COMPRAR';
    else if (sobra > EPS) status = 'EXCESSO';
    else status = 'OK';

    return {
      insumoId: a.insumoId,
      insumoNome: a.insumoNome || a.insumoId,
      categoria: a.categoria,
      unidadeMedida: a.unidadeMedida,
      necessidadeTotal: a.necessidadeTotal,
      jaConsumido: a.jaConsumido,
      necessidadeRestante,
      saldoEstoque: a.saldoEstoque,
      emPedido: a.emPedido,
      aComprar,
      sobra,
      custoUnitario,
      custoCompra: aComprar * custoUnitario,
      valorSobra: sobra * custoUnitario,
      abaixoMinimo: a.nivelMinimo != null && a.saldoEstoque < a.nivelMinimo,
      status,
    };
  });

  // A comprar primeiro (maior custo no topo), depois excessos, depois ok.
  const rank = (s: StatusMrp) => (s === 'COMPRAR' ? 0 : s === 'EXCESSO' ? 1 : 2);
  linhas.sort((x, y) => rank(x.status) - rank(y.status) || y.custoCompra - x.custoCompra || y.valorSobra - x.valorSobra);

  const resumo: ResumoMrp = {
    totalCasas: casaIds.length,
    totalInsumos: linhas.length,
    insumosAComprar: linhas.filter((l) => l.status === 'COMPRAR').length,
    custoTotalCompra: linhas.reduce((s, l) => s + l.custoCompra, 0),
    insumosExcesso: linhas.filter((l) => l.status === 'EXCESSO').length,
    valorTotalSobra: linhas.reduce((s, l) => s + l.valorSobra, 0),
  };

  return { linhas, resumo };
}
