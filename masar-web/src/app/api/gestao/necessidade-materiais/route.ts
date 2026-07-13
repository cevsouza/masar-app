import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { calcularNecessidadeMateriais } from '@/lib/mrp';

export const dynamic = 'force-dynamic';

// Necessidade de materiais / MRP leve (Fase 6.3): quanto comprar para não faltar
// e o que está sobrando, cruzando plano × consumo × estoque × em pedido.
export async function GET(request: NextRequest) {
  const sessionToken = request.cookies.get('masar_session')?.value;
  const session = sessionToken ? await verifySession(sessionToken) : null;
  if (!session || !['ADMIN', 'FINANCEIRO'].includes(session.role)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const empreendimentoId = searchParams.get('empreendimentoId') || undefined;

  const resultado = await calcularNecessidadeMateriais({ empreendimentoId });
  return NextResponse.json(resultado);
}
