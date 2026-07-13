import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/auth';

// PATCH: marca o EPI como devolvido (ou reverte). DELETE: remove o registro.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sessionToken = request.cookies.get('masar_session')?.value;
    const session = sessionToken ? await verifySession(sessionToken) : null;
    if (!session || !['ADMIN', 'FINANCEIRO', 'ENGENHARIA'].includes(session.role || '')) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }
    const { id } = await params;
    const body = await request.json();
    const devolvido = typeof body.devolvido === 'boolean' ? body.devolvido : true;
    const epi = await db.entregaEPI.update({ where: { id }, data: { devolvido } });
    return NextResponse.json(epi);
  } catch (error) {
    console.error('Erro ao atualizar EPI:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sessionToken = request.cookies.get('masar_session')?.value;
    const session = sessionToken ? await verifySession(sessionToken) : null;
    if (!session || !['ADMIN', 'FINANCEIRO', 'ENGENHARIA'].includes(session.role || '')) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }
    const { id } = await params;
    await db.entregaEPI.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Erro ao excluir EPI:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
