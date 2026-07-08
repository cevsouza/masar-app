import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { numero, quadra, empreendimentoId, statusObra, percentualObra } = body;

    if (!numero || !quadra || !empreendimentoId) {
      return NextResponse.json({ error: 'Número, quadra e ID do empreendimento são obrigatórios' }, { status: 400 });
    }

    const validStatuses = ['SEM_INICIO', 'FUNDACAO', 'ALVENARIA', 'COBERTURA', 'ACABAMENTO', 'CONCLUIDA'];
    const statusObraValido = statusObra && validStatuses.includes(statusObra) 
      ? statusObra 
      : 'SEM_INICIO';

    const percentualFloat = percentualObra ? parseFloat(percentualObra) : 0.0;

    const casa = await db.casa.create({
      data: {
        numero,
        quadra,
        empreendimentoId,
        statusObra: statusObraValido,
        percentualObra: percentualFloat,
      },
    });

    return NextResponse.json(casa, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar casa:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
