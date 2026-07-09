import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { registerFinancialTransaction } from '@/lib/transactions';

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

    const current = await db.medicaoCaixa.findUnique({
      where: { id },
      include: {
        casa: {
          include: {
            empreendimento: true
          }
        }
      }
    });

    if (!current) {
      return NextResponse.json({ error: 'Medição não encontrada' }, { status: 404 });
    }

    const medicao = await db.medicaoCaixa.update({
      where: { id },
      data: { status },
    });

    const isNewlyPaid = current.status !== 'PAGA' && status === 'PAGA';
    const isNewlyReverted = current.status === 'PAGA' && status !== 'PAGA';

    if (isNewlyPaid) {
      await registerFinancialTransaction(
        medicao.valorLiberado,
        'CREDITO',
        `Liberação Medição CEF - Lote Qd ${current.casa.quadra}, Casa ${current.casa.numero} | Projeto: ${current.casa.empreendimento.nome}`
      );
    } else if (isNewlyReverted) {
      await registerFinancialTransaction(
        medicao.valorLiberado,
        'DEBITO',
        `Estorno Medição CEF - Lote Qd ${current.casa.quadra}, Casa ${current.casa.numero} | Projeto: ${current.casa.empreendimento.nome}`
      );
    }

    return NextResponse.json(medicao);
  } catch (error) {
    console.error('Erro ao atualizar status da medição:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
