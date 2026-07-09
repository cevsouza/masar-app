import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function GET() {
  try {
    const hoje = new Date();
    // 1. Limpar banco na ordem de dependência
    await db.user.deleteMany();
    await db.movimentacaoSocio.deleteMany();
    await db.socio.deleteMany();
    await db.contaBancaria.deleteMany();
    await db.transacaoFinanceira.deleteMany();
    await db.contratoVenda.deleteMany();
    await db.corretor.deleteMany();

    await db.diarioDeObra.deleteMany();
    await db.infraestruturaUnidade.deleteMany();
    await db.itemOrcamento.deleteMany();
    await db.orcamentoCasa.deleteMany();
    await db.insumoPadrao.deleteMany();
    await db.medicaoCaixa.deleteMany();
    await db.casa.deleteMany();
    await db.cliente.deleteMany();
    await db.marcoBurocratico.deleteMany();
    await db.empreendimento.deleteMany();

    // Criar usuários administradores padrão
    const adminPasswordHash = await hashPassword('V!to2017');
    await db.user.create({
      data: {
        nome: 'Julio Souza',
        email: 'cevsouza@hotmail',
        password: adminPasswordHash,
        role: 'ADMIN'
      }
    });

    await db.user.create({
      data: {
        nome: 'Julio Souza',
        email: 'cevsouza@hotmail.com',
        password: adminPasswordHash,
        role: 'ADMIN'
      }
    });

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
          dataAprovacaoReal: null,
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

    // 4. Criar Insumos Padrão (Catálogo Global - Engenharia Civil MCMV)
    const cimento = await db.insumoPadrao.create({
      data: { nome: 'Cimento CP-II (Saco 50kg)', unidadeMedida: 'SC', categoria: 'MATERIAL' }
    });
    const aco = await db.insumoPadrao.create({
      data: { nome: 'Aço CA-50 10.0mm (Vara 12m)', unidadeMedida: 'KG', categoria: 'MATERIAL' }
    });
    const areia = await db.insumoPadrao.create({
      data: { nome: 'Areia Média Lavada', unidadeMedida: 'M3', categoria: 'MATERIAL' }
    });
    const retro = await db.insumoPadrao.create({
      data: { nome: 'Hora de Retroescavadeira JCB', unidadeMedida: 'HORA', categoria: 'EQUIPAMENTO' }
    });
    const maoFundacao = await db.insumoPadrao.create({
      data: { nome: 'Mão de Obra de Fundação/Base', unidadeMedida: 'EMPREITADA', categoria: 'MAO_DE_OBRA' }
    });
    const maoAlvenaria = await db.insumoPadrao.create({
      data: { nome: 'Mão de Obra de Alvenaria e Estrutura', unidadeMedida: 'EMPREITADA', categoria: 'MAO_DE_OBRA' }
    });
    const maoTelhado = await db.insumoPadrao.create({
      data: { nome: 'Mão de Obra de Cobertura/Telhado', unidadeMedida: 'EMPREITADA', categoria: 'MAO_DE_OBRA' }
    });

    // Demais insumos básicos
    await db.insumoPadrao.createMany({
      data: [
        { nome: 'Pedra Brita nº 1', unidadeMedida: 'M3', categoria: 'MATERIAL' },
        { nome: 'Aço CA-50 8.0mm (Vara 12m)', unidadeMedida: 'KG', categoria: 'MATERIAL' },
        { nome: 'Tijolo Baiano 8 Furos (9x19x19cm)', unidadeMedida: 'SC', categoria: 'MATERIAL' },
        { nome: 'Bloco de Concreto Estrutural (14x19x39cm)', unidadeMedida: 'SC', categoria: 'MATERIAL' },
        { nome: 'Argamassa AC-II (Saco 20kg)', unidadeMedida: 'SC', categoria: 'MATERIAL' },
        { nome: 'Concreto Usinado Fck 25 MPa', unidadeMedida: 'M3', categoria: 'MATERIAL' },
        { nome: 'Piso Cerâmico PEI-4', unidadeMedida: 'M3', categoria: 'MATERIAL' },
        { nome: 'Azulejo de Parede 30x40', unidadeMedida: 'M3', categoria: 'MATERIAL' },
        { nome: 'Argamassa de Assentamento', unidadeMedida: 'KG', categoria: 'MATERIAL' },
        { nome: 'Tubo Esgoto PVC 100mm (Barra 6m)', unidadeMedida: 'KG', categoria: 'MATERIAL' },
        { nome: 'Tubo Água Fria PVC 25mm (Barra 6m)', unidadeMedida: 'KG', categoria: 'MATERIAL' },
        { nome: 'Fio Cobre Flexível 2.5mm² (Rolo 100m)', unidadeMedida: 'KG', categoria: 'MATERIAL' },
        { nome: 'Eletroduto Corrugado 3/4 (Bobina 50m)', unidadeMedida: 'KG', categoria: 'MATERIAL' },
        { nome: 'Telha Cerâmica Portuguesa', unidadeMedida: 'SC', categoria: 'MATERIAL' },
        { nome: 'Telha de Fibrocimento 6mm', unidadeMedida: 'SC', categoria: 'MATERIAL' },
        { nome: 'Porta de Madeira Interna Completa', unidadeMedida: 'SC', categoria: 'MATERIAL' },
        { nome: 'Janela de Alumínio de Correr 1.20x1.00m', unidadeMedida: 'SC', categoria: 'MATERIAL' },
        { nome: 'Tinta Acrílica Látex Branca (Lata 18L)', unidadeMedida: 'SC', categoria: 'MATERIAL' },
        { nome: 'Caixa d\'Água Polietileno 500L', unidadeMedida: 'SC', categoria: 'MATERIAL' },
        { nome: 'Argamassa de Rejunte', unidadeMedida: 'KG', categoria: 'MATERIAL' },
        { nome: 'Gesso Liso para Gesso Acartonado', unidadeMedida: 'KG', categoria: 'MATERIAL' },
        { nome: 'Mão de Obra de Terraplenagem', unidadeMedida: 'EMPREITADA', categoria: 'MAO_DE_OBRA' },
        { nome: 'Mão de Obra de Instalações Elétricas', unidadeMedida: 'EMPREITADA', categoria: 'MAO_DE_OBRA' },
        { nome: 'Mão de Obra de Instalações Hidrossanitárias', unidadeMedida: 'EMPREITADA', categoria: 'MAO_DE_OBRA' },
        { nome: 'Mão de Obra de Acabamentos e Revestimentos', unidadeMedida: 'EMPREITADA', categoria: 'MAO_DE_OBRA' },
        { nome: 'Mão de Obra de Pintura e Textura', unidadeMedida: 'EMPREITADA', categoria: 'MAO_DE_OBRA' },
        { nome: 'Mão de Obra de Limpeza de Obra', unidadeMedida: 'EMPREITADA', categoria: 'MAO_DE_OBRA' },
        { nome: 'Locação de Betoneira 400L (Mensal)', unidadeMedida: 'EMPREITADA', categoria: 'EQUIPAMENTO' },
        { nome: 'Locação de Andaime Metálico (Mensal)', unidadeMedida: 'EMPREITADA', categoria: 'EQUIPAMENTO' },
        { nome: 'Locação de Container para Ferramentas (Mensal)', unidadeMedida: 'EMPREITADA', categoria: 'EQUIPAMENTO' },
        { nome: 'Locação de Banheiro Químico (Mensal)', unidadeMedida: 'EMPREITADA', categoria: 'EQUIPAMENTO' },
        { nome: 'Alvará de Construção (Prefeitura)', unidadeMedida: 'EMPREITADA', categoria: 'TAXA' },
        { nome: 'Taxa de Registro e Emolumentos de Cartório', unidadeMedida: 'EMPREITADA', categoria: 'TAXA' },
        { nome: 'CREA/ART de Execução de Obra', unidadeMedida: 'EMPREITADA', categoria: 'TAXA' },
        { nome: 'Seguro de Engenharia (Obra)', unidadeMedida: 'EMPREITADA', categoria: 'TAXA' }
      ]
    });

    // 5. Criar Casas
    const casa1 = await db.casa.create({
      data: {
        numero: '101',
        quadra: 'A',
        empreendimentoId: emp1.id,
        clienteId: cli1.id,
        statusObra: 'SUPRAESTRUTURA',
        percentualObra: 45.0,
      },
    });

    const casa2 = await db.casa.create({
      data: {
        numero: '102',
        quadra: 'A',
        empreendimentoId: emp1.id,
        clienteId: cli2.id,
        statusObra: 'INFRAESTRUTURA',
        percentualObra: 20.0,
        liberadaVenda: true,
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
      data: { casaId: casa1.id }
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

    // 7. Criar Diários de Obra
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

    // 8. Criar Ligações de Utilidades/Infraestrutura
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

    // 9. Criar Medições Caixa (Físico)
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

    // Criar Contas Bancárias
    await db.contaBancaria.create({
      data: { nome: 'Conta Corrente CEF - Masar App', saldoAtual: 285000.00 }
    });

    // Criar Sócios cotistas
    await db.socio.create({
      data: { nome: 'Sócio Incorporador Principal', percentualCotas: 60.0 }
    });
    await db.socio.create({
      data: { nome: 'Sócio Empreiteiro Operacional', percentualCotas: 40.0 }
    });

    // Criar Corretor parceiro
    const corretor = await db.corretor.create({
      data: { nome: 'Lucas Imóveis Campinas', creci: 'CRECI-12345-J', comissaoPercentual: 2.0 }
    });

    // Criar Contrato de Venda para Casa 101
    const contratoCasa1 = await db.contratoVenda.create({
      data: {
        casaId: casa1.id,
        clienteId: cli1.id,
        corretorId: corretor.id,
        valorVenda: 180000.00,
        entrada: 20000.00,
        financiamento: 140000.00,
        fgts: 10000.00,
        subsidio: 10000.00,
        comissaoValor: 3600.00,
        comissaoPaga: false,
        status: 'ASSINADO_CAIXA'
      }
    });

    // 10. Criar Transações Financeiras Consolidadas (Single Ledger)
    await db.transacaoFinanceira.createMany({
      data: [
        // Custos Globais (Sem casaId)
        {
          descricao: 'Terreno Geral Residencial Bela Vista',
          valor: 90000.00,
          dataVencimento: new Date(new Date().setDate(new Date().getDate() - 100)),
          dataPagamento: new Date(new Date().setDate(new Date().getDate() - 100)),
          natureza: 'DESPESA',
          status: 'PAGO',
          categoria: 'TERRENO',
          empreendimentoId: emp1.id
        },
        {
          descricao: 'Marketing Geral Outdoor & Banners',
          valor: 12000.00,
          dataVencimento: new Date(new Date().setDate(new Date().getDate() - 80)),
          dataPagamento: new Date(new Date().setDate(new Date().getDate() - 80)),
          natureza: 'DESPESA',
          status: 'PAGO',
          categoria: 'MATERIAL',
          empreendimentoId: emp1.id
        },
        {
          descricao: 'Projetos Arquitetônicos & Topografia Bela Vista',
          valor: 18000.00,
          dataVencimento: new Date(new Date().setDate(new Date().getDate() - 90)),
          dataPagamento: new Date(new Date().setDate(new Date().getDate() - 90)),
          natureza: 'DESPESA',
          status: 'PAGO',
          categoria: 'PROJETOS',
          empreendimentoId: emp1.id
        },
        
        // Custos de Obras Realizados (Com casaId)
        {
          descricao: 'Apropriação - Cimento CP-II (95 sacos)',
          valor: 3610.00,
          dataVencimento: new Date(new Date().setDate(new Date().getDate() - 30)),
          dataPagamento: new Date(new Date().setDate(new Date().getDate() - 30)),
          natureza: 'DESPESA',
          status: 'PAGO',
          categoria: 'MATERIAL',
          empreendimentoId: emp1.id,
          casaId: casa1.id,
          insumoId: cimento.id,
          quantidade: 95
        },
        {
          descricao: 'Apropriação - Aço CA-50 (410 kg)',
          valor: 4920.00,
          dataVencimento: new Date(new Date().setDate(new Date().getDate() - 28)),
          dataPagamento: new Date(new Date().setDate(new Date().getDate() - 28)),
          natureza: 'DESPESA',
          status: 'PAGO',
          categoria: 'MATERIAL',
          empreendimentoId: emp1.id,
          casaId: casa1.id,
          insumoId: aco.id,
          quantidade: 410
        },
        {
          descricao: 'Apropriação - Locação de Máquinas (20h)',
          valor: 3200.00,
          dataVencimento: new Date(new Date().setDate(new Date().getDate() - 25)),
          dataPagamento: new Date(new Date().setDate(new Date().getDate() - 25)),
          natureza: 'DESPESA',
          status: 'PAGO',
          categoria: 'MATERIAL',
          empreendimentoId: emp1.id,
          casaId: casa1.id,
          insumoId: retro.id,
          quantidade: 20
        },
        {
          descricao: 'Apropriação - Empreitada Mão de Obra Fundação',
          valor: 9500.00,
          dataVencimento: new Date(new Date().setDate(new Date().getDate() - 20)),
          dataPagamento: new Date(new Date().setDate(new Date().getDate() - 20)),
          natureza: 'DESPESA',
          status: 'PAGO',
          categoria: 'MAO_DE_OBRA',
          empreendimentoId: emp1.id,
          casaId: casa1.id,
          insumoId: maoFundacao.id,
          quantidade: 1
        },

        // Receitas CEF Realizadas (Com casaId)
        {
          descricao: 'Repasse CEF Medição 1 - Casa 101',
          valor: 25000.00,
          dataVencimento: new Date(new Date().setDate(new Date().getDate() - 60)),
          dataPagamento: new Date(new Date().setDate(new Date().getDate() - 60)),
          natureza: 'RECEITA',
          status: 'PAGO',
          categoria: 'MEDICAO_CAIXA',
          empreendimentoId: emp1.id,
          casaId: casa1.id
        },
        {
          descricao: 'Repasse CEF Medição 2 - Casa 101',
          valor: 25000.00,
          dataVencimento: new Date(new Date().setDate(new Date().getDate() - 30)),
          dataPagamento: new Date(new Date().setDate(new Date().getDate() - 30)),
          natureza: 'RECEITA',
          status: 'PAGO',
          categoria: 'MEDICAO_CAIXA',
          empreendimentoId: emp1.id,
          casaId: casa1.id
        },
        {
          descricao: 'Repasse CEF Medição 1 - Casa 102',
          valor: 22000.00,
          dataVencimento: new Date(new Date().setDate(new Date().getDate() - 30)),
          dataPagamento: new Date(new Date().setDate(new Date().getDate() - 30)),
          natureza: 'RECEITA',
          status: 'PAGO',
          categoria: 'MEDICAO_CAIXA',
          empreendimentoId: emp1.id,
          casaId: casa2.id
        },

        // Receitas Entrada Cliente Realizadas/Pendentes (Com casaId e clienteId)
        {
          descricao: 'Sinal de Entrada - Parcela 1/4 - Casa 101',
          valor: 5000.00,
          dataVencimento: new Date(new Date().setDate(hoje.getDate() - 15)),
          dataPagamento: new Date(new Date().setDate(hoje.getDate() - 15)),
          natureza: 'RECEITA',
          status: 'PAGO',
          categoria: 'ENTRADA_CLIENTE',
          empreendimentoId: emp1.id,
          casaId: casa1.id,
          clienteId: cli1.id,
          contratoId: contratoCasa1.id
        },
        {
          descricao: 'Sinal de Entrada - Parcela 2/4 - Casa 101',
          valor: 5000.00,
          dataVencimento: new Date(new Date().setDate(hoje.getDate() - 5)),
          dataPagamento: new Date(new Date().setDate(hoje.getDate() - 5)),
          natureza: 'RECEITA',
          status: 'PAGO',
          categoria: 'ENTRADA_CLIENTE',
          empreendimentoId: emp1.id,
          casaId: casa1.id,
          clienteId: cli1.id,
          contratoId: contratoCasa1.id
        },
        {
          descricao: 'Sinal de Entrada - Parcela 3/4 - Casa 101',
          valor: 5000.00,
          dataVencimento: new Date(new Date().setDate(hoje.getDate() + 10)),
          natureza: 'RECEITA',
          status: 'PENDENTE',
          categoria: 'ENTRADA_CLIENTE',
          empreendimentoId: emp1.id,
          casaId: casa1.id,
          clienteId: cli1.id,
          contratoId: contratoCasa1.id
        },
        {
          descricao: 'Sinal de Entrada - Parcela 4/4 - Casa 101',
          valor: 5000.00,
          dataVencimento: new Date(new Date().setDate(hoje.getDate() + 40)),
          natureza: 'RECEITA',
          status: 'PENDENTE',
          categoria: 'ENTRADA_CLIENTE',
          empreendimentoId: emp1.id,
          casaId: casa1.id,
          clienteId: cli1.id,
          contratoId: contratoCasa1.id
        }
      ]
    });

    return NextResponse.json({ success: true, message: 'Banco de dados de microgerenciamento e livro-caixa unificado populado com sucesso!' });
  } catch (error: any) {
    console.error('Erro ao rodar o seed via API:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
