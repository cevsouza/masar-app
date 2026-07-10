import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/auth';
import { logMutation } from '@/lib/audit';

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('masar_session')?.value;
    const session = sessionToken ? await verifySession(sessionToken) : null;
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const empId = searchParams.get('empreendimentoId');
    const casaId = searchParams.get('casaId');
    const escopo = searchParams.get('escopo');

    const where: any = {};
    if (empId) where.empreendimentoId = empId;
    if (casaId) where.casaId = casaId;
    if (escopo) where.escopo = escopo;

    const atividades = await db.atividadeCronograma.findMany({
      where,
      include: {
        empreendimento: { select: { nome: true } },
        casa: { select: { numero: true, quadra: true } }
      },
      orderBy: [{ ordem: 'asc' }, { dataInicioPrevista: 'asc' }]
    });

    return NextResponse.json(atividades);
  } catch (error: any) {
    console.error('Erro ao buscar atividades de cronograma:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('masar_session')?.value;
    const session = sessionToken ? await verifySession(sessionToken) : null;
    if (!session || !['ADMIN', 'ENGENHARIA'].includes(session.role)) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const {
      titulo, descricao, escopo, status, ordem,
      dataInicioPrevista, dataFimPrevista,
      empreendimentoId, casaId
    } = body;

    if (!titulo || !escopo || !dataInicioPrevista || !dataFimPrevista || !empreendimentoId) {
      return NextResponse.json({ error: 'Título, escopo, datas previstas e empreendimento são obrigatórios.' }, { status: 400 });
    }

    if (escopo === 'LOTE' && !casaId) {
      return NextResponse.json({ error: 'Uma casa/lote deve ser selecionada para o escopo LOTE.' }, { status: 400 });
    }

    const atividade = await db.atividadeCronograma.create({
      data: {
        titulo,
        descricao: descricao || null,
        escopo,
        status: status || 'BACKLOG',
        ordem: typeof ordem === 'number' ? ordem : 0,
        dataInicioPrevista: new Date(dataInicioPrevista),
        dataFimPrevista: new Date(dataFimPrevista),
        empreendimentoId,
        casaId: escopo === 'LOTE' ? casaId : null
      }
    });

    await logMutation({
      usuarioId: session.userId,
      usuarioNome: session.nome,
      acao: 'CREATE',
      tabela: 'AtividadeCronograma',
      registroId: atividade.id,
      valoresNovos: atividade
    });

    return NextResponse.json(atividade);
  } catch (error: any) {
    console.error('Erro ao criar atividade de cronograma:', error);
    return NextResponse.json({ error: 'Erro interno do servidor', message: error.message }, { status: 500 });
  }
}
