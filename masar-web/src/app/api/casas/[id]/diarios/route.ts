import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: casaId } = await params;
    const body = await request.json();
    const { clima, efetivoTrabalhadores, atividadesExecutadas, ocorrencias } = body;

    if (!clima || !efetivoTrabalhadores || !atividadesExecutadas) {
      return NextResponse.json({ error: 'Clima, efetivo de trabalhadores e atividades executadas são obrigatórios' }, { status: 400 });
    }

    const validClimas = ['BOM', 'CHUVA', 'IMPRATICAVEL'];
    if (!validClimas.includes(clima)) {
      return NextResponse.json({ error: 'Clima inválido' }, { status: 400 });
    }

    const diario = await db.diarioDeObra.create({
      data: {
        casaId,
        clima,
        efetivoTrabalhadores: parseInt(efetivoTrabalhadores),
        atividadesExecutadas,
        ocorrencias: ocorrencias || '',
      }
    });

    return NextResponse.json(diario, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar diário de obra:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
