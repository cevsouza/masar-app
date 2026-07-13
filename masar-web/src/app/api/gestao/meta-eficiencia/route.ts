import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/auth';
import { avaliarMetas, getMetaEficiencia } from '@/lib/metaEficiencia';

export const dynamic = 'force-dynamic';

// GET: avaliação diária (metas + status + violações + indicadores). Fase 6.5.
export async function GET(request: NextRequest) {
  const sessionToken = request.cookies.get('masar_session')?.value;
  const session = sessionToken ? await verifySession(sessionToken) : null;
  if (!session || !['ADMIN', 'FINANCEIRO'].includes(session.role)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }
  const avaliacao = await avaliarMetas();
  return NextResponse.json(avaliacao);
}

// PATCH: atualiza as metas (somente ADMIN).
export async function PATCH(request: NextRequest) {
  const sessionToken = request.cookies.get('masar_session')?.value;
  const session = sessionToken ? await verifySession(sessionToken) : null;
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Acesso negado: apenas administradores' }, { status: 403 });
  }

  await getMetaEficiencia(); // garante o registro default
  const body = await request.json();
  const data: any = {};
  if (typeof body.cpiMinimo === 'number' && body.cpiMinimo >= 0) data.cpiMinimo = body.cpiMinimo;
  if (typeof body.spiMinimo === 'number' && body.spiMinimo >= 0) data.spiMinimo = body.spiMinimo;
  if (Number.isInteger(body.maxInsumosEstouro) && body.maxInsumosEstouro >= 0) data.maxInsumosEstouro = body.maxInsumosEstouro;
  if (typeof body.alertarRuptura === 'boolean') data.alertarRuptura = body.alertarRuptura;

  const meta = await db.metaEficiencia.update({ where: { id: 'default' }, data });
  return NextResponse.json(meta);
}
