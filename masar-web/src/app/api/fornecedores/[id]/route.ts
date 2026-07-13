import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { parseFornecedorBody } from '@/lib/fornecedor';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const fornecedor = await db.fornecedor.findUnique({
      where: { id },
      include: {
        cotacoes: {
          orderBy: { dataCriacao: 'desc' },
          take: 20,
        },
      },
    });
    if (!fornecedor) {
      return NextResponse.json({ error: 'Fornecedor não encontrado' }, { status: 404 });
    }
    return NextResponse.json(fornecedor);
  } catch (error) {
    console.error('Erro ao buscar fornecedor:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = parseFornecedorBody(body);

    if (!data.nome) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
    }

    const atual = await db.fornecedor.findUnique({ where: { id } });
    if (!atual) {
      return NextResponse.json({ error: 'Fornecedor não encontrado' }, { status: 404 });
    }

    // Se mudou o CNPJ/CPF, garante que nao colide com outro fornecedor.
    if (data.cnpj && data.cnpj !== atual.cnpj) {
      const existe = await db.fornecedor.findUnique({ where: { cnpj: data.cnpj } });
      if (existe && existe.id !== id) {
        return NextResponse.json({ error: 'Já existe um fornecedor com este CNPJ' }, { status: 400 });
      }
    }
    if (data.cpf && data.cpf !== atual.cpf) {
      const existe = await db.fornecedor.findUnique({ where: { cpf: data.cpf } });
      if (existe && existe.id !== id) {
        return NextResponse.json({ error: 'Já existe um fornecedor com este CPF' }, { status: 400 });
      }
    }

    // `ativo` e opcional no PUT: permite reativar um fornecedor inativado.
    const ativo = typeof body.ativo === 'boolean' ? body.ativo : atual.ativo;

    const fornecedor = await db.fornecedor.update({
      where: { id },
      data: { ...data, ativo },
    });
    return NextResponse.json(fornecedor);
  } catch (error) {
    console.error('Erro ao atualizar fornecedor:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// Soft-delete: inativa o fornecedor preservando o historico de cotacoes.
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const atual = await db.fornecedor.findUnique({ where: { id } });
    if (!atual) {
      return NextResponse.json({ error: 'Fornecedor não encontrado' }, { status: 404 });
    }
    await db.fornecedor.update({ where: { id }, data: { ativo: false } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Erro ao inativar fornecedor:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
