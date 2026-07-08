import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

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

    // 1. Calcular VGV Projetado e Realizado
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

    // 3. Calcular Impostos (RET - Regime Especial de Tributação, padrão 4%)
    const impostoRET = await db.imposto.findUnique({ where: { nome: 'RET' } });
    const retPercent = impostoRET ? impostoRET.percentual : 4.0;
    const totalImpostoProjetado = (retPercent / 100) * totalVGVProjetado;
    const totalImpostoRealizado = (retPercent / 100) * totalVGVRealizado;

    // 4. Custos Diretos de Construção (Projetado vs Realizado por categoria)
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
          select: { categoria: true }
        }
      }
    });

    let totalDiretoProjetado = 0;
    let projMaterial = 0;
    let projMaoDeObra = 0;
    let projEquipamento = 0;
    let projTaxa = 0;

    for (const item of orcadoItens) {
      const itemCost = item.quantidadePlanejada * item.custoUnitarioPrevisto;
      totalDiretoProjetado += itemCost;
      if (item.insumo.categoria === 'MATERIAL') projMaterial += itemCost;
      else if (item.insumo.categoria === 'MAO_DE_OBRA') projMaoDeObra += itemCost;
      else if (item.insumo.categoria === 'EQUIPAMENTO') projEquipamento += itemCost;
      else if (item.insumo.categoria === 'TAXA') projTaxa += itemCost;
    }

    const apropriacoes = await db.apropriacaoCusto.findMany({
      where: {
        aprovado: true,
        casa: { empreendimentoId }
      },
      select: {
        custoTotal: true,
        insumo: {
          select: { categoria: true }
        }
      }
    });

    let totalDiretoRealizado = 0;
    let realMaterial = 0;
    let realMaoDeObra = 0;
    let realEquipamento = 0;
    let realTaxa = 0;

    for (const ap of apropriacoes) {
      totalDiretoRealizado += ap.custoTotal;
      if (ap.insumo.categoria === 'MATERIAL') realMaterial += ap.custoTotal;
      else if (ap.insumo.categoria === 'MAO_DE_OBRA') realMaoDeObra += ap.custoTotal;
      else if (ap.insumo.categoria === 'EQUIPAMENTO') realEquipamento += ap.custoTotal;
      else if (ap.insumo.categoria === 'TAXA') realTaxa += ap.custoTotal;
    }

    // 5. Lucro Líquido
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

      // Custos Diretos
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

      // Resultado
      lucroLiquidoProjetado,
      lucroLiquidoRealizado
    });
  } catch (error) {
    console.error('Erro ao calcular DRE:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
