import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const ROLES = ['ADMIN', 'FINANCEIRO', 'ENGENHARIA'];

async function auth(request: NextRequest) {
  const token = request.cookies.get('masar_session')?.value;
  const session = token ? await verifySession(token) : null;
  if (!session || !ROLES.includes(session.role)) return null;
  return session;
}

// DDS — Diálogo Diário de Segurança (Fase 3.3).
export async function GET(request: NextRequest) {
  if (!(await auth(request))) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  const { searchParams } = new URL(request.url);
  const empreendimentoId = searchParams.get('empreendimentoId') || undefined;
  const registros = await db.dialogoSeguranca.findMany({
    where: empreendimentoId ? { empreendimentoId } : {},
    include: { empreendimento: { select: { nome: true } }, casa: { select: { numero: true, quadra: true } } },
    orderBy: { data: 'desc' },
  });
  return NextResponse.json(registros);
}

export async function POST(request: NextRequest) {
  if (!(await auth(request))) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  const b = await request.json();
  if (!b.tema || !b.responsavel) {
    return NextResponse.json({ error: 'Tema e responsável são obrigatórios' }, { status: 400 });
  }
  const registro = await db.dialogoSeguranca.create({
    data: {
      tema: b.tema,
      responsavel: b.responsavel,
      data: b.data ? new Date(b.data) : new Date(),
      participantes: b.participantes ?? undefined,
      observacoes: b.observacoes || null,
      empreendimentoId: b.empreendimentoId || null,
      casaId: b.casaId || null,
    },
  });
  return NextResponse.json(registro, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  if (!(await auth(request))) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });
  await db.dialogoSeguranca.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
