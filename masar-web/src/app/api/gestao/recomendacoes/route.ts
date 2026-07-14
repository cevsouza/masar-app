import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { gerarRecomendacoes } from '@/lib/recomendacoes';

export const dynamic = 'force-dynamic';

// GET: recomendações prescritivas priorizadas (Consultor de Eficiência, Fase 7.1).
export async function GET(request: NextRequest) {
  const sessionToken = request.cookies.get('masar_session')?.value;
  const session = sessionToken ? await verifySession(sessionToken) : null;
  if (!session || !['ADMIN', 'FINANCEIRO'].includes(session.role)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }
  const resultado = await gerarRecomendacoes();
  return NextResponse.json(resultado);
}
