import { rotuloUnidade, type Tipologia } from '@/lib/vocabulario';

/**
 * De quem é a medição — a pergunta que passou a ter duas respostas.
 *
 * Horizontal: o engenheiro credenciado mede CASA A CASA, e a medição pertence
 * à unidade. Vertical: não existe "medição do apartamento 101" — fundação,
 * estrutura e lajes servem todas as unidades ao mesmo tempo, e o que se mede é
 * o avanço da TORRE. A medição pertence ao empreendimento.
 *
 * Este módulo existe para que nenhuma tela precise saber disso. Toda vez que
 * alguém escrever `medicao.casa.numero` direto, o vertical quebra — e quebra
 * em silêncio, com um campo vazio no relatório em vez de um erro.
 */

export interface MedicaoComDono {
  casa?: {
    numero: string;
    quadra: string;
    empreendimento?: { id?: string; nome: string; tipologia?: string | null } | null;
  } | null;
  empreendimento?: { id?: string; nome: string; tipologia?: string | null } | null;
  referencia?: string | null;
}

/** O empreendimento da medição, venha ela por unidade ou direto. */
export function empreendimentoDaMedicao(
  m: MedicaoComDono,
): { id?: string; nome: string; tipologia?: string | null } | null {
  return m.empreendimento ?? m.casa?.empreendimento ?? null;
}

/**
 * Como a medição se chama na tela e no e-mail.
 *
 * Horizontal: "Casa 12 · Quadra A". Vertical: "Torre A" quando o cliente
 * informou a referência, senão o nome do empreendimento — que é o que ele
 * mediu de fato.
 */
export function rotuloMedicao(m: MedicaoComDono): string {
  if (m.casa) {
    return rotuloUnidade(m.casa, m.casa.empreendimento?.tipologia as Tipologia | undefined);
  }
  const emp = m.empreendimento;
  if (!emp) return 'Medição sem origem';
  return m.referencia?.trim() ? `${emp.nome} · ${m.referencia.trim()}` : emp.nome;
}

/** Nome do empreendimento para agrupar/rotular, com fallback explícito. */
export function nomeDoEmpreendimento(m: MedicaoComDono): string {
  return empreendimentoDaMedicao(m)?.nome ?? '(sem empreendimento)';
}

/**
 * Valida a regra que o banco também garante por CHECK: exatamente um dono.
 *
 * Duplicada aqui de propósito — a mensagem do Postgres para violação de CHECK
 * não diz nada de útil a quem está usando a tela.
 */
export function validarDono(entrada: {
  casaId?: string | null;
  empreendimentoId?: string | null;
}): string | null {
  const temCasa = !!entrada.casaId;
  const temEmp = !!entrada.empreendimentoId;
  if (temCasa && temEmp) {
    return 'A medição não pode ser da unidade e do empreendimento ao mesmo tempo.';
  }
  if (!temCasa && !temEmp) {
    return 'Informe a unidade (obra de casas) ou o empreendimento (prédio) da medição.';
  }
  return null;
}
