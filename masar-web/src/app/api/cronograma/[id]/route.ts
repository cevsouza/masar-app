import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/auth';
import { logMutation } from '@/lib/audit';

const STAGES = [
  'BACKLOG', 'APROVACOES', 'INFRAESTRUTURA', 'SUPRAESTRUTURA',
  'INSTALACOES', 'ACABAMENTO', 'VISTORIA_CAIXA', 'CARTORIO', 'VISITAS', 'CONCLUIDA'
];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sessionToken = request.cookies.get('masar_session')?.value;
    const session = sessionToken ? await verifySession(sessionToken) : null;
    if (!session || !['ADMIN', 'ENGENHARIA'].includes(session.role)) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const current = await db.atividadeCronograma.findUnique({ where: { id } });
    if (!current) {
      return NextResponse.json({ error: 'Atividade não encontrada' }, { status: 404 });
    }

    const body = await request.json();
    const {
      titulo, descricao, status, ordem,
      dataInicioPrevista, dataFimPrevista,
      percentualConcluido
    } = body;

    const data: any = {};
    if (titulo !== undefined) data.titulo = titulo;
    if (descricao !== undefined) data.descricao = descricao;
    if (ordem !== undefined) data.ordem = ordem;
    if (dataInicioPrevista !== undefined) data.dataInicioPrevista = new Date(dataInicioPrevista);
    if (dataFimPrevista !== undefined) data.dataFimPrevista = new Date(dataFimPrevista);
    if (percentualConcluido !== undefined) data.percentualConcluido = percentualConcluido;

    if (status !== undefined && STAGES.includes(status)) {
      data.status = status;
      if (!current.dataInicioReal && status !== 'BACKLOG') {
        data.dataInicioReal = new Date();
      }
      if (status === 'CONCLUIDA') {
        data.dataFimReal = new Date();
        data.percentualConcluido = 100;
      } else if (current.status === 'CONCLUIDA') {
        data.dataFimReal = null;
      }
    }

    const updated = await db.atividadeCronograma.update({ where: { id }, data });

    await logMutation({
      usuarioId: session.userId,
      usuarioNome: session.nome,
      acao: 'UPDATE',
      tabela: 'AtividadeCronograma',
      registroId: id,
      valoresAntigos: current,
      valoresNovos: updated
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Erro ao atualizar atividade de cronograma:', error);
    return NextResponse.json({ error: 'Erro interno do servidor', message: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sessionToken = request.cookies.get('masar_session')?.value;
    const session = sessionToken ? await verifySession(sessionToken) : null;
    if (!session || !['ADMIN', 'ENGENHARIA'].includes(session.role)) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const current = await db.atividadeCronograma.findUnique({ where: { id } });
    if (!current) {
      return NextResponse.json({ error: 'Atividade não encontrada' }, { status: 404 });
    }

    await db.atividadeCronograma.delete({ where: { id } });

    await logMutation({
      usuarioId: session.userId,
      usuarioNome: session.nome,
      acao: 'DELETE',
      tabela: 'AtividadeCronograma',
      registroId: id,
      valoresAntigos: current
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao excluir atividade de cronograma:', error);
    return NextResponse.json({ error: 'Erro interno do servidor', message: error.message }, { status: 500 });
  }
}
