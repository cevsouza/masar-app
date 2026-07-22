import { NextRequest, NextResponse } from 'next/server';
import { calcularDre } from '@/lib/dre';
import { exigirAcesso } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

// DRE (projetado x realizado) de um empreendimento. A lógica vive em lib/dre.
export async function GET(request: NextRequest) {
  const auth = await exigirAcesso(request, { modulo: 'financeiro' });
  if (!auth.ok) return auth.resposta;

  try {
    const { searchParams } = new URL(request.url);
    const empreendimentoId = searchParams.get('empreendimentoId');

    if (!empreendimentoId) {
      return NextResponse.json({ error: 'ID do empreendimento é obrigatório' }, { status: 400 });
    }

    const dre = await calcularDre(empreendimentoId);
    if (!dre) {
      return NextResponse.json({ error: 'Empreendimento não encontrado' }, { status: 404 });
    }

    return NextResponse.json(dre);
  } catch (error) {
    console.error('Erro ao calcular DRE:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
