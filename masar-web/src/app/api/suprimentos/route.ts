import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logMutation } from '@/lib/audit';

// POST: Criar nova requisição de compra
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { casaId, empreendimentoId, insumoId, quantidadeSolicitada, dataNecessidade } = body;

    if (!insumoId || !quantidadeSolicitada || !dataNecessidade) {
      return NextResponse.json(
        { error: 'Insumo, quantidade solicitada e data de necessidade são obrigatórios.' },
        { status: 400 }
      );
    }

    // Validação rígida MCMV de saldo orçado se for vinculado a uma casa
    if (casaId) {
      const itemOrcado = await db.itemOrcamento.findFirst({
        where: {
          orcamentoCasa: { casaId },
          insumoId
        }
      });

      if (!itemOrcado) {
        return NextResponse.json(
          { error: 'Bloqueio de Margem (MCMV): Este insumo não está planejado no orçamento deste lote. Adicione-o ao orçamento do lote antes de solicitar a compra.' },
          { status: 400 }
        );
      }

      const jaSolicitadoSum = await db.solicitacaoCompra.aggregate({
        where: {
          casaId,
          insumoId,
          status: { notIn: ['REJEITADA'] }
        },
        _sum: { quantidadeSolicitada: true }
      });
      
      const jaApropriadoSum = await db.transacaoFinanceira.aggregate({
        where: {
          casaId,
          insumoId,
          status: 'PAGO'
        },
        _sum: { quantidade: true }
      });

      const totalConsumido = (jaSolicitadoSum._sum.quantidadeSolicitada || 0) + (jaApropriadoSum._sum.quantidade || 0);
      const limiteDisponivel = itemOrcado.quantidadePlanejada - totalConsumido;
      
      if (parseFloat(quantidadeSolicitada) > limiteDisponivel) {
        return NextResponse.json(
          { error: `Bloqueio de Margem (MCMV): A quantidade solicitada (${quantidadeSolicitada}) excede o saldo orçado disponível para este lote (Disponível: ${limiteDisponivel.toFixed(2)}).` },
          { status: 400 }
        );
      }
    }

    // Gerar token de cotação pública único
    const tokenCotacao = crypto.randomUUID();

    const solicitacao = await db.solicitacaoCompra.create({
      data: {
        casaId: casaId || null,
        empreendimentoId: empreendimentoId || null,
        insumoId,
        quantidadeSolicitada: parseFloat(quantidadeSolicitada),
        dataNecessidade: new Date(dataNecessidade),
        tokenCotacao,
        status: 'PENDENTE'
      },
      include: {
        insumo: true
      }
    });

    await logMutation({
      usuarioId: 'SYSTEM',
      usuarioNome: 'Sistema',
      acao: 'CREATE_REQUISITION',
      tabela: 'SolicitacaoCompra',
      registroId: solicitacao.id,
      valoresNovos: solicitacao
    });

    return NextResponse.json(solicitacao, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao criar requisição de compra:', error);
    return NextResponse.json({ error: 'Erro interno do servidor', message: error.message }, { status: 500 });
  }
}

// PATCH: Editar requisição existente
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, quantidadeSolicitada, status, dataNecessidade } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID da requisição é obrigatório.' }, { status: 400 });
    }

    const current = await db.solicitacaoCompra.findUnique({ where: { id } });
    if (!current) {
      return NextResponse.json({ error: 'Requisição não encontrada.' }, { status: 404 });
    }

    // Se estiver atualizando a quantidade e a requisição for vinculada a um lote
    if (quantidadeSolicitada !== undefined && current.casaId) {
      const itemOrcado = await db.itemOrcamento.findFirst({
        where: {
          orcamentoCasa: { casaId: current.casaId },
          insumoId: current.insumoId
        }
      });

      if (itemOrcado) {
        const jaSolicitadoSum = await db.solicitacaoCompra.aggregate({
          where: {
            casaId: current.casaId,
            insumoId: current.insumoId,
            id: { not: id }, // ignora a própria solicitação
            status: { notIn: ['REJEITADA'] }
          },
          _sum: { quantidadeSolicitada: true }
        });
        
        const jaApropriadoSum = await db.transacaoFinanceira.aggregate({
          where: {
            casaId: current.casaId,
            insumoId: current.insumoId,
            status: 'PAGO'
          },
          _sum: { quantidade: true }
        });

        const totalConsumido = (jaSolicitadoSum._sum.quantidadeSolicitada || 0) + (jaApropriadoSum._sum.quantidade || 0);
        const limiteDisponivel = itemOrcado.quantidadePlanejada - totalConsumido;
        
        if (parseFloat(quantidadeSolicitada) > limiteDisponivel) {
          return NextResponse.json(
            { error: `Bloqueio de Margem (MCMV): A nova quantidade solicitada (${quantidadeSolicitada}) excede o saldo orçado disponível para este lote (Disponível: ${limiteDisponivel.toFixed(2)}).` },
            { status: 400 }
          );
        }
      }
    }

    const data: any = {};
    if (quantidadeSolicitada !== undefined) data.quantidadeSolicitada = parseFloat(quantidadeSolicitada);
    if (status !== undefined) data.status = status;
    if (dataNecessidade !== undefined) data.dataNecessidade = new Date(dataNecessidade);

    const solicitacao = await db.solicitacaoCompra.update({
      where: { id },
      data,
      include: {
        insumo: true
      }
    });

    await logMutation({
      usuarioId: 'SYSTEM',
      usuarioNome: 'Sistema',
      acao: 'UPDATE_REQUISITION',
      tabela: 'SolicitacaoCompra',
      registroId: solicitacao.id,
      valoresAntigos: current,
      valoresNovos: solicitacao
    });

    return NextResponse.json(solicitacao);
  } catch (error: any) {
    console.error('Erro ao atualizar requisição de compra:', error);
    return NextResponse.json({ error: 'Erro interno do servidor', message: error.message }, { status: 500 });
  }
}

// DELETE: Excluir requisição existente
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID da requisição é obrigatório.' }, { status: 400 });
    }

    const current = await db.solicitacaoCompra.findUnique({ where: { id } });
    if (!current) {
      return NextResponse.json({ error: 'Requisição não encontrada.' }, { status: 404 });
    }

    // Bloquear exclusão se já houver ordem de compra emitida
    const hasOrdemCompra = await db.ordemCompra.findFirst({
      where: {
        cotacao: {
          solicitacaoId: id
        }
      }
    });

    if (hasOrdemCompra) {
      return NextResponse.json(
        { error: 'Não é possível excluir uma requisição que possui ordem de compra emitida.' },
        { status: 400 }
      );
    }

    await db.solicitacaoCompra.delete({ where: { id } });

    await logMutation({
      usuarioId: 'SYSTEM',
      usuarioNome: 'Sistema',
      acao: 'DELETE_REQUISITION',
      tabela: 'SolicitacaoCompra',
      registroId: id,
      valoresAntigos: current
    });

    return NextResponse.json({ success: true, message: 'Requisição excluída com sucesso.' });
  } catch (error: any) {
    console.error('Erro ao excluir requisição de compra:', error);
    return NextResponse.json({ error: 'Erro interno do servidor', message: error.message }, { status: 500 });
  }
}
