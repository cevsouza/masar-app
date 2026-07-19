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

    // (Removida a auto-promoção a ADMIN por e-mail fixo — ver comentário em api/auth/login.)

    const userRole = user?.role || session.role || 'COMERCIAL';

    // Módulos permitidos (Fase 5.2): do token quando presente, senão computa do banco.
    let modulos: string[] = Array.isArray(session.modulos) ? session.modulos : [];
    const precisaModulos = !Array.isArray(session.modulos);
    if (precisaModulos) {
      const { computarModulosUsuario } = await import('@/lib/permissoesDb');
      modulos = await computarModulosUsuario(userRole);
    }

    const response = NextResponse.json({
      authenticated: true,
      nome: session.nome,
      email: session.email,
      role: userRole,
      modulos,
    });

    // Re-assina o token se faltava a role OU os módulos (cookies antigos).
    if ((!session.role || precisaModulos) && user) {
      const { signSession } = await import('@/lib/auth');
      const newToken = await signSession({
        userId: session.userId,
        email: session.email,
        nome: session.nome,
        role: userRole,
        modulos,
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
