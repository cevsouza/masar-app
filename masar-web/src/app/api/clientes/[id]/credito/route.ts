import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { exigirAcesso } from '@/lib/apiAuth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await exigirAcesso(request, { modulo: 'comercial' });
  if (!auth.ok) return auth.resposta;

  try {
    const { id } = await params;
    const body = await request.json();
    const { statusCredito } = body;

    const validStatuses = ['DOCUMENTACAO_PENDENTE', 'EM_ANALISE_CAIXA', 'APROVADO_CONDICIONADO', 'APROVADO'];
    if (!statusCredito || !validStatuses.includes(statusCredito)) {
      return NextResponse.json({ error: 'Status de crédito inválido' }, { status: 400 });
    }

    const cliente = await db.cliente.update({
      where: { id },
      data: { statusCredito },
    });

    return NextResponse.json(cliente);
  } catch (error) {
    console.error('Erro ao atualizar status de crédito do cliente:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
