import { db } from '@/lib/db';
import { CHAVES_CATALOGO } from '@/lib/mcmv/catalogo';

/**
 * O cenário da DEMONSTRAÇÃO, montado de trás para frente a partir das três
 * telas do kit de vendas.
 *
 * O seed antigo criava uma construtora plausível, mas nenhuma das três telas
 * da demonstração funcionava nela: sem regime MCMV a Prontidão Caixa ficava
 * vazia, sem trabalhador e sem documento a TRAVA DE MEDIÇÃO não tinha do que
 * reclamar — e a trava é o argumento de venda inteiro —, e com uma transação
 * financeira só não havia semana de ruptura no fluxo.
 *
 * Aqui o roteiro é o produto:
 *
 *   1. Prontidão Caixa   → checklist com pendências reais e percentual
 *   2. A TRAVA AO VIVO   → tentar liberar a medição e ser recusado, com o
 *                          aviso dizendo por que travou e como resolver
 *   3. Fluxo projetado   → a semana em que o caixa fura
 *
 * ⚠️ TODAS AS DATAS SÃO RELATIVAS A HOJE. Data fixa apodrece: em três meses o
 * ASO passaria a "vencido há 100 dias" e a demonstração viraria retrato de
 * desleixo em vez de urgência. Rodar o seed de novo sempre devolve o cenário
 * no mesmo ponto da história.
 *
 * O empreendimento estrela é VERTICAL e em São Paulo, porque é o que o público
 * inicial constrói — mostrar "casa" e "quadra" para quem faz prédio é perder a
 * conversa na primeira tela.
 */

const dias = (n: number) => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d;
};

export interface ResumoCenario {
  empreendimento: string;
  unidades: number;
  medicaoAguardando: string;
  bloqueadores: string[];
}

export async function criarCenarioDemonstracao(): Promise<ResumoCenario> {
  // ── 1. O empreendimento estrela: vertical, MCMV Faixa 3, São Paulo ────────
  const emp = await db.empreendimento.create({
    data: {
      nome: 'Residencial Vista Paulista',
      localizacao: 'São Paulo/SP',
      endereco: 'Rua das Palmeiras, 1200',
      bairro: 'Vila Prudente',
      cidade: 'São Paulo',
      estado: 'SP',
      statusLegal: 'EM_OBRA',
      tipologia: 'VERTICAL',
      regimeMCMV: true,
      faixaMCMV: 'FAIXA_3',
      aliquotaRET: 4.0,
      dataInicio: dias(-320),
      dataFim: dias(230),
      orcamento: 18_500_000,
      quantidadeCasasPrevistas: 48,
      padraoAreaConstruida: 46.5,
      padraoQuantidadeQuartos: 2,
      padraoQuantidadeBanheiros: 1,
      padraoVagasGaragem: 1,
    },
  });

  // Checklist de conformidade: no fluxo real quem semeia é a rota de criação.
  // Aqui o empreendimento nasce direto no banco, então precisa ser semeado à mão.
  await db.itemConformidadeMCMV.createMany({
    data: CHAVES_CATALOGO.map((chave) => ({ empreendimentoId: emp.id, chave })),
    skipDuplicates: true,
  });

  // ── 2. As unidades — 48 apartamentos em duas torres ───────────────────────
  // Valor abaixo do teto da Faixa 3 de propósito: o item de teto fica CONFORME
  // e não polui a demonstração com um bloqueio que não é o da história.
  const unidades = Array.from({ length: 48 }, (_, i) => {
    const torre = i < 24 ? 'Torre A' : 'Torre B';
    const andar = Math.floor((i % 24) / 4) + 1;
    const posicao = (i % 4) + 1;
    return {
      empreendimentoId: emp.id,
      numero: `${andar}0${posicao}`,
      quadra: torre,
      statusObra: i < 24 ? ('ACABAMENTO' as const) : ('INSTALACOES' as const),
      percentualObra: i < 24 ? 82 : 54,
      areaConstruida: 46.5,
      quantidadeQuartos: 2,
      quantidadeBanheiros: 1,
      vagasGaragem: 1,
      valorVendaProjetado: 285_000,
      // 3% de unidades adaptáveis: mantém o item de acessibilidade conforme.
      unidadeAdaptavelMCMV: i === 0 || i === 24,
    };
  });
  await db.casa.createMany({ data: unidades });

  // ── 3. Marcos: tudo aprovado MENOS o que conta a história ─────────────────
  // Alvará e projeto Caixa aprovados; é o DOCUMENTO do alvará que vai estar
  // vencido, que é o caso real — o alvará saiu e depois expirou no meio da obra.
  await db.marcoBurocratico.createMany({
    data: [
      { empreendimentoId: emp.id, tipo: 'ALVARA_PREFEITURA', dataProtocolo: dias(-340), prazoEsperadoDias: 60, dataAprovacaoReal: dias(-300) },
      { empreendimentoId: emp.id, tipo: 'PROJETO_CAIXA', dataProtocolo: dias(-330), prazoEsperadoDias: 45, dataAprovacaoReal: dias(-295) },
    ],
  });

  // ── 4. O cofre: documentos com validade, um deles JÁ VENCIDO ──────────────
  await db.documentoAnexo.createMany({
    data: [
      {
        nome: 'Alvará de construção — Prefeitura de São Paulo',
        caminhoArquivo: 'demonstracao/alvara-construcao.pdf',
        tipo: 'ALVARA_CONSTRUCAO',
        empreendimentoId: emp.id,
        dataVencimento: dias(-6),
        status: 'ATIVO',
      },
      {
        nome: 'PBQP-H / SiAC — certificado nível A',
        caminhoArquivo: 'demonstracao/pbqp-h.pdf',
        tipo: 'PBQP_H_SIAC',
        empreendimentoId: emp.id,
        dataVencimento: dias(190),
        status: 'ATIVO',
      },
      {
        nome: 'CND Federal (Receita/PGFN)',
        caminhoArquivo: 'demonstracao/cnd-federal.pdf',
        tipo: 'CND_FEDERAL',
        empreendimentoId: emp.id,
        dataVencimento: dias(21),
        status: 'ATIVO',
      },
      {
        nome: 'CRF FGTS',
        caminhoArquivo: 'demonstracao/crf-fgts.pdf',
        tipo: 'CND_FGTS',
        empreendimentoId: emp.id,
        // Vence em 4 dias: é o que o alerta diário pega ANTES de virar problema.
        dataVencimento: dias(4),
        status: 'ATIVO',
      },
      {
        nome: 'ART do responsável técnico — CREA-SP',
        caminhoArquivo: 'demonstracao/art.pdf',
        tipo: 'ART_RRT',
        empreendimentoId: emp.id,
        dataVencimento: dias(240),
        status: 'ATIVO',
      },
    ],
  });

  // ── 5. A equipe — e o ASO que trava a medição ─────────────────────────────
  const equipe = [
    { nome: 'João Batista Ferreira', funcao: 'Pedreiro', validadeASO: -11 },
    { nome: 'Maria Aparecida Souza', funcao: 'Serralheira', validadeASO: 96 },
    { nome: 'Antônio Carlos Lima', funcao: 'Mestre de obras', validadeASO: 145 },
    { nome: 'Rafael Nunes da Silva', funcao: 'Eletricista', validadeASO: 12 },
    { nome: 'Sebastião Rocha', funcao: 'Servente', validadeASO: 210 },
  ];

  for (const [i, p] of equipe.entries()) {
    const t = await db.trabalhador.create({
      data: {
        nome: p.nome,
        funcao: p.funcao,
        cpf: `${100 + i}.${200 + i}.${300 + i}-0${i}`,
        tipoVinculo: 'PROPRIO',
        dataAdmissao: dias(-280 + i * 15),
        ativo: true,
      },
    });
    await db.aSO.create({
      data: {
        trabalhadorId: t.id,
        tipo: 'PERIODICO',
        dataRealizacao: dias(p.validadeASO - 365),
        dataValidade: dias(p.validadeASO),
        resultado: 'APTO',
        medico: 'Clínica Med Trabalho SP',
      },
    });
    await db.entregaEPI.create({
      data: {
        trabalhadorId: t.id,
        equipamento: 'Capacete classe B',
        ca: `CA-${31000 + i}`,
        dataEntrega: dias(-200 + i * 10),
        // O do João também vencido: dois motivos com o mesmo nome reforçam a história.
        dataValidade: i === 0 ? dias(-3) : dias(120 + i * 20),
      },
    });
  }

  // ── 6. A medição AGUARDANDO — o botão que ele vai te ver apertar ──────────
  const medicao = await db.medicaoCaixa.create({
    data: {
      empreendimentoId: emp.id,
      referencia: 'Torre A — 8ª medição',
      percentualMedido: 82,
      valorLiberado: 1_420_000,
      status: 'AGUARDANDO',
      dataMedicao: dias(-2),
    },
  });

  // ── 7. Cronograma: uma atividade atrasada, visível na hora ────────────────
  await db.atividadeCronograma.createMany({
    data: [
      { empreendimentoId: emp.id, titulo: 'Fundação — Torre A', escopo: 'GERAL', status: 'CONCLUIDA', ordem: 1, dataInicioPrevista: dias(-310), dataFimPrevista: dias(-250), dataFimReal: dias(-248), percentualConcluido: 100 },
      { empreendimentoId: emp.id, titulo: 'Estrutura — Torre A', escopo: 'GERAL', status: 'CONCLUIDA', ordem: 2, dataInicioPrevista: dias(-250), dataFimPrevista: dias(-120), dataFimReal: dias(-110), percentualConcluido: 100 },
      { empreendimentoId: emp.id, titulo: 'Alvenaria e instalações — Torre A', escopo: 'GERAL', status: 'INSTALACOES', ordem: 3, dataInicioPrevista: dias(-120), dataFimPrevista: dias(-14), percentualConcluido: 88 },
      { empreendimentoId: emp.id, titulo: 'Acabamento — Torre A', escopo: 'GERAL', status: 'ACABAMENTO', ordem: 4, dataInicioPrevista: dias(-30), dataFimPrevista: dias(70), percentualConcluido: 35 },
      { empreendimentoId: emp.id, titulo: 'Estrutura — Torre B', escopo: 'GERAL', status: 'SUPRAESTRUTURA', ordem: 5, dataInicioPrevista: dias(-90), dataFimPrevista: dias(60), percentualConcluido: 54 },
    ],
  });

  // ── 8. O caixa: a semana da ruptura ───────────────────────────────────────
  // Saídas grandes concentradas antes da entrada da medição — que é justamente
  // a medição travada. A conversa se fecha sozinha: o dinheiro que falta é o
  // que está preso na pendência da tela anterior.
  await db.transacaoFinanceira.createMany({
    data: [
      { descricao: 'Folha de obra — mês corrente', valor: 312_000, dataVencimento: dias(6), natureza: 'DESPESA', status: 'PENDENTE', categoria: 'MAO_DE_OBRA', empreendimentoId: emp.id },
      { descricao: 'Concreto usinado — Torre B', valor: 186_400, dataVencimento: dias(9), natureza: 'DESPESA', status: 'PENDENTE', categoria: 'MATERIAL', empreendimentoId: emp.id },
      { descricao: 'Esquadrias de alumínio — 1ª parcela', valor: 244_000, dataVencimento: dias(11), natureza: 'DESPESA', status: 'PENDENTE', categoria: 'MATERIAL', empreendimentoId: emp.id },
      { descricao: 'Revestimento cerâmico — Torre A', valor: 158_000, dataVencimento: dias(13), natureza: 'DESPESA', status: 'PENDENTE', categoria: 'MATERIAL', empreendimentoId: emp.id },
      // A entrada que salvaria a semana — e que depende da medição travada.
      { descricao: 'Medição 8 — Torre A (Caixa)', valor: 1_420_000, dataVencimento: dias(15), natureza: 'RECEITA', status: 'PENDENTE', categoria: 'MEDICAO_CAIXA', empreendimentoId: emp.id },
      { descricao: 'Medição 7 — Torre A (Caixa)', valor: 1_180_000, dataVencimento: dias(-28), natureza: 'RECEITA', status: 'PAGO', categoria: 'MEDICAO_CAIXA', empreendimentoId: emp.id, dataPagamento: dias(-26) },
      { descricao: 'Folha de obra — mês anterior', valor: 298_000, dataVencimento: dias(-24), natureza: 'DESPESA', status: 'PAGO', categoria: 'MAO_DE_OBRA', empreendimentoId: emp.id, dataPagamento: dias(-24) },
    ],
  });

  return {
    empreendimento: emp.nome,
    unidades: unidades.length,
    medicaoAguardando: medicao.referencia ?? 'Torre A',
    bloqueadores: [
      'ASO de João Batista Ferreira vencido há 11 dias',
      'EPI (capacete) de João Batista Ferreira vencido há 3 dias',
      'Alvará de construção vencido há 6 dias no cofre',
    ],
  };
}
