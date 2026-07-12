import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/auth';
import { logMutation } from '@/lib/audit';

// Aprovar (ou reabrir) um marco burocrático — usado pela Agenda de Prazos.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sessionToken = request.cookies.get('masar_session')?.value;
    const session = sessionToken ? await verifySession(sessionToken) : null;
    if (!session || !['ADMIN', 'FINANCEIRO', 'ENGENHARIA'].includes(session.role)) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const current = await db.marcoBurocratico.findUnique({ where: { id } });
    if (!current) {
      return NextResponse.json({ error: 'Marco não encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const { aprovado } = body;

    const updated = await db.marcoBurocratico.update({
      where: { id },
      data: {
        dataAprovacaoReal: aprovado === true ? new Date() : null
      }
    });

    await logMutation({
      usuarioId: session.userId,
      usuarioNome: session.nome,
      acao: 'UPDATE',
      tabela: 'MarcoBurocratico',
      registroId: id,
      valoresAntigos: current,
      valoresNovos: updated
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Erro ao atualizar marco burocrático:', error);
    return NextResponse.json({ error: 'Erro interno do servidor', message: error.message }, { status: 500 });
  }
}
