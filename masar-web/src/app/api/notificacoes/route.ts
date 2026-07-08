import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('masar_session')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const session = await verifySession(sessionToken);
    if (!session) {
      return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 });
    }

    const notificacoes = await db.notificacao.findMany({
      where: { usuarioId: session.userId },
      orderBy: { data: 'desc' },
      take: 20
    });

    return NextResponse.json(notificacoes);
  } catch (error) {
    console.error('Erro ao buscar notificações:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('masar_session')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const session = await verifySession(sessionToken);
    if (!session) {
      return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 });
    }

    const body = await request.json();
    const { id, marcarTodasLidas } = body;

    if (marcarTodasLidas) {
      await db.notificacao.updateMany({
        where: { usuarioId: session.userId, lida: false },
        data: { lida: true }
      });
      return NextResponse.json({ success: true });
    }

    if (!id) {
      return NextResponse.json({ error: 'ID da notificação é obrigatório' }, { status: 400 });
    }

    const updated = await db.notificacao.update({
      where: { id, usuarioId: session.userId },
      data: { lida: true }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Erro ao atualizar notificação:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
