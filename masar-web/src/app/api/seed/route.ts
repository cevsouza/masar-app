import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // 1. Limpar banco
    await db.medicaoCaixa.deleteMany();
    await db.casa.deleteMany();
    await db.cliente.deleteMany();
    await db.empreendimento.deleteMany();

    // 2. Criar Empreendimentos
    const emp1 = await db.empreendimento.create({
      data: {
        nome: 'Residencial Bela Vista',
        localizacao: 'Campinas, SP',
        statusLegal: 'EM_OBRA',
      },
    });

    const emp2 = await db.empreendimento.create({
      data: {
        nome: 'Jardim das Palmeiras',
        localizacao: 'Ribeirão Preto, SP',
        statusLegal: 'APROVACAO_CAIXA',
      },
    });

    const emp3 = await db.empreendimento.create({
      data: {
        nome: 'Portal do Sol',
        localizacao: 'Sorocaba, SP',
        statusLegal: 'APROVACAO_PREFEITURA',
      },
    });

    const emp4 = await db.empreendimento.create({
      data: {
        nome: 'Villa Bella MCMV',
        localizacao: 'Indaiatuba, SP',
        statusLegal: 'ESTUDO_VIABILIDADE',
      },
    });

    // 3. Criar Clientes
    const cli1 = await db.cliente.create({
      data: {
        nome: 'Carlos Eduardo Silva',
        cpf: '123.456.789-01',
        rendaComprovada: 4500.0,
        statusCredito: 'APROVADO',
      },
    });

    const cli2 = await db.cliente.create({
      data: {
        nome: 'Mariana Costa Ramos',
        cpf: '234.567.890-12',
        rendaComprovada: 3800.0,
        statusCredito: 'EM_ANALISE_CAIXA',
      },
    });

    const cli3 = await db.cliente.create({
      data: {
        nome: 'Roberto Souza Melo',
        cpf: '345.678.901-23',
        rendaComprovada: 5200.0,
        statusCredito: 'DOCUMENTACAO_PENDENTE',
      },
    });

    const cli4 = await db.cliente.create({
      data: {
        nome: 'Patricia Albuquerque',
        cpf: '456.789.012-34',
        rendaComprovada: 4100.0,
        statusCredito: 'APROVADO',
      },
    });

    // 4. Criar Casas
    const casa1 = await db.casa.create({
      data: {
        numero: '101',
        quadra: 'A',
        empreendimentoId: emp1.id,
        clienteId: cli1.id,
        statusObra: 'ALVENARIA',
        percentualObra: 45.0,
      },
    });

    const casa2 = await db.casa.create({
      data: {
        numero: '102',
        quadra: 'A',
        empreendimentoId: emp1.id,
        clienteId: cli2.id,
        statusObra: 'FUNDACAO',
        percentualObra: 20.0,
      },
    });

    const casa3 = await db.casa.create({
      data: {
        numero: '103',
        quadra: 'B',
        empreendimentoId: emp1.id,
        clienteId: cli4.id,
        statusObra: 'ACABAMENTO',
        percentualObra: 85.0,
      },
    });

    const casa4 = await db.casa.create({
      data: {
        numero: '104',
        quadra: 'B',
        empreendimentoId: emp1.id,
        clienteId: null,
        statusObra: 'SEM_INICIO',
        percentualObra: 0.0,
      },
    });

    const casa5 = await db.casa.create({
      data: {
        numero: '01',
        quadra: 'X',
        empreendimentoId: emp2.id,
        clienteId: cli3.id,
        statusObra: 'SEM_INICIO',
        percentualObra: 0.0,
      },
    });

    // 5. Criar Medições
    await db.medicaoCaixa.createMany({
      data: [
        {
          casaId: casa1.id,
          percentualMedido: 15.0,
          valorLiberado: 25000.0,
          status: 'PAGA',
          dataMedicao: new Date(new Date().setDate(new Date().getDate() - 60)),
        },
        {
          casaId: casa1.id,
          percentualMedido: 15.0,
          valorLiberado: 25000.0,
          status: 'PAGA',
          dataMedicao: new Date(new Date().setDate(new Date().getDate() - 30)),
        },
        {
          casaId: casa1.id,
          percentualMedido: 10.0,
          valorLiberado: 17000.0,
          status: 'AGUARDANDO',
          dataMedicao: new Date(),
        },
        {
          casaId: casa2.id,
          percentualMedido: 15.0,
          valorLiberado: 22000.0,
          status: 'PAGA',
          dataMedicao: new Date(new Date().setDate(new Date().getDate() - 30)),
        },
        {
          casaId: casa2.id,
          percentualMedido: 5.0,
          valorLiberado: 8000.0,
          status: 'GLOSADA_REPROVADA',
          dataMedicao: new Date(),
        },
        {
          casaId: casa3.id,
          percentualMedido: 20.0,
          valorLiberado: 35000.0,
          status: 'PAGA',
          dataMedicao: new Date(new Date().setDate(new Date().getDate() - 90)),
        },
        {
          casaId: casa3.id,
          percentualMedido: 30.0,
          valorLiberado: 52500.0,
          status: 'PAGA',
          dataMedicao: new Date(new Date().setDate(new Date().getDate() - 60)),
        },
        {
          casaId: casa3.id,
          percentualMedido: 20.0,
          valorLiberado: 35000.0,
          status: 'PAGA',
          dataMedicao: new Date(new Date().setDate(new Date().getDate() - 30)),
        },
        {
          casaId: casa3.id,
          percentualMedido: 15.0,
          valorLiberado: 26250.0,
          status: 'AGUARDANDO',
          dataMedicao: new Date(),
        },
      ],
    });

    return NextResponse.json({ success: true, message: 'Banco de dados populado com sucesso!' });
  } catch (error: any) {
    console.error('Erro ao rodar o seed via API:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
