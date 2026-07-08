import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
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
