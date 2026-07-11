import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/auth';
import { logMutation } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('masar_session')?.value;
    const session = sessionToken ? await verifySession(sessionToken) : null;
    if (!session || !['ADMIN', 'FINANCEIRO'].includes(session.role || '')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { nome, percentualCotas } = body;

    if (!nome || percentualCotas === undefined || percentualCotas === null) {
      return NextResponse.json({ error: 'Nome e percentual de cotas são obrigatórios.' }, { status: 400 });
    }

    const percentual = parseFloat(percentualCotas);
    if (isNaN(percentual) || percentual < 0 || percentual > 100) {
      return NextResponse.json({ error: 'Percentual de cotas deve estar entre 0 e 100.' }, { status: 400 });
    }

    const socio = await db.socio.create({
      data: { nome, percentualCotas: percentual }
    });

    await logMutation({
      usuarioId: session.userId,
      usuarioNome: session.nome,
      acao: 'CREATE',
      tabela: 'Socio',
      registroId: socio.id,
      valoresNovos: socio
    });

    return NextResponse.json(socio, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao criar sócio:', error);
    return NextResponse.json({ error: 'Erro interno do servidor', message: error.message }, { status: 500 });
  }
}
