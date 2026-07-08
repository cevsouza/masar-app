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
      select: { id: true, role: true, email: true }
    });

    if (user && ['cevsouza@hotmail.com', 'cevsouza@hotmail'].includes(user.email.toLowerCase().trim()) && user.role !== 'ADMIN') {
      await db.user.update({
        where: { id: user.id },
        data: { role: 'ADMIN' }
      });
      user.role = 'ADMIN';
    }

    const userRole = user?.role || session.role || 'COMERCIAL';

    const response = NextResponse.json({
      authenticated: true,
      nome: session.nome,
      email: session.email,
      role: userRole,
    });

    // Se o cookie antigo não tinha a role gravada, atualiza re-assinando o token
    if (!session.role && user) {
      const { signSession } = await import('@/lib/auth');
      const newToken = await signSession({
        userId: session.userId,
        email: session.email,
        nome: session.nome,
        role: userRole,
      });
      response.cookies.set('masar_session', newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 1 semana
        path: '/',
      });
    }

    return response;
  } catch (error) {
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}
