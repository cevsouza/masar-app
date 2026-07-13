import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySession } from './lib/auth';

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

  // 2. Apenas ADMIN e FINANCEIRO acessam o DRE, Tesouraria e Suprimentos
  if (pathname.startsWith('/socios') || pathname.startsWith('/financeiro') || pathname.startsWith('/suprimentos') || pathname.startsWith('/fornecedores') || pathname.startsWith('/fiscal')) {
    if (!['ADMIN', 'FINANCEIRO'].includes(userRole)) {
      const redirectUrl = new URL(getDefaultRouteForRole(userRole), request.url);
      redirectUrl.searchParams.set('unauthorized', 'true');
      return NextResponse.redirect(redirectUrl);
    }
  }

  // 3. Apenas ADMIN, FINANCEIRO e ENGENHARIA acessam projetos, casas, canteiro e agenda
  if (pathname.startsWith('/canteiro') || pathname.startsWith('/empreendimentos') || pathname.startsWith('/casas') || pathname.startsWith('/agenda') || pathname.startsWith('/trabalhadores')) {
    if (!['ADMIN', 'FINANCEIRO', 'ENGENHARIA'].includes(userRole)) {
      const redirectUrl = new URL(getDefaultRouteForRole(userRole), request.url);
      redirectUrl.searchParams.set('unauthorized', 'true');
      return NextResponse.redirect(redirectUrl);
    }
  }

  // 4. Apenas ADMIN, FINANCEIRO e COMERCIAL acessam a tela comercial (CRM)
  if (pathname.startsWith('/comercial')) {
    if (!['ADMIN', 'FINANCEIRO', 'COMERCIAL'].includes(userRole)) {
      const redirectUrl = new URL(getDefaultRouteForRole(userRole), request.url);
      redirectUrl.searchParams.set('unauthorized', 'true');
      return NextResponse.redirect(redirectUrl);
    }
  }

  // 5. Apenas ADMIN acessa a tela de gerenciamento de usuários da equipe (/usuarios)
  if (pathname.startsWith('/usuarios')) {
    if (userRole !== 'ADMIN') {
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
