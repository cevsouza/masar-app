/**
 * Núcleo aritmético PURO do "caixa livre" da construtora — sem Prisma, sem IO.
 *
 * Extraído de lib/caixa.ts para ser testável isoladamente. A função
 * calcularCaixaLivre continua responsável por buscar os dados no banco e
 * delega a matemática para cá. Assim a regra que decide se pode sair dinheiro
 * (guardrail de retirada) fica coberta por testes determinísticos.
 */

export interface ItemOrcado {
  quantidadePlanejada: number;
  custoUnitarioPrevisto: number;
}

export interface TransacaoObra {
  categoria: string;
  valor: number;
}

/** Categorias que contam como custo físico de obra realizado. */
const CATEGORIAS_OBRA = ['MATERIAL', 'MAO_DE_OBRA'];

/** Soma do orçado: Σ (quantidade planejada × custo unitário previsto). */
export function orcadoTotal(itens: ItemOrcado[]): number {
  return itens.reduce((acc, it) => acc + it.quantidadePlanejada * it.custoUnitarioPrevisto, 0);
}

/** Soma do realizado de obra (apenas MATERIAL e MÃO DE OBRA pagos). */
export function realizadoObra(transacoes: TransacaoObra[]): number {
  return transacoes
    .filter((t) => CATEGORIAS_OBRA.includes(t.categoria))
    .reduce((acc, t) => acc + t.valor, 0);
}

/** Custo ainda a incorrer, com piso zero (obra não "sobra" dinheiro para o caixa). */
export function custoAIncorrer(orcado: number, realizado: number): number {
  return Math.max(0, orcado - realizado);
}

/** Caixa livre = (saldo em conta + recebíveis de curto prazo) − custo a incorrer. */
export function caixaLivre(params: {
  saldoBancario: number;
  recebiveisCurtoPrazo: number;
  custoAIncorrer: number;
}): number {
  return params.saldoBancario + params.recebiveisCurtoPrazo - params.custoAIncorrer;
}

/**
 * Guardrail: uma retirada de lucro é bloqueada quando excede o caixa livre.
 * (Mesma regra do POST /api/socios/retiradas.)
 */
export function retiradaBloqueada(valor: number, caixaLivreDisponivel: number): boolean {
  return valor > caixaLivreDisponivel;
}
