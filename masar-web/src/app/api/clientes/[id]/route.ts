import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logMutation } from '@/lib/audit';
import { verifySession } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sessionToken = request.cookies.get('masar_session')?.value;
    const session = sessionToken ? await verifySession(sessionToken) : null;
    if (!session || !['ADMIN', 'COMERCIAL'].includes(session.role || '')) {
      return NextResponse.json({ error: 'Acesso negado: Apenas administradores ou corretores comerciais podem editar clientes.' }, { status: 403 });
    }

    const current = await db.cliente.findUnique({
      where: { id }
    });

    if (!current) {
      return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 });
    }

    const body = await request.json();
    const {
      nome,
      cpf,
      rendaComprovada,
      statusCredito
    } = body;

    const updateData: any = {};
    if (nome !== undefined) updateData.nome = nome;
    if (cpf !== undefined) updateData.cpf = cpf;
    if (rendaComprovada !== undefined) updateData.rendaComprovada = parseFloat(rendaComprovada);
    if (statusCredito !== undefined) updateData.statusCredito = statusCredito;

    const updated = await db.cliente.update({
      where: { id },
      data: updateData
    });

    await logMutation({
      usuarioId: session.userId,
      usuarioNome: session.nome,
      acao: 'UPDATE',
      tabela: 'Cliente',
      registroId: id,
      valoresAntigos: current,
      valoresNovos: updated
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Erro ao atualizar cliente:', error);
    return NextResponse.json({ error: 'Erro interno do servidor', message: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sessionToken = request.cookies.get('masar_session')?.value;
    const session = sessionToken ? await verifySession(sessionToken) : null;
    if (!session || !['ADMIN', 'COMERCIAL'].includes(session.role || '')) {
      return NextResponse.json({ error: 'Acesso negado: Apenas administradores ou corretores comerciais podem excluir clientes.' }, { status: 403 });
    }

    const current = await db.cliente.findUnique({
      where: { id }
    });

    if (!current) {
      return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 });
    }

    await db.cliente.delete({
      where: { id }
    });

    await logMutation({
      usuarioId: session.userId,
      usuarioNome: session.nome,
      acao: 'DELETE',
      tabela: 'Cliente',
      registroId: id,
      valoresAntigos: current,
      valoresNovos: null
    });

    return NextResponse.json({ success: true, message: 'Cliente excluído com sucesso.' });
  } catch (error: any) {
    console.error('Erro ao excluir cliente:', error);
    return NextResponse.json({ error: 'Erro interno do servidor', message: error.message }, { status: 500 });
  }
}
