import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { exigirAcesso } from '@/lib/apiAuth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await exigirAcesso(request, { modulo: 'obras' });
  if (!auth.ok) return auth.resposta;

  try {
    const { id } = await params;
    const body = await request.json();
    const { statusLegal } = body;

    const validStatuses = ['ESTUDO_VIABILIDADE', 'APROVACAO_PREFEITURA', 'APROVACAO_CAIXA', 'EM_OBRA'];
    if (!statusLegal || !validStatuses.includes(statusLegal)) {
      return NextResponse.json({ error: 'Status legal inválido' }, { status: 400 });
    }

    const empreendimento = await db.empreendimento.update({
      where: { id },
      data: { statusLegal },
    });

    return NextResponse.json(empreendimento);
  } catch (error) {
    console.error('Erro ao atualizar status do empreendimento:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
