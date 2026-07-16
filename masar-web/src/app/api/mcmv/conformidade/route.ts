import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { avaliarConformidade } from '@/lib/mcmv/conformidade';

// Checklist de conformidade MCMV avaliado de um empreendimento.
export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('masar_session')?.value;
    const session = sessionToken ? await verifySession(sessionToken) : null;
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const empreendimentoId = searchParams.get('empreendimentoId');
    if (!empreendimentoId) {
      return NextResponse.json({ error: 'empreendimentoId é obrigatório' }, { status: 400 });
    }

    const resultado = await avaliarConformidade(empreendimentoId);
    return NextResponse.json(resultado);
  } catch (error: any) {
    if (String(error?.message).includes('não encontrado')) {
      return NextResponse.json({ error: 'Empreendimento não encontrado' }, { status: 404 });
    }
    console.error('Erro ao avaliar conformidade MCMV:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
