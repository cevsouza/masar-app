import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { iaConfigurada, responderConsultor, type TurnoChat } from '@/lib/consultorIA';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// GET: informa se a IA conversacional está configurada (para a UI).
export async function GET(request: NextRequest) {
  const token = request.cookies.get('masar_session')?.value;
  const session = token ? await verifySession(token) : null;
  if (!session || !['ADMIN', 'FINANCEIRO'].includes(session.role)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }
  return NextResponse.json({ configurado: iaConfigurada() });
}

// POST: responde uma pergunta do sócio em linguagem natural (Fase 7.3).
export async function POST(request: NextRequest) {
  const token = request.cookies.get('masar_session')?.value;
  const session = token ? await verifySession(token) : null;
  if (!session || !['ADMIN', 'FINANCEIRO'].includes(session.role)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const pergunta = typeof body.pergunta === 'string' ? body.pergunta.trim() : '';
  if (!pergunta) {
    return NextResponse.json({ error: 'Pergunta vazia' }, { status: 400 });
  }
  const historico: TurnoChat[] = Array.isArray(body.historico)
    ? body.historico
        .filter((t: any) => t && (t.role === 'user' || t.role === 'model') && typeof t.text === 'string')
        .map((t: any) => ({ role: t.role, text: String(t.text).slice(0, 4000) }))
    : [];

  const resultado = await responderConsultor(pergunta.slice(0, 2000), historico);
  return NextResponse.json(resultado);
}
