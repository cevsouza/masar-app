import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/auth';
import { TipoAcidente, GravidadeAcidente } from '@prisma/client';

export const dynamic = 'force-dynamic';

const ROLES = ['ADMIN', 'FINANCEIRO', 'ENGENHARIA'];

async function auth(request: NextRequest) {
  const token = request.cookies.get('masar_session')?.value;
  const session = token ? await verifySession(token) : null;
  if (!session || !ROLES.includes(session.role)) return null;
  return session;
}

// Acidentes / CAT (Fase 3.3).
export async function GET(request: NextRequest) {
  if (!(await auth(request))) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  const { searchParams } = new URL(request.url);
  const empreendimentoId = searchParams.get('empreendimentoId') || undefined;
  const registros = await db.acidente.findMany({
    where: empreendimentoId ? { empreendimentoId } : {},
    include: {
      trabalhador: { select: { nome: true, funcao: true } },
      empreendimento: { select: { nome: true } },
      casa: { select: { numero: true, quadra: true } },
    },
    orderBy: { data: 'desc' },
  });
  return NextResponse.json(registros);
}

export async function POST(request: NextRequest) {
  if (!(await auth(request))) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  const b = await request.json();
  if (!b.trabalhadorId || !b.descricao) {
    return NextResponse.json({ error: 'Trabalhador e descrição são obrigatórios' }, { status: 400 });
  }
  const tipo = (Object.values(TipoAcidente) as string[]).includes(b.tipo) ? b.tipo : 'TIPICO';
  const gravidade = (Object.values(GravidadeAcidente) as string[]).includes(b.gravidade) ? b.gravidade : 'LEVE';
  const registro = await db.acidente.create({
    data: {
      trabalhadorId: b.trabalhadorId,
      descricao: b.descricao,
      data: b.data ? new Date(b.data) : new Date(),
      tipo: tipo as TipoAcidente,
      gravidade: gravidade as GravidadeAcidente,
      parteCorpo: b.parteCorpo || null,
      diasAfastamento: Number.isFinite(b.diasAfastamento) ? Math.max(0, Math.trunc(b.diasAfastamento)) : 0,
      catEmitida: !!b.catEmitida,
      numeroCat: b.numeroCat || null,
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
  await db.acidente.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
