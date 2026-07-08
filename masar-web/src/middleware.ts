import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySession } from './lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Paths that do not require authentication
  const isPublicPath = 
    pathname.startsWith('/login') || 
    pathname.startsWith('/signup') || 
    pathname.startsWith('/api/auth') || 
    pathname.startsWith('/api/health') || 
    pathname.startsWith('/api/seed') || 
    pathname.startsWith('/api/debug-env') || 
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

  // 1. Apenas ADMIN e FINANCEIRO acessam o DRE e a Tesouraria Societária
  if (pathname.startsWith('/socios') || pathname.startsWith('/financeiro')) {
    if (!['ADMIN', 'FINANCEIRO'].includes(userRole)) {
      const dashboardUrl = new URL('/', request.url);
      dashboardUrl.searchParams.set('unauthorized', 'true');
      return NextResponse.redirect(dashboardUrl);
    }
  }

  // 2. Apenas ADMIN, FINANCEIRO e ENGENHARIA acessam o apontamento de canteiro
  if (pathname.startsWith('/canteiro')) {
    if (!['ADMIN', 'FINANCEIRO', 'ENGENHARIA'].includes(userRole)) {
      const dashboardUrl = new URL('/', request.url);
      dashboardUrl.searchParams.set('unauthorized', 'true');
      return NextResponse.redirect(dashboardUrl);
    }
  }

  // 3. Apenas ADMIN acessa a tela de gerenciamento de usuários da equipe (/usuarios)
  if (pathname.startsWith('/usuarios')) {
    if (userRole !== 'ADMIN') {
      const dashboardUrl = new URL('/', request.url);
      dashboardUrl.searchParams.set('unauthorized', 'true');
      return NextResponse.redirect(dashboardUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
