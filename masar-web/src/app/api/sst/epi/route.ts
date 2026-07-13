import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const trabalhadorId = searchParams.get('trabalhadorId');
    if (!trabalhadorId) {
      return NextResponse.json({ error: 'trabalhadorId é obrigatório' }, { status: 400 });
    }
    const epis = await db.entregaEPI.findMany({
      where: { trabalhadorId },
      orderBy: { dataEntrega: 'desc' },
    });
    return NextResponse.json(epis);
  } catch (error) {
    console.error('Erro ao listar EPIs:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('masar_session')?.value;
    const session = sessionToken ? await verifySession(sessionToken) : null;
    if (!session || !['ADMIN', 'FINANCEIRO', 'ENGENHARIA'].includes(session.role || '')) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }

    const body = await request.json();
    const { trabalhadorId, equipamento, ca, quantidade, dataEntrega, dataValidade, observacoes } = body;

    if (!trabalhadorId || !equipamento?.trim() || !dataEntrega) {
      return NextResponse.json({ error: 'Trabalhador, equipamento e data de entrega são obrigatórios.' }, { status: 400 });
    }

    const qtd = parseInt(quantidade, 10);

    const epi = await db.entregaEPI.create({
      data: {
        trabalhadorId,
        equipamento: equipamento.trim(),
        ca: ca?.trim() || null,
        quantidade: Number.isNaN(qtd) || qtd < 1 ? 1 : qtd,
        dataEntrega: new Date(dataEntrega),
        dataValidade: dataValidade ? new Date(dataValidade) : null,
        observacoes: observacoes?.trim() || null,
      },
    });
    return NextResponse.json(epi, { status: 201 });
  } catch (error) {
    console.error('Erro ao registrar EPI:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
