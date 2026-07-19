import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { parseTrabalhadorBody } from '@/lib/trabalhador';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const incluirInativos = searchParams.get('incluirInativos') === 'true';

    const trabalhadores = await db.trabalhador.findMany({
      where: incluirInativos ? undefined : { ativo: true },
      orderBy: { nome: 'asc' },
    });
    return NextResponse.json(trabalhadores);
  } catch (error) {
    console.error('Erro ao listar trabalhadores:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = parseTrabalhadorBody(body);

    if (!data.nome) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
    }

    if (data.cpf) {
      const existe = await db.trabalhador.findFirst({ where: { cpf: data.cpf } });
      if (existe) {
        return NextResponse.json({ error: 'Já existe um trabalhador com este CPF' }, { status: 400 });
      }
    }

    const trabalhador = await db.trabalhador.create({ data });
    return NextResponse.json(trabalhador, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar trabalhador:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
