import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: empreendimentoId } = await params;

    const marcos = await db.marcoBurocratico.findMany({
      where: { empreendimentoId },
      orderBy: { dataProtocolo: 'asc' },
    });

    return NextResponse.json(marcos);
  } catch (error) {
    console.error('Erro ao buscar marcos burocráticos:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: empreendimentoId } = await params;
    const body = await request.json();
    const { tipo, dataProtocolo, prazoEsperadoDias, dataAprovacaoReal } = body;

    if (!tipo || !dataProtocolo || !prazoEsperadoDias) {
      return NextResponse.json({ error: 'Tipo, data de protocolo e prazo esperado são obrigatórios' }, { status: 400 });
    }

    const validTipos = ['ALVARA_PREFEITURA', 'PROJETO_CAIXA', 'HABITESE', 'CND_RECEITA'];
    if (!validTipos.includes(tipo)) {
      return NextResponse.json({ error: 'Tipo de marco burocrático inválido' }, { status: 400 });
    }

    const marco = await db.marcoBurocratico.create({
      data: {
        empreendimentoId,
        tipo,
        dataProtocolo: new Date(dataProtocolo),
        prazoEsperadoDias: parseInt(prazoEsperadoDias),
        dataAprovacaoReal: dataAprovacaoReal ? new Date(dataAprovacaoReal) : null,
      },
    });

    return NextResponse.json(marco, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar marco burocrático:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
