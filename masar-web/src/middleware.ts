import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySession } from './lib/auth';
import { moduloDaRota, modulosPermitidos } from './lib/permissoes';

function getDefaultRouteForRole(role: string): string {
  switch (role) {
    case 'ADMIN':
      return '/';
    case 'FINANCEIRO':
      return '/empreendimentos';
    case 'ENGENHARIA':
      return '/canteiro/ponto';
    case 'COMERCIAL':
      return '/comercial';
    default:
      return '/login';
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Paths that do not require authentication
  const isPublicPath = 
    pathname.startsWith('/login') || 
    pathname.startsWith('/signup') || 
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/cron') ||
    pathname.startsWith('/api/webhooks') ||
    pathname.startsWith('/api/health') ||
    pathname.startsWith('/api/seed') ||
    pathname.startsWith('/api/clean') ||
    pathname.includes('.') ||
    pathname.startsWith('/_next');

  if (isPublicPath) {
    return NextResponse.next();
  }

  // Get session cookie
  const sessionToken = request.cookies.get('masar_session')?.value;

  if (!sessionToken) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Verify session
  const session = await verifySession(sessionToken);

  if (!session) {
    const loginUrl = new URL('/login', request.url);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.set('masar_session', '', { maxAge: 0 });
    return response;
  }

  const userRole = session.role || 'COMERCIAL';

  // 1. Dashboard (/) é de acesso exclusivo do ADMIN
  if (pathname === '/') {
    if (userRole !== 'ADMIN') {
      const redirectUrl = new URL(getDefaultRouteForRole(userRole), request.url);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // 2. Áreas exclusivas de ADMIN (sistema): equipe e permissões.
  if (pathname.startsWith('/usuarios') || pathname.startsWith('/permissoes')) {
    if (userRole !== 'ADMIN') {
      const redirectUrl = new URL(getDefaultRouteForRole(userRole), request.url);
      redirectUrl.searchParams.set('unauthorized', 'true');
      return NextResponse.redirect(redirectUrl);
    }
  }

  // 3. Permissões finas por MÓDULO (Fase 5.2). Os módulos permitidos vêm do
  // token (gravados no login); para cookies antigos sem `modulos`, cai no default
  // do papel. ADMIN passa em tudo. Só barra PÁGINAS — as APIs checam o papel.
  const modulo = moduloDaRota(pathname);
  if (modulo && userRole !== 'ADMIN') {
    const modulos: string[] = Array.isArray(session.modulos)
      ? session.modulos
      : modulosPermitidos(userRole);
    if (!modulos.includes(modulo)) {
      const redirectUrl = new URL(getDefaultRouteForRole(userRole), request.url);
      redirectUrl.searchParams.set('unauthorized', 'true');
      return NextResponse.redirect(redirectUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
