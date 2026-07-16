import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/auth';
import { logMutation } from '@/lib/audit';

const STATUS_VALIDOS = ['PENDENTE', 'EM_ANDAMENTO', 'CONFORME', 'NAO_CONFORME', 'NAO_APLICAVEL'];

// Atualiza o ESTADO de um item de conformidade (status manual / N-A e observação).
// Itens AUTO/DOC têm o status recalculado na leitura — aqui só faz sentido para
// itens MANUAL ou para marcar qualquer item como NAO_APLICAVEL, além da observação.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const sessionToken = request.cookies.get('masar_session')?.value;
    const session = sessionToken ? await verifySession(sessionToken) : null;
    if (!session || !['ADMIN', 'ENGENHARIA'].includes(session.role)) {
      return NextResponse.json(
        { error: 'Acesso negado: apenas administradores ou engenharia podem atualizar a conformidade.' },
        { status: 403 },
      );
    }

    const current = await db.itemConformidadeMCMV.findUnique({ where: { id } });
    if (!current) {
      return NextResponse.json({ error: 'Item de conformidade não encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const { status, observacao } = body;

    const updateData: any = {};
    if (status !== undefined) {
      if (!STATUS_VALIDOS.includes(status)) {
        return NextResponse.json({ error: 'Status inválido' }, { status: 400 });
      }
      updateData.status = status;
    }
    if (observacao !== undefined) {
      updateData.observacao = observacao ? String(observacao).slice(0, 2000) : null;
    }
    updateData.dataVerificacao = new Date();
    updateData.verificadoPor = session.nome;

    const updated = await db.itemConformidadeMCMV.update({ where: { id }, data: updateData });

    await logMutation({
      usuarioId: session.userId,
      usuarioNome: session.nome,
      acao: 'UPDATE',
      tabela: 'ItemConformidadeMCMV',
      registroId: id,
      valoresAntigos: current,
      valoresNovos: updated,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Erro ao atualizar item de conformidade MCMV:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
