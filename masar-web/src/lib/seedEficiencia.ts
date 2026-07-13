import { db } from '@/lib/db';

/**
 * Seed de demonstração para exercitar TODOS os indicadores de eficiência
 * (Fases 6.1, 6.2, 6.2b, 6.3, 6.4, 6.5 e 5.3).
 *
 * Cria um empreendimento "[SEED] ..." com 4 casas de perfis distintos:
 *   A01 saudável · A02 custo estourado · A03 cronograma atrasado · A04 material desalinhado
 * mais insumos com estoque abaixo/acima do mínimo, uma OC pendente (em pedido),
 * contas a pagar/receber datadas (fluxo de caixa) e registros de SST.
 *
 * Idempotente: apaga tudo que começa com "[SEED]" antes de recriar. Não toca em
 * dados reais. Somente para dev/demonstração.
 */

const PFX = '[SEED]';
const dias = (n: number) => new Date(Date.now() + n * 86400000);

export async function limparSeed() {
  // Ordem importa por causa dos onDelete Restrict em InsumoPadrao.
  await db.solicitacaoCompra.deleteMany({ where: { insumo: { nome: { startsWith: PFX } } } });
  await db.movimentacaoEstoque.deleteMany({ where: { insumo: { nome: { startsWith: PFX } } } });
  await db.empreendimento.deleteMany({ where: { nome: { startsWith: PFX } } });
  await db.insumoPadrao.deleteMany({ where: { nome: { startsWith: PFX } } });
  await db.fornecedor.deleteMany({ where: { nome: { startsWith: PFX } } });
  await db.contaBancaria.deleteMany({ where: { nome: { startsWith: PFX } } });
}

interface ItemPlano { insumoIdx: number; qtdPlan: number; custoUnit: number; consumo: number; despesa: number; despesaPendente?: boolean }
interface AtividadePlano { titulo: string; iniDias: number; fimDias: number; concluida: boolean }
interface CasaPlano {
  numero: string;
  statusObra: any;
  percentualObra: number;
  criacaoDias: number;   // dataCriacao (negativo = passado)
  prazoDias: number;     // prazoFisico
  itens: ItemPlano[];
  atividades: AtividadePlano[];
  despesaExtraNaoOrcada?: { insumoIdx: number; valor: number };
}

export async function seedEficiencia() {
  await limparSeed();

  // ── Insumos (saldo global p/ o MRP) ──────────────────────────────────────
  const insumosDef = [
    { nome: `${PFX} Cimento CP-II`, unidadeMedida: 'SC', categoria: 'MATERIAL', saldoEstoque: 30, nivelMinimoEstoque: 60 },   // abaixo do mínimo
    { nome: `${PFX} Areia Média`, unidadeMedida: 'M3', categoria: 'MATERIAL', saldoEstoque: 180, nivelMinimoEstoque: 20 },     // excesso
    { nome: `${PFX} Brita 1`, unidadeMedida: 'M3', categoria: 'MATERIAL', saldoEstoque: 26, nivelMinimoEstoque: 15 },
    { nome: `${PFX} Aço CA-50`, unidadeMedida: 'KG', categoria: 'MATERIAL', saldoEstoque: 420, nivelMinimoEstoque: 250 },
    { nome: `${PFX} Argamassa AC-II`, unidadeMedida: 'SC', categoria: 'MATERIAL', saldoEstoque: 12, nivelMinimoEstoque: 40 },  // abaixo do mínimo
  ] as const;
  const insumos = [];
  for (const i of insumosDef) insumos.push(await db.insumoPadrao.create({ data: i as any }));

  const fornecedor = await db.fornecedor.create({
    data: { nome: `${PFX} Construrápida Materiais`, cnpj: `${PFX}-00.000.000/0001-00`, prazoPagamentoDias: 30, ramo: 'material', ativo: true },
  });

  await db.contaBancaria.create({ data: { nome: `${PFX} Conta Obra Demo`, saldoAtual: 28000 } });

  const emp = await db.empreendimento.create({
    data: {
      nome: `${PFX} Residencial Demonstração`,
      localizacao: 'Cidade Demo/UF',
      statusLegal: 'EM_OBRA',
      aliquotaRET: 4,
      dataInicio: dias(-150),
    },
  });

  // ── Perfis das casas ─────────────────────────────────────────────────────
  const casas: CasaPlano[] = [
    { // A01 — SAUDÁVEL: gasto ~ orçado×%físico, cronograma no prazo
      numero: '01', statusObra: 'INSTALACOES', percentualObra: 50, criacaoDias: -90, prazoDias: 90,
      itens: [
        { insumoIdx: 0, qtdPlan: 100, custoUnit: 32, consumo: 50, despesa: 1600 },
        { insumoIdx: 1, qtdPlan: 50, custoUnit: 90, consumo: 25, despesa: 2250 },
        { insumoIdx: 3, qtdPlan: 800, custoUnit: 8, consumo: 400, despesa: 3200 },
        { insumoIdx: 4, qtdPlan: 40, custoUnit: 28, consumo: 20, despesa: 560 },
      ],
      atividades: [
        { titulo: 'Infraestrutura', iniDias: -90, fimDias: -60, concluida: true },
        { titulo: 'Supraestrutura', iniDias: -60, fimDias: -10, concluida: true },
        { titulo: 'Instalações', iniDias: -10, fimDias: 40, concluida: false },
      ],
    },
    { // A02 — CUSTO ESTOURADO: gasto > orçado
      numero: '02', statusObra: 'ACABAMENTO', percentualObra: 60, criacaoDias: -120, prazoDias: 60,
      itens: [
        { insumoIdx: 0, qtdPlan: 100, custoUnit: 32, consumo: 130, despesa: 5200 },  // estouro físico + custo
        { insumoIdx: 1, qtdPlan: 40, custoUnit: 90, consumo: 45, despesa: 4300 },
        { insumoIdx: 3, qtdPlan: 700, custoUnit: 8, consumo: 720, despesa: 6800, despesaPendente: true },
      ],
      atividades: [
        { titulo: 'Infraestrutura', iniDias: -120, fimDias: -90, concluida: true },
        { titulo: 'Supraestrutura', iniDias: -90, fimDias: -40, concluida: true },
        { titulo: 'Acabamento', iniDias: -40, fimDias: 20, concluida: false },
      ],
    },
    { // A03 — CRONOGRAMA ATRASADO: atividades vencidas não concluídas, %físico baixo
      numero: '03', statusObra: 'SUPRAESTRUTURA', percentualObra: 25, criacaoDias: -150, prazoDias: 20,
      itens: [
        { insumoIdx: 0, qtdPlan: 90, custoUnit: 32, consumo: 22, despesa: 700 },
        { insumoIdx: 2, qtdPlan: 30, custoUnit: 80, consumo: 8, despesa: 640 },
        { insumoIdx: 3, qtdPlan: 600, custoUnit: 8, consumo: 150, despesa: 1200 },
      ],
      atividades: [
        { titulo: 'Infraestrutura', iniDias: -150, fimDias: -100, concluida: true },
        { titulo: 'Supraestrutura', iniDias: -100, fimDias: -20, concluida: false }, // ATRASADA
        { titulo: 'Instalações', iniDias: -20, fimDias: 10, concluida: false },      // ATRASADA
      ],
    },
    { // A04 — MATERIAL DESALINHADO: sobra num insumo, estouro noutro, item fora do orçamento
      numero: '04', statusObra: 'INFRAESTRUTURA', percentualObra: 15, criacaoDias: -45, prazoDias: 120,
      itens: [
        { insumoIdx: 0, qtdPlan: 80, custoUnit: 32, consumo: 8, despesa: 260 },     // muito saldo a consumir
        { insumoIdx: 1, qtdPlan: 20, custoUnit: 90, consumo: 40, despesa: 3600 },    // estouro físico
      ],
      atividades: [
        { titulo: 'Infraestrutura', iniDias: -45, fimDias: 30, concluida: false },
      ],
      despesaExtraNaoOrcada: { insumoIdx: 4, valor: 900 }, // insumo consumido sem estar no orçamento
    },
  ];

  const catFin = 'MATERIAL';
  const casasCriadas = [];
  for (const c of casas) {
    const casa = await db.casa.create({
      data: {
        numero: c.numero, quadra: 'A', empreendimentoId: emp.id,
        statusObra: c.statusObra, percentualObra: c.percentualObra,
        prazoFisico: dias(c.prazoDias), dataCriacao: dias(c.criacaoDias),
        valorVendaProjetado: 180000,
      },
    });
    casasCriadas.push(casa);

    const orc = await db.orcamentoCasa.create({ data: { casaId: casa.id } });
    for (const it of c.itens) {
      await db.itemOrcamento.create({
        data: { orcamentoCasaId: orc.id, insumoId: insumos[it.insumoIdx].id, quantidadePlanejada: it.qtdPlan, custoUnitarioPrevisto: it.custoUnit },
      });
      // consumo físico (saída de estoque para a casa)
      if (it.consumo > 0) {
        await db.movimentacaoEstoque.create({ data: { insumoId: insumos[it.insumoIdx].id, quantidade: it.consumo, tipo: 'SAIDA', casaId: casa.id } });
      }
      // custo realizado (despesa do insumo na casa)
      if (it.despesa > 0) {
        await db.transacaoFinanceira.create({
          data: {
            descricao: `${PFX} Compra ${insumos[it.insumoIdx].nome.replace(PFX + ' ', '')} - Casa ${c.numero}`,
            valor: it.despesa, natureza: 'DESPESA', categoria: catFin as any,
            status: it.despesaPendente ? 'PENDENTE' : 'PAGO',
            dataVencimento: it.despesaPendente ? dias(10 + Math.floor(Math.random() * 40)) : dias(-15),
            dataPagamento: it.despesaPendente ? null : dias(-15),
            empreendimentoId: emp.id, casaId: casa.id, insumoId: insumos[it.insumoIdx].id, quantidade: it.consumo,
          },
        });
      }
    }
    if (c.despesaExtraNaoOrcada) {
      await db.transacaoFinanceira.create({
        data: {
          descricao: `${PFX} Material fora do orçamento - Casa ${c.numero}`,
          valor: c.despesaExtraNaoOrcada.valor, natureza: 'DESPESA', categoria: catFin as any, status: 'PAGO',
          dataVencimento: dias(-10), dataPagamento: dias(-10),
          empreendimentoId: emp.id, casaId: casa.id, insumoId: insumos[c.despesaExtraNaoOrcada.insumoIdx].id, quantidade: 1,
        },
      });
    }

    for (const [i, a] of c.atividades.entries()) {
      await db.atividadeCronograma.create({
        data: {
          titulo: a.titulo, escopo: 'LOTE', ordem: i + 1,
          status: a.concluida ? 'CONCLUIDA' : (c.statusObra as any),
          percentualConcluido: a.concluida ? 100 : 40,
          dataInicioPrevista: dias(a.iniDias), dataFimPrevista: dias(a.fimDias),
          dataInicioReal: a.iniDias < 0 ? dias(a.iniDias) : null,
          dataFimReal: a.concluida ? dias(a.fimDias) : null,
          empreendimentoId: emp.id, casaId: casa.id,
        },
      });
    }
  }

  // ── Em pedido: OC PENDENTE de Cimento (aparece no MRP) ────────────────────
  const sol = await db.solicitacaoCompra.create({
    data: { empreendimentoId: emp.id, insumoId: insumos[0].id, quantidadeSolicitada: 40, status: 'APROVADA', dataNecessidade: dias(20), tokenCotacao: `${PFX}-tok-${Date.now()}` },
  });
  const cot = await db.cotacaoFornecedor.create({
    data: { solicitacaoId: sol.id, fornecedorNome: fornecedor.nome, fornecedorId: fornecedor.id, valorUnitario: 32, prazoEntregaDias: 7 },
  });
  await db.ordemCompra.create({ data: { cotacaoId: cot.id, statusEntrega: 'PENDENTE' } });

  // ── Contas a receber (fluxo de caixa: entradas futuras) ───────────────────
  for (const [i, casa] of casasCriadas.entries()) {
    await db.transacaoFinanceira.create({
      data: {
        descricao: `${PFX} Medição a receber - Casa ${casa.numero}`,
        valor: 12000 + i * 3000, natureza: 'RECEITA', categoria: 'ENTRADA_CLIENTE', status: 'PENDENTE',
        dataVencimento: dias(7 + i * 14), empreendimentoId: emp.id, casaId: casa.id,
      },
    });
  }
  // Conta a pagar global grande e próxima (estressa o caixa)
  await db.transacaoFinanceira.create({
    data: {
      descricao: `${PFX} Empreiteira - medição de mão de obra`, valor: 38000, natureza: 'DESPESA',
      categoria: 'MAO_DE_OBRA', status: 'PENDENTE', dataVencimento: dias(9), empreendimentoId: emp.id,
    },
  });

  // ── SST (registros documentais) ───────────────────────────────────────────
  const trab = await db.trabalhador.create({
    data: { nome: `${PFX} Pedro Alves`, funcao: 'Pedreiro', tipoVinculo: 'PROPRIO', ativo: true },
  });
  await db.dialogoSeguranca.create({ data: { tema: 'Uso obrigatório de EPI', responsavel: 'Téc. Segurança', participantes: [{ nome: 'Pedro' }, { nome: 'João' }], empreendimentoId: emp.id } });
  await db.acidente.create({ data: { trabalhadorId: trab.id, descricao: 'Escoriação leve no braço', tipo: 'TIPICO', gravidade: 'LEVE', diasAfastamento: 0, empreendimentoId: emp.id } });
  await db.checklistNR.create({ data: { norma: 'NR-18', responsavel: 'Eng. Segurança', itens: [{ item: 'Tapumes instalados', conforme: true }, { item: 'Extintores no prazo', conforme: true }, { item: 'EPC em altura', conforme: false }], empreendimentoId: emp.id } });

  return {
    empreendimento: emp.nome,
    casas: casasCriadas.length,
    insumos: insumos.length,
    ocPendente: 1,
  };
}
