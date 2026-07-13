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

// Checklists de NR (Fase 3.3).
export async function GET(request: NextRequest) {
  if (!(await auth(request))) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  const { searchParams } = new URL(request.url);
  const empreendimentoId = searchParams.get('empreendimentoId') || undefined;
  const registros = await db.checklistNR.findMany({
    where: empreendimentoId ? { empreendimentoId } : {},
    include: { empreendimento: { select: { nome: true } }, casa: { select: { numero: true, quadra: true } } },
    orderBy: { data: 'desc' },
  });
  return NextResponse.json(registros);
}

export async function POST(request: NextRequest) {
  if (!(await auth(request))) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  const b = await request.json();
  if (!b.norma || !b.responsavel) {
    return NextResponse.json({ error: 'Norma e responsável são obrigatórios' }, { status: 400 });
  }
  const registro = await db.checklistNR.create({
    data: {
      norma: b.norma,
      responsavel: b.responsavel,
      data: b.data ? new Date(b.data) : new Date(),
      itens: Array.isArray(b.itens) ? b.itens : undefined,
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
  await db.checklistNR.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
