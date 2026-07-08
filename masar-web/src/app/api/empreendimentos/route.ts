import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nome, localizacao, statusLegal, dataInicio, dataFim, orcamento } = body;

    if (!nome || !localizacao) {
      return NextResponse.json({ error: 'Nome e localização são obrigatórios' }, { status: 400 });
    }

    const validStatuses = ['ESTUDO_VIABILIDADE', 'APROVACAO_PREFEITURA', 'APROVACAO_CAIXA', 'EM_OBRA'];
    const statusValido = statusLegal && validStatuses.includes(statusLegal) 
      ? statusLegal 
      : 'ESTUDO_VIABILIDADE';

    const orcamentoFloat = orcamento ? parseFloat(orcamento) : null;
    const inicioDate = dataInicio ? new Date(dataInicio) : null;
    const fimDate = dataFim ? new Date(dataFim) : null;

    const empreendimento = await db.empreendimento.create({
      data: {
        nome,
        localizacao,
        statusLegal: statusValido,
        dataInicio: inicioDate,
        dataFim: fimDate,
        orcamento: orcamentoFloat,
      },
    });

    return NextResponse.json(empreendimento, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar empreendimento:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
