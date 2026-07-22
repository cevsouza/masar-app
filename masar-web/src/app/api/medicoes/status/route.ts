import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { exigirAcesso } from '@/lib/apiAuth';

export async function GET(request: NextRequest) {
  const auth = await exigirAcesso(request, { modulo: 'obras' });
  if (!auth.ok) return auth.resposta;

  try {
    const glosadasCount = await db.medicaoCaixa.count({
      where: {
        status: 'GLOSADA_REPROVADA',
      },
    });

    return NextResponse.json({ hasGlosa: glosadasCount > 0 });
  } catch (error) {
    console.error('Erro ao buscar status de glosas:', error);
    return NextResponse.json({ hasGlosa: false }, { status: 500 });
  }
}
