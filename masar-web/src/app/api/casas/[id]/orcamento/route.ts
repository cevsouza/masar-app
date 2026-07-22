import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logMutation } from '@/lib/audit';
import { exigirAcesso } from '@/lib/apiAuth';

// POST: Adicionar ou editar um item do orçamento previsto da casa
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await exigirAcesso(request, { modulo: 'obras' });
  if (!auth.ok) return auth.resposta;

  try {
    const { id: casaId } = await params;
    const body = await request.json();
    const { insumoId, quantidadePlanejada, custoUnitarioPrevisto } = body;

    if (!insumoId || quantidadePlanejada === undefined || custoUnitarioPrevisto === undefined) {
      return NextResponse.json(
        { error: 'Insumo, quantidade planejada e custo unitário previsto são obrigatórios.' },
        { status: 400 }
      );
    }

    // 1. Verificar se existe o Orçamento da Casa, senão criar
    let orcamento = await db.orcamentoCasa.findUnique({
      where: { casaId }
    });

    if (!orcamento) {
      orcamento = await db.orcamentoCasa.create({
        data: { casaId }
      });
    }

    // 2. Verificar se o item já existe no orçamento para atualizar, senão criar
    const existingItem = await db.itemOrcamento.findFirst({
      where: {
        orcamentoCasaId: orcamento.id,
        insumoId
      }
    });

    let item;
    if (existingItem) {
      item = await db.itemOrcamento.update({
        where: { id: existingItem.id },
        data: {
          quantidadePlanejada: parseFloat(quantidadePlanejada),
          custoUnitarioPrevisto: parseFloat(custoUnitarioPrevisto)
        },
        include: {
          insumo: true
        }
      });
      
      await logMutation({
        usuarioId: 'SYSTEM',
        usuarioNome: 'Sistema',
        acao: 'UPDATE_BUDGET_ITEM',
        tabela: 'ItemOrcamento',
        registroId: item.id,
        valoresAntigos: existingItem,
        valoresNovos: item
      });
    } else {
      item = await db.itemOrcamento.create({
        data: {
          orcamentoCasaId: orcamento.id,
          insumoId,
          quantidadePlanejada: parseFloat(quantidadePlanejada),
          custoUnitarioPrevisto: parseFloat(custoUnitarioPrevisto)
        },
        include: {
          insumo: true
        }
      });

      await logMutation({
        usuarioId: 'SYSTEM',
        usuarioNome: 'Sistema',
        acao: 'CREATE_BUDGET_ITEM',
        tabela: 'ItemOrcamento',
        registroId: item.id,
        valoresNovos: item
      });
    }

    return NextResponse.json(item, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao gerenciar orçamento planejado:', error);
    return NextResponse.json({ error: 'Erro interno do servidor', message: error.message }, { status: 500 });
  }
}

// DELETE: Remover um item do orçamento previsto da casa
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await exigirAcesso(request, { modulo: 'obras' });
  if (!auth.ok) return auth.resposta;

  try {
    const { id: casaId } = await params;
    const { searchParams } = new URL(request.url);
    const insumoId = searchParams.get('insumoId');

    if (!insumoId) {
      return NextResponse.json({ error: 'Insumo ID é obrigatório.' }, { status: 400 });
    }

    const orcamento = await db.orcamentoCasa.findUnique({
      where: { casaId }
    });

    if (!orcamento) {
      return NextResponse.json({ error: 'Orçamento não encontrado para esta casa.' }, { status: 404 });
    }

    const item = await db.itemOrcamento.findFirst({
      where: {
        orcamentoCasaId: orcamento.id,
        insumoId
      }
    });

    if (!item) {
      return NextResponse.json({ error: 'Item não encontrado no orçamento.' }, { status: 404 });
    }

    await db.itemOrcamento.delete({
      where: { id: item.id }
    });

    await logMutation({
      usuarioId: 'SYSTEM',
      usuarioNome: 'Sistema',
      acao: 'DELETE_BUDGET_ITEM',
      tabela: 'ItemOrcamento',
      registroId: item.id,
      valoresAntigos: item
    });

    return NextResponse.json({ success: true, message: 'Item removido do orçamento com sucesso.' });
  } catch (error: any) {
    console.error('Erro ao excluir item do orçamento:', error);
    return NextResponse.json({ error: 'Erro interno do servidor', message: error.message }, { status: 500 });
  }
}
