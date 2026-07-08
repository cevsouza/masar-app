import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Limpar banco
  await prisma.medicaoCaixa.deleteMany();
  await prisma.casa.deleteMany();
  await prisma.cliente.deleteMany();
  await prisma.empreendimento.deleteMany();

  console.log('Banco de dados limpo.');

  // 1. Criar Empreendimentos
  const emp1 = await prisma.empreendimento.create({
    data: {
      nome: 'Residencial Bela Vista',
      localizacao: 'Campinas, SP',
      statusLegal: 'EM_OBRA',
    },
  });

  const emp2 = await prisma.empreendimento.create({
    data: {
      nome: 'Jardim das Palmeiras',
      localizacao: 'Ribeirão Preto, SP',
      statusLegal: 'APROVACAO_CAIXA',
    },
  });

  const emp3 = await prisma.empreendimento.create({
    data: {
      nome: 'Portal do Sol',
      localizacao: 'Sorocaba, SP',
      statusLegal: 'APROVACAO_PREFEITURA',
    },
  });

  const emp4 = await prisma.empreendimento.create({
    data: {
      nome: 'Villa Bella MCMV',
      localizacao: 'Indaiatuba, SP',
      statusLegal: 'ESTUDO_VIABILIDADE',
    },
  });

  console.log('Empreendimentos criados.');

  // 2. Criar Clientes
  const cli1 = await prisma.cliente.create({
    data: {
      nome: 'Carlos Eduardo Silva',
      cpf: '123.456.789-01',
      rendaComprovada: 4500.0,
      statusCredito: 'APROVADO',
    },
  });

  const cli2 = await prisma.cliente.create({
    data: {
      nome: 'Mariana Costa Ramos',
      cpf: '234.567.890-12',
      rendaComprovada: 3800.0,
      statusCredito: 'EM_ANALISE_CAIXA',
    },
  });

  const cli3 = await prisma.cliente.create({
    data: {
      nome: 'Roberto Souza Melo',
      cpf: '345.678.901-23',
      rendaComprovada: 5200.0,
      statusCredito: 'DOCUMENTACAO_PENDENTE',
    },
  });

  const cli4 = await prisma.cliente.create({
    data: {
      nome: 'Patricia Albuquerque',
      cpf: '456.789.012-34',
      rendaComprovada: 4100.0,
      statusCredito: 'APROVADO',
    },
  });

  console.log('Clientes criados.');

  // 3. Criar Casas
  // Residencial Bela Vista (emp1) - EM_OBRA
  const casa1 = await prisma.casa.create({
    data: {
      numero: '101',
      quadra: 'A',
      empreendimentoId: emp1.id,
      clienteId: cli1.id,
      statusObra: 'ALVENARIA',
      percentualObra: 45.0,
    },
  });

  const casa2 = await prisma.casa.create({
    data: {
      numero: '102',
      quadra: 'A',
      empreendimentoId: emp1.id,
      clienteId: cli2.id,
      statusObra: 'FUNDACAO',
      percentualObra: 20.0,
    },
  });

  const casa3 = await prisma.casa.create({
    data: {
      numero: '103',
      quadra: 'B',
      empreendimentoId: emp1.id,
      clienteId: cli4.id,
      statusObra: 'ACABAMENTO',
      percentualObra: 85.0,
    },
  });

  // Casa em estoque (sem cliente)
  const casa4 = await prisma.casa.create({
    data: {
      numero: '104',
      quadra: 'B',
      empreendimentoId: emp1.id,
      clienteId: null,
      statusObra: 'SEM_INICIO',
      percentualObra: 0.0,
    },
  });

  // Jardim das Palmeiras (emp2) - APROVACAO_CAIXA (casas sem início físico)
  const casa5 = await prisma.casa.create({
    data: {
      numero: '01',
      quadra: 'X',
      empreendimentoId: emp2.id,
      clienteId: cli3.id,
      statusObra: 'SEM_INICIO',
      percentualObra: 0.0,
    },
  });

  console.log('Casas criadas.');

  // 4. Criar Medições da Caixa Econômica Federal (MedicaoCaixa)
  // Medições para a Casa 1 (Obra em 45%)
  await prisma.medicaoCaixa.createMany({
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
    ],
  });

  // Medições para a Casa 2 (Obra em 20%)
  await prisma.medicaoCaixa.createMany({
    data: [
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
        status: 'GLOSADA_REPROVADA', // Crucial para o Alerta do Dashboard!
        dataMedicao: new Date(),
      },
    ],
  });

  // Medições para a Casa 3 (Obra em 85%)
  await prisma.medicaoCaixa.createMany({
    data: [
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

  console.log('Medições de Caixa criadas.');
  console.log('Seed do banco de dados concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
