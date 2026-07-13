import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/auth';

const TIPOS = ['ADMISSIONAL', 'PERIODICO', 'RETORNO_AO_TRABALHO', 'MUDANCA_DE_FUNCAO', 'DEMISSIONAL'];
const RESULTADOS = ['APTO', 'APTO_COM_RESTRICAO', 'INAPTO'];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const trabalhadorId = searchParams.get('trabalhadorId');
    if (!trabalhadorId) {
      return NextResponse.json({ error: 'trabalhadorId é obrigatório' }, { status: 400 });
    }
    const asos = await db.aSO.findMany({
      where: { trabalhadorId },
      orderBy: { dataValidade: 'desc' },
    });
    return NextResponse.json(asos);
  } catch (error) {
    console.error('Erro ao listar ASOs:', error);
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
    const { trabalhadorId, tipo, dataRealizacao, dataValidade, resultado, medico, observacoes } = body;

    if (!trabalhadorId || !dataRealizacao || !dataValidade) {
      return NextResponse.json({ error: 'Trabalhador, data de realização e validade são obrigatórios.' }, { status: 400 });
    }

    const aso = await db.aSO.create({
      data: {
        trabalhadorId,
        tipo: TIPOS.includes(tipo) ? tipo : 'PERIODICO',
        dataRealizacao: new Date(dataRealizacao),
        dataValidade: new Date(dataValidade),
        resultado: RESULTADOS.includes(resultado) ? resultado : 'APTO',
        medico: medico?.trim() || null,
        observacoes: observacoes?.trim() || null,
      },
    });
    return NextResponse.json(aso, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar ASO:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
