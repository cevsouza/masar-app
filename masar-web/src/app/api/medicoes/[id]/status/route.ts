import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status || !['AGUARDANDO', 'PAGA', 'GLOSADA_REPROVADA'].includes(status)) {
      return NextResponse.json({ error: 'Status inválido' }, { status: 400 });
    }

    const medicao = await db.medicaoCaixa.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json(medicao);
  } catch (error) {
    console.error('Erro ao atualizar status da medição:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
