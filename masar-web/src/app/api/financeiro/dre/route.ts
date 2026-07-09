import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export function classificarInsumoMCMV(nome: string, categoria: string): {
  tipo: 'FIXO' | 'VARIAVEL';
  subcategoria: 'EQUIPE_GESTAO' | 'CANTEIRO' | 'CONSUMO_CONTINUO' | 'LOCACAO_EQUIPAMENTOS' | 'TAXAS_SEGUROS' | 'MATERIAIS_CURVA_A' | 'MAO_DE_OBRA_DIRETA' | 'LOGISTICA_FRETES' | 'MAQUINAS_CONSUMO' | 'IMPOSTOS_RECEITA';
  label: string;
} {
  const nomeLower = nome.toLowerCase();

  // 1. Custos Fixos (O Relógio Contra a Margem)
  if (
    nomeLower.includes('gestão') || 
    nomeLower.includes('supervisão') || 
    nomeLower.includes('engenheiro') || 
    nomeLower.includes('mestre') || 
    nomeLower.includes('segurança do trabalho') || 
    nomeLower.includes('administrativo') ||
    nomeLower.includes('equipe')
  ) {
    return { tipo: 'FIXO', subcategoria: 'EQUIPE_GESTAO', label: 'Equipe de Gestão e Supervisão' };
  }
  
  if (
    nomeLower.includes('canteiro') || 
    nomeLower.includes('mobilização') || 
    nomeLower.includes('desmobilização') || 
    nomeLower.includes('tapume') || 
    nomeLower.includes('contêiner') || 
    nomeLower.includes('refeitório') || 
    nomeLower.includes('sanitário') ||
    nomeLower.includes('barracão')
  ) {
    return { tipo: 'FIXO', subcategoria: 'CANTEIRO', label: 'Instalação e Manutenção do Canteiro' };
  }
  
  if (
    nomeLower.includes('consumo') || 
    nomeLower.includes('água') || 
    nomeLower.includes('energia') || 
    nomeLower.includes('luz') || 
    nomeLower.includes('internet') || 
    nomeLower.includes('segurança patrimonial') || 
    nomeLower.includes('vigilância') ||
    nomeLower.includes('vigilante') ||
    nomeLower.includes('alarme')
  ) {
    return { tipo: 'FIXO', subcategoria: 'CONSUMO_CONTINUO', label: 'Despesas de Consumo Contínuo' };
  }
  
  if (
    nomeLower.includes('aluguel') || 
    nomeLower.includes('locação') || 
    nomeLower.includes('andaime') || 
    nomeLower.includes('escoramento') || 
    nomeLower.includes('betoneira') ||
    nomeLower.includes('grua')
  ) {
    return { tipo: 'FIXO', subcategoria: 'LOCACAO_EQUIPAMENTOS', label: 'Locação de Equipamentos Mensais' };
  }
  
  if (
    nomeLower.includes('taxa') || 
    nomeLower.includes('alvará') || 
    nomeLower.includes('seguro') || 
    nomeLower.includes('crea') || 
    nomeLower.includes('cau') || 
    nomeLower.includes('prefeitura') ||
    nomeLower.includes('registro') ||
    nomeLower.includes('emolumento') ||
    categoria === 'TAXA'
  ) {
    return { tipo: 'FIXO', subcategoria: 'TAXAS_SEGUROS', label: 'Taxas, Alvarás e Seguros' };
  }

  // 2. Custos Variáveis (A Eficiência da Produção)
  if (
    nomeLower.includes('aço') || 
    nomeLower.includes('cimento') || 
    nomeLower.includes('areia') || 
    nomeLower.includes('bloco') || 
    nomeLower.includes('tijolo') || 
    nomeLower.includes('concreto') || 
    nomeLower.includes('porta') || 
    nomeLower.includes('esquadria') || 
    nomeLower.includes('janela') || 
    nomeLower.includes('cerâmica') || 
    nomeLower.includes('tinta') || 
    nomeLower.includes('argamassa') ||
    nomeLower.includes('ferro') ||
    nomeLower.includes('brita') ||
    nomeLower.includes('telha') ||
    categoria === 'MATERIAL'
  ) {
    return { tipo: 'VARIAVEL', subcategoria: 'MATERIAIS_CURVA_A', label: 'Materiais de Construção (Curva A)' };
  }
  
  if (
    nomeLower.includes('pedreiro') || 
    nomeLower.includes('servente') || 
    nomeLower.includes('armador') || 
    nomeLower.includes('carpinteiro') || 
    nomeLower.includes('encanador') || 
    nomeLower.includes('eletricista') || 
    nomeLower.includes('mão de obra') ||
    nomeLower.includes('ajudante') ||
    categoria === 'MAO_DE_OBRA'
  ) {
    return { tipo: 'VARIAVEL', subcategoria: 'MAO_DE_OBRA_DIRETA', label: 'Mão de Obra Direta' };
  }
  
  if (
    nomeLower.includes('frete') || 
    nomeLower.includes('logística') || 
    nomeLower.includes('transporte') || 
    nomeLower.includes('carreto') ||
    nomeLower.includes('entrega')
  ) {
    return { tipo: 'VARIAVEL', subcategoria: 'LOGISTICA_FRETES', label: 'Logística e Fretes' };
  }
  
  if (
    nomeLower.includes('combustível') || 
    nomeLower.includes('diesel') || 
    nomeLower.includes('óleo') || 
    nomeLower.includes('retroescavadeira') || 
    nomeLower.includes('trator') || 
    nomeLower.includes('escavadeira') || 
    nomeLower.includes('caminhão') ||
    nomeLower.includes('maquinário') ||
    categoria === 'EQUIPAMENTO'
  ) {
    return { tipo: 'VARIAVEL', subcategoria: 'MAQUINAS_CONSUMO', label: 'Consumo Específico de Máquinas' };
  }
  
  if (
    nomeLower.includes('imposto') || 
    nomeLower.includes('ret') || 
    nomeLower.includes('tributo') || 
    nomeLower.includes('receita')
  ) {
    return { tipo: 'VARIAVEL', subcategoria: 'IMPOSTOS_RECEITA', label: 'Impostos sobre a Receita' };
  }

  // Fallbacks padrão
  if (categoria === 'EQUIPAMENTO') {
    return { tipo: 'FIXO', subcategoria: 'LOCACAO_EQUIPAMENTOS', label: 'Locação de Equipamentos Mensais' };
  }
  if (categoria === 'TAXA') {
    return { tipo: 'FIXO', subcategoria: 'TAXAS_SEGUROS', label: 'Taxas, Alvarás e Seguros' };
  }

  return { tipo: 'VARIAVEL', subcategoria: 'MATERIAIS_CURVA_A', label: 'Materiais de Construção (Curva A)' };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const empreendimentoId = searchParams.get('empreendimentoId');

    if (!empreendimentoId) {
      return NextResponse.json({ error: 'ID do empreendimento é obrigatório' }, { status: 400 });
    }

    const emp = await db.empreendimento.findUnique({
      where: { id: empreendimentoId },
      include: { casas: { include: { contrato: true } } }
    });

    if (!emp) {
      return NextResponse.json({ error: 'Empreendimento não encontrado' }, { status: 404 });
    }

    // 1. Calcular Valor Geral de Vendas (VGV) Projetado e Realizado
    const houses = await db.casa.findMany({
      where: { empreendimentoId },
      select: { 
        valorVendaProjetado: true,
        contrato: {
          select: {
            valorVenda: true,
            comissaoValor: true
          }
        }
      }
    });

    const totalVGVProjetado = houses.reduce((acc, h) => acc + (h.valorVendaProjetado ? Number(h.valorVendaProjetado) : 0), 0);
    const totalVGVRealizado = houses.reduce((acc, h) => acc + (h.contrato ? h.contrato.valorVenda : 0), 0);

    // Comissão: Projetada (5% padrão do VGV Projetado) vs Realizada (soma dos contratos assinados)
    const totalComissaoProjetada = totalVGVProjetado * 0.05;
    const totalComissaoRealizada = houses.reduce((acc, h) => acc + (h.contrato ? h.contrato.comissaoValor : 0), 0);

    // 2. Calcular rateio de custos globais (Específicos do projeto + Compartilhados rateados)
    const totalHouses = await db.casa.count();
    const projectHouses = emp.casas.length;

    const custosEspecificos = await db.custoGlobal.groupBy({
      where: { empreendimentoId },
      by: ['tipo'],
      _sum: { valor: true }
    });

    const custosCompartilhados = await db.custoGlobal.groupBy({
      where: { empreendimentoId: null },
      by: ['tipo'],
      _sum: { valor: true }
    });

    const getCustoGlobalProporcional = (tipo: 'TERRENO' | 'PROJETOS' | 'MARKETING' | 'OUTRO') => {
      const itemEsp = custosEspecificos.find(c => c.tipo === tipo);
      const valorEsp = itemEsp?._sum.valor || 0;

      const itemComp = custosCompartilhados.find(c => c.tipo === tipo);
      const valorComp = itemComp?._sum.valor || 0;
      const compProporcional = totalHouses > 0 ? (valorComp / totalHouses) * projectHouses : 0;

      return valorEsp + compProporcional;
    };

    const rateioTerreno = getCustoGlobalProporcional('TERRENO');
    const rateioProjetos = getCustoGlobalProporcional('PROJETOS');
    const rateioMarketing = getCustoGlobalProporcional('MARKETING');
    const rateioOutros = getCustoGlobalProporcional('OUTRO');

    const totalRateio = rateioTerreno + rateioProjetos + rateioMarketing + rateioOutros;

    // 3. Calcular Impostos (Regime Especial de Tributação - RET, padrão 4%)
    const impostoRET = await db.imposto.findUnique({ where: { nome: 'RET' } });
    const retPercent = impostoRET ? impostoRET.percentual : 4.0;
    const totalImpostoProjetado = (retPercent / 100) * totalVGVProjetado;
    const totalImpostoRealizado = (retPercent / 100) * totalVGVRealizado;

    // 4. Custos Diretos de Construção (Projetado vs Realizado por categoria MCMV)
    const orcadoItens = await db.itemOrcamento.findMany({
      where: {
        orcamentoCasa: {
          casa: { empreendimentoId }
        }
      },
      select: {
        quantidadePlanejada: true,
        custoUnitarioPrevisto: true,
        insumo: {
          select: { nome: true, categoria: true }
        }
      }
    });

    let totalDiretoProjetado = 0;
    let projMaterial = 0;
    let projMaoDeObra = 0;
    let projEquipamento = 0;
    let projTaxa = 0;

    // Custos Fixos Projetados (MCMV)
    let projFixoEquipeGestao = 0;
    let projFixoCanteiro = 0;
    let projFixoConsumo = 0;
    let projFixoLocacao = 0;
    let projFixoTaxasSeguros = 0;

    // Custos Variáveis Projetados (MCMV)
    let projVariavelMateriais = 0;
    let projVariavelMaoDireta = 0;
    let projVariavelLogistica = 0;
    let projVariavelMaquinas = 0;

    for (const item of orcadoItens) {
      const itemCost = item.quantidadePlanejada * item.custoUnitarioPrevisto;
      totalDiretoProjetado += itemCost;

      // Legado
      if (item.insumo.categoria === 'MATERIAL') projMaterial += itemCost;
      else if (item.insumo.categoria === 'MAO_DE_OBRA') projMaoDeObra += itemCost;
      else if (item.insumo.categoria === 'EQUIPAMENTO') projEquipamento += itemCost;
      else if (item.insumo.categoria === 'TAXA') projTaxa += itemCost;

      // MCMV Novo
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

    const apropriacoes = await db.apropriacaoCusto.findMany({
      where: {
        aprovado: true,
        casa: { empreendimentoId }
      },
      select: {
        custoTotal: true,
        insumo: {
          select: { nome: true, categoria: true }
        }
      }
    });

    let totalDiretoRealizado = 0;
    let realMaterial = 0;
    let realMaoDeObra = 0;
    let realEquipamento = 0;
    let realTaxa = 0;

    // Custos Fixos Realizados (MCMV)
    let realFixoEquipeGestao = 0;
    let realFixoCanteiro = 0;
    let realFixoConsumo = 0;
    let realFixoLocacao = 0;
    let realFixoTaxasSeguros = 0;

    // Custos Variáveis Realizados (MCMV)
    let realVariavelMateriais = 0;
    let realVariavelMaoDireta = 0;
    let realVariavelLogistica = 0;
    let realVariavelMaquinas = 0;

    for (const ap of apropriacoes) {
      totalDiretoRealizado += ap.custoTotal;

      // Legado
      if (ap.insumo.categoria === 'MATERIAL') realMaterial += ap.custoTotal;
      else if (ap.insumo.categoria === 'MAO_DE_OBRA') realMaoDeObra += ap.custoTotal;
      else if (ap.insumo.categoria === 'EQUIPAMENTO') realEquipamento += ap.custoTotal;
      else if (ap.insumo.categoria === 'TAXA') realTaxa += ap.custoTotal;

      // MCMV Novo
      const classif = classificarInsumoMCMV(ap.insumo.nome, ap.insumo.categoria);
      if (classif.tipo === 'FIXO') {
        if (classif.subcategoria === 'EQUIPE_GESTAO') realFixoEquipeGestao += ap.custoTotal;
        else if (classif.subcategoria === 'CANTEIRO') realFixoCanteiro += ap.custoTotal;
        else if (classif.subcategoria === 'CONSUMO_CONTINUO') realFixoConsumo += ap.custoTotal;
        else if (classif.subcategoria === 'LOCACAO_EQUIPAMENTOS') realFixoLocacao += ap.custoTotal;
        else if (classif.subcategoria === 'TAXAS_SEGUROS') realFixoTaxasSeguros += ap.custoTotal;
      } else {
        if (classif.subcategoria === 'MATERIAIS_CURVA_A') realVariavelMateriais += ap.custoTotal;
        else if (classif.subcategoria === 'MAO_DE_OBRA_DIRETA') realVariavelMaoDireta += ap.custoTotal;
        else if (classif.subcategoria === 'LOGISTICA_FRETES') realVariavelLogistica += ap.custoTotal;
        else if (classif.subcategoria === 'MAQUINAS_CONSUMO') realVariavelMaquinas += ap.custoTotal;
      }
    }

    // Imposto RET entra como custo variável na DRE corporativa (Regime Especial de Tributação)
    const projVariavelImpostos = totalImpostoProjetado;
    const realVariavelImpostos = totalImpostoRealizado;

    // Totais Consolidados MCMV
    const totalFixoProjetado = projFixoEquipeGestao + projFixoCanteiro + projFixoConsumo + projFixoLocacao + projFixoTaxasSeguros;
    const totalFixoRealizado = realFixoEquipeGestao + realFixoCanteiro + realFixoConsumo + realFixoLocacao + realFixoTaxasSeguros;

    const totalVariavelProjetado = projVariavelMateriais + projVariavelMaoDireta + projVariavelLogistica + projVariavelMaquinas + projVariavelImpostos;
    const totalVariavelRealizado = realVariavelMateriais + realVariavelMaoDireta + realVariavelLogistica + realVariavelMaquinas + realVariavelImpostos;

    // 5. Resultado Líquido
    const lucroLiquidoProjetado = totalVGVProjetado - totalComissaoProjetada - totalRateio - totalImpostoProjetado - totalDiretoProjetado;
    const lucroLiquidoRealizado = totalVGVRealizado - totalComissaoRealizada - totalRateio - totalImpostoRealizado - totalDiretoRealizado;

    return NextResponse.json({
      empreendimentoNome: emp.nome,
      
      // Receitas
      totalVGVProjetado,
      totalVGVRealizado,
      
      // Comissões
      totalComissaoProjetada,
      totalComissaoRealizada,
      
      // Custos Globais (rateio)
      rateioTerreno,
      rateioProjetos,
      rateioMarketing,
      rateioOutros,
      totalRateio,

      // Impostos
      totalImpostoProjetado,
      totalImpostoRealizado,

      // Custos Diretos (Compatibilidade Legada)
      totalDiretoProjetado,
      totalDiretoRealizado,
      projMaterial,
      realMaterial,
      projMaoDeObra,
      realMaoDeObra,
      projEquipamento,
      realEquipamento,
      projTaxa,
      realTaxa,

      // Estrutura detalhada de Custos MCMV por extenso
      totalFixoProjetado,
      totalFixoRealizado,
      projFixoEquipeGestao,
      realFixoEquipeGestao,
      projFixoCanteiro,
      realFixoCanteiro,
      projFixoConsumo,
      realFixoConsumo,
      projFixoLocacao,
      realFixoLocacao,
      projFixoTaxasSeguros,
      realFixoTaxasSeguros,

      totalVariavelProjetado,
      totalVariavelRealizado,
      projVariavelMateriais,
      realVariavelMateriais,
      projVariavelMaoDireta,
      realVariavelMaoDireta,
      projVariavelLogistica,
      realVariavelLogistica,
      projVariavelMaquinas,
      realVariavelMaquinas,
      projVariavelImpostos,
      realVariavelImpostos,

      // Resultado
      lucroLiquidoProjetado,
      lucroLiquidoRealizado
    });
  } catch (error) {
    console.error('Erro ao calcular DRE:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

