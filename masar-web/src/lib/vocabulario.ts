/**
 * O vocabulário das telas, por tipologia do empreendimento.
 *
 * Nasceu de um achado comercial, não técnico: o MCMV em São Paulo capital é
 * majoritariamente vertical, e o sistema falava horizontal em toda tela —
 * "casa", "quadra", "área do lote", "possui quintal". Funcionava para prédio
 * (a quadra vira bloco, o lote fica vazio), mas o construtor de prédio LIA
 * "quintal" durante a demonstração e concluía, com razão, que o produto não
 * era para ele. É uma perda de credibilidade no pior momento possível.
 *
 * Isto muda apenas PALAVRA e VISIBILIDADE de campo. Nenhuma regra, nenhum
 * cálculo, nenhuma trava depende da tipologia — de propósito: a conformidade
 * MCMV e a liberação de medição são iguais nos dois casos, e fazer a regra
 * depender do vocabulário seria criar dois produtos para manter.
 *
 * HORIZONTAL é o padrão, então nada muda para quem já opera.
 */

export type Tipologia = 'HORIZONTAL' | 'VERTICAL';

export interface Vocabulario {
  /** "Casa" / "Apartamento" */
  unidade: string;
  /** "Casas" / "Apartamentos" */
  unidadePlural: string;
  /** Forma curta usada em rótulo composto: "Casa 01" / "Apto 101" */
  unidadeCurta: string;
  /** "Quadra" / "Bloco" */
  agrupador: string;
  /** Rótulo do campo de área do terreno da unidade. */
  areaLote: string;
  /** Campos que só existem em casa térrea. */
  temLote: boolean;
  temQuintal: boolean;
}

const HORIZONTAL: Vocabulario = {
  unidade: 'Casa',
  unidadePlural: 'Casas',
  unidadeCurta: 'Casa',
  agrupador: 'Quadra',
  areaLote: 'Área do lote',
  temLote: true,
  temQuintal: true,
};

const VERTICAL: Vocabulario = {
  unidade: 'Apartamento',
  unidadePlural: 'Apartamentos',
  unidadeCurta: 'Apto',
  agrupador: 'Bloco',
  areaLote: 'Área privativa externa',
  temLote: false,
  temQuintal: false,
};

/**
 * Vocabulário da tipologia. Sem tipologia conhecida (consulta antiga que não
 * trouxe o campo), cai em HORIZONTAL — que é o padrão do banco e o que o
 * sistema sempre fez. Falhar para o neutro deixaria a tela de todo cliente
 * atual mais fria sem que ninguém tivesse pedido.
 */
export function vocabulario(tipologia?: Tipologia | string | null): Vocabulario {
  return tipologia === 'VERTICAL' ? VERTICAL : HORIZONTAL;
}

/**
 * Rótulo de uma unidade: "Casa 01 · Quadra A" ou "Apto 101 · Bloco A".
 *
 * Existe para não haver quatro versões deste mesmo texto espalhadas pelas
 * telas — que foi exatamente como o vocabulário horizontal se enraizou.
 */
export function rotuloUnidade(
  casa: { numero: string; quadra: string },
  tipologia?: Tipologia | string | null,
): string {
  const v = vocabulario(tipologia);
  return `${v.unidadeCurta} ${casa.numero} · ${v.agrupador} ${casa.quadra}`;
}

export const LABEL_TIPOLOGIA: Record<Tipologia, string> = {
  HORIZONTAL: 'Casas / condomínio horizontal',
  VERTICAL: 'Apartamentos / vertical',
};
