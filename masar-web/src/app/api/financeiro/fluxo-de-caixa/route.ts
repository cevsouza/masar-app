import { NextRequest, NextResponse } from 'next/server';
import { calcularFluxoCaixaProjetado } from '@/lib/cashFlowService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
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
