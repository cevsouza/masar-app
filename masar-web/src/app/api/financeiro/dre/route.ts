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

    // 1. Calcular VGV (Valor de Venda fechado)
    const contratos = await db.contratoVenda.findMany({
      where: {
        casa: { empreendimentoId }
      }
    });

    const totalVGV = contratos.reduce((acc, c) => acc + c.valorVenda, 0);
    const totalComissao = contratos.reduce((acc, c) => acc + c.comissaoValor, 0);

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
    const totalImposto = (retPercent / 100) * totalVGV;

    // 4. Custos Diretos de Construção (apropriados e aprovados)
    const apropriacoesSum = await db.apropriacaoCusto.aggregate({
      where: {
        aprovado: true,
        casa: { empreendimentoId }
      },
      _sum: { custoTotal: true }
    });
    const totalConstrucao = apropriacoesSum._sum.custoTotal || 0;

    // 5. Lucro Líquido
    const lucroLiquido = totalVGV - totalComissao - totalRateio - totalImposto - totalConstrucao;

    return NextResponse.json({
      empreendimentoNome: emp.nome,
      totalVGV,
      totalComissao,
      rateioTerreno,
      rateioProjetos,
      rateioMarketing,
      rateioOutros,
      totalRateio,
      totalImposto,
      totalConstrucao,
      lucroLiquido
    });
  } catch (error) {
    console.error('Erro ao calcular DRE:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
