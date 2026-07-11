import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/auth';
import { logMutation } from '@/lib/audit';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sessionToken = request.cookies.get('masar_session')?.value;
    const session = sessionToken ? await verifySession(sessionToken) : null;
    if (!session || !['ADMIN', 'FINANCEIRO'].includes(session.role || '')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const current = await db.socio.findUnique({ where: { id } });
    if (!current) {
      return NextResponse.json({ error: 'Sócio não encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const { nome, percentualCotas } = body;

    const data: any = {};
    if (nome !== undefined) data.nome = nome;
    if (percentualCotas !== undefined) {
      const percentual = parseFloat(percentualCotas);
      if (isNaN(percentual) || percentual < 0 || percentual > 100) {
        return NextResponse.json({ error: 'Percentual de cotas deve estar entre 0 e 100.' }, { status: 400 });
      }
      data.percentualCotas = percentual;
    }

    const updated = await db.socio.update({ where: { id }, data });

    await logMutation({
      usuarioId: session.userId,
      usuarioNome: session.nome,
      acao: 'UPDATE',
      tabela: 'Socio',
      registroId: id,
      valoresAntigos: current,
      valoresNovos: updated
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Erro ao atualizar sócio:', error);
    return NextResponse.json({ error: 'Erro interno do servidor', message: error.message }, { status: 500 });
  }
}
