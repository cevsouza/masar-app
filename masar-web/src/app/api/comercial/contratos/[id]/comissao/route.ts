import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contratoId } = await params;
    const body = await request.json();
    const { comissaoPaga } = body;

    if (comissaoPaga === undefined) {
      return NextResponse.json({ error: 'Status comissaoPaga é obrigatório' }, { status: 400 });
    }

    const contrato = await db.contratoVenda.findUnique({
      where: { id: contratoId }
    });

    if (!contrato) {
      return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 });
    }

    // Trava de Comissão: Comissão do Corretor só pode ser alterada para "Paga" se o Contrato estiver ASSINADO_CAIXA
    if (comissaoPaga && contrato.status !== 'ASSINADO_CAIXA') {
      return NextResponse.json({ 
        error: `Bloqueio de Comissão: O pagamento de comissão (R$ ${contrato.comissaoValor.toFixed(2)}) só pode ser efetuado se o contrato de financiamento estiver assinado de fato com a Caixa (status ASSINADO CAIXA). Status atual: ${contrato.status.replace('_', ' ')}.` 
      }, { status: 400 });
    }

    const updatedContrato = await db.contratoVenda.update({
      where: { id: contratoId },
      data: { comissaoPaga: Boolean(comissaoPaga) }
    });

    // Se a comissão foi paga, debitar do saldo bancário principal
    if (comissaoPaga && !contrato.comissaoPaga) {
      const conta = await db.contaBancaria.findFirst();
      if (conta) {
        await db.contaBancaria.update({
          where: { id: conta.id },
          data: { saldoAtual: { decrement: contrato.comissaoValor } }
        });
      }
    }

    return NextResponse.json(updatedContrato);
  } catch (error) {
    console.error('Erro ao atualizar comissão:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
