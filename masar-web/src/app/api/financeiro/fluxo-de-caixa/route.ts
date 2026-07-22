import { NextRequest, NextResponse } from 'next/server';
import { calcularFluxoCaixaProjetado } from '@/lib/cashFlowService';
import { exigirAcesso } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await exigirAcesso(request, { modulo: 'financeiro' });
  if (!auth.ok) return auth.resposta;

  try {
    const { searchParams } = new URL(request.url);
    const empreendimentoId = searchParams.get('empreendimentoId') || undefined;

    const data = await calcularFluxoCaixaProjetado(empreendimentoId);

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Erro ao calcular fluxo de caixa projetado:', error);
    return NextResponse.json({ error: 'Erro interno do servidor', message: error.message }, { status: 500 });
  }
}
