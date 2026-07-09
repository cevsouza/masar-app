import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: casaId } = await params;
    const body = await request.json();
    const { insumoId, quantidadeReal, custoTotal } = body;

    if (!insumoId || !quantidadeReal || !custoTotal) {
      return NextResponse.json({ error: 'Insumo, quantidade e custo total são obrigatórios' }, { status: 400 });
    }

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

    // 1. Trava de Empreiteiro (Mão de Obra correspondente à etapa concluída)
    if (insumo.categoria === 'MAO_DE_OBRA') {
      const insumoNomeLower = insumo.nome.toLowerCase();
      const statusObra = casa.statusObra;

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

    // 2. Validação de Orçamento (Overbudget Trigger)
    const budgetItem = casa.orcamento?.itens.find(item => item.insumoId === insumoId);
    
    // Sum previous approved/paid transactions for this insumo in this house
    const prevTransacoes = await db.transacaoFinanceira.aggregate({
      where: { 
        casaId, 
        insumoId, 
        natureza: 'DESPESA', 
        status: 'PAGO' 
      },
      _sum: { valor: true }
    });

    const totalCustoPrevisto = budgetItem 
      ? budgetItem.quantidadePlanejada * budgetItem.custoUnitarioPrevisto 
      : 0;

    const prevSum = prevTransacoes._sum.valor || 0;
    const isOverbudget = (prevSum + parseFloat(custoTotal)) > totalCustoPrevisto;

    // 3. Save as TransacaoFinanceira
    const transacao = await db.transacaoFinanceira.create({
      data: {
        descricao: `Apropriação - ${insumo.nome}`,
        valor: parseFloat(custoTotal),
        dataVencimento: new Date(),
        dataPagamento: isOverbudget ? null : new Date(),
        natureza: 'DESPESA',
        status: isOverbudget ? 'PENDENTE' : 'PAGO',
        categoria: insumo.categoria === 'MAO_DE_OBRA' ? 'MAO_DE_OBRA' : 'MATERIAL',
        empreendimentoId: casa.empreendimentoId,
        casaId,
        insumoId,
        quantidade: parseFloat(quantidadeReal)
      },
      include: {
        insumo: true
      }
    });

    return NextResponse.json({
      id: transacao.id,
      casaId: transacao.casaId,
      insumoId: transacao.insumoId,
      quantidadeReal: transacao.quantidade,
      custoTotal: transacao.valor,
      aprovado: transacao.status === 'PAGO',
      insumo: transacao.insumo,
      warning: isOverbudget ? 'OVERBUDGET_DETECTION' : null,
      message: isOverbudget 
        ? 'Aviso: Esta despesa ultrapassou o orçamento previsto e foi registrada como "Pendente" para aprovação do sócio.' 
        : 'Custo apropriado com sucesso no livro-caixa.'
    }, { status: 201 });
  } catch (error) {
    console.error('Erro ao apropriar custo:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { apropriacaoId, aprovado, quantidadeReal, custoTotal } = body;

    if (!apropriacaoId) {
      return NextResponse.json({ error: 'ID da transação (apropriação) é obrigatório' }, { status: 400 });
    }

    const current = await db.transacaoFinanceira.findUnique({
      where: { id: apropriacaoId }
    });

    if (!current) {
      return NextResponse.json({ error: 'Transação não encontrada' }, { status: 404 });
    }

    const updateData: any = {};
    if (aprovado !== undefined) {
      updateData.status = aprovado ? 'PAGO' : 'PENDENTE';
      updateData.dataPagamento = aprovado ? new Date() : null;
    }
    if (quantidadeReal !== undefined) updateData.quantidade = parseFloat(quantidadeReal);
    if (custoTotal !== undefined) updateData.valor = parseFloat(custoTotal);

    const transacao = await db.transacaoFinanceira.update({
      where: { id: apropriacaoId },
      data: updateData,
      include: { insumo: true }
    });

    return NextResponse.json({
      id: transacao.id,
      casaId: transacao.casaId,
      insumoId: transacao.insumoId,
      quantidadeReal: transacao.quantidade,
      custoTotal: transacao.valor,
      aprovado: transacao.status === 'PAGO',
      insumo: transacao.insumo
    });
  } catch (error) {
    console.error('Erro ao atualizar transação de obra:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const apropriacaoId = searchParams.get('apropriacaoId');

    if (!apropriacaoId) {
      return NextResponse.json({ error: 'ID da transação (apropriação) é obrigatório' }, { status: 400 });
    }

    const current = await db.transacaoFinanceira.findUnique({
      where: { id: apropriacaoId }
    });

    if (!current) {
      return NextResponse.json({ error: 'Transação não encontrada' }, { status: 404 });
    }

    await db.transacaoFinanceira.delete({
      where: { id: apropriacaoId }
    });

    return NextResponse.json({ success: true, message: 'Apropriação excluída com sucesso do livro-caixa' });
  } catch (error) {
    console.error('Erro ao excluir transação de obra:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
