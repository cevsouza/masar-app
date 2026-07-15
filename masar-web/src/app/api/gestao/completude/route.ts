import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { calcularCompletude } from '@/lib/completude';

export const dynamic = 'force-dynamic';

// GET: completude do cadastro por empreendimento + cadastros base (Fase 8.1).
export async function GET(request: NextRequest) {
  const token = request.cookies.get('masar_session')?.value;
  const session = token ? await verifySession(token) : null;
  if (!session || !['ADMIN', 'FINANCEIRO'].includes(session.role)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const resultado = await calcularCompletude();
  return NextResponse.json(resultado);
}
