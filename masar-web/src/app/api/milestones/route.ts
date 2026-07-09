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
    const concluidoParam = searchParams.get('concluido');
    const empId = searchParams.get('empreendimentoId');
    const casaId = searchParams.get('casaId');

    const where: any = {};
    if (concluidoParam !== null) {
      where.concluido = concluidoParam === 'true';
    }
    if (empId) where.empreendimentoId = empId;
    if (casaId) where.casaId = casaId;

    const milestones = await db.milestone.findMany({
      where,
      include: {
        empreendimento: { select: { nome: true } },
        casa: { select: { numero: true, quadra: true } }
      },
      orderBy: { dataLimite: 'asc' }
    });

    return NextResponse.json(milestones);
  } catch (error: any) {
    console.error('Erro ao buscar milestones:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('masar_session')?.value;
    const session = sessionToken ? await verifySession(sessionToken) : null;
    if (!session || !['ADMIN', 'FINANCEIRO', 'ENGENHARIA'].includes(session.role)) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { titulo, descricao, categoria, dataLimite, empreendimentoId, casaId } = body;

    if (!titulo || !dataLimite) {
      return NextResponse.json({ error: 'Título e data limite são obrigatórios.' }, { status: 400 });
    }

    const milestone = await db.milestone.create({
      data: {
        titulo,
        descricao: descricao || null,
        categoria: categoria || 'PROJETO',
        dataLimite: new Date(dataLimite),
        empreendimentoId: empreendimentoId || null,
        casaId: casaId || null
      }
    });

    await logMutation({
      usuarioId: session.userId,
      usuarioNome: session.nome,
      acao: 'CREATE',
      tabela: 'Milestone',
      registroId: milestone.id,
      valoresNovos: milestone
    });

    return NextResponse.json(milestone);
  } catch (error: any) {
    console.error('Erro ao criar milestone:', error);
    return NextResponse.json({ error: 'Erro interno do servidor', message: error.message }, { status: 500 });
  }
}
