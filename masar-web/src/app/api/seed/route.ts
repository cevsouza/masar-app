import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // 1. Limpar banco na ordem de dependência
    await db.diarioDeObra.deleteMany();
    await db.infraestruturaUnidade.deleteMany();
    await db.apropriacaoCusto.deleteMany();
    await db.itemOrcamento.deleteMany();
    await db.orcamentoCasa.deleteMany();
    await db.insumoPadrao.deleteMany();
    await db.medicaoCaixa.deleteMany();
    await db.casa.deleteMany();
    await db.cliente.deleteMany();
    await db.marcoBurocratico.deleteMany();
    await db.empreendimento.deleteMany();

    // 2. Criar Empreendimentos
    const emp1 = await db.empreendimento.create({
      data: {
        nome: 'Residencial Bela Vista',
        localizacao: 'Campinas, SP',
        statusLegal: 'EM_OBRA',
        temSondagemSolo: true,
        temInfraestruturaBasica: true,
      },
    });

    const emp2 = await db.empreendimento.create({
      data: {
        nome: 'Jardim das Palmeiras',
        localizacao: 'Ribeirão Preto, SP',
        statusLegal: 'APROVACAO_CAIXA',
        temSondagemSolo: true,
        temInfraestruturaBasica: false,
      },
    });

    // Criar Marcos Burocráticos de Exemplo
    await db.marcoBurocratico.createMany({
      data: [
        {
          empreendimentoId: emp1.id,
          tipo: 'ALVARA_PREFEITURA',
          dataProtocolo: new Date(new Date().setDate(new Date().getDate() - 120)),
          prazoEsperadoDias: 30,
          dataAprovacaoReal: new Date(new Date().setDate(new Date().getDate() - 90)),
        },
        {
          empreendimentoId: emp1.id,
          tipo: 'PROJETO_CAIXA',
          dataProtocolo: new Date(new Date().setDate(new Date().getDate() - 90)),
          prazoEsperadoDias: 45,
          dataAprovacaoReal: new Date(new Date().setDate(new Date().getDate() - 40)),
        },
        {
          empreendimentoId: emp2.id,
          tipo: 'ALVARA_PREFEITURA',
          dataProtocolo: new Date(new Date().setDate(new Date().getDate() - 60)),
          prazoEsperadoDias: 30,
          dataAprovacaoReal: null, // Atrasado! (60 dias > 30 prazo)
        }
      ]
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
        nome: 'Patricia Albuquerque',
        cpf: '456.789.012-34',
        rendaComprovada: 4100.0,
        statusCredito: 'APROVADO_CONDICIONADO',
      },
    });

    // 4. Criar Insumos Padrão (Catálogo Global)
    const cimento = await db.insumoPadrao.create({
      data: { nome: 'Cimento CP-II (Votoran)', unidadeMedida: 'SC', categoria: 'MATERIAL' }
    });
    const aco = await db.insumoPadrao.create({
      data: { nome: 'Aço CA-50 10mm (Gerdau)', unidadeMedida: 'KG', categoria: 'MATERIAL' }
    });
    const areia = await db.insumoPadrao.create({
      data: { nome: 'Areia Média Lavada', unidadeMedida: 'M3', categoria: 'MATERIAL' }
    });
    const retro = await db.insumoPadrao.create({
      data: { nome: 'Hora de Retroescavadeira JCB', unidadeMedida: 'HORA', categoria: 'EQUIPAMENTO' }
    });
    const maoFundacao = await db.insumoPadrao.create({
      data: { nome: 'Mão de Obra Fundação', unidadeMedida: 'EMPREITADA', categoria: 'MAO_DE_OBRA' }
    });
    const maoAlvenaria = await db.insumoPadrao.create({
      data: { nome: 'Mão de Obra Alvenaria', unidadeMedida: 'EMPREITADA', categoria: 'MAO_DE_OBRA' }
    });
    const maoTelhado = await db.insumoPadrao.create({
      data: { nome: 'Mão de Obra Cobertura/Telhado', unidadeMedida: 'EMPREITADA', categoria: 'MAO_DE_OBRA' }
    });

    // 5. Criar Casas
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
        clienteId: cli3.id,
        statusObra: 'CONCLUIDA',
        percentualObra: 100.0,
      },
    });

    // 6. Criar Orçamentos Planejados (OrcamentoCasa e ItemOrcamento)
    const orcCasa1 = await db.orcamentoCasa.create({
      data: {
        casaId: casa1.id,
      }
    });

    await db.itemOrcamento.createMany({
      data: [
        { orcamentoCasaId: orcCasa1.id, insumoId: cimento.id, quantidadePlanejada: 120, custoUnitarioPrevisto: 38.0 },
        { orcamentoCasaId: orcCasa1.id, insumoId: aco.id, quantidadePlanejada: 480, custoUnitarioPrevisto: 11.5 },
        { orcamentoCasaId: orcCasa1.id, insumoId: areia.id, quantidadePlanejada: 15, custoUnitarioPrevisto: 95.0 },
        { orcamentoCasaId: orcCasa1.id, insumoId: retro.id, quantidadePlanejada: 24, custoUnitarioPrevisto: 160.0 },
        { orcamentoCasaId: orcCasa1.id, insumoId: maoFundacao.id, quantidadePlanejada: 1, custoUnitarioPrevisto: 9500.0 },
        { orcamentoCasaId: orcCasa1.id, insumoId: maoAlvenaria.id, quantidadePlanejada: 1, custoUnitarioPrevisto: 14000.0 },
        { orcamentoCasaId: orcCasa1.id, insumoId: maoTelhado.id, quantidadePlanejada: 1, custoUnitarioPrevisto: 11000.0 }
      ]
    });

    // 7. Criar Apropriações Iniciais de Custo (Realizado)
    await db.apropriacaoCusto.createMany({
      data: [
        { casaId: casa1.id, insumoId: cimento.id, quantidadeReal: 95, custoTotal: 3610.0, aprovado: true }, // Real Unit: 38.0
        { casaId: casa1.id, insumoId: aco.id, quantidadeReal: 410, custoTotal: 4920.0, aprovado: true },  // Real Unit: 12.0 (Mais caro)
        { casaId: casa1.id, insumoId: retro.id, quantidadeReal: 20, custoTotal: 3200.0, aprovado: true },
        { casaId: casa1.id, insumoId: maoFundacao.id, quantidadeReal: 1, custoTotal: 9500.0, aprovado: true }
      ]
    });

    // 8. Criar Diários de Obra
    await db.diarioDeObra.createMany({
      data: [
        {
          casaId: casa1.id,
          clima: 'BOM',
          efetivoTrabalhadores: 8,
          atividadesExecutadas: 'Conclusão da alvenaria estrutural da sala e cozinha. Início da marcação de vergas.',
          ocorrencias: 'Nenhuma ocorrência grave. Entrega de cimento realizada pela manhã.'
        },
        {
          casaId: casa1.id,
          clima: 'CHUVA',
          efetivoTrabalhadores: 4,
          atividadesExecutadas: 'Trabalho interno de lixamento de alvenaria e instalações elétricas preliminares.',
          ocorrencias: 'Chuva forte na parte da tarde impediu trabalhos na área externa.'
        }
      ]
    });

    // 9. Criar Ligações de Utilidades/Infraestrutura
    await db.infraestruturaUnidade.create({
      data: {
        casaId: casa1.id,
        padraoEnergiaInstalado: true,
        ligacaoAguaConcluida: false,
        fossaFiltroEsgotoConcluido: false,
        numeroMedidorLuz: 'LUZ-98218-A',
        numeroMedidorAgua: null
      }
    });

    await db.infraestruturaUnidade.create({
      data: {
        casaId: casa3.id,
        padraoEnergiaInstalado: true,
        ligacaoAguaConcluida: true,
        fossaFiltroEsgotoConcluido: true,
        numeroMedidorLuz: 'LUZ-44122-C',
        numeroMedidorAgua: 'AGUA-12399-Z'
      }
    });

    // 10. Criar Medições Caixa
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
        }
      ],
    });

    return NextResponse.json({ success: true, message: 'Banco de dados de microgerenciamento populado com sucesso!' });
  } catch (error: any) {
    console.error('Erro ao rodar o seed via API:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
