import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { calcularDriftLinhaBase, congelarLinhaBase, congelarLinhaBaseEmpreendimento } from '@/lib/linhaBase';

export const dynamic = 'force-dynamic';

// GET: drift do plano atual vs linha de base congelada (Fase 6.2b).
export async function GET(request: NextRequest) {
  const sessionToken = request.cookies.get('masar_session')?.value;
  const session = sessionToken ? await verifySession(sessionToken) : null;
  if (!session || !['ADMIN', 'FINANCEIRO'].includes(session.role)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }
  const { searchParams } = new URL(request.url);
  const empreendimentoId = searchParams.get('empreendimentoId') || undefined;
  const resultado = await calcularDriftLinhaBase({ empreendimentoId });
  return NextResponse.json(resultado);
}

// POST: congela a linha de base de uma casa ({casaId}) ou de todas as casas de
// um empreendimento ({empreendimentoId}). Somente ADMIN.
export async function POST(request: NextRequest) {
  const sessionToken = request.cookies.get('masar_session')?.value;
  const session = sessionToken ? await verifySession(sessionToken) : null;
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Acesso negado: apenas administradores' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  try {
    if (body.casaId) {
      const base = await congelarLinhaBase(body.casaId);
      return NextResponse.json({ congeladas: 1, casaId: base.casaId });
    }
    if (body.empreendimentoId) {
      const n = await congelarLinhaBaseEmpreendimento(body.empreendimentoId);
      return NextResponse.json({ congeladas: n });
    }
    return NextResponse.json({ error: 'Informe casaId ou empreendimentoId' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erro ao congelar linha de base' }, { status: 400 });
  }
}
