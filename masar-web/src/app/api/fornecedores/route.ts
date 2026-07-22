import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { parseFornecedorBody } from '@/lib/fornecedor';
import { exigirAcesso } from '@/lib/apiAuth';

export async function GET(request: NextRequest) {
  const auth = await exigirAcesso(request, { modulo: 'suprimentos' });
  if (!auth.ok) return auth.resposta;

  try {
    const { searchParams } = new URL(request.url);
    const incluirInativos = searchParams.get('incluirInativos') === 'true';

    const fornecedores = await db.fornecedor.findMany({
      where: incluirInativos ? undefined : { ativo: true },
      orderBy: { nome: 'asc' },
    });
    return NextResponse.json(fornecedores);
  } catch (error) {
    console.error('Erro ao listar fornecedores:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await exigirAcesso(request, { modulo: 'suprimentos' });
  if (!auth.ok) return auth.resposta;

  try {
    const body = await request.json();
    const data = parseFornecedorBody(body);

    if (!data.nome) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
    }

    // CNPJ/CPF sao unicos: bloqueia duplicidade com mensagem clara.
    if (data.cnpj) {
      const existe = await db.fornecedor.findFirst({ where: { cnpj: data.cnpj } });
      if (existe) {
        return NextResponse.json({ error: 'Já existe um fornecedor com este CNPJ' }, { status: 400 });
      }
    }
    if (data.cpf) {
      const existe = await db.fornecedor.findFirst({ where: { cpf: data.cpf } });
      if (existe) {
        return NextResponse.json({ error: 'Já existe um fornecedor com este CPF' }, { status: 400 });
      }
    }

    const fornecedor = await db.fornecedor.create({ data });
    return NextResponse.json(fornecedor, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar fornecedor:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
