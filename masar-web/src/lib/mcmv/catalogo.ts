// Catálogo de conformidade MCMV / Caixa — a fonte da verdade das "demandas da
// construtora" para um empreendimento financiado pela Caixa no Minha Casa Minha
// Vida. Cada item é avaliado de uma de três formas:
//   - AUTO   : o sistema calcula a partir de dados que já existem (não digita nada);
//   - DOC    : satisfeito pela presença (e validade) de um documento no cofre GED;
//   - MANUAL : marcado por ADMIN/ENGENHARIA (com observação).
// O ESTADO por empreendimento fica em ItemConformidadeMCMV (schema); aqui mora só
// a definição estável dos itens. A engine (lib/mcmv/conformidade.ts) cruza os dois.

export type CategoriaMCMV = 'A' | 'B' | 'C' | 'D';
export type TipoAvaliacaoMCMV = 'AUTO' | 'DOC' | 'MANUAL';
export type StatusConformidade =
  | 'PENDENTE'
  | 'EM_ANDAMENTO'
  | 'CONFORME'
  | 'NAO_CONFORME'
  | 'NAO_APLICAVEL';

export const LABEL_CATEGORIA: Record<CategoriaMCMV, string> = {
  A: 'Habilitação da construtora',
  B: 'Empreendimento e terreno',
  C: 'Projeto e unidade',
  D: 'Execução e liberação',
};

// Contexto montado uma vez por empreendimento e passado aos resolvers AUTO.
export interface ContextoAvaliacao {
  faixaMCMV: string | null;
  parametro: {
    tetoValorImovel: number;
    areaUtilMinima: number;
    percentualUnidadesAcessiveis: number;
  } | null;
  casas: { numero: string; quadra: string; valorVendaProjetado: number | null; areaConstruida: number | null; adaptavel: boolean }[];
  marcosAprovados: string[]; // tipos de MarcoBurocratico com dataAprovacaoReal preenchida
  totalAtividadesCronograma: number;
  segurancaBloqueada: boolean;
}

export interface ResultadoAuto {
  status: StatusConformidade;
  detalhe?: string;
}

export interface ItemCatalogo {
  chave: string;
  categoria: CategoriaMCMV;
  titulo: string;
  descricao: string;
  obrigatorio: boolean;
  tipoAvaliacao: TipoAvaliacaoMCMV;
  // Para DOC: tipo de documento (enum TipoDocumentoAnexo) que satisfaz o item.
  tipoDocumento?: string;
  // Para AUTO: função pura que calcula o status a partir do contexto.
  auto?: (ctx: ContextoAvaliacao) => ResultadoAuto;
  // Se true, item obrigatório NÃO-conforme trava a liberação de medição (Slice 3).
  // Curado para os controles nucleares da Caixa (evita travar por marco de fim de obra).
  bloqueiaMedicao?: boolean;
}

// ── Resolvers AUTO reutilizáveis ─────────────────────────────────────────────

function marcoAprovado(tipo: string): (ctx: ContextoAvaliacao) => ResultadoAuto {
  return (ctx) =>
    ctx.marcosAprovados.includes(tipo)
      ? { status: 'CONFORME' }
      : { status: 'PENDENTE', detalhe: 'Marco ainda não aprovado.' };
}

function autoTetoValor(ctx: ContextoAvaliacao): ResultadoAuto {
  if (!ctx.parametro) return { status: 'PENDENTE', detalhe: 'Defina o teto da faixa nos Parâmetros MCMV.' };
  const teto = ctx.parametro.tetoValorImovel;
  const comValor = ctx.casas.filter((c) => c.valorVendaProjetado != null);
  if (comValor.length === 0) return { status: 'PENDENTE', detalhe: 'Nenhuma casa com valor de venda informado.' };
  const acima = comValor.filter((c) => (c.valorVendaProjetado as number) > teto);
  if (acima.length > 0) {
    const nomes = acima.map((c) => `${c.quadra}-${c.numero}`).join(', ');
    return { status: 'NAO_CONFORME', detalhe: `Acima do teto (R$ ${teto.toLocaleString('pt-BR')}): ${nomes}.` };
  }
  if (comValor.length < ctx.casas.length) {
    return { status: 'EM_ANDAMENTO', detalhe: 'Faltam casas sem valor de venda informado.' };
  }
  return { status: 'CONFORME' };
}

function autoAcessibilidade(ctx: ContextoAvaliacao): ResultadoAuto {
  if (!ctx.parametro) return { status: 'PENDENTE', detalhe: 'Defina o % de acessibilidade nos Parâmetros MCMV.' };
  const pct = ctx.parametro.percentualUnidadesAcessiveis;
  const total = ctx.casas.length;
  if (total === 0) return { status: 'PENDENTE', detalhe: 'Nenhuma unidade cadastrada.' };
  const necessarias = Math.ceil((total * pct) / 100);
  const adaptaveis = ctx.casas.filter((c) => c.adaptavel).length;
  if (adaptaveis >= necessarias) return { status: 'CONFORME' };
  return {
    status: 'NAO_CONFORME',
    detalhe: `${adaptaveis} de ${necessarias} unidades adaptáveis (mínimo ${pct}% de ${total}).`,
  };
}

function autoAreaMinima(ctx: ContextoAvaliacao): ResultadoAuto {
  if (!ctx.parametro) return { status: 'PENDENTE', detalhe: 'Defina a área mínima nos Parâmetros MCMV.' };
  const minima = ctx.parametro.areaUtilMinima;
  const comArea = ctx.casas.filter((c) => c.areaConstruida != null);
  if (comArea.length === 0) return { status: 'PENDENTE', detalhe: 'Nenhuma casa com área construída informada.' };
  const abaixo = comArea.filter((c) => (c.areaConstruida as number) < minima);
  if (abaixo.length > 0) {
    const nomes = abaixo.map((c) => `${c.quadra}-${c.numero}`).join(', ');
    return { status: 'NAO_CONFORME', detalhe: `Abaixo da área mínima (${minima} m²): ${nomes}.` };
  }
  if (comArea.length < ctx.casas.length) {
    return { status: 'EM_ANDAMENTO', detalhe: 'Faltam casas sem área construída informada.' };
  }
  return { status: 'CONFORME' };
}

// ── Catálogo ─────────────────────────────────────────────────────────────────

export const CATALOGO_MCMV: ItemCatalogo[] = [
  // A. Habilitação da construtora
  {
    chave: 'pbqp-h',
    categoria: 'A',
    titulo: 'PBQP-H / SiAC vigente',
    descricao: 'Certificação do Programa Brasileiro da Qualidade e Produtividade do Habitat em vigor.',
    obrigatorio: true,
    tipoAvaliacao: 'DOC',
    tipoDocumento: 'PBQP_H_SIAC',
    bloqueiaMedicao: true,
  },
  {
    chave: 'geric',
    categoria: 'A',
    titulo: 'Aprovação de risco de crédito (GERIC)',
    descricao: 'Análise da saúde financeira da construtora aprovada pela Caixa.',
    obrigatorio: true,
    tipoAvaliacao: 'MANUAL',
  },
  {
    chave: 'cnd-federal',
    categoria: 'A',
    titulo: 'CND Federal (Receita/PGFN)',
    descricao: 'Certidão negativa de débitos federais válida.',
    obrigatorio: true,
    tipoAvaliacao: 'DOC',
    tipoDocumento: 'CND_FEDERAL',
  },
  {
    chave: 'cnd-fgts',
    categoria: 'A',
    titulo: 'CRF / CND FGTS',
    descricao: 'Certificado de regularidade do FGTS válido.',
    obrigatorio: true,
    tipoAvaliacao: 'DOC',
    tipoDocumento: 'CND_FGTS',
  },
  {
    chave: 'cnd-trabalhista',
    categoria: 'A',
    titulo: 'CNDT (Trabalhista)',
    descricao: 'Certidão negativa de débitos trabalhistas válida.',
    obrigatorio: true,
    tipoAvaliacao: 'DOC',
    tipoDocumento: 'CND_TRABALHISTA',
  },
  {
    chave: 'art-rrt',
    categoria: 'A',
    titulo: 'ART/RRT do responsável técnico',
    descricao: 'Anotação/Registro de Responsabilidade Técnica (CREA/CAU) do responsável pela obra.',
    obrigatorio: true,
    tipoAvaliacao: 'DOC',
    tipoDocumento: 'ART_RRT',
  },

  // B. Empreendimento e terreno
  {
    chave: 'matricula-terreno',
    categoria: 'B',
    titulo: 'Matrícula do terreno',
    descricao: 'Matrícula atualizada do imóvel comprovando titularidade.',
    obrigatorio: true,
    tipoAvaliacao: 'DOC',
    tipoDocumento: 'MATRICULA_TERRENO',
  },
  {
    chave: 'registro-incorporacao',
    categoria: 'B',
    titulo: 'Registro de incorporação',
    descricao: 'Registro de incorporação no cartório de imóveis (Lei 4.591/64).',
    obrigatorio: true,
    tipoAvaliacao: 'DOC',
    tipoDocumento: 'REGISTRO_INCORPORACAO',
  },
  {
    chave: 'alvara-construcao',
    categoria: 'B',
    titulo: 'Alvará de construção / prefeitura',
    descricao: 'Alvará de construção emitido pela prefeitura (marco ALVARA_PREFEITURA aprovado).',
    obrigatorio: true,
    tipoAvaliacao: 'AUTO',
    auto: marcoAprovado('ALVARA_PREFEITURA'),
  },
  {
    chave: 'projeto-caixa',
    categoria: 'B',
    titulo: 'Aprovação do projeto na Caixa',
    descricao: 'Projeto de engenharia aprovado pela Caixa (marco PROJETO_CAIXA aprovado).',
    obrigatorio: true,
    tipoAvaliacao: 'AUTO',
    auto: marcoAprovado('PROJETO_CAIXA'),
    bloqueiaMedicao: true,
  },
  {
    chave: 'faixa-definida',
    categoria: 'B',
    titulo: 'Enquadramento por faixa definido',
    descricao: 'Faixa do MCMV do empreendimento selecionada (define teto de valor e área mínima).',
    obrigatorio: true,
    tipoAvaliacao: 'AUTO',
    auto: (ctx) =>
      ctx.faixaMCMV ? { status: 'CONFORME' } : { status: 'PENDENTE', detalhe: 'Selecione a faixa do empreendimento.' },
    bloqueiaMedicao: true,
  },

  // C. Projeto e unidade
  {
    chave: 'teto-valor',
    categoria: 'C',
    titulo: 'Valor do imóvel dentro do teto da faixa',
    descricao: 'Valor de venda projetado de cada unidade ≤ teto máximo da faixa.',
    obrigatorio: true,
    tipoAvaliacao: 'AUTO',
    auto: autoTetoValor,
    bloqueiaMedicao: true,
  },
  {
    chave: 'area-minima',
    categoria: 'C',
    titulo: 'Área útil mínima por unidade',
    descricao: 'Área construída de cada unidade ≥ área útil mínima exigida.',
    obrigatorio: true,
    tipoAvaliacao: 'AUTO',
    auto: autoAreaMinima,
  },
  {
    chave: 'especificacoes-minimas',
    categoria: 'C',
    titulo: 'Especificações mínimas de acabamento',
    descricao: 'Memorial/kit de acabamento conforme especificações da Caixa (Portarias 488/489).',
    obrigatorio: true,
    tipoAvaliacao: 'DOC',
    tipoDocumento: 'ESPECIFICACOES_MINIMAS',
  },
  {
    chave: 'desempenho-nbr15575',
    categoria: 'C',
    titulo: 'Laudo de desempenho (NBR 15575)',
    descricao: 'Comprovação de desempenho mínimo (térmico, acústico, estrutural) conforme NBR 15575.',
    obrigatorio: true,
    tipoAvaliacao: 'DOC',
    tipoDocumento: 'LAUDO_DESEMPENHO_NBR15575',
  },
  {
    chave: 'acessibilidade-nbr9050',
    categoria: 'C',
    titulo: 'Laudo de acessibilidade (NBR 9050)',
    descricao: 'Rota acessível e projeto conforme NBR 9050 (laudo/memorial).',
    obrigatorio: true,
    tipoAvaliacao: 'DOC',
    tipoDocumento: 'LAUDO_ACESSIBILIDADE_NBR9050',
  },
  {
    chave: 'unidades-acessiveis',
    categoria: 'C',
    titulo: 'Mínimo de unidades adaptáveis',
    descricao: 'Percentual mínimo de unidades marcadas como adaptáveis/acessíveis por faixa.',
    obrigatorio: true,
    tipoAvaliacao: 'AUTO',
    auto: autoAcessibilidade,
  },

  // D. Execução e liberação
  {
    chave: 'cronograma-definido',
    categoria: 'D',
    titulo: 'Cronograma físico-financeiro definido',
    descricao: 'Cronograma de obra cadastrado para acompanhamento das medições.',
    obrigatorio: true,
    tipoAvaliacao: 'AUTO',
    auto: (ctx) =>
      ctx.totalAtividadesCronograma > 0
        ? { status: 'CONFORME' }
        : { status: 'PENDENTE', detalhe: 'Cadastre o cronograma da obra.' },
  },
  {
    chave: 'seguranca-em-dia',
    categoria: 'D',
    titulo: 'Segurança do trabalho em dia',
    descricao: 'Sem trabalhadores com ASO/EPI vencido (já trava a liberação de medição).',
    obrigatorio: true,
    tipoAvaliacao: 'AUTO',
    // bloqueiaMedicao=false de propósito: a trava de SST já cobre esse gate.
    auto: (ctx) =>
      ctx.segurancaBloqueada
        ? { status: 'NAO_CONFORME', detalhe: 'Há segurança fora de dia (ASO/EPI vencido).' }
        : { status: 'CONFORME' },
  },
  {
    chave: 'habite-se',
    categoria: 'D',
    titulo: 'Habite-se / averbação',
    descricao: 'Habite-se emitido e obra averbada na matrícula (marco HABITESE aprovado).',
    obrigatorio: true,
    tipoAvaliacao: 'AUTO',
    auto: marcoAprovado('HABITESE'),
  },
];

export const CHAVES_CATALOGO = CATALOGO_MCMV.map((i) => i.chave);

export function itemPorChave(chave: string): ItemCatalogo | undefined {
  return CATALOGO_MCMV.find((i) => i.chave === chave);
}
