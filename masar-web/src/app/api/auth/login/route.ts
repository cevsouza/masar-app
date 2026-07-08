import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, signSession } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Preencha todos os campos' }, { status: 400 });
    }

    const emailLower = email.toLowerCase().trim();

    // Find user
    const user = await db.user.findUnique({
      where: { email: emailLower },
    });

    if (!user) {
      return NextResponse.json({ error: 'E-mail ou senha incorretos' }, { status: 400 });
    }

    // Verify password
    const hashedInputPassword = await hashPassword(password);
    if (user.password !== hashedInputPassword) {
      return NextResponse.json({ error: 'E-mail ou senha incorretos' }, { status: 400 });
    }

    // Create session token
    const token = await signSession({
      userId: user.id,
      email: user.email,
      nome: user.nome,
      role: user.role,
    });

    // Save token in cookie
    const cookieStore = await cookies();
    cookieStore.set('masar_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return NextResponse.json({
      id: user.id,
      nome: user.nome,
      email: user.email,
    });
  } catch (error) {
    console.error('Erro no login:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
