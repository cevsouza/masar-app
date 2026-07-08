import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: casaId } = await params;
    const body = await request.json();
    const { insumoId, quantidadeReal, custoTotal, comprovanteUrl } = body;

    if (!insumoId || !quantidadeReal || !custoTotal) {
      return NextResponse.json({ error: 'Insumo, quantidade e custo total são obrigatórios' }, { status: 400 });
    }

    // 1. Load Casa and Insumo details
    const casa = await db.casa.findUnique({
      where: { id: casaId },
      include: { orcamento: { include: { itens: true } } }
    });

    const insumo = await db.insumoPadrao.findUnique({
      where: { id: insumoId }
    });

    if (!casa || !insumo) {
      return NextResponse.json({ error: 'Casa ou Insumo não encontrados' }, { status: 404 });
    }

    // 2. Trava de Empreiteiro (Mão de Obra correspondente à etapa concluída)
    if (insumo.categoria === 'MAO_DE_OBRA') {
      const insumoNomeLower = insumo.nome.toLowerCase();
      const statusObra = casa.statusObra;

      // Define dependency rules between task name and construction stage
      let isStageMet = true;
      let requiredStageLabel = '';

      if (insumoNomeLower.includes('fundação') && statusObra === 'SEM_INICIO') {
        isStageMet = false;
        requiredStageLabel = 'Fundação';
      } else if (insumoNomeLower.includes('alvenaria') && ['SEM_INICIO', 'FUNDACAO'].includes(statusObra)) {
        isStageMet = false;
        requiredStageLabel = 'Alvenaria';
      } else if ((insumoNomeLower.includes('telhado') || insumoNomeLower.includes('cobertura')) && ['SEM_INICIO', 'FUNDACAO', 'ALVENARIA'].includes(statusObra)) {
        isStageMet = false;
        requiredStageLabel = 'Cobertura';
      } else if ((insumoNomeLower.includes('acabamento') || insumoNomeLower.includes('pintura')) && ['SEM_INICIO', 'FUNDACAO', 'ALVENARIA', 'COBERTURA'].includes(statusObra)) {
        isStageMet = false;
        requiredStageLabel = 'Acabamento';
      }

      if (!isStageMet) {
        return NextResponse.json({ 
          error: `Bloqueio de Empreitada: Esta despesa de Mão de Obra exige que o estágio da obra seja no mínimo "${requiredStageLabel}" (atual: ${statusObra.replace('_', ' ')}).` 
        }, { status: 400 });
      }
    }

    // 3. Validação de Orçamento (Overbudget Trigger)
    const budgetItem = casa.orcamento?.itens.find(item => item.insumoId === insumoId);
    
    // Sum previous approved/pending appropriations for this insumo
    const prevAppr = await db.apropriacaoCusto.aggregate({
      where: { casaId, insumoId },
      _sum: { custoTotal: true }
    });

    const totalCustoPrevisto = budgetItem 
      ? budgetItem.quantidadePlanejada * budgetItem.custoUnitarioPrevisto 
      : 0; // if not budgeted, total allowed is 0

    const prevSum = prevAppr._sum.custoTotal || 0;
    const isOverbudget = (prevSum + parseFloat(custoTotal)) > totalCustoPrevisto;

    // 4. Save Apropriacao
    const apropriacao = await db.apropriacaoCusto.create({
      data: {
        casaId,
        insumoId,
        quantidadeReal: parseFloat(quantidadeReal),
        custoTotal: parseFloat(custoTotal),
        comprovanteUrl: comprovanteUrl || null,
        aprovado: !isOverbudget, // pending if overbudget
      },
      include: {
        insumo: true
      }
    });

    return NextResponse.json({
      ...apropriacao,
      warning: isOverbudget ? 'OVERBUDGET_DETECTION' : null,
      message: isOverbudget 
        ? 'Aviso: Esta despesa ultrapassou o orçamento previsto e foi registrada como "Pendente" para aprovação do sócio.' 
        : 'Custo apropriado com sucesso.'
    }, { status: 201 });
  } catch (error) {
    console.error('Erro ao apropriar custo:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// Support updating approval status (Partner/Office View)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { apropriacaoId, aprovado } = body;

    if (!apropriacaoId || aprovado === undefined) {
      return NextResponse.json({ error: 'ID da apropriação e status de aprovação são obrigatórios' }, { status: 400 });
    }

    const apropriacao = await db.apropriacaoCusto.update({
      where: { id: apropriacaoId },
      data: { aprovado: Boolean(aprovado) },
      include: { insumo: true }
    });

    return NextResponse.json(apropriacao);
  } catch (error) {
    console.error('Erro ao aprovar apropriação:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
