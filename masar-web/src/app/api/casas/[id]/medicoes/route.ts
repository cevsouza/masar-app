import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const casaId = id;
    const body = await request.json();
    const { percentualMedido, valorLiberado, status } = body;

    const percentualFloat = parseFloat(percentualMedido);
    if (isNaN(percentualFloat) || percentualFloat < 0 || percentualFloat > 100) {
      return NextResponse.json({ error: 'Percentual medido inválido (deve ser entre 0 e 100)' }, { status: 400 });
    }

    const valorFloat = parseFloat(valorLiberado);
    if (isNaN(valorFloat) || valorFloat < 0) {
      return NextResponse.json({ error: 'Valor liberado inválido' }, { status: 400 });
    }

    const statusValido = status && ['AGUARDANDO', 'PAGA', 'GLOSADA_REPROVADA'].includes(status) 
      ? status 
      : 'AGUARDANDO';

    const medicao = await db.medicaoCaixa.create({
      data: {
        casaId,
        percentualMedido: percentualFloat,
        valorLiberado: valorFloat,
        status: statusValido,
        dataMedicao: new Date(),
      },
    });

    return NextResponse.json(medicao, { status: 201 });
  } catch (error) {
    console.error('Erro ao registrar medição da Caixa:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
