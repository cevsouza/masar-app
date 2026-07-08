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
    pathname.includes('.') || // static assets like favicon, images, etc.
    pathname.startsWith('/_next'); // internal next files

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
    // Expire the invalid cookie
    const response = NextResponse.redirect(loginUrl);
    response.cookies.set('masar_session', '', { maxAge: 0 });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
