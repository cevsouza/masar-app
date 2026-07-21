import { GUIA_SST, guiaDe, type GuiaItem } from '@/lib/mcmv/guia';

/**
 * A pendência que a trava devolve — o formato que INSTRUI.
 *
 * Antes a trava devolvia `string[]`: "ASO vencido: João Silva (validade
 * 10/07/2026)". Diz o que está errado e para aí. Num produto sem suporte, o
 * cliente lê isso e liga para alguém — e o "alguém" é você. Cada campo abaixo
 * responde uma das perguntas que essa ligação faria.
 */
export interface PendenciaTrava extends GuiaItem {
  /** Identificador estável (chave do catálogo, ou 'aso'/'epi'). */
  chave: string;
  /** O que está errado, com nome e data. */
  titulo: string;
  /** Prazo em linguagem de gente: "venceu há 11 dias", "vence amanhã". */
  prazo?: string;
  /**
   * Ordem de atendimento. Menor = primeiro. Não é gravidade abstrata: é a
   * resposta a "por onde eu começo?", que é a pergunta real de quem abriu a
   * tela e viu cinco pendências.
   */
  ordem: number;
}

const DIA_MS = 24 * 60 * 60 * 1000;

/**
 * Prazo em linguagem de obra. "Vencido há 11 dias" comunica urgência; uma data
 * solta obriga o leitor a fazer a conta — e quem está com a medição travada não
 * está com paciência para fazer conta.
 */
export function textoPrazo(validade: Date | string | null | undefined): string | undefined {
  if (!validade) return undefined;
  const d = new Date(validade);
  if (Number.isNaN(d.getTime())) return undefined;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const alvo = new Date(d);
  alvo.setHours(0, 0, 0, 0);
  const dias = Math.round((alvo.getTime() - hoje.getTime()) / DIA_MS);

  const data = d.toLocaleDateString('pt-BR');
  if (dias < -1) return `venceu há ${-dias} dias (${data})`;
  if (dias === -1) return `venceu ontem (${data})`;
  if (dias === 0) return `vence hoje (${data})`;
  if (dias === 1) return `vence amanhã (${data})`;
  return `vence em ${dias} dias (${data})`;
}

/**
 * Quanto mais vencido, mais na frente da fila. Item sem data entra depois dos
 * vencidos e antes dos que ainda vão vencer — não é urgente por prazo, mas é
 * uma pendência aberta.
 */
function ordemPorPrazo(validade: Date | string | null | undefined, base: number): number {
  if (!validade) return base + 500;
  const d = new Date(validade);
  if (Number.isNaN(d.getTime())) return base + 500;
  const dias = Math.round((d.getTime() - Date.now()) / DIA_MS);
  return base + dias; // vencido (negativo) vem primeiro
}

/** Pendência de SST (ASO/EPI), que vale para qualquer obra. */
export function pendenciaSST(
  tipo: 'aso' | 'epi',
  titulo: string,
  validade?: Date | string | null,
): PendenciaTrava {
  return {
    chave: tipo,
    titulo,
    prazo: textoPrazo(validade),
    ordem: ordemPorPrazo(validade, 0),
    ...GUIA_SST[tipo],
  };
}

/** Pendência vinda do catálogo MCMV. */
export function pendenciaMCMV(chave: string, titulo: string, detalhe?: string): PendenciaTrava {
  return {
    chave,
    titulo: detalhe ? `${titulo} — ${detalhe}` : titulo,
    // Documentação do empreendimento entra depois da segurança de pessoas, que
    // é o que embarga a obra hoje; mas antes de qualquer coisa sem prazo.
    ordem: 1000,
    ...guiaDe(chave),
  };
}

/** Ordena e devolve as pendências prontas para a tela. */
export function ordenar(p: PendenciaTrava[]): PendenciaTrava[] {
  return [...p].sort((a, b) => a.ordem - b.ordem);
}

/**
 * Uma frase que resume o bloqueio. Usada no topo do aviso e no corpo do e-mail,
 * onde não cabe a lista inteira.
 */
export function resumo(p: PendenciaTrava[]): string {
  if (p.length === 0) return 'Nenhuma pendência.';
  const vencidas = p.filter((x) => x.prazo?.startsWith('venceu')).length;
  const n = p.length;
  const base = n === 1 ? 'Falta 1 item' : `Faltam ${n} itens`;
  return vencidas > 0
    ? `${base} para liberar esta medição — ${vencidas} já ${vencidas === 1 ? 'vencido' : 'vencidos'}.`
    : `${base} para liberar esta medição.`;
}
