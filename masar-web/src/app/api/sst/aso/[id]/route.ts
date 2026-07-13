import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/auth';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sessionToken = request.cookies.get('masar_session')?.value;
    const session = sessionToken ? await verifySession(sessionToken) : null;
    if (!session || !['ADMIN', 'FINANCEIRO', 'ENGENHARIA'].includes(session.role || '')) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }
    const { id } = await params;
    await db.aSO.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Erro ao excluir ASO:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
