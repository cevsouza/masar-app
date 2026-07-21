/**
 * Catálogo de planos — a escada comercial em código.
 *
 * O limite fica AQUI, não em coluna do banco, porque o plano é uma decisão
 * comercial que muda para todo mundo de uma vez: mudar o teto do Essencial não
 * pode exigir editar linha por linha de cliente. A coluna `limiteUnidades` da
 * Empresa existe só como EXCEÇÃO negociada (o cliente que comprou 40 unidades
 * no plano de 25); vazia, vale o plano.
 *
 * A unidade de cobrança é a CASA, não o empreendimento — é assim que o preço
 * foi montado e é o número que o cliente reconhece. `limiteObras` (coluna
 * antiga) não é usada por isto e ficou como resíduo do schema.
 */

export interface Plano {
  chave: string;
  rotulo: string;
  /** Teto de unidades ativas. null = sem teto. */
  limiteUnidades: number | null;
  descricao: string;
}

export const PLANOS: Record<string, Plano> = {
  ESSENCIAL: {
    chave: 'ESSENCIAL',
    rotulo: 'Essencial',
    limiteUnidades: 25,
    descricao: 'Até 25 unidades sob gestão.',
  },
  CRESCIMENTO: {
    chave: 'CRESCIMENTO',
    rotulo: 'Crescimento',
    limiteUnidades: 100,
    descricao: 'Até 100 unidades sob gestão.',
  },
  OPERACAO: {
    chave: 'OPERACAO',
    rotulo: 'Operação',
    limiteUnidades: 300,
    descricao: 'Até 300 unidades sob gestão.',
  },
  /**
   * Legado. É o default do schema e o plano da empresa raiz de cada instância
   * (a construtora do dono, que não se cobra). Sem teto de propósito: aplicar
   * um limite retroativo a quem já opera seria travar trabalho em andamento
   * por causa de uma migração.
   */
  PADRAO: {
    chave: 'PADRAO',
    rotulo: 'Padrão (sem limite)',
    limiteUnidades: null,
    descricao: 'Sem teto de unidades. Uso interno e contratos antigos.',
  },
};

export const PLANOS_LISTA: Plano[] = [
  PLANOS.ESSENCIAL,
  PLANOS.CRESCIMENTO,
  PLANOS.OPERACAO,
  PLANOS.PADRAO,
];

/** Plano de uma chave; cai em PADRAO (sem teto) se a chave for desconhecida. */
export function planoDe(chave: string | null | undefined): Plano {
  if (!chave) return PLANOS.PADRAO;
  return PLANOS[chave.trim().toUpperCase()] ?? PLANOS.PADRAO;
}

/**
 * Teto efetivo: a exceção negociada na Empresa vence o plano.
 *
 * `limiteUnidades = 0` é um valor válido e significa zero — por isso o teste é
 * contra null/undefined, não contra falsy.
 */
export function limiteEfetivo(
  plano: string | null | undefined,
  limiteUnidadesDaEmpresa: number | null | undefined,
): number | null {
  if (limiteUnidadesDaEmpresa !== null && limiteUnidadesDaEmpresa !== undefined) {
    return limiteUnidadesDaEmpresa;
  }
  return planoDe(plano).limiteUnidades;
}

/** Fração do teto a partir da qual o cliente é avisado (sem impedir). */
export const AVISO_A_PARTIR_DE = 0.8;

/**
 * A aritmética do teto, isolada de banco e de request.
 *
 * Fica pura de propósito: é aqui que mora o off-by-one que libera a 26ª unidade
 * num plano de 25, e um erro desses não aparece em teste de tela — aparece na
 * fatura do cliente que pagou o plano menor.
 *
 * `cabem` nunca é negativo: quem já passou do teto (contrato antigo, exceção
 * removida) tem zero de espaço, não espaço negativo.
 */
export function decidirTeto(
  consumo: number,
  limite: number | null,
  quantidade = 1,
): { bloqueado: boolean; cabem: number; percentual: number | null; proximoDoLimite: boolean } {
  if (limite === null) {
    return { bloqueado: false, cabem: Infinity, percentual: null, proximoDoLimite: false };
  }
  const cabem = Math.max(0, limite - consumo);
  const percentual = limite === 0 ? 100 : Math.round((consumo / limite) * 100);
  return {
    bloqueado: consumo + quantidade > limite,
    cabem,
    percentual,
    proximoDoLimite: limite > 0 && consumo < limite && consumo / limite >= AVISO_A_PARTIR_DE,
  };
}
