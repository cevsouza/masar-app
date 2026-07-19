import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword, needsRehash, hashPassword } from '@/lib/auth';
import { assinarSessaoPlataforma, COOKIE_ADMIN } from '@/lib/plataforma';
import { logger } from '@/lib/logger';

/**
 * Login do CONTROL PLANE. Rota separada da do staff de propósito.
 *
 * Não existe cadastro por aqui: administrador de plataforma nasce só pelo
 * scripts/criar-admin-plataforma.mjs, que exige DATABASE_URL. Um endpoint de
 * auto-cadastro no control plane seria uma porta para virar dono de todos os
 * clientes de uma vez.
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Preencha todos os campos' }, { status: 400 });
    }

    const emailLower = String(email).toLowerCase().trim();
    const admin = await db.adminPlataforma.findUnique({ where: { email: emailLower } });

    // Mensagem única para e-mail inexistente, senha errada e conta desativada:
    // não entregamos a quem tenta a informação de quais contas existem.
    const generico = NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
    if (!admin || !admin.ativo) {
      logger.warn('[Plataforma] tentativa de login recusada', { email: emailLower });
      return generico;
    }

    if (!(await verifyPassword(password, admin.password))) {
      logger.warn('[Plataforma] senha incorreta', { email: emailLower });
      return generico;
    }

    if (needsRehash(admin.password)) {
      try {
        await db.adminPlataforma.update({
          where: { id: admin.id },
          data: { password: await hashPassword(password) },
        });
      } catch (e) {
        logger.error('[Plataforma] falha ao migrar hash (login não bloqueado)', e);
      }
    }

    await db.adminPlataforma.update({
      where: { id: admin.id },
      data: { ultimoAcesso: new Date() },
    });

    const token = await assinarSessaoPlataforma(admin);
    const response = NextResponse.json({ success: true, nome: admin.nome });

    response.cookies.set(COOKIE_ADMIN, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict', // control plane não precisa de navegação entre sites
      maxAge: 60 * 60 * 8, // 8h: sessão privilegiada expira mais rápido
      path: '/',
    });

    logger.info('[Plataforma] login', { adminId: admin.id, email: admin.email });
    return response;
  } catch (error: any) {
    logger.error('[Plataforma] erro no login', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(COOKIE_ADMIN, '', { maxAge: 0, path: '/' });
  return response;
}
