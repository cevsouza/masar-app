import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { registerFinancialTransaction } from '@/lib/transactions';

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

      if (insumoNomeLower.includes('fundação') && ['BACKLOG', 'APROVACOES'].includes(statusObra)) {
        isStageMet = false;
        requiredStageLabel = 'Infraestrutura (Base)';
      } else if (insumoNomeLower.includes('alvenaria') && ['BACKLOG', 'APROVACOES', 'INFRAESTRUTURA'].includes(statusObra)) {
        isStageMet = false;
        requiredStageLabel = 'Supraestrutura e Cobertura';
      } else if ((insumoNomeLower.includes('telhado') || insumoNomeLower.includes('cobertura')) && ['BACKLOG', 'APROVACOES', 'INFRAESTRUTURA'].includes(statusObra)) {
        isStageMet = false;
        requiredStageLabel = 'Supraestrutura e Cobertura';
      } else if ((insumoNomeLower.includes('instalação') || insumoNomeLower.includes('instalações') || insumoNomeLower.includes('elétrica') || insumoNomeLower.includes('hidráulica')) && ['BACKLOG', 'APROVACOES', 'INFRAESTRUTURA', 'SUPRAESTRUTURA'].includes(statusObra)) {
        isStageMet = false;
        requiredStageLabel = 'Instalações (Embutidas)';
      } else if ((insumoNomeLower.includes('acabamento') || insumoNomeLower.includes('pintura')) && ['BACKLOG', 'APROVACOES', 'INFRAESTRUTURA', 'SUPRAESTRUTURA', 'INSTALACOES'].includes(statusObra)) {
        isStageMet = false;
        requiredStageLabel = 'Acabamentos';
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

    if (apropriacao.aprovado) {
      await registerFinancialTransaction(
        apropriacao.custoTotal,
        'DEBITO',
        `Apropriação de Custo Obra - Lote Qd ${casa.quadra}, Casa ${casa.numero} | Insumo: ${apropriacao.insumo.nome}`
      );
    }

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

// Support updating cost appropriation details or approval status (Partner/Office View)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { apropriacaoId, aprovado, quantidadeReal, custoTotal, comprovanteUrl } = body;

    if (!apropriacaoId) {
      return NextResponse.json({ error: 'ID da apropriação é obrigatório' }, { status: 400 });
    }

    const current = await db.apropriacaoCusto.findUnique({
      where: { id: apropriacaoId }
    });

    if (!current) {
      return NextResponse.json({ error: 'Apropriação não encontrada' }, { status: 404 });
    }

    const updateData: any = {};
    if (aprovado !== undefined) updateData.aprovado = Boolean(aprovado);
    if (quantidadeReal !== undefined) updateData.quantidadeReal = parseFloat(quantidadeReal);
    if (custoTotal !== undefined) updateData.custoTotal = parseFloat(custoTotal);
    if (comprovanteUrl !== undefined) updateData.comprovanteUrl = comprovanteUrl;

    const isNewlyApproved = !current.aprovado && aprovado === true;
    const isNewlyUnapproved = current.aprovado && aprovado === false;
    const wasAlreadyApproved = current.aprovado && aprovado === true;

    const apropriacao = await db.apropriacaoCusto.update({
      where: { id: apropriacaoId },
      data: updateData,
      include: { insumo: true }
    });

    if (isNewlyApproved) {
      const finalCusto = custoTotal !== undefined ? parseFloat(custoTotal) : current.custoTotal;
      await registerFinancialTransaction(
        finalCusto,
        'DEBITO',
        `Apropriação Aprovada - Custo Obra Lote Qd ${current.casaId} | Insumo: ${apropriacao.insumo.nome}`
      );
    } else if (isNewlyUnapproved) {
      await registerFinancialTransaction(
        current.custoTotal,
        'CREDITO',
        `Estorno de Apropriação - Custo Obra Lote Qd ${current.casaId} | Insumo: ${apropriacao.insumo.nome}`
      );
    } else if (wasAlreadyApproved && custoTotal !== undefined) {
      const diff = parseFloat(custoTotal) - current.custoTotal;
      if (diff > 0) {
        await registerFinancialTransaction(
          diff,
          'DEBITO',
          `Ajuste de Custo (Acréscimo) - Custo Obra Lote Qd ${current.casaId} | Insumo: ${apropriacao.insumo.nome}`
        );
      } else if (diff < 0) {
        await registerFinancialTransaction(
          Math.abs(diff),
          'CREDITO',
          `Ajuste de Custo (Desconto) - Custo Obra Lote Qd ${current.casaId} | Insumo: ${apropriacao.insumo.nome}`
        );
      }
    }

    return NextResponse.json(apropriacao);
  } catch (error) {
    console.error('Erro ao atualizar apropriação:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// DELETE: Excluir uma apropriação de custo
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const apropriacaoId = searchParams.get('apropriacaoId');

    if (!apropriacaoId) {
      return NextResponse.json({ error: 'ID da apropriação é obrigatório' }, { status: 400 });
    }

    const current = await db.apropriacaoCusto.findUnique({
      where: { id: apropriacaoId }
    });

    if (!current) {
      return NextResponse.json({ error: 'Apropriação não encontrada' }, { status: 404 });
    }

    if (current.aprovado) {
      await registerFinancialTransaction(
        current.custoTotal,
        'CREDITO',
        `Exclusão de Apropriação - Estorno Lote Qd ${current.casaId}`
      );
    }

    await db.apropriacaoCusto.delete({
      where: { id: apropriacaoId }
    });

    return NextResponse.json({ success: true, message: 'Apropriação excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir apropriação:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
