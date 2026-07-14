import { db } from '@/lib/db';
import { calcularEvm } from '@/lib/evm';
import { calcularNecessidadeMateriais } from '@/lib/mrp';
import { calcularFluxoCaixaSemanal } from '@/lib/fluxoProjetado';
import { buscarVencimentosSST, statusValidade } from '@/lib/sst';

/**
 * Consultor de Eficiência — motor de recomendações (Fase 7.1, "Motor A").
 *
 * LÊ os indicadores que o sistema já calcula (EVM, MRP, fluxo de caixa, SST,
 * medições, documentos) e APLICA regras determinísticas de priorização para
 * gerar sugestões prescritivas para os sócios: para cada problema detectado nos
 * dados REAIS, um card com "por quê → ação → tela → impacto estimado".
 *
 * 100% determinístico (sem IA/LLM), explicável e sempre atualizado. Read-only.
 *
 * Ordem de prioridade (menor = mais urgente):
 *   0 SEGURANÇA/CAIXA travado · 1 CUSTO · 2 PRAZO · 3 ESTOQUE · 4 CAIXA · 5 COMPLIANCE
 */

export type SeveridadeRec = 'CRITICO' | 'ATENCAO' | 'INFO';
export type CategoriaRec = 'SEGURANCA' | 'CAIXA' | 'CUSTO' | 'PRAZO' | 'ESTOQUE' | 'COMPLIANCE';

export interface Recomendacao {
  id: string;
  prioridade: number;        // 0..5 (0 = mais urgente)
  severidade: SeveridadeRec;
  categoria: CategoriaRec;
  titulo: string;
  porque: string;            // a evidência nos dados
  acao: string;              // o que fazer
  impacto: string | null;    // impacto estimado (R$/dias)
  impactoValor: number;      // usado só para ordenação
  href: string;              // link para a tela
  telaLabel: string;
}

export interface RecomendacoesResult {
  resumo: {
    total: number;
    criticos: number;
    atencao: number;
    info: number;
    status: 'CRITICO' | 'ATENCAO' | 'OK';
    cpiGeral: number | null;
    spiGeral: number | null;
    valorEmJogo: number;     // Σ dos impactos financeiros dos cards
  };
  recomendacoes: Recomendacao[];
}

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const semPfx = (s: string) => s.replace('[SEED] ', '');
const casaLabel = (c?: { quadra: string | null; numero: string } | null) => (c ? `${c.quadra ?? ''}${c.numero}` : '—');

export async function gerarRecomendacoes(): Promise<RecomendacoesResult> {
  const [evm, mrp, fluxo, sst, medicoes, documentos] = await Promise.all([
    calcularEvm({}),
    calcularNecessidadeMateriais({}),
    calcularFluxoCaixaSemanal({}),
    buscarVencimentosSST(),
    db.medicaoCaixa.findMany({
      where: { status: { in: ['AGUARDANDO', 'GLOSADA_REPROVADA'] } },
      include: { casa: { select: { numero: true, quadra: true } } },
    }),
    db.documentoAnexo.findMany({ select: { id: true, nome: true, dataVencimento: true } }),
  ]);

  const recs: Recomendacao[] = [];

  // ── P0 · SEGURANÇA trava a liberação de medição (Fase 3.4) ────────────────
  const asosV = sst.asosVencidos;
  const episV = sst.episVencidos;
  const bloqueado = asosV.length + episV.length > 0;
  const aguardando = medicoes.filter((m) => m.status === 'AGUARDANDO');
  const valorAguardando = aguardando.reduce((a, m) => a + m.valorLiberado, 0);
  if (bloqueado) {
    const nomes = [...new Set([...asosV.map((a) => a.trabalhadorNome), ...episV.map((e) => e.trabalhadorNome)])].map(semPfx);
    recs.push({
      id: 'sst-bloqueio',
      prioridade: 0,
      severidade: 'CRITICO',
      categoria: 'SEGURANCA',
      titulo: valorAguardando > 0 ? `Destrave ${brl(valorAguardando)} em medições regularizando a segurança` : 'Regularize a segurança — a liberação de medição está bloqueada',
      porque: `${asosV.length} ASO(s) e ${episV.length} EPI(s) vencidos (${nomes.join(', ')}) bloqueiam a liberação de qualquer medição enquanto não forem regularizados.`,
      acao: 'Renove os ASOs e reponha os EPIs vencidos na tela de Trabalhadores. Assim que ficarem em dia, a trava some.',
      impacto: valorAguardando > 0 ? `${brl(valorAguardando)} em medições aguardando` : 'Conformidade legal do canteiro',
      impactoValor: valorAguardando,
      href: '/trabalhadores',
      telaLabel: 'Trabalhadores',
    });
  }

  // ── P0 · Medições glosadas (dinheiro reprovado a reapresentar) ────────────
  const glosadas = medicoes.filter((m) => m.status === 'GLOSADA_REPROVADA');
  if (glosadas.length > 0) {
    const v = glosadas.reduce((a, m) => a + m.valorLiberado, 0);
    recs.push({
      id: 'medicao-glosada',
      prioridade: 0,
      severidade: 'CRITICO',
      categoria: 'CAIXA',
      titulo: `Reapresente ${glosadas.length} medição(ões) glosada(s) — ${brl(v)}`,
      porque: `Medições reprovadas pela CEF somam ${brl(v)} que não entraram no caixa. Casas: ${glosadas.map((m) => casaLabel(m.casa)).join(', ')}.`,
      acao: 'Corrija as pendências apontadas na glosa e reapresente a medição à CEF.',
      impacto: `${brl(v)} a recuperar`,
      impactoValor: v,
      href: '/financeiro',
      telaLabel: 'Central Financeira',
    });
  }

  // ── P1 · CUSTO estourando (CPI < 0,9 → estouro projetado) ─────────────────
  const custoRuim = evm.linhas
    .filter((l) => l.cpi != null && l.cpi < 0.9 && l.vac != null)
    .sort((a, b) => (a.vac ?? 0) - (b.vac ?? 0)); // VAC mais negativo primeiro
  for (const l of custoRuim.slice(0, 4)) {
    const estouro = l.vac != null ? Math.max(0, -l.vac) : 0;
    recs.push({
      id: `custo-${l.id}`,
      prioridade: 1,
      severidade: l.cpi != null && l.cpi < 0.75 ? 'CRITICO' : 'ATENCAO',
      categoria: 'CUSTO',
      titulo: `Casa ${l.quadra}${l.numero} estourando o custo (eficiência ${l.cpi!.toFixed(2)})`,
      porque: `Gastou ${brl(l.ac)} para um físico de ${Math.round(l.evPercent)}% (orçado ${brl(l.orcado)}). No ritmo atual o custo final projetado é ${brl(l.eac ?? 0)} — estouro de ${brl(estouro)}.`,
      acao: `Abra "Eficiência de Material" filtrando a Casa ${l.quadra}${l.numero} para achar o insumo que estourou (consumo/perda/preço) antes de comprar mais.`,
      impacto: estouro > 0 ? `${brl(estouro)} de estouro projetado` : null,
      impactoValor: estouro,
      href: '/gestao/eficiencia',
      telaLabel: 'Eficiência de Material',
    });
  }

  // ── P2 · PRAZO (atraso projetado pelo SPI) ────────────────────────────────
  const atrasadas = evm.linhas
    .filter((l) => l.atrasoDias != null && l.atrasoDias > 0)
    .sort((a, b) => (b.atrasoDias ?? 0) - (a.atrasoDias ?? 0));
  for (const l of atrasadas.slice(0, 4)) {
    recs.push({
      id: `prazo-${l.id}`,
      prioridade: 2,
      severidade: (l.atrasoDias ?? 0) > 45 ? 'CRITICO' : 'ATENCAO',
      categoria: 'PRAZO',
      titulo: `Recupere o cronograma da Casa ${l.quadra}${l.numero} (${l.atrasoDias} dias de atraso projetado)`,
      porque: `Físico ${Math.round(l.evPercent)}% vs planejado ${l.pvPercent != null ? Math.round(l.pvPercent) : '—'}% (eficiência de prazo ${l.spi != null ? l.spi.toFixed(2) : '—'}).`,
      acao: 'Priorize a alocação de equipe/empreita para as atividades vencidas desta casa antes de abrir novas frentes.',
      impacto: `${l.atrasoDias} dias de atraso`,
      impactoValor: (l.atrasoDias ?? 0) * 1000,
      href: '/gestao/evm',
      telaLabel: 'Desempenho (EVM)',
    });
  }

  // ── P3 · ESTOQUE: comprar abaixo do mínimo (risco de parar a obra) ────────
  const comprarMin = mrp.linhas
    .filter((l) => l.status === 'COMPRAR' && l.abaixoMinimo)
    .sort((a, b) => b.custoCompra - a.custoCompra);
  if (comprarMin.length > 0) {
    const custo = comprarMin.reduce((a, l) => a + l.custoCompra, 0);
    recs.push({
      id: 'estoque-comprar',
      prioridade: 3,
      severidade: 'ATENCAO',
      categoria: 'ESTOQUE',
      titulo: `Compre ${comprarMin.length} insumo(s) abaixo do mínimo (risco de parar a obra)`,
      porque: `Abaixo do estoque mínimo: ${comprarMin.slice(0, 5).map((l) => semPfx(l.insumoNome)).join(', ')}. Custo estimado ${brl(custo)}.`,
      acao: 'Gere as solicitações de compra na tela "Necessidade de Materiais" (botão Solicitar) — já alinhadas ao plano.',
      impacto: `${brl(custo)} a comprar`,
      impactoValor: custo,
      href: '/gestao/materiais',
      telaLabel: 'Necessidade de Materiais',
    });
  }

  // ── P3 · ESTOQUE: excesso (capital parado) ────────────────────────────────
  const excesso = mrp.linhas
    .filter((l) => l.status === 'EXCESSO' && l.valorSobra > 0)
    .sort((a, b) => b.valorSobra - a.valorSobra);
  if (excesso.length > 0) {
    const v = excesso.reduce((a, l) => a + l.valorSobra, 0);
    recs.push({
      id: 'estoque-excesso',
      prioridade: 3,
      severidade: 'INFO',
      categoria: 'ESTOQUE',
      titulo: `Remaneje ${brl(v)} em estoque parado (excesso)`,
      porque: `Acima da necessidade (capital parado): ${excesso.slice(0, 5).map((l) => semPfx(l.insumoNome)).join(', ')}.`,
      acao: 'Evite novas compras desses itens e remaneje o excedente entre as obras.',
      impacto: `${brl(v)} de capital parado`,
      impactoValor: v,
      href: '/gestao/materiais',
      telaLabel: 'Necessidade de Materiais',
    });
  }

  // ── P4 · CAIXA: ruptura projetada ou contas vencidas ──────────────────────
  if (fluxo.resumo.semanaRuptura) {
    recs.push({
      id: 'caixa-ruptura',
      prioridade: 4,
      severidade: 'CRITICO',
      categoria: 'CAIXA',
      titulo: `Ruptura de caixa projetada na semana de ${fluxo.resumo.semanaRuptura}`,
      porque: `O saldo acumulado fica negativo (menor saldo ${brl(fluxo.resumo.menorSaldo)})${fluxo.resumo.vencidoPagar > 0 ? `. Já há ${brl(fluxo.resumo.vencidoPagar)} em contas vencidas` : ''}.`,
      acao: 'Antecipe recebíveis ou renegocie vencimentos no "Fluxo Projetado" antes da data crítica.',
      impacto: `menor saldo ${brl(fluxo.resumo.menorSaldo)}`,
      impactoValor: Math.abs(fluxo.resumo.menorSaldo),
      href: '/gestao/fluxo-projetado',
      telaLabel: 'Fluxo Projetado',
    });
  } else if (fluxo.resumo.vencidoPagar > 0) {
    recs.push({
      id: 'caixa-vencido',
      prioridade: 4,
      severidade: 'ATENCAO',
      categoria: 'CAIXA',
      titulo: `Regularize ${brl(fluxo.resumo.vencidoPagar)} em contas já vencidas`,
      porque: `Há ${brl(fluxo.resumo.vencidoPagar)} em contas a pagar vencidas em aberto.`,
      acao: 'Dê baixa ou renegocie os títulos vencidos na aba Contas da Central Financeira.',
      impacto: `${brl(fluxo.resumo.vencidoPagar)} vencido`,
      impactoValor: fluxo.resumo.vencidoPagar,
      href: '/financeiro',
      telaLabel: 'Central Financeira',
    });
  }

  // ── P5 · COMPLIANCE: documentos vencidos ──────────────────────────────────
  const docsVencidos = documentos.filter((d) => statusValidade(d.dataVencimento) === 'VENCIDO');
  if (docsVencidos.length > 0) {
    recs.push({
      id: 'ged-vencidos',
      prioridade: 5,
      severidade: 'ATENCAO',
      categoria: 'COMPLIANCE',
      titulo: `Renove ${docsVencidos.length} documento(s) vencido(s)`,
      porque: `Documentos vencidos podem gerar embargo/multa: ${docsVencidos.slice(0, 4).map((d) => semPfx(d.nome)).join(', ')}.`,
      acao: 'Atualize os documentos no "Cofre de Documentos".',
      impacto: `${docsVencidos.length} documento(s)`,
      impactoValor: docsVencidos.length,
      href: '/fiscal/documentos',
      telaLabel: 'Cofre de Documentos',
    });
  }

  // ── P5 · Segurança a vencer (só alerta, ainda não bloqueia) ───────────────
  const aVencer = sst.asosAVencer.length + sst.episAVencer.length;
  if (aVencer > 0) {
    recs.push({
      id: 'sst-a-vencer',
      prioridade: 5,
      severidade: 'INFO',
      categoria: 'SEGURANCA',
      titulo: `${aVencer} exame/EPI vencem nos próximos 30 dias`,
      porque: `${sst.asosAVencer.length} ASO(s) e ${sst.episAVencer.length} EPI(s) estão perto do vencimento — se vencerem, travam a liberação de medição.`,
      acao: 'Agende as renovações com antecedência em Trabalhadores para não travar o caixa depois.',
      impacto: 'Prevenção de bloqueio',
      impactoValor: 0,
      href: '/trabalhadores',
      telaLabel: 'Trabalhadores',
    });
  }

  // ── Ordenação: prioridade → severidade → impacto ──────────────────────────
  const rankSev = (s: SeveridadeRec) => (s === 'CRITICO' ? 0 : s === 'ATENCAO' ? 1 : 2);
  recs.sort((a, b) => a.prioridade - b.prioridade || rankSev(a.severidade) - rankSev(b.severidade) || b.impactoValor - a.impactoValor);

  const criticos = recs.filter((r) => r.severidade === 'CRITICO').length;
  const atencao = recs.filter((r) => r.severidade === 'ATENCAO').length;
  const info = recs.filter((r) => r.severidade === 'INFO').length;
  const valorEmJogo = recs
    .filter((r) => r.categoria === 'CAIXA' || r.categoria === 'SEGURANCA' || r.categoria === 'CUSTO')
    .reduce((a, r) => a + r.impactoValor, 0);

  return {
    resumo: {
      total: recs.length,
      criticos,
      atencao,
      info,
      status: criticos > 0 ? 'CRITICO' : atencao > 0 ? 'ATENCAO' : 'OK',
      cpiGeral: evm.resumo.cpiGeral,
      spiGeral: evm.resumo.spiGeral,
      valorEmJogo,
    },
    recomendacoes: recs,
  };
}
