import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { calcularFluxoCaixaSemanal } from '@/lib/fluxoProjetado';

export const dynamic = 'force-dynamic';

// Fluxo de caixa projetado — calendário semanal de obrigações datadas (Fase 6.4).
export async function GET(request: NextRequest) {
  const sessionToken = request.cookies.get('masar_session')?.value;
  const session = sessionToken ? await verifySession(sessionToken) : null;
  if (!session || !['ADMIN', 'FINANCEIRO'].includes(session.role)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const empreendimentoId = searchParams.get('empreendimentoId') || undefined;
  const semanasParam = parseInt(searchParams.get('semanas') || '', 10);

  const resultado = await calcularFluxoCaixaSemanal({
    empreendimentoId,
    semanas: Number.isFinite(semanasParam) ? semanasParam : undefined,
  });
  return NextResponse.json(resultado);
}
