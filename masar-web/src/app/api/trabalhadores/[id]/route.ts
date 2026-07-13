import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { parseTrabalhadorBody } from '@/lib/trabalhador';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const trabalhador = await db.trabalhador.findUnique({
      where: { id },
      include: { pontos: { orderBy: { dataRegistro: 'desc' }, take: 20 } },
    });
    if (!trabalhador) {
      return NextResponse.json({ error: 'Trabalhador não encontrado' }, { status: 404 });
    }
    return NextResponse.json(trabalhador);
  } catch (error) {
    console.error('Erro ao buscar trabalhador:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = parseTrabalhadorBody(body);

    if (!data.nome) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
    }

    const atual = await db.trabalhador.findUnique({ where: { id } });
    if (!atual) {
      return NextResponse.json({ error: 'Trabalhador não encontrado' }, { status: 404 });
    }

    if (data.cpf && data.cpf !== atual.cpf) {
      const existe = await db.trabalhador.findUnique({ where: { cpf: data.cpf } });
      if (existe && existe.id !== id) {
        return NextResponse.json({ error: 'Já existe um trabalhador com este CPF' }, { status: 400 });
      }
    }

    const ativo = typeof body.ativo === 'boolean' ? body.ativo : atual.ativo;

    const trabalhador = await db.trabalhador.update({
      where: { id },
      data: { ...data, ativo },
    });
    return NextResponse.json(trabalhador);
  } catch (error) {
    console.error('Erro ao atualizar trabalhador:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// Soft-delete: inativa o trabalhador preservando o histórico de ponto.
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const atual = await db.trabalhador.findUnique({ where: { id } });
    if (!atual) {
      return NextResponse.json({ error: 'Trabalhador não encontrado' }, { status: 404 });
    }
    await db.trabalhador.update({ where: { id }, data: { ativo: false } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Erro ao inativar trabalhador:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
