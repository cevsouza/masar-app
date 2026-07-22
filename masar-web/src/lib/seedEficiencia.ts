import { db } from '@/lib/db';
import { criarCenarioDemonstracao } from '@/lib/demonstracao';

/**
 * Seed de demonstração para exercitar TODOS os indicadores de eficiência,
 * financeiros, de cronograma e de segurança (Fases 2.x, 3.x, 4.x, 5.3 e 6.x).
 *
 * Cria DOIS empreendimentos "[SEED] ..." com ~10 casas de perfis distintos
 * (saudável, custo estourado, cronograma atrasado, material desalinhado, quase
 * pronta, concluída e em início), 11 insumos (material/equipamento/mão de obra/
 * taxa) com estoque abaixo/acima do mínimo, ordens de compra pendentes,
 * histórico financeiro espalhado por vários meses (para dar profundidade ao DRE,
 * fluxo de caixa, EVM e apuração de RET), medições, milestones, documentos com
 * validade e uma equipe de trabalhadores com registros de SST.
 *
 * Idempotente: apaga tudo que começa com "[SEED]" antes de recriar. Não toca em
 * dados reais. Somente para dev/demonstração.
 */

const PFX = '[SEED]';
const dias = (n: number) => new Date(Date.now() + n * 86400000);

// Mapeia a categoria do insumo para a categoria financeira da despesa.
const CAT_FIN: Record<string, string> = {
  MATERIAL: 'MATERIAL',
  EQUIPAMENTO: 'MATERIAL',
  MAO_DE_OBRA: 'MAO_DE_OBRA',
  TAXA: 'IMPOSTOS',
};

export async function limparSeed() {
  // Ordem importa: onDelete Restrict em InsumoPadrao e SetNull nos registros de
  // SST (que não cascateiam com o empreendimento).
  const emps = await db.empreendimento.findMany({ where: { nome: { startsWith: PFX } }, select: { id: true } });
  const empIds = emps.map((e) => e.id);
  if (empIds.length) {
    await db.dialogoSeguranca.deleteMany({ where: { empreendimentoId: { in: empIds } } });
    await db.checklistNR.deleteMany({ where: { empreendimentoId: { in: empIds } } });
    await db.acidente.deleteMany({ where: { empreendimentoId: { in: empIds } } });
  }
  await db.solicitacaoCompra.deleteMany({ where: { insumo: { nome: { startsWith: PFX } } } });
  await db.movimentacaoEstoque.deleteMany({ where: { insumo: { nome: { startsWith: PFX } } } });
  // Cascade: casas, orcamento, itens, transacoes, atividades, medicoes, milestones, documentos, linhaBase.
  await db.empreendimento.deleteMany({ where: { nome: { startsWith: PFX } } });
  // Cascade: ASO, EPI e acidentes remanescentes dos trabalhadores de demonstração.
  await db.trabalhador.deleteMany({ where: { nome: { startsWith: PFX } } });
  await db.insumoPadrao.deleteMany({ where: { nome: { startsWith: PFX } } });
  await db.fornecedor.deleteMany({ where: { nome: { startsWith: PFX } } });
  // Cascade: TransacaoBancaria (linhas de conciliação).
  await db.contaBancaria.deleteMany({ where: { nome: { startsWith: PFX } } });
}

interface ItemPlano { insumoIdx: number; qtdPlan: number; custoUnit: number; consumo: number; despesa: number; despesaPendente?: boolean }
interface AtividadePlano { titulo: string; iniDias: number; fimDias: number; concluida: boolean }
interface HistDespesa { valor: number; diasAtras: number; categoria?: string; descricao: string }
interface MedicaoPlano { pct: number; valor: number; status: any; diasAtras: number }
interface CasaPlano {
  numero: string;
  quadra: string;
  statusObra: any;
  percentualObra: number;
  criacaoDias: number;   // dataCriacao (negativo = passado)
  prazoDias: number;     // prazoFisico
  valorVenda?: number;
  itens: ItemPlano[];
  atividades: AtividadePlano[];
  despesaExtraNaoOrcada?: { insumoIdx: number; valor: number };
  historico?: HistDespesa[];       // despesas PAGAS no passado (profundidade do DRE/DFC)
  medicoes?: MedicaoPlano[];
}
interface EmpPlano {
  nome: string;
  localizacao: string;
  aliquotaRET: number;
  inicioDias: number;
  casas: CasaPlano[];
  receitasHistoricas?: { valor: number; diasAtras: number; categoria?: string; descricao: string }[];
  contasReceber?: { valor: number; vencDias: number; descricao: string; casaIdx?: number }[];
  contasPagar?: { valor: number; vencDias: number; descricao: string; categoria: string }[];
  milestones?: { titulo: string; categoria: string; limiteDias: number; concluido: boolean; concDias?: number; casaIdx?: number }[];
  documentos?: { nome: string; vencDias: number | null; tipo: string }[];
}

export async function seedEficiencia() {
  await limparSeed();

  // ── Insumos (saldo global p/ o MRP) ──────────────────────────────────────
  const insumosDef = [
    { nome: `${PFX} Cimento CP-II`, unidadeMedida: 'SC', categoria: 'MATERIAL', saldoEstoque: 30, nivelMinimoEstoque: 60 },   // abaixo
    { nome: `${PFX} Areia Média`, unidadeMedida: 'M3', categoria: 'MATERIAL', saldoEstoque: 180, nivelMinimoEstoque: 20 },     // excesso
    { nome: `${PFX} Brita 1`, unidadeMedida: 'M3', categoria: 'MATERIAL', saldoEstoque: 26, nivelMinimoEstoque: 15 },
    { nome: `${PFX} Aço CA-50`, unidadeMedida: 'KG', categoria: 'MATERIAL', saldoEstoque: 420, nivelMinimoEstoque: 250 },
    { nome: `${PFX} Argamassa AC-II`, unidadeMedida: 'SC', categoria: 'MATERIAL', saldoEstoque: 12, nivelMinimoEstoque: 40 },  // abaixo
    { nome: `${PFX} Cal Hidratada`, unidadeMedida: 'SC', categoria: 'MATERIAL', saldoEstoque: 70, nivelMinimoEstoque: 30 },
    { nome: `${PFX} Vergalhão CA-60`, unidadeMedida: 'KG', categoria: 'MATERIAL', saldoEstoque: 140, nivelMinimoEstoque: 200 }, // abaixo
    { nome: `${PFX} Concreto Usinado`, unidadeMedida: 'M3', categoria: 'MATERIAL', saldoEstoque: 6, nivelMinimoEstoque: 10 },   // abaixo
    { nome: `${PFX} Mão de Obra Pedreiro`, unidadeMedida: 'HORA', categoria: 'MAO_DE_OBRA', saldoEstoque: 0, nivelMinimoEstoque: null },
    { nome: `${PFX} Locação Betoneira`, unidadeMedida: 'HORA', categoria: 'EQUIPAMENTO', saldoEstoque: 0, nivelMinimoEstoque: null },
    { nome: `${PFX} Taxa ART/CREA`, unidadeMedida: 'EMPREITADA', categoria: 'TAXA', saldoEstoque: 0, nivelMinimoEstoque: null },
  ] as const;
  const insumos: any[] = [];
  for (const i of insumosDef) insumos.push(await db.insumoPadrao.create({ data: i as any }));

  // ── Fornecedores ─────────────────────────────────────────────────────────
  const fornecedores: any[] = [];
  fornecedores.push(await db.fornecedor.create({
    data: { nome: `${PFX} Construrápida Materiais`, cnpj: `${PFX}-00.000.000/0001-00`, prazoPagamentoDias: 30, ramo: 'material', avaliacao: 4, ativo: true },
  }));
  fornecedores.push(await db.fornecedor.create({
    data: { nome: `${PFX} Aço Forte Distribuidora`, cnpj: `${PFX}-11.111.111/0001-11`, prazoPagamentoDias: 21, ramo: 'aço/ferro', avaliacao: 5, ativo: true },
  }));
  fornecedores.push(await db.fornecedor.create({
    data: { nome: `${PFX} LocaEquip Betoneiras`, cnpj: `${PFX}-22.222.222/0001-22`, prazoPagamentoDias: 14, ramo: 'equipamento', avaliacao: 3, ativo: true },
  }));

  // ── Contas bancárias ─────────────────────────────────────────────────────
  const conta = await db.contaBancaria.create({ data: { nome: `${PFX} Conta Obra Demo`, saldoAtual: 42000 } });
  await db.contaBancaria.create({ data: { nome: `${PFX} Conta Investimentos Demo`, saldoAtual: 15000 } });

  // ── Helper: cria uma casa completa (orçamento, consumo, despesas, cronograma, medições) ──
  async function criarCasa(empId: string, c: CasaPlano) {
    const casa = await db.casa.create({
      data: {
        numero: c.numero, quadra: c.quadra, empreendimentoId: empId,
        statusObra: c.statusObra, percentualObra: c.percentualObra,
        prazoFisico: dias(c.prazoDias), dataCriacao: dias(c.criacaoDias),
        valorVendaProjetado: c.valorVenda ?? 180000,
      },
    });

    const orc = await db.orcamentoCasa.create({ data: { casaId: casa.id } });
    for (const it of c.itens) {
      const ins = insumos[it.insumoIdx];
      await db.itemOrcamento.create({
        data: { orcamentoCasaId: orc.id, insumoId: ins.id, quantidadePlanejada: it.qtdPlan, custoUnitarioPrevisto: it.custoUnit },
      });
      // consumo físico (saída de estoque para a casa) — só materiais têm saldo
      if (it.consumo > 0 && (ins as any).categoria === 'MATERIAL') {
        await db.movimentacaoEstoque.create({ data: { insumoId: ins.id, quantidade: it.consumo, tipo: 'SAIDA', casaId: casa.id } });
      }
      // custo realizado (despesa do insumo na casa)
      if (it.despesa > 0) {
        await db.transacaoFinanceira.create({
          data: {
            descricao: `${PFX} ${ins.nome.replace(PFX + ' ', '')} - Casa ${c.quadra}${c.numero}`,
            valor: it.despesa, natureza: 'DESPESA', categoria: (CAT_FIN[(ins as any).categoria] ?? 'MATERIAL') as any,
            status: it.despesaPendente ? 'PENDENTE' : 'PAGO',
            dataVencimento: it.despesaPendente ? dias(10 + (it.insumoIdx * 5) % 40) : dias(-15),
            dataPagamento: it.despesaPendente ? null : dias(-15),
            empreendimentoId: empId, casaId: casa.id, insumoId: ins.id, quantidade: it.consumo,
          },
        });
      }
    }
    if (c.despesaExtraNaoOrcada) {
      await db.transacaoFinanceira.create({
        data: {
          descricao: `${PFX} Material fora do orçamento - Casa ${c.quadra}${c.numero}`,
          valor: c.despesaExtraNaoOrcada.valor, natureza: 'DESPESA', categoria: 'MATERIAL' as any, status: 'PAGO',
          dataVencimento: dias(-10), dataPagamento: dias(-10),
          empreendimentoId: empId, casaId: casa.id, insumoId: insumos[c.despesaExtraNaoOrcada.insumoIdx].id, quantidade: 1,
        },
      });
    }
    // histórico de despesas pagas (profundidade do DRE/DFC ao longo dos meses)
    for (const h of c.historico ?? []) {
      await db.transacaoFinanceira.create({
        data: {
          descricao: `${PFX} ${h.descricao} - Casa ${c.quadra}${c.numero}`,
          valor: h.valor, natureza: 'DESPESA', categoria: (h.categoria ?? 'MATERIAL') as any, status: 'PAGO',
          dataVencimento: dias(-h.diasAtras), dataPagamento: dias(-h.diasAtras),
          empreendimentoId: empId, casaId: casa.id,
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
          empreendimentoId: empId, casaId: casa.id,
        },
      });
    }

    for (const m of c.medicoes ?? []) {
      await db.medicaoCaixa.create({
        data: { casaId: casa.id, percentualMedido: m.pct, valorLiberado: m.valor, status: m.status, dataMedicao: dias(-m.diasAtras) },
      });
    }

    return casa;
  }

  // ── Perfis de casa reutilizáveis (cronograma fino) ───────────────────────
  const cronogramaPadrao = (base: number): AtividadePlano[] => [
    { titulo: 'Infraestrutura', iniDias: base, fimDias: base + 25, concluida: true },
    { titulo: 'Fundação', iniDias: base + 25, fimDias: base + 45, concluida: true },
    { titulo: 'Supraestrutura', iniDias: base + 45, fimDias: base + 80, concluida: true },
    { titulo: 'Alvenaria', iniDias: base + 80, fimDias: base + 110, concluida: false },
    { titulo: 'Instalações', iniDias: base + 110, fimDias: base + 140, concluida: false },
  ];

  // ── Empreendimento 1: Residencial Demonstração (6 casas, gradiente) ───────
  const emp1: EmpPlano = {
    nome: `${PFX} Residencial Demonstração`, localizacao: 'Cidade Demo/UF', aliquotaRET: 4, inicioDias: -180,
    casas: [
      { // A01 — SAUDÁVEL
        numero: '01', quadra: 'A', statusObra: 'INSTALACOES', percentualObra: 50, criacaoDias: -90, prazoDias: 40,
        itens: [
          { insumoIdx: 0, qtdPlan: 100, custoUnit: 32, consumo: 50, despesa: 1600 },
          { insumoIdx: 1, qtdPlan: 50, custoUnit: 90, consumo: 25, despesa: 2250 },
          { insumoIdx: 3, qtdPlan: 800, custoUnit: 8, consumo: 400, despesa: 3200 },
          { insumoIdx: 8, qtdPlan: 200, custoUnit: 25, consumo: 100, despesa: 2500 },
        ],
        atividades: [
          { titulo: 'Infraestrutura', iniDias: -90, fimDias: -60, concluida: true },
          { titulo: 'Supraestrutura', iniDias: -60, fimDias: -10, concluida: true },
          { titulo: 'Instalações', iniDias: -10, fimDias: 40, concluida: false },
        ],
        historico: [
          { valor: 4200, diasAtras: 90, categoria: 'MATERIAL', descricao: 'Fundação (concreto/aço)' },
          { valor: 3100, diasAtras: 55, categoria: 'MAO_DE_OBRA', descricao: 'Empreita alvenaria' },
        ],
        medicoes: [{ pct: 30, valor: 40000, status: 'PAGA', diasAtras: 20 }],
      },
      { // A02 — CUSTO ESTOURADO
        numero: '02', quadra: 'A', statusObra: 'ACABAMENTO', percentualObra: 60, criacaoDias: -120, prazoDias: 20,
        itens: [
          { insumoIdx: 0, qtdPlan: 100, custoUnit: 32, consumo: 130, despesa: 5200 },  // estouro
          { insumoIdx: 1, qtdPlan: 40, custoUnit: 90, consumo: 45, despesa: 4300 },
          { insumoIdx: 3, qtdPlan: 700, custoUnit: 8, consumo: 720, despesa: 6800 },
        ],
        atividades: [
          { titulo: 'Infraestrutura', iniDias: -120, fimDias: -90, concluida: true },
          { titulo: 'Supraestrutura', iniDias: -90, fimDias: -40, concluida: true },
          { titulo: 'Acabamento', iniDias: -40, fimDias: 20, concluida: false },
        ],
        historico: [
          { valor: 7800, diasAtras: 100, categoria: 'MATERIAL', descricao: 'Retrabalho estrutural' },
          { valor: 5200, diasAtras: 45, categoria: 'MAO_DE_OBRA', descricao: 'Hora extra equipe' },
        ],
        medicoes: [{ pct: 15, valor: 22000, status: 'AGUARDANDO', diasAtras: 3 }, { pct: 10, valor: 15000, status: 'GLOSADA_REPROVADA', diasAtras: 2 }],
      },
      { // A03 — CRONOGRAMA ATRASADO
        numero: '03', quadra: 'A', statusObra: 'SUPRAESTRUTURA', percentualObra: 25, criacaoDias: -150, prazoDias: 15,
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
        historico: [{ valor: 2600, diasAtras: 120, categoria: 'MATERIAL', descricao: 'Terraplanagem' }],
      },
      { // A04 — MATERIAL DESALINHADO
        numero: '04', quadra: 'A', statusObra: 'INFRAESTRUTURA', percentualObra: 15, criacaoDias: -45, prazoDias: 110,
        itens: [
          { insumoIdx: 0, qtdPlan: 80, custoUnit: 32, consumo: 8, despesa: 260 },     // muito saldo a consumir
          { insumoIdx: 1, qtdPlan: 20, custoUnit: 90, consumo: 40, despesa: 3600 },    // estouro físico
        ],
        atividades: [{ titulo: 'Infraestrutura', iniDias: -45, fimDias: 30, concluida: false }],
        despesaExtraNaoOrcada: { insumoIdx: 4, valor: 900 },
      },
      { // A05 — QUASE PRONTA (saudável, CPI alto)
        numero: '05', quadra: 'A', statusObra: 'VISTORIA_CAIXA', percentualObra: 92, criacaoDias: -160, prazoDias: 10,
        itens: [
          { insumoIdx: 0, qtdPlan: 110, custoUnit: 32, consumo: 100, despesa: 3100 },
          { insumoIdx: 3, qtdPlan: 850, custoUnit: 8, consumo: 800, despesa: 6200 },
          { insumoIdx: 5, qtdPlan: 60, custoUnit: 18, consumo: 55, despesa: 950 },
        ],
        atividades: [
          { titulo: 'Infraestrutura', iniDias: -160, fimDias: -130, concluida: true },
          { titulo: 'Supraestrutura', iniDias: -130, fimDias: -80, concluida: true },
          { titulo: 'Acabamento', iniDias: -80, fimDias: -15, concluida: true },
          { titulo: 'Vistoria', iniDias: -15, fimDias: 10, concluida: false },
        ],
        historico: [
          { valor: 9500, diasAtras: 140, categoria: 'MATERIAL', descricao: 'Estrutura completa' },
          { valor: 6400, diasAtras: 70, categoria: 'MAO_DE_OBRA', descricao: 'Acabamento' },
        ],
        medicoes: [{ pct: 80, valor: 96000, status: 'PAGA', diasAtras: 25 }],
      },
      { // A06 — EM INÍCIO
        numero: '06', quadra: 'A', statusObra: 'APROVACOES', percentualObra: 5, criacaoDias: -20, prazoDias: 160,
        itens: [
          { insumoIdx: 10, qtdPlan: 1, custoUnit: 1800, consumo: 1, despesa: 1800 }, // taxa ART
        ],
        atividades: [{ titulo: 'Aprovações', iniDias: -20, fimDias: 30, concluida: false }],
      },
    ],
    receitasHistoricas: [
      { valor: 88000, diasAtras: 70, categoria: 'MEDICAO_CAIXA', descricao: 'Repasse CEF - competência anterior' },
      { valor: 96000, diasAtras: 8, categoria: 'MEDICAO_CAIXA', descricao: 'Repasse CEF - medições do mês' },
    ],
    contasReceber: [
      { valor: 12000, vencDias: 7, descricao: 'Medição a receber', casaIdx: 0 },
      { valor: 15000, vencDias: 21, descricao: 'Medição a receber', casaIdx: 1 },
      { valor: 18000, vencDias: 35, descricao: 'Medição a receber', casaIdx: 4 },
    ],
    contasPagar: [
      { valor: 38000, vencDias: 9, descricao: 'Empreiteira - medição de mão de obra', categoria: 'MAO_DE_OBRA' },
      { valor: 6400, vencDias: 18, descricao: 'RET a recolher', categoria: 'IMPOSTOS' },
    ],
    milestones: [
      { titulo: 'Alvará de construção', categoria: 'PROJETO', limiteDias: -12, concluido: false },
      { titulo: 'Habite-se Casa A01', categoria: 'OBRA', limiteDias: 5, concluido: false, casaIdx: 0 },
      { titulo: 'Matrícula do terreno', categoria: 'PROJETO', limiteDias: -40, concluido: true, concDias: -38 },
      { titulo: 'Vistoria CEF Casa A05', categoria: 'FINANCEIRO', limiteDias: 12, concluido: false, casaIdx: 4 },
    ],
    documentos: [
      { nome: 'ART de execução', vencDias: 8, tipo: 'OUTRO' },
      { nome: 'Apólice de seguro da obra', vencDias: -6, tipo: 'OUTRO' },
      { nome: 'Licença ambiental', vencDias: 120, tipo: 'ALVARA_LOTEAMENTO' },
      { nome: 'Projeto estrutural', vencDias: null, tipo: 'PROJETO_ESTRUTURAL' },
    ],
  };

  // ── Empreendimento 2: Loteamento Jardim Demo (4 casas, RET social 1%) ─────
  const emp2: EmpPlano = {
    nome: `${PFX} Loteamento Jardim Demo`, localizacao: 'Vila Nova Demo/UF', aliquotaRET: 1, inicioDias: -220,
    casas: [
      { // B01 — CONCLUÍDA
        numero: '01', quadra: 'B', statusObra: 'CONCLUIDA', percentualObra: 100, criacaoDias: -210, prazoDias: -30, valorVenda: 165000,
        itens: [
          { insumoIdx: 0, qtdPlan: 120, custoUnit: 32, consumo: 118, despesa: 3700 },
          { insumoIdx: 3, qtdPlan: 900, custoUnit: 8, consumo: 890, despesa: 7000 },
          { insumoIdx: 8, qtdPlan: 400, custoUnit: 25, consumo: 390, despesa: 9600 },
        ],
        atividades: cronogramaPadrao(-210).map((a) => ({ ...a, concluida: true, fimDias: Math.min(a.fimDias, -30) })),
        historico: [
          { valor: 11000, diasAtras: 180, categoria: 'MATERIAL', descricao: 'Estrutura' },
          { valor: 8200, diasAtras: 90, categoria: 'MAO_DE_OBRA', descricao: 'Acabamento final' },
        ],
        medicoes: [{ pct: 100, valor: 120000, status: 'PAGA', diasAtras: 35 }],
      },
      { // B02 — SAUDÁVEL avançada
        numero: '02', quadra: 'B', statusObra: 'ACABAMENTO', percentualObra: 70, criacaoDias: -130, prazoDias: 30,
        itens: [
          { insumoIdx: 0, qtdPlan: 100, custoUnit: 32, consumo: 68, despesa: 2200 },
          { insumoIdx: 1, qtdPlan: 45, custoUnit: 90, consumo: 30, despesa: 2700 },
          { insumoIdx: 6, qtdPlan: 300, custoUnit: 9, consumo: 200, despesa: 1800 },
        ],
        atividades: [
          { titulo: 'Infraestrutura', iniDias: -130, fimDias: -95, concluida: true },
          { titulo: 'Supraestrutura', iniDias: -95, fimDias: -45, concluida: true },
          { titulo: 'Acabamento', iniDias: -45, fimDias: 30, concluida: false },
        ],
        historico: [{ valor: 5600, diasAtras: 100, categoria: 'MATERIAL', descricao: 'Alvenaria' }],
        medicoes: [{ pct: 55, valor: 60000, status: 'PAGA', diasAtras: 15 }],
      },
      { // B03 — LEVE ATRASO
        numero: '03', quadra: 'B', statusObra: 'INSTALACOES', percentualObra: 45, criacaoDias: -110, prazoDias: 5,
        itens: [
          { insumoIdx: 0, qtdPlan: 95, custoUnit: 32, consumo: 42, despesa: 1350 },
          { insumoIdx: 7, qtdPlan: 40, custoUnit: 350, consumo: 18, despesa: 6400 },
        ],
        atividades: [
          { titulo: 'Infraestrutura', iniDias: -110, fimDias: -80, concluida: true },
          { titulo: 'Supraestrutura', iniDias: -80, fimDias: -25, concluida: true },
          { titulo: 'Instalações', iniDias: -25, fimDias: -3, concluida: false }, // ligeiramente atrasada
        ],
        medicoes: [{ pct: 40, valor: 38000, status: 'AGUARDANDO', diasAtras: 5 }],
      },
      { // B04 — CUSTO ADIANTADO (gasto acima do físico)
        numero: '04', quadra: 'B', statusObra: 'SUPRAESTRUTURA', percentualObra: 30, criacaoDias: -70, prazoDias: 80,
        itens: [
          { insumoIdx: 0, qtdPlan: 90, custoUnit: 32, consumo: 60, despesa: 2100 },
          { insumoIdx: 3, qtdPlan: 650, custoUnit: 8, consumo: 500, despesa: 4400 },
          { insumoIdx: 9, qtdPlan: 80, custoUnit: 45, consumo: 60, despesa: 2900 }, // locação equipamento
        ],
        atividades: [
          { titulo: 'Infraestrutura', iniDias: -70, fimDias: -40, concluida: true },
          { titulo: 'Supraestrutura', iniDias: -40, fimDias: 20, concluida: false },
        ],
        historico: [{ valor: 4100, diasAtras: 50, categoria: 'MATERIAL', descricao: 'Adiantamento de compra' }],
      },
    ],
    receitasHistoricas: [
      { valor: 42000, diasAtras: 40, categoria: 'MEDICAO_CAIXA', descricao: 'Repasse CEF - social' },
      { valor: 51000, diasAtras: 10, categoria: 'MEDICAO_CAIXA', descricao: 'Repasse CEF - social' },
    ],
    contasReceber: [
      { valor: 9000, vencDias: 14, descricao: 'Medição a receber', casaIdx: 1 },
      { valor: 11000, vencDias: 28, descricao: 'Medição a receber', casaIdx: 2 },
    ],
    contasPagar: [
      { valor: 21000, vencDias: 12, descricao: 'Empreiteira - fundação', categoria: 'MAO_DE_OBRA' },
    ],
    milestones: [
      { titulo: 'Habite-se Casa B01', categoria: 'OBRA', limiteDias: -5, concluido: true, concDias: -3, casaIdx: 0 },
      { titulo: 'CND da Receita', categoria: 'FINANCEIRO', limiteDias: 18, concluido: false },
      { titulo: 'Averbação Casa B01', categoria: 'PROJETO', limiteDias: 6, concluido: false, casaIdx: 0 },
    ],
    documentos: [
      { nome: 'Matrícula do loteamento', vencDias: null, tipo: 'MATRICULA_TERRENO' },
      { nome: 'Alvará de loteamento', vencDias: 90, tipo: 'ALVARA_LOTEAMENTO' },
      { nome: 'Projeto hidráulico', vencDias: -3, tipo: 'PROJETO_HIDRAULICO' },
    ],
  };

  // ── Cria os empreendimentos ───────────────────────────────────────────────
  const empsPlano = [emp1, emp2];
  let totalCasas = 0;
  let totalMedicoes = 0;
  let totalMilestones = 0;
  let totalDocumentos = 0;
  const primeiroEmpCasas: { id: string }[] = [];
  let primeiroEmpId = '';

  for (const [ei, ep] of empsPlano.entries()) {
    const emp = await db.empreendimento.create({
      data: {
        nome: ep.nome, localizacao: ep.localizacao, statusLegal: 'EM_OBRA',
        aliquotaRET: ep.aliquotaRET, dataInicio: dias(ep.inicioDias),
      },
    });
    if (ei === 0) primeiroEmpId = emp.id;

    const casasCriadas = [];
    for (const c of ep.casas) {
      casasCriadas.push(await criarCasa(emp.id, c));
      totalCasas++;
      totalMedicoes += (c.medicoes ?? []).length;
    }
    if (ei === 0) primeiroEmpCasas.push(...casasCriadas);

    for (const r of ep.receitasHistoricas ?? []) {
      await db.transacaoFinanceira.create({
        data: {
          descricao: `${PFX} ${r.descricao}`, valor: r.valor, natureza: 'RECEITA',
          categoria: (r.categoria ?? 'MEDICAO_CAIXA') as any, status: 'PAGO',
          dataVencimento: dias(-r.diasAtras), dataPagamento: dias(-r.diasAtras),
          empreendimentoId: emp.id, casaId: casasCriadas[0].id,
        },
      });
    }
    for (const cr of ep.contasReceber ?? []) {
      await db.transacaoFinanceira.create({
        data: {
          descricao: `${PFX} ${cr.descricao}`, valor: cr.valor, natureza: 'RECEITA',
          categoria: 'ENTRADA_CLIENTE' as any, status: 'PENDENTE', dataVencimento: dias(cr.vencDias),
          empreendimentoId: emp.id, casaId: cr.casaIdx != null ? casasCriadas[cr.casaIdx].id : null,
        },
      });
    }
    for (const cp of ep.contasPagar ?? []) {
      await db.transacaoFinanceira.create({
        data: {
          descricao: `${PFX} ${cp.descricao}`, valor: cp.valor, natureza: 'DESPESA',
          categoria: cp.categoria as any, status: 'PENDENTE', dataVencimento: dias(cp.vencDias),
          empreendimentoId: emp.id,
        },
      });
    }
    for (const m of ep.milestones ?? []) {
      await db.milestone.create({
        data: {
          titulo: `${PFX} ${m.titulo}`, categoria: m.categoria, dataLimite: dias(m.limiteDias),
          concluido: m.concluido, dataConclusao: m.concDias != null ? dias(m.concDias) : null,
          empreendimentoId: emp.id, casaId: m.casaIdx != null ? casasCriadas[m.casaIdx].id : null,
        },
      });
      totalMilestones++;
    }
    for (const d of ep.documentos ?? []) {
      await db.documentoAnexo.create({
        data: {
          nome: `${PFX} ${d.nome}`, caminhoArquivo: `/seed/${d.nome.toLowerCase().replace(/\s+/g, '-')}.pdf`,
          status: 'ATIVO', dataVencimento: d.vencDias != null ? dias(d.vencDias) : null, tipo: d.tipo as any,
          empreendimentoId: emp.id,
        },
      });
      totalDocumentos++;
    }
  }

  // ── Em pedido: OCs PENDENTES (aparecem no MRP como "em pedido") ────────────
  const comprasPendentes = [
    { insumoIdx: 0, qtd: 40, unit: 32 },   // Cimento
    { insumoIdx: 6, qtd: 120, unit: 9 },   // Vergalhão (abaixo do mínimo)
    { insumoIdx: 7, qtd: 8, unit: 350 },   // Concreto usinado (abaixo do mínimo)
  ];
  for (const cp of comprasPendentes) {
    const sol = await db.solicitacaoCompra.create({
      data: { empreendimentoId: primeiroEmpId, insumoId: insumos[cp.insumoIdx].id, quantidadeSolicitada: cp.qtd, status: 'APROVADA', dataNecessidade: dias(20), tokenCotacao: `${PFX}-tok-${cp.insumoIdx}-${Date.now()}` },
    });
    const cot = await db.cotacaoFornecedor.create({
      data: { solicitacaoId: sol.id, fornecedorNome: fornecedores[0].nome, fornecedorId: fornecedores[0].id, valorUnitario: cp.unit, prazoEntregaDias: 7 },
    });
    await db.ordemCompra.create({ data: { cotacaoId: cot.id, statusEntrega: 'PENDENTE' } });
  }

  // ── Conciliação bancária: linhas importadas ainda não conciliadas ─────────
  const t = Date.now();
  const linhasBanco = [
    { d: -4, v: 96000, desc: 'TED recebida CEF', tipo: 'CREDITO' },
    { d: -6, v: 5200, desc: 'Débito fornecedor materiais', tipo: 'DEBITO' },
    { d: -1, v: 1200, desc: 'Tarifa bancária', tipo: 'DEBITO' },
    { d: -3, v: 51000, desc: 'TED recebida CEF - social', tipo: 'CREDITO' },
    { d: -8, v: 8200, desc: 'Débito empreiteira', tipo: 'DEBITO' },
  ];
  for (const [i, l] of linhasBanco.entries()) {
    await db.transacaoBancaria.create({
      data: { contaBancariaId: conta.id, data: dias(l.d), valor: l.v, descricao: `${PFX} ${l.desc}`, tipo: l.tipo as any, conciliado: false, origem: null, documentoIdentificador: `${PFX}-ext-${t}-${i}` },
    });
  }

  // ── SST: equipe de trabalhadores com conformidade variada ─────────────────
  const trabsDef = [
    { nome: `${PFX} Pedro Alves`, funcao: 'Pedreiro', tipoVinculo: 'PROPRIO',
      aso: { tipo: 'PERIODICO', real: -380, val: -15, res: 'APTO' },  // ASO VENCIDO
      epis: [{ eq: 'Capacete', ca: '12345', entrega: -200, val: 20 }, { eq: 'Cinto de segurança', ca: '67890', entrega: -400, val: -10 }] }, // 1 a vencer, 1 vencido
    { nome: `${PFX} João Santos`, funcao: 'Servente', tipoVinculo: 'PROPRIO',
      aso: { tipo: 'ADMISSIONAL', real: -120, val: 245, res: 'APTO' },
      epis: [{ eq: 'Botina', ca: '22222', entrega: -100, val: 260 }] },
    { nome: `${PFX} Carlos Lima`, funcao: 'Eletricista', tipoVinculo: 'TERCEIRO',
      aso: { tipo: 'PERIODICO', real: -350, val: 10, res: 'APTO_COM_RESTRICAO' }, // ASO a vencer
      epis: [{ eq: 'Luva isolante', ca: '33333', entrega: -30, val: -2 }] }, // vencido
    { nome: `${PFX} Marcos Rocha`, funcao: 'Encanador', tipoVinculo: 'EMPREITEIRO',
      aso: { tipo: 'PERIODICO', real: -60, val: 300, res: 'APTO' },
      epis: [{ eq: 'Óculos de proteção', ca: '44444', entrega: -20, val: 340 }] },
  ];
  const trabsCriados = [];
  for (const td of trabsDef) {
    const trab = await db.trabalhador.create({
      data: { nome: td.nome, funcao: td.funcao, tipoVinculo: td.tipoVinculo as any, ativo: true },
    });
    trabsCriados.push(trab);
    await db.aSO.create({
      data: { trabalhadorId: trab.id, tipo: td.aso.tipo as any, dataRealizacao: dias(td.aso.real), dataValidade: dias(td.aso.val), resultado: td.aso.res as any, medico: 'Clínica Demo' },
    });
    for (const e of td.epis) {
      await db.entregaEPI.create({
        data: { trabalhadorId: trab.id, equipamento: e.eq, ca: e.ca, quantidade: 1, dataEntrega: dias(e.entrega), dataValidade: dias(e.val) },
      });
    }
  }

  // DDS, acidentes e checklists NR (distribuídos entre os empreendimentos)
  await db.dialogoSeguranca.create({ data: { tema: 'Uso obrigatório de EPI', responsavel: 'Téc. Segurança', participantes: [{ nome: 'Pedro' }, { nome: 'João' }, { nome: 'Carlos' }], empreendimentoId: primeiroEmpId } });
  await db.dialogoSeguranca.create({ data: { tema: 'Trabalho em altura (NR-35)', responsavel: 'Eng. Segurança', participantes: [{ nome: 'Marcos' }, { nome: 'Carlos' }], empreendimentoId: primeiroEmpId } });
  await db.acidente.create({ data: { trabalhadorId: trabsCriados[0].id, descricao: 'Escoriação leve no braço', tipo: 'TIPICO', gravidade: 'LEVE', diasAfastamento: 0, empreendimentoId: primeiroEmpId } });
  await db.acidente.create({ data: { trabalhadorId: trabsCriados[2].id, descricao: 'Choque elétrico de baixa intensidade', tipo: 'TIPICO', gravidade: 'MODERADO', diasAfastamento: 3, catEmitida: true, numeroCat: `${PFX}-CAT-2026-001`, empreendimentoId: primeiroEmpId } });
  await db.checklistNR.create({ data: { norma: 'NR-18', responsavel: 'Eng. Segurança', itens: [{ item: 'Tapumes instalados', conforme: true }, { item: 'Extintores no prazo', conforme: true }, { item: 'EPC em altura', conforme: false }], empreendimentoId: primeiroEmpId } });
  await db.checklistNR.create({ data: { norma: 'NR-35', responsavel: 'Téc. Segurança', itens: [{ item: 'Cinto tipo paraquedista', conforme: true }, { item: 'Linha de vida', conforme: false }], empreendimentoId: primeiroEmpId } });

  // ── Cenário da DEMONSTRAÇÃO comercial ─────────────────────────────────────
  // Os dois empreendimentos acima exercitam os INDICADORES (eficiência, EVM,
  // estoque). Este terceiro existe para a CONVERSA DE VENDA: é vertical, está
  // no regime MCMV e tem a Prontidão Caixa com conteúdo — que era a única das
  // três telas do kit que não funcionava aqui.
  const cenario = await criarCenarioDemonstracao();

  return {
    empreendimentos: empsPlano.length + 1,
    demonstracaoComercial: cenario.empreendimento,
    casas: totalCasas + cenario.unidades,
    insumos: insumos.length,
    fornecedores: fornecedores.length,
    ocPendente: comprasPendentes.length,
    medicoes: totalMedicoes,
    milestones: totalMilestones,
    documentos: totalDocumentos,
    conciliacaoPendente: linhasBanco.length,
    trabalhadores: trabsCriados.length,
  };
}
