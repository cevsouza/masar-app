import { db } from '@/lib/db';
import { pendenciaMCMV, ordenar, type PendenciaTrava } from '@/lib/travaMedicao';
import { bloqueioSegurancaMedicao } from '@/lib/sst';
import {
  CATALOGO_MCMV,
  LABEL_CATEGORIA,
  type CategoriaMCMV,
  type ContextoAvaliacao,
  type ItemCatalogo,
  type StatusConformidade,
} from '@/lib/mcmv/catalogo';

// Engine de conformidade MCMV. Cruza o catálogo (definição estável dos itens)
// com o ESTADO por empreendimento (ItemConformidadeMCMV) e com os dados reais
// (casas, marcos, documentos, cronograma, segurança) para calcular, na leitura,
// o status de cada item — AUTO calculado, DOC pela presença/validade do arquivo,
// MANUAL pelo estado gravado. Nada aqui grava no banco.

export interface ItemAvaliado {
  chave: string;
  categoria: CategoriaMCMV;
  categoriaLabel: string;
  titulo: string;
  descricao: string;
  obrigatorio: boolean;
  tipoAvaliacao: ItemCatalogo['tipoAvaliacao'];
  status: StatusConformidade;
  detalhe?: string;
  observacao?: string | null;
  bloqueiaMedicao: boolean;
  itemId?: string; // id do ItemConformidadeMCMV (para PATCH de itens MANUAL)
}

export interface ResumoConformidade {
  totalObrigatorios: number;
  conformes: number;
  percentual: number; // 0..100 sobre obrigatórios não-N/A
  pendencias: number;
  naoConformes: number;
}

export interface ConformidadeResultado {
  regimeMCMV: boolean;
  faixaMCMV: string | null;
  itens: ItemAvaliado[];
  resumo: ResumoConformidade;
  bloqueadores: string[]; // motivos em texto puro (log, e-mail)
  pendenciasBloqueio: PendenciaTrava[]; // as mesmas, com o que fazer a respeito
}

// Documento válido = existe com o tipo pedido e não está vencido.
function docValido(
  documentos: { tipo: string | null; status: string; dataVencimento: Date | null }[],
  tipo: string,
): StatusConformidade {
  const doDoTipo = documentos.filter((d) => d.tipo === tipo);
  if (doDoTipo.length === 0) return 'PENDENTE';
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const algumValido = doDoTipo.some(
    (d) => d.status !== 'VENCIDO' && (!d.dataVencimento || new Date(d.dataVencimento) >= hoje),
  );
  return algumValido ? 'CONFORME' : 'NAO_CONFORME';
}

/**
 * Estado do alvará no cofre. Vencido = existe documento do tipo e a data já
 * passou (ou o status foi marcado VENCIDO). Documento sem data de vencimento
 * conta como presente, não como vencido — ausência de data é dado faltando,
 * não irregularidade.
 */
function estadoDoAlvara(
  documentos: { tipo: string | null; status: string; dataVencimento: Date | null }[],
): ContextoAvaliacao['alvara'] {
  const doAlvara = documentos.filter((d) => d.tipo === 'ALVARA_CONSTRUCAO');
  if (doAlvara.length === 0) return { temDocumento: false, vencido: false, vencimento: null };

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const valido = doAlvara.find(
    (d) => d.status !== 'VENCIDO' && (!d.dataVencimento || new Date(d.dataVencimento) >= hoje),
  );
  if (valido) return { temDocumento: true, vencido: false, vencimento: valido.dataVencimento };

  // Nenhum válido: reporta o que venceu mais tarde, que é o mais recente.
  const maisRecente = doAlvara
    .map((d) => d.dataVencimento)
    .filter((d): d is Date => !!d)
    .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
  return { temDocumento: true, vencido: true, vencimento: maisRecente };
}

async function montarContexto(
  empreendimentoId: string,
  faixaMCMV: string | null,
  documentos: { tipo: string | null; status: string; dataVencimento: Date | null }[],
): Promise<ContextoAvaliacao> {
  const [casas, marcos, totalAtividadesCronograma, parametro, seguranca] = await Promise.all([
    db.casa.findMany({
      where: { empreendimentoId },
      select: { numero: true, quadra: true, valorVendaProjetado: true, areaConstruida: true, unidadeAdaptavelMCMV: true },
    }),
    db.marcoBurocratico.findMany({
      where: { empreendimentoId, dataAprovacaoReal: { not: null } },
      select: { tipo: true },
    }),
    db.atividadeCronograma.count({ where: { empreendimentoId } }),
    faixaMCMV
      ? db.parametroMCMV.findFirst({ where: { faixa: faixaMCMV as any } })
      : Promise.resolve(null),
    bloqueioSegurancaMedicao(),
  ]);

  return {
    faixaMCMV,
    parametro: parametro
      ? {
          tetoValorImovel: Number(parametro.tetoValorImovel),
          areaUtilMinima: Number(parametro.areaUtilMinima),
          percentualUnidadesAcessiveis: parametro.percentualUnidadesAcessiveis,
        }
      : null,
    casas: casas.map((c) => ({
      numero: c.numero,
      quadra: c.quadra,
      valorVendaProjetado: c.valorVendaProjetado != null ? Number(c.valorVendaProjetado) : null,
      areaConstruida: c.areaConstruida != null ? Number(c.areaConstruida) : null,
      adaptavel: c.unidadeAdaptavelMCMV,
    })),
    marcosAprovados: marcos.map((m) => m.tipo),
    totalAtividadesCronograma,
    segurancaBloqueada: seguranca.bloqueado,
    alvara: estadoDoAlvara(documentos),
  };
}

/**
 * Avalia o checklist de conformidade MCMV de um empreendimento.
 * Retorna cada item com status calculado, o resumo (% conforme) e a lista de
 * bloqueadores (itens que travam medição — usados no Slice 3).
 */
export async function avaliarConformidade(empreendimentoId: string): Promise<ConformidadeResultado> {
  const emp = await db.empreendimento.findUnique({
    where: { id: empreendimentoId },
    select: {
      regimeMCMV: true,
      faixaMCMV: true,
      documentos: { select: { tipo: true, status: true, dataVencimento: true } },
      itensConformidadeMCMV: {
        select: { id: true, chave: true, status: true, observacao: true },
      },
    },
  });

  if (!emp) {
    throw new Error('Empreendimento não encontrado');
  }

  const faixa = emp.faixaMCMV as string | null;
  const ctx = await montarContexto(empreendimentoId, faixa, emp.documentos);
  const estadoPorChave = new Map(emp.itensConformidadeMCMV.map((i) => [i.chave, i]));

  const itens: ItemAvaliado[] = CATALOGO_MCMV.map((cat) => {
    const estado = estadoPorChave.get(cat.chave);
    let status: StatusConformidade;
    let detalhe: string | undefined;

    // NÃO_APLICÁVEL é uma marcação manual que vale para qualquer tipo de item.
    if (estado?.status === 'NAO_APLICAVEL') {
      status = 'NAO_APLICAVEL';
    } else if (cat.tipoAvaliacao === 'AUTO' && cat.auto) {
      const r = cat.auto(ctx);
      status = r.status;
      detalhe = r.detalhe;
    } else if (cat.tipoAvaliacao === 'DOC' && cat.tipoDocumento) {
      status = docValido(emp.documentos, cat.tipoDocumento);
      if (status === 'PENDENTE') detalhe = 'Anexe o documento no Cofre.';
      else if (status === 'NAO_CONFORME') detalhe = 'Documento vencido — atualize no Cofre.';
    } else {
      // MANUAL
      status = estado?.status ?? 'PENDENTE';
    }

    return {
      chave: cat.chave,
      categoria: cat.categoria,
      categoriaLabel: LABEL_CATEGORIA[cat.categoria],
      titulo: cat.titulo,
      descricao: cat.descricao,
      obrigatorio: cat.obrigatorio,
      tipoAvaliacao: cat.tipoAvaliacao,
      status,
      detalhe,
      observacao: estado?.observacao ?? null,
      bloqueiaMedicao: !!cat.bloqueiaMedicao,
      itemId: estado?.id,
    };
  });

  const obrigatorios = itens.filter((i) => i.obrigatorio && i.status !== 'NAO_APLICAVEL');
  const conformes = obrigatorios.filter((i) => i.status === 'CONFORME').length;
  const naoConformes = obrigatorios.filter((i) => i.status === 'NAO_CONFORME').length;
  const pendencias = obrigatorios.filter((i) => i.status === 'PENDENTE' || i.status === 'EM_ANDAMENTO').length;
  const percentual = obrigatorios.length > 0 ? Math.round((conformes / obrigatorios.length) * 100) : 100;

  const itensBloqueadores = itens.filter(
    (i) => i.bloqueiaMedicao && i.status !== 'CONFORME' && i.status !== 'NAO_APLICAVEL',
  );
  const bloqueadores = itensBloqueadores.map(
    (i) => `${i.titulo}${i.detalhe ? ` — ${i.detalhe}` : ''}`,
  );
  const pendenciasBloqueio = itensBloqueadores.map((i) =>
    pendenciaMCMV(i.chave, i.titulo, i.detalhe ?? undefined),
  );

  return {
    regimeMCMV: emp.regimeMCMV,
    faixaMCMV: faixa,
    itens,
    resumo: { totalObrigatorios: obrigatorios.length, conformes, percentual, pendencias, naoConformes },
    bloqueadores,
    pendenciasBloqueio,
  };
}

/**
 * Trava de liberação de medição por conformidade MCMV (Slice 3). Só se aplica a
 * empreendimentos no regime MCMV; espelha bloqueioSegurancaMedicao() do SST.
 * A segurança em si continua sendo travada pela trava de SST (não duplicamos aqui).
 */
export async function bloqueioConformidadeMCMV(empreendimentoId: string): Promise<{
  bloqueado: boolean;
  motivos: string[];
  pendencias: PendenciaTrava[];
}> {
  const r = await avaliarConformidade(empreendimentoId);
  if (!r.regimeMCMV) return { bloqueado: false, motivos: [], pendencias: [] };
  return {
    bloqueado: r.bloqueadores.length > 0,
    motivos: r.bloqueadores,
    pendencias: ordenar(r.pendenciasBloqueio),
  };
}
