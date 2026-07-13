import { NextResponse } from 'next/server';
import { calcularDreConsolidado } from '@/lib/dre';

export const dynamic = 'force-dynamic';

// DRE consolidado: soma o DRE de todos os empreendimentos + detalhamento por projeto.
export async function GET() {
  try {
    const { consolidado, porEmpreendimento } = await calcularDreConsolidado();
    return NextResponse.json({ ...consolidado, porEmpreendimento });
  } catch (error) {
    console.error('Erro ao calcular DRE consolidado:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
