import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/auth';
import { logMutation } from '@/lib/audit';

export async function PATCH(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('masar_session')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const session = await verifySession(sessionToken);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Permissão negada. Apenas administradores podem gerenciar perfis.' }, { status: 403 });
    }

    const body = await request.json();
    const { id, role } = body;

    if (!id || !role) {
      return NextResponse.json({ error: 'ID do usuário e novo perfil são obrigatórios' }, { status: 400 });
    }

    const targetUser = await db.user.findUnique({ where: { id } });
    if (!targetUser) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Atualizar perfil
    const updatedUser = await db.user.update({
      where: { id },
      data: { role },
      select: { id: true, nome: true, email: true, role: true }
    });

    // Gravar na auditoria
    await logMutation({
      usuarioId: session.userId,
      usuarioNome: session.nome,
      acao: 'UPDATE_USER_ROLE',
      tabela: 'User',
      registroId: updatedUser.id,
      valoresAntigos: { role: targetUser.role },
      valoresNovos: { role: updatedUser.role }
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Erro ao atualizar papel do usuário:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('masar_session')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const session = await verifySession(sessionToken);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Permissão negada. Apenas administradores podem excluir usuários.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userIdToDelete = searchParams.get('id');

    if (!userIdToDelete) {
      return NextResponse.json({ error: 'ID do usuário é obrigatório' }, { status: 400 });
    }

    if (userIdToDelete === session.userId) {
      return NextResponse.json({ error: 'Você não pode excluir sua própria conta de administrador ativa.' }, { status: 400 });
    }

    const targetUser = await db.user.findUnique({ where: { id: userIdToDelete } });
    if (!targetUser) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Deletar usuário
    await db.user.delete({
      where: { id: userIdToDelete }
    });

    // Gravar na auditoria
    await logMutation({
      usuarioId: session.userId,
      usuarioNome: session.nome,
      acao: 'DELETE_USER',
      tabela: 'User',
      registroId: userIdToDelete,
      valoresAntigos: { nome: targetUser.nome, email: targetUser.email, role: targetUser.role }
    });

    return NextResponse.json({ success: true, message: 'Usuário removido com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
