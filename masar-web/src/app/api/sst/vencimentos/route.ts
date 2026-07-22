import { NextRequest, NextResponse } from 'next/server';
import { buscarVencimentosSST } from '@/lib/sst';
import { exigirAcesso } from '@/lib/apiAuth';

// GET: ASOs e EPIs vencidos ou a vencer (janela de 30 dias) dos trabalhadores ativos.
export async function GET(request: NextRequest) {
  const auth = await exigirAcesso(request, { modulo: 'seguranca' });
  if (!auth.ok) return auth.resposta;

  try {
    const v = await buscarVencimentosSST();
    return NextResponse.json({
      asos: v.asos,
      epis: v.epis,
      resumo: {
        asosVencidos: v.asosVencidos.length,
        asosAVencer: v.asosAVencer.length,
        episVencidos: v.episVencidos.length,
        episAVencer: v.episAVencer.length,
      },
    });
  } catch (error) {
    console.error('Erro ao buscar vencimentos SST:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
