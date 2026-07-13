import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { calcularEvm } from '@/lib/evm';

export const dynamic = 'force-dynamic';

// EVM — desempenho de custo e prazo por obra (Fase 6.2): CPI, SPI, EAC, prazo projetado.
export async function GET(request: NextRequest) {
  const sessionToken = request.cookies.get('masar_session')?.value;
  const session = sessionToken ? await verifySession(sessionToken) : null;
  if (!session || !['ADMIN', 'FINANCEIRO'].includes(session.role)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const empreendimentoId = searchParams.get('empreendimentoId') || undefined;

  const resultado = await calcularEvm({ empreendimentoId });
  return NextResponse.json(resultado);
}
