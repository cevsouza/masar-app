import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, signSession } from '@/lib/auth';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const traceId = crypto.randomUUID();
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'E-mail e senha são obrigatórios.' }, { status: 400 });
    }

    logger.info('[Auth Cliente] Tentativa de login no Portal do Cliente', { traceId, email });

    // Buscar usuário cliente
    const clientUser = await db.usuarioCliente.findUnique({
      where: { email },
      include: {
        cliente: true
      }
    });

    if (!clientUser) {
      logger.warn('[Auth Cliente] E-mail do cliente não cadastrado', { traceId, email });
      return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 401 });
    }

    // Verificar senha hashed
    const hashed = await hashPassword(password);
    if (hashed !== clientUser.password) {
      logger.warn('[Auth Cliente] Senha incorreta fornecida', { traceId, email });
      return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 401 });
    }

    // Gerar token
    const token = await signSession({
      id: clientUser.id,
      clienteId: clientUser.clienteId,
      nome: clientUser.cliente.nome,
      email: clientUser.email,
      role: 'CLIENT'
    });

    const response = NextResponse.json({
      success: true,
      nome: clientUser.cliente.nome
    });

    // Definir cookie seguro
    response.cookies.set('masar_client_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 // 24 horas
    });

    logger.info(`[Auth Cliente] Login bem-sucedido para o cliente ${clientUser.cliente.nome}`, { traceId });

    return response;
  } catch (error: any) {
    logger.error('[Auth Cliente] Erro no login do cliente', error);
    return NextResponse.json({ error: 'Erro interno do servidor', message: error.message }, { status: 500 });
  }
}
