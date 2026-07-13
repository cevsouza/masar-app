import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { calcularEficienciaMaterial } from '@/lib/eficiencia';

export const dynamic = 'force-dynamic';

// Eficiência de material: Previsto × Realizado por insumo (Fase 6.1).
// Escopo por empreendimento e/ou casa. Cruza quantidade planejada × consumida
// (estoque) e custo previsto × realizado (despesas).
export async function GET(request: NextRequest) {
  const sessionToken = request.cookies.get('masar_session')?.value;
  const session = sessionToken ? await verifySession(sessionToken) : null;
  if (!session || !['ADMIN', 'FINANCEIRO'].includes(session.role)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const empreendimentoId = searchParams.get('empreendimentoId') || undefined;
  const casaId = searchParams.get('casaId') || undefined;

  const resultado = await calcularEficienciaMaterial({ empreendimentoId, casaId });
  return NextResponse.json(resultado);
}
