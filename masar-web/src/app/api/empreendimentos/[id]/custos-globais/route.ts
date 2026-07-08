import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logMutation } from '@/lib/audit';
import { verifySession } from '@/lib/auth';
import { TipoCustoGlobal } from '@prisma/client';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sessionToken = request.cookies.get('masar_session')?.value;
    const session = sessionToken ? await verifySession(sessionToken) : null;
    if (!session || !['ADMIN', 'FINANCEIRO'].includes(session.role || '')) {
      return NextResponse.json({ error: 'Acesso negado: Apenas administradores ou financeiro podem registrar custos globais.' }, { status: 403 });
    }

    const project = await db.empreendimento.findUnique({
      where: { id }
    });

    if (!project) {
      return NextResponse.json({ error: 'Empreendimento não encontrado.' }, { status: 404 });
    }

    const body = await request.json();
    const { descricao, tipo, valor, data } = body;

    if (!descricao || !tipo || !valor) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes: descricao, tipo, valor.' }, { status: 400 });
    }

    // Certifique-se de que o tipo é um valor enum válido
    if (!Object.values(TipoCustoGlobal).includes(tipo)) {
      return NextResponse.json({ error: 'Tipo de custo global inválido.' }, { status: 400 });
    }

    const newCost = await db.custoGlobal.create({
      data: {
        descricao,
        tipo: tipo as TipoCustoGlobal,
        valor: parseFloat(valor),
        data: data ? new Date(data) : new Date(),
        empreendimentoId: id
      }
    });

    await logMutation({
      usuarioId: session.userId,
      usuarioNome: session.nome,
      acao: 'CREATE',
      tabela: 'CustoGlobal',
      registroId: newCost.id,
      valoresAntigos: null,
      valoresNovos: newCost
    });

    return NextResponse.json(newCost);
  } catch (error: any) {
    console.error('Erro ao adicionar custo global:', error);
    return NextResponse.json({ error: 'Erro interno do servidor', message: error.message }, { status: 500 });
  }
}
