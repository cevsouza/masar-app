import { db } from '@/lib/db';

// Classificação MCMV de um insumo (custo fixo x variável e subcategoria).
// Extraída da rota /api/financeiro/dre para ser reutilizada pelo consolidado.
export function classificarInsumoMCMV(nome: string, categoria: string): {
  tipo: 'FIXO' | 'VARIAVEL';
  subcategoria: 'EQUIPE_GESTAO' | 'CANTEIRO' | 'CONSUMO_CONTINUO' | 'LOCACAO_EQUIPAMENTOS' | 'TAXAS_SEGUROS' | 'MATERIAIS_CURVA_A' | 'MAO_DE_OBRA_DIRETA' | 'LOGISTICA_FRETES' | 'MAQUINAS_CONSUMO' | 'IMPOSTOS_RECEITA';
  label: string;
} {
  const nomeLower = nome.toLowerCase();

  if (
    nomeLower.includes('gestão') || nomeLower.includes('supervisão') || nomeLower.includes('engenheiro') ||
    nomeLower.includes('mestre') || nomeLower.includes('segurança do trabalho') || nomeLower.includes('administrativo') ||
    nomeLower.includes('equipe')
  ) {
    return { tipo: 'FIXO', subcategoria: 'EQUIPE_GESTAO', label: 'Equipe de Gestão e Supervisão' };
  }
  if (
    nomeLower.includes('canteiro') || nomeLower.includes('mobilização') || nomeLower.includes('desmobilização') ||
    nomeLower.includes('tapume') || nomeLower.includes('contêiner') || nomeLower.includes('refeitório') ||
    nomeLower.includes('sanitário') || nomeLower.includes('barracão')
  ) {
    return { tipo: 'FIXO', subcategoria: 'CANTEIRO', label: 'Instalação e Manutenção do Canteiro' };
  }
  if (
    nomeLower.includes('consumo') || nomeLower.includes('água') || nomeLower.includes('energia') ||
    nomeLower.includes('luz') || nomeLower.includes('internet') || nomeLower.includes('segurança patrimonial') ||
    nomeLower.includes('vigilância') || nomeLower.includes('vigilante') || nomeLower.includes('alarme')
  ) {
    return { tipo: 'FIXO', subcategoria: 'CONSUMO_CONTINUO', label: 'Despesas de Consumo Contínuo' };
  }
  if (
    nomeLower.includes('aluguel') || nomeLower.includes('locação') || nomeLower.includes('andaime') ||
    nomeLower.includes('escoramento') || nomeLower.includes('betoneira') || nomeLower.includes('grua')
  ) {
    return { tipo: 'FIXO', subcategoria: 'LOCACAO_EQUIPAMENTOS', label: 'Locação de Equipamentos Mensais' };
  }
  if (
    nomeLower.includes('taxa') || nomeLower.includes('alvará') || nomeLower.includes('seguro') ||
    nomeLower.includes('crea') || nomeLower.includes('cau') || nomeLower.includes('prefeitura') ||
    nomeLower.includes('registro') || nomeLower.includes('emolumento') || categoria === 'TAXA'
  ) {
    return { tipo: 'FIXO', subcategoria: 'TAXAS_SEGUROS', label: 'Taxas, Alvarás e Seguros' };
  }
  if (
    nomeLower.includes('aço') || nomeLower.includes('cimento') || nomeLower.includes('areia') ||
    nomeLower.includes('bloco') || nomeLower.includes('tijolo') || nomeLower.includes('concreto') ||
    nomeLower.includes('porta') || nomeLower.includes('esquadria') || nomeLower.includes('janela') ||
    nomeLower.includes('cerâmica') || nomeLower.includes('tinta') || nomeLower.includes('argamassa') ||
    nomeLower.includes('ferro') || nomeLower.includes('brita') || nomeLower.includes('telha') || categoria === 'MATERIAL'
  ) {
    return { tipo: 'VARIAVEL', subcategoria: 'MATERIAIS_CURVA_A', label: 'Materiais de Construção (Curva A)' };
  }
  if (
    nomeLower.includes('pedreiro') || nomeLower.includes('servente') || nomeLower.includes('armador') ||
    nomeLower.includes('carpinteiro') || nomeLower.includes('encanador') || nomeLower.includes('eletricista') ||
    nomeLower.includes('mão de obra') || nomeLower.includes('ajudante') || categoria === 'MAO_DE_OBRA'
  ) {
    return { tipo: 'VARIAVEL', subcategoria: 'MAO_DE_OBRA_DIRETA', label: 'Mão de Obra Direta' };
  }
  if (
    nomeLower.includes('frete') || nomeLower.includes('logística') || nomeLower.includes('transporte') ||
    nomeLower.includes('carreto') || nomeLower.includes('entrega')
  ) {
    return { tipo: 'VARIAVEL', subcategoria: 'LOGISTICA_FRETES', label: 'Logística e Fretes' };
  }
  if (
    nomeLower.includes('combustível') || nomeLower.includes('diesel') || nomeLower.includes('óleo') ||
    nomeLower.includes('retroescavadeira') || nomeLower.includes('trator') || nomeLower.includes('escavadeira') ||
    nomeLower.includes('caminhão') || nomeLower.includes('maquinário') || categoria === 'EQUIPAMENTO'
  ) {
    return { tipo: 'VARIAVEL', subcategoria: 'MAQUINAS_CONSUMO', label: 'Consumo Específico de Máquinas' };
  }
  if (
    nomeLower.includes('imposto') || nomeLower.includes('ret') || nomeLower.includes('tributo') || nomeLower.includes('receita')
  ) {
    return { tipo: 'VARIAVEL', subcategoria: 'IMPOSTOS_RECEITA', label: 'Impostos sobre a Receita' };
  }
  if (categoria === 'EQUIPAMENTO') {
    return { tipo: 'FIXO', subcategoria: 'LOCACAO_EQUIPAMENTOS', label: 'Locação de Equipamentos Mensais' };
  }
  if (categoria === 'TAXA') {
    return { tipo: 'FIXO', subcategoria: 'TAXAS_SEGUROS', label: 'Taxas, Alvarás e Seguros' };
  }
  return { tipo: 'VARIAVEL', subcategoria: 'MATERIAIS_CURVA_A', label: 'Materiais de Construção (Curva A)' };
}

export type DreResult = Record<string, any>;

/**
 * Calcula o DRE (projetado x realizado) de UM empreendimento. Retorna null se não existir.
 * A lógica é idêntica à antiga rota GET /api/financeiro/dre; foi extraída para cá para
 * ser reutilizada pelo consolidado (que soma o DRE de todos os empreendimentos).
 */
export async function calcularDre(empreendimentoId: string): Promise<DreResult | null> {
  const emp = await db.empreendimento.findUnique({ where: { id: empreendimentoId } });
  if (!emp) return null;

  // 1. VGV projetado x realizado + comissões
  const houses = await db.casa.findMany({
    where: { empreendimentoId },
    select: { valorVendaProjetado: true, contrato: { select: { valorVenda: true, comissaoValor: true } } },
  });

  const totalVGVProjetado = houses.reduce((acc, h) => acc + (h.valorVendaProjetado ? Number(h.valorVendaProjetado) : 0), 0);
  const totalVGVRealizado = houses.reduce((acc, h) => acc + (h.contrato ? h.contrato.valorVenda : 0), 0);
  const totalComissaoProjetada = totalVGVProjetado * 0.05;
  const totalComissaoRealizada = houses.reduce((acc, h) => acc + (h.contrato ? h.contrato.comissaoValor : 0), 0);

  // 2. Rateio de custos globais (despesas do projeto sem casaId)
  const globalTransacoes = await db.transacaoFinanceira.findMany({
    where: { empreendimentoId, casaId: null, natureza: 'DESPESA' },
  });

  let rateioTerrenoProj = 0, rateioTerrenoReal = 0, rateioProjetosProj = 0, rateioProjetosReal = 0;
  let rateioMarketingProj = 0, rateioMarketingReal = 0, rateioOutrosProj = 0, rateioOutrosReal = 0;

  globalTransacoes.forEach((t) => {
    const isReal = t.status === 'PAGO';
    const valor = t.valor;
    const descLower = t.descricao.toLowerCase();
    const cat = t.categoria;
    if (cat === 'IMPOSTOS') {
      // contabilizado na seção de impostos
    } else if (cat === 'TERRENO' || descLower.includes('terreno')) {
      if (isReal) rateioTerrenoReal += valor; else rateioTerrenoProj += valor;
    } else if (cat === 'PROJETOS' || descLower.includes('projeto') || descLower.includes('licenciamento')) {
      if (isReal) rateioProjetosReal += valor; else rateioProjetosProj += valor;
    } else if (descLower.includes('marketing') || descLower.includes('publicidade') || descLower.includes('outdoor')) {
      if (isReal) rateioMarketingReal += valor; else rateioMarketingProj += valor;
    } else {
      if (isReal) rateioOutrosReal += valor; else rateioOutrosProj += valor;
    }
  });

  const totalRateioProj = rateioTerrenoProj + rateioProjetosProj + rateioMarketingProj + rateioOutrosProj;
  const totalRateioReal = rateioTerrenoReal + rateioProjetosReal + rateioMarketingReal + rateioOutrosReal;

  // 3. Impostos (RET 4% como fallback)
  const retPercent = 4.0;
  const pendingTaxes = globalTransacoes.filter((t) => t.categoria === 'IMPOSTOS' && t.status !== 'PAGO').reduce((s, t) => s + t.valor, 0);
  const totalImpostoProjetado = pendingTaxes > 0 ? pendingTaxes : (retPercent / 100) * totalVGVProjetado;
  const paidTaxes = globalTransacoes.filter((t) => t.categoria === 'IMPOSTOS' && t.status === 'PAGO').reduce((s, t) => s + t.valor, 0);
  const totalImpostoRealizado = paidTaxes > 0 ? paidTaxes : (retPercent / 100) * totalVGVRealizado;

  // 4. Custos diretos projetados (orçamento) por categoria MCMV
  const orcadoItens = await db.itemOrcamento.findMany({
    where: { orcamentoCasa: { casa: { empreendimentoId } } },
    select: { quantidadePlanejada: true, custoUnitarioPrevisto: true, insumo: { select: { nome: true, categoria: true } } },
  });

  let totalDiretoProjetado = 0, projMaterial = 0, projMaoDeObra = 0, projEquipamento = 0, projTaxa = 0;
  let projFixoEquipeGestao = 0, projFixoCanteiro = 0, projFixoConsumo = 0, projFixoLocacao = 0, projFixoTaxasSeguros = 0;
  let projVariavelMateriais = 0, projVariavelMaoDireta = 0, projVariavelLogistica = 0, projVariavelMaquinas = 0;

  for (const item of orcadoItens) {
    const itemCost = item.quantidadePlanejada * item.custoUnitarioPrevisto;
    totalDiretoProjetado += itemCost;
    if (item.insumo.categoria === 'MATERIAL') projMaterial += itemCost;
    else if (item.insumo.categoria === 'MAO_DE_OBRA') projMaoDeObra += itemCost;
    else if (item.insumo.categoria === 'EQUIPAMENTO') projEquipamento += itemCost;
    else if (item.insumo.categoria === 'TAXA') projTaxa += itemCost;

    const classif = classificarInsumoMCMV(item.insumo.nome, item.insumo.categoria);
    if (classif.tipo === 'FIXO') {
      if (classif.subcategoria === 'EQUIPE_GESTAO') projFixoEquipeGestao += itemCost;
      else if (classif.subcategoria === 'CANTEIRO') projFixoCanteiro += itemCost;
      else if (classif.subcategoria === 'CONSUMO_CONTINUO') projFixoConsumo += itemCost;
      else if (classif.subcategoria === 'LOCACAO_EQUIPAMENTOS') projFixoLocacao += itemCost;
      else if (classif.subcategoria === 'TAXAS_SEGUROS') projFixoTaxasSeguros += itemCost;
    } else {
      if (classif.subcategoria === 'MATERIAIS_CURVA_A') projVariavelMateriais += itemCost;
      else if (classif.subcategoria === 'MAO_DE_OBRA_DIRETA') projVariavelMaoDireta += itemCost;
      else if (classif.subcategoria === 'LOGISTICA_FRETES') projVariavelLogistica += itemCost;
      else if (classif.subcategoria === 'MAQUINAS_CONSUMO') projVariavelMaquinas += itemCost;
    }
  }

  // 5. Custos diretos realizados (regime de competência: toda despesa de casa)
  const transacoesApropriadas = await db.transacaoFinanceira.findMany({
    where: { empreendimentoId, casaId: { not: null }, natureza: 'DESPESA' },
    include: { insumo: true },
  });

  let totalDiretoRealizado = 0, realMaterial = 0, realMaoDeObra = 0, realEquipamento = 0, realTaxa = 0;
  let realFixoEquipeGestao = 0, realFixoCanteiro = 0, realFixoConsumo = 0, realFixoLocacao = 0, realFixoTaxasSeguros = 0;
  let realVariavelMateriais = 0, realVariavelMaoDireta = 0, realVariavelLogistica = 0, realVariavelMaquinas = 0;

  for (const ap of transacoesApropriadas) {
    totalDiretoRealizado += ap.valor;
    const insumoNome = ap.insumo?.nome || ap.descricao;
    const insumoCategoria = ap.insumo?.categoria || (ap.categoria === 'MAO_DE_OBRA' ? 'MAO_DE_OBRA' : 'MATERIAL');
    if (insumoCategoria === 'MATERIAL') realMaterial += ap.valor;
    else if (insumoCategoria === 'MAO_DE_OBRA') realMaoDeObra += ap.valor;
    else if (insumoCategoria === 'EQUIPAMENTO') realEquipamento += ap.valor;
    else if (insumoCategoria === 'TAXA') realTaxa += ap.valor;

    const classif = classificarInsumoMCMV(insumoNome, insumoCategoria);
    if (classif.tipo === 'FIXO') {
      if (classif.subcategoria === 'EQUIPE_GESTAO') realFixoEquipeGestao += ap.valor;
      else if (classif.subcategoria === 'CANTEIRO') realFixoCanteiro += ap.valor;
      else if (classif.subcategoria === 'CONSUMO_CONTINUO') realFixoConsumo += ap.valor;
      else if (classif.subcategoria === 'LOCACAO_EQUIPAMENTOS') realFixoLocacao += ap.valor;
      else if (classif.subcategoria === 'TAXAS_SEGUROS') realFixoTaxasSeguros += ap.valor;
    } else {
      if (classif.subcategoria === 'MATERIAIS_CURVA_A') realVariavelMateriais += ap.valor;
      else if (classif.subcategoria === 'MAO_DE_OBRA_DIRETA') realVariavelMaoDireta += ap.valor;
      else if (classif.subcategoria === 'LOGISTICA_FRETES') realVariavelLogistica += ap.valor;
      else if (classif.subcategoria === 'MAQUINAS_CONSUMO') realVariavelMaquinas += ap.valor;
    }
  }

  const projVariavelImpostos = totalImpostoProjetado;
  const realVariavelImpostos = totalImpostoRealizado;

  const totalFixoProjetado = projFixoEquipeGestao + projFixoCanteiro + projFixoConsumo + projFixoLocacao + projFixoTaxasSeguros;
  const totalFixoRealizado = realFixoEquipeGestao + realFixoCanteiro + realFixoConsumo + realFixoLocacao + realFixoTaxasSeguros;
  const totalVariavelProjetado = projVariavelMateriais + projVariavelMaoDireta + projVariavelLogistica + projVariavelMaquinas + projVariavelImpostos;
  const totalVariavelRealizado = realVariavelMateriais + realVariavelMaoDireta + realVariavelLogistica + realVariavelMaquinas + realVariavelImpostos;

  const lucroLiquidoProjetado = totalVGVProjetado - totalComissaoProjetada - totalRateioProj - totalImpostoProjetado - totalDiretoProjetado;
  const lucroLiquidoRealizado = totalVGVRealizado - totalComissaoRealizada - totalRateioReal - totalImpostoRealizado - totalDiretoRealizado;

  return {
    empreendimentoId,
    empreendimentoNome: emp.nome,
    totalVGVProjetado, totalVGVRealizado,
    totalComissaoProjetada, totalComissaoRealizada,
    rateioTerrenoProj, rateioTerrenoReal, rateioProjetosProj, rateioProjetosReal,
    rateioMarketingProj, rateioMarketingReal, rateioOutrosProj, rateioOutrosReal,
    totalRateioProj, totalRateioReal,
    totalImpostoProjetado, totalImpostoRealizado,
    totalDiretoProjetado, totalDiretoRealizado,
    projMaterial, realMaterial, projMaoDeObra, realMaoDeObra,
    projEquipamento, realEquipamento, projTaxa, realTaxa,
    totalFixoProjetado, totalFixoRealizado,
    projFixoEquipeGestao, realFixoEquipeGestao, projFixoCanteiro, realFixoCanteiro,
    projFixoConsumo, realFixoConsumo, projFixoLocacao, realFixoLocacao,
    projFixoTaxasSeguros, realFixoTaxasSeguros,
    totalVariavelProjetado, totalVariavelRealizado,
    projVariavelMateriais, realVariavelMateriais, projVariavelMaoDireta, realVariavelMaoDireta,
    projVariavelLogistica, realVariavelLogistica, projVariavelMaquinas, realVariavelMaquinas,
    projVariavelImpostos, realVariavelImpostos,
    lucroLiquidoProjetado, lucroLiquidoRealizado,
  };
}

// Campos numéricos somáveis no consolidado (tudo menos os identificadores).
const CAMPOS_SOMAVEIS_EXCLUIDOS = new Set(['empreendimentoId', 'empreendimentoNome']);

/**
 * DRE consolidado = soma campo a campo do DRE de cada empreendimento. Retorna
 * os totais somados + a lista por empreendimento (para o detalhamento na tela).
 */
export async function calcularDreConsolidado(): Promise<{ consolidado: DreResult; porEmpreendimento: DreResult[] }> {
  const empreendimentos = await db.empreendimento.findMany({ select: { id: true }, orderBy: { nome: 'asc' } });

  const porEmpreendimento: DreResult[] = [];
  for (const e of empreendimentos) {
    const dre = await calcularDre(e.id);
    if (dre) porEmpreendimento.push(dre);
  }

  const consolidado: DreResult = { empreendimentoNome: 'Consolidado (todos os empreendimentos)', qtdEmpreendimentos: porEmpreendimento.length };
  for (const dre of porEmpreendimento) {
    for (const [k, v] of Object.entries(dre)) {
      if (CAMPOS_SOMAVEIS_EXCLUIDOS.has(k) || typeof v !== 'number') continue;
      consolidado[k] = (consolidado[k] || 0) + v;
    }
  }

  return { consolidado, porEmpreendimento };
}
