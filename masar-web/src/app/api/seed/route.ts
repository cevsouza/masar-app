import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function GET() {
  try {
    // 1. Limpar banco na ordem de dependência
    await db.user.deleteMany();
    await db.movimentacaoSocio.deleteMany();
    await db.socio.deleteMany();
    await db.contaBancaria.deleteMany();
    await db.contasAReceberCliente.deleteMany();
    await db.contratoVenda.deleteMany();
    await db.corretor.deleteMany();
    await db.custoGlobal.deleteMany();
    await db.imposto.deleteMany();

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

    // Criar usuários administradores padrão solicitados
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

    // 7. Criar Apropriações Iniciais de Custo (Realizado)
    await db.apropriacaoCusto.createMany({
      data: [
        { casaId: casa1.id, insumoId: cimento.id, quantidadeReal: 95, custoTotal: 3610.0, aprovado: true },
        { casaId: casa1.id, insumoId: aco.id, quantidadeReal: 410, custoTotal: 4920.0, aprovado: true },
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

    // === ADICIONAIS FASE 5 (CONTA BANCÁRIA, SÓCIOS, RET RATEIOS, CONTRATOS, CORRETOR) ===

    // Criar Contas Bancárias
    const contaCEF = await db.contaBancaria.create({
      data: { nome: 'Conta Corrente CEF - Masar App', saldoAtual: 285000.00 }
    });

    // Criar Sócios cotistas
    const socioInc = await db.socio.create({
      data: { nome: 'Sócio Incorporador Principal', percentualCotas: 60.0 }
    });
    const socioEmp = await db.socio.create({
      data: { nome: 'Sócio Empreiteiro Operacional', percentualCotas: 40.0 }
    });

    // Criar Impostos (RET incorporação MCMV)
    await db.imposto.create({
      data: { nome: 'RET', percentual: 4.0 }
    });

    // Criar Custos Globais (Terreno geral para rateio contábil proporcional)
    await db.custoGlobal.createMany({
      data: [
        { descricao: 'Terreno Geral Residencial Bela Vista', tipo: 'TERRENO', valor: 90000.00 },
        { descricao: 'Marketing Geral Outdoor & Banners', tipo: 'MARKETING', valor: 12000.00 },
        { descricao: 'Projetos Arquitetônicos & Topografia Bela Vista', tipo: 'PROJETOS', valor: 18000.00 }
      ]
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

    // Criar parcelas do sinal a receber
    const hoje = new Date();
    await db.contasAReceberCliente.createMany({
      data: [
        { contratoId: contratoCasa1.id, numeroParcela: 1, valor: 5000.00, dataVencimento: new Date(new Date().setDate(hoje.getDate() - 15)), pago: true },
        { contratoId: contratoCasa1.id, numeroParcela: 2, valor: 5000.00, dataVencimento: new Date(new Date().setDate(hoje.getDate() - 5)), pago: true },
        { contratoId: contratoCasa1.id, numeroParcela: 3, valor: 5000.00, dataVencimento: new Date(new Date().setDate(hoje.getDate() + 10)), pago: false },
        { contratoId: contratoCasa1.id, numeroParcela: 4, valor: 5000.00, dataVencimento: new Date(new Date().setDate(hoje.getDate() + 40)), pago: false }
      ]
    });

    return NextResponse.json({ success: true, message: 'Banco de dados de microgerenciamento e tesouraria societária (Fase 5) populado com sucesso!' });
  } catch (error: any) {
    console.error('Erro ao rodar o seed via API:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
