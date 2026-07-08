import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nome, cpf, rendaComprovada, statusCredito, casaId } = body;

    if (!nome || !cpf || !rendaComprovada) {
      return NextResponse.json({ error: 'Nome, CPF e renda comprovada são obrigatórios' }, { status: 400 });
    }

    // Check if client already exists by CPF
    const existingClient = await db.cliente.findUnique({
      where: { cpf },
    });

    if (existingClient) {
      return NextResponse.json({ error: 'Cliente com este CPF já cadastrado' }, { status: 400 });
    }

    const rendaFloat = parseFloat(rendaComprovada);
    const validCreditos = ['DOCUMENTACAO_PENDENTE', 'EM_ANALISE_CAIXA', 'APROVADO'];
    const statusCreditoValido = statusCredito && validCreditos.includes(statusCredito) 
      ? statusCredito 
      : 'DOCUMENTACAO_PENDENTE';

    // Create client
    const cliente = await db.cliente.create({
      data: {
        nome,
        cpf,
        rendaComprovada: rendaFloat,
        statusCredito: statusCreditoValido,
      },
    });

    // If a house id was provided, link the house to this client
    if (casaId) {
      await db.casa.update({
        where: { id: casaId },
        data: { clienteId: cliente.id },
      });
    }

    return NextResponse.json(cliente, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar cliente:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
