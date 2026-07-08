import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';

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

    return NextResponse.json({
      authenticated: true,
      nome: session.nome,
      email: session.email,
      role: session.role || 'COMERCIAL',
    });
  } catch (error) {
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}
