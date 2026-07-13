import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { seedEficiencia, limparSeed } from '@/lib/seedEficiencia';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Popula dados de DEMONSTRAÇÃO ("[SEED] ...") para exercitar os indicadores de
// eficiência. Idempotente. Só ADMIN. (/api/seed é público no middleware — a
// checagem de ADMIN é feita aqui dentro.)
export async function POST(request: NextRequest) {
  const token = request.cookies.get('masar_session')?.value;
  const session = token ? await verifySession(token) : null;
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Acesso negado: apenas administradores' }, { status: 403 });
  }
  const resumo = await seedEficiencia();
  return NextResponse.json({ ok: true, ...resumo });
}

// Remove os dados de demonstração.
export async function DELETE(request: NextRequest) {
  const token = request.cookies.get('masar_session')?.value;
  const session = token ? await verifySession(token) : null;
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Acesso negado: apenas administradores' }, { status: 403 });
  }
  await limparSeed();
  return NextResponse.json({ ok: true });
}
