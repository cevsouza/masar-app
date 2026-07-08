import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('masar_session')?.value;
    if (!sessionToken) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const session = await verifySession(sessionToken);
    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // Buscar a role diretamente do banco para compatibilidade com cookies antigos
    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: { role: true }
    });

    return NextResponse.json({
      authenticated: true,
      nome: session.nome,
      email: session.email,
      role: user?.role || session.role || 'COMERCIAL',
    });
  } catch (error) {
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}
