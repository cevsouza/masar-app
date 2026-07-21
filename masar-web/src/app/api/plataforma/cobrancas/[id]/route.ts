import { NextRequest, NextResponse } from 'next/server';
import { atualizarCobranca, type StatusCobranca } from '@/lib/cobranca';

export const dynamic = 'force-dynamic';

const STATUS_VALIDOS: StatusCobranca[] = ['PENDENTE', 'PAGA', 'CANCELADA'];

// PATCH { status?, dataPagamento?, observacao? } → baixa ou cancelamento.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    if (body.status !== undefined && !STATUS_VALIDOS.includes(body.status)) {
      return NextResponse.json({ error: 'Status inválido.' }, { status: 400 });
    }

    await atualizarCobranca(id, {
      status: body.status,
      dataPagamento:
        body.dataPagamento === undefined
          ? undefined
          : body.dataPagamento
            ? new Date(body.dataPagamento)
            : null,
      observacao: body.observacao,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Falha ao atualizar cobrança' },
      { status: 400 },
    );
  }
}
