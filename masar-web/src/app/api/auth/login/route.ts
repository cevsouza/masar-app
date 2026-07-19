import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword, needsRehash, hashPassword, signSession } from '@/lib/auth';
import { computarModulosUsuario } from '@/lib/permissoesDb';
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

    // NÃO reintroduzir auto-promoção por e-mail aqui.
    // Havia um bloco que promovia a ADMIN qualquer conta com um e-mail fixo do
    // fornecedor — e rodava ANTES da verificação de senha. Numa instância de
    // cliente isso é um superusuário do fornecedor dentro do sistema do cliente.
    // A role vem do banco; o primeiro admin é criado por scripts/provisionar-cliente.mjs.

    // Verify password
    const passwordOk = await verifyPassword(password, user.password);
    if (!passwordOk) {
      return NextResponse.json({ error: 'E-mail ou senha incorretos' }, { status: 400 });
    }

    // Migração transparente: regrava hashes antigos/fracos no formato forte.
    if (needsRehash(user.password)) {
      try {
        const upgraded = await hashPassword(password);
        await db.user.update({ where: { id: user.id }, data: { password: upgraded } });
      } catch (rehashErr) {
        console.error('Falha ao migrar hash de senha (login não bloqueado):', rehashErr);
      }
    }

    // Módulos que o papel pode acessar (Fase 5.2) — gravados no token para o
    // middleware (edge) barrar por módulo sem tocar no banco.
    const modulos = await computarModulosUsuario(user.role);

    // Create session token
    const token = await signSession({
      userId: user.id,
      email: user.email,
      nome: user.nome,
      role: user.role,
      modulos,
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
