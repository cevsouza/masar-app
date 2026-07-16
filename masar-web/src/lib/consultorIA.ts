import { gerarRecomendacoes } from '@/lib/recomendacoes';
import { calcularEvm } from '@/lib/evm';

/**
 * Consultor de Eficiência — camada conversacional (Fase 7.3, "Motor B").
 *
 * Por cima do motor de regras determinístico (lib/recomendacoes), esta camada
 * usa um LLM (Google Gemini) para responder perguntas em linguagem natural dos
 * sócios ("o que priorizo essa semana?", "por que a casa A02 está no vermelho?").
 *
 * O LLM recebe os indicadores e recomendações JÁ CALCULADOS como contexto e é
 * instruído a responder SOMENTE com base neles (sem inventar números). Fail-closed:
 * sem GEMINI_API_KEY configurada, retorna uma mensagem amigável em vez de erro.
 */

import { chamarGemini, iaConfigurada } from '@/lib/gemini';

export { iaConfigurada };

export interface TurnoChat {
  role: 'user' | 'model';
  text: string;
}

export interface RespostaConsultor {
  configurado: boolean;
  resposta: string;
  erro?: boolean;
  detalhe?: string;
}

const SYSTEM_PROMPT = `Você é o "Consultor de Eficiência" da Masar Empreendimentos, um ERP de construção civil (obras do programa MCMV / Caixa Econômica). Seu papel é ajudar os SÓCIOS a interpretar os indicadores e decidir o que fazer no dia a dia.

REGRAS OBRIGATÓRIAS:
- Responda SEMPRE em português do Brasil, de forma objetiva, prática e cordial.
- Baseie-se EXCLUSIVAMENTE nos DADOS fornecidos no bloco de contexto. NUNCA invente números, casas, valores, nomes ou fatos que não estejam nos dados.
- Se a pergunta não puder ser respondida com os dados disponíveis, diga isso com honestidade e sugira qual tela do sistema o sócio deve consultar.
- Pense como consultor de gestão: priorize por IMPACTO (dinheiro travado/estourado e prazo), explique o "porquê" e recomende AÇÕES concretas.
- Ao indicar onde agir, use os nomes das telas do sistema (ex.: "Eficiência de Material", "Necessidade de Materiais", "Fluxo Projetado", "Desempenho (EVM)", "Trabalhadores", "Cofre de Documentos", "Central Financeira").
- Glossário: CPI = eficiência de custo (abaixo de 1 = gastou mais do que entregou). SPI = eficiência de prazo (abaixo de 1 = atrasado). VAC/estouro projetado = quanto o custo final deve ultrapassar o orçado.
- Insight importante do sistema: ASO/EPI vencidos (segurança) BLOQUEIAM a liberação de medições — ou seja, segurança vencida trava dinheiro.
- Seja conciso: vá direto ao ponto e use listas curtas quando ajudar. Formate valores em reais.`;

// Monta um contexto compacto (indicadores + recomendações + resumo por casa).
async function montarContexto() {
  const [rec, evm] = await Promise.all([gerarRecomendacoes(), calcularEvm({})]);

  const casas = evm.linhas
    .filter((l) => l.status !== 'SEM_BASE')
    .map((l) => ({
      casa: `${l.quadra}${l.numero}`,
      empreendimento: l.empreendimentoNome.replace('[SEED] ', ''),
      fisicoPct: Math.round(l.evPercent),
      planejadoPct: l.pvPercent != null ? Math.round(l.pvPercent) : null,
      cpi: l.cpi != null ? Number(l.cpi.toFixed(2)) : null,
      spi: l.spi != null ? Number(l.spi.toFixed(2)) : null,
      atrasoDias: l.atrasoDias,
      estouroProjetado: l.vac != null && l.vac < 0 ? Math.round(-l.vac) : 0,
      status: l.status,
    }));

  return {
    resumoGeral: {
      status: rec.resumo.status,
      cpiGeral: rec.resumo.cpiGeral != null ? Number(rec.resumo.cpiGeral.toFixed(2)) : null,
      spiGeral: rec.resumo.spiGeral != null ? Number(rec.resumo.spiGeral.toFixed(2)) : null,
      valorEmJogo: Math.round(rec.resumo.valorEmJogo),
      recomendacoesCriticas: rec.resumo.criticos,
    },
    recomendacoes: rec.recomendacoes.map((r) => ({
      prioridade: r.prioridade,
      severidade: r.severidade,
      categoria: r.categoria,
      titulo: r.titulo,
      porque: r.porque,
      acao: r.acao,
      impacto: r.impacto,
      tela: r.telaLabel,
    })),
    casas,
  };
}

// Garante que a conversa comece por 'user' e não estoure o histórico.
function sanitizarHistorico(historico: TurnoChat[]): TurnoChat[] {
  const recorte = historico.slice(-8);
  while (recorte.length > 0 && recorte[0].role !== 'user') recorte.shift();
  return recorte;
}

export async function responderConsultor(pergunta: string, historico: TurnoChat[] = []): Promise<RespostaConsultor> {
  if (!iaConfigurada()) {
    return {
      configurado: false,
      resposta:
        'A IA conversacional ainda não está ligada. Um administrador precisa definir a variável de ambiente GEMINI_API_KEY (chave gratuita do Google AI Studio) no servidor. Enquanto isso, use o Consultor de Eficiência acima — as recomendações priorizadas continuam funcionando sem IA.',
    };
  }

  const contexto = await montarContexto();
  const systemText = `${SYSTEM_PROMPT}\n\n=== DADOS ATUAIS DO SISTEMA (JSON) ===\n${JSON.stringify(contexto)}`;

  const contents = [
    ...sanitizarHistorico(historico).map((h) => ({ role: h.role, parts: [{ text: h.text }] })),
    { role: 'user', parts: [{ text: pergunta }] },
  ];

  try {
    const resultado = await chamarGemini({
      system_instruction: { parts: [{ text: systemText }] },
      contents,
      generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
    });

    if (!resultado.ok) {
      const s = resultado.status;
      const dica =
        s === 404
          ? ' (nenhum modelo Gemini disponível para esta chave — verifique a chave/projeto no Google)'
          : s === 403
            ? ' (chave inválida ou sem permissão)'
            : s === 429
              ? ' (cota da API Gemini excedida — aguarde alguns minutos ou ative faturamento no Google)'
              : s === 400
                ? ' (requisição rejeitada pelo modelo)'
                : '';
      return { configurado: true, erro: true, resposta: `Não consegui falar com a IA agora — erro ${s}${dica}. Tente novamente em instantes.`, detalhe: resultado.erro };
    }

    const data = resultado.data;
    const texto: string = (data?.candidates?.[0]?.content?.parts || []).map((p: any) => p?.text || '').join('').trim();
    if (!texto) {
      const motivo = data?.candidates?.[0]?.finishReason;
      return { configurado: true, resposta: motivo === 'SAFETY' ? 'Não posso responder a essa pergunta. Reformule focando na gestão das obras.' : 'A IA não retornou resposta. Tente reformular a pergunta.' };
    }
    return { configurado: true, resposta: texto };
  } catch (e: any) {
    return { configurado: true, erro: true, resposta: 'Falha de rede ao contatar a IA. Verifique a conexão do servidor e tente novamente.', detalhe: String(e?.message || e).slice(0, 300) };
  }
}
