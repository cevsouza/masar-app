import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { statusObra, percentualObra } = body;

    const validStatuses = ['SEM_INICIO', 'FUNDACAO', 'ALVENARIA', 'COBERTURA', 'ACABAMENTO', 'CONCLUIDA'];
    if (!statusObra || !validStatuses.includes(statusObra)) {
      return NextResponse.json({ error: 'Status da obra inválido' }, { status: 400 });
    }

    const percentualFloat = parseFloat(percentualObra);
    if (isNaN(percentualFloat) || percentualFloat < 0 || percentualFloat > 100) {
      return NextResponse.json({ error: 'Percentual da obra inválido (deve ser entre 0 e 100)' }, { status: 400 });
    }

    const casa = await db.casa.update({
      where: { id },
      data: {
        statusObra,
        percentualObra: percentualFloat,
      },
    });

    return NextResponse.json(casa);
  } catch (error) {
    console.error('Erro ao evoluir obra da casa:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
