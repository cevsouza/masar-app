import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/auth';
import { logMutation } from '@/lib/audit';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sessionToken = request.cookies.get('masar_session')?.value;
    const session = sessionToken ? await verifySession(sessionToken) : null;
    if (!session || !['ADMIN', 'FINANCEIRO', 'ENGENHARIA'].includes(session.role)) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const current = await db.milestone.findUnique({ where: { id } });
    if (!current) {
      return NextResponse.json({ error: 'Milestone não encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const { concluido } = body;

    const updated = await db.milestone.update({
      where: { id },
      data: {
        concluido: concluido === true,
        dataConclusao: concluido === true ? new Date() : null
      }
    });

    await logMutation({
      usuarioId: session.userId,
      usuarioNome: session.nome,
      acao: 'UPDATE',
      tabela: 'Milestone',
      registroId: id,
      valoresAntigos: current,
      valoresNovos: updated
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Erro ao atualizar milestone:', error);
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
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado: Apenas administradores podem excluir milestones.' }, { status: 403 });
    }

    const current = await db.milestone.findUnique({ where: { id } });
    if (!current) {
      return NextResponse.json({ error: 'Milestone não encontrado' }, { status: 404 });
    }

    await db.milestone.delete({ where: { id } });

    await logMutation({
      usuarioId: session.userId,
      usuarioNome: session.nome,
      acao: 'DELETE',
      tabela: 'Milestone',
      registroId: id,
      valoresAntigos: current
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao excluir milestone:', error);
    return NextResponse.json({ error: 'Erro interno do servidor', message: error.message }, { status: 500 });
  }
}
