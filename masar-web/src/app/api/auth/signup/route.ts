import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, signSession } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nome, email, password } = body;

    if (!nome || !email || !password) {
      return NextResponse.json({ error: 'Preencha todos os campos' }, { status: 400 });
    }

    const emailLower = email.toLowerCase().trim();

    // Check if user already exists
    const userExists = await db.user.findUnique({
      where: { email: emailLower },
    });

    if (userExists) {
      return NextResponse.json({ error: 'E-mail já cadastrado' }, { status: 400 });
    }

    // Hash password and create user
    const hashedPassword = await hashPassword(password);
    const user = await db.user.create({
      data: {
        nome,
        email: emailLower,
        password: hashedPassword,
      },
    });

    // Create session token
    const token = await signSession({
      userId: user.id,
      email: user.email,
      nome: user.nome,
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
    }, { status: 201 });
  } catch (error) {
    console.error('Erro no cadastro:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
