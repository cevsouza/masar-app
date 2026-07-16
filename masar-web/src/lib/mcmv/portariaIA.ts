// Consulta assistida por IA dos parâmetros regulatórios do MCMV (teto de valor
// por faixa, área útil mínima, % de unidades acessíveis). Reaproveita o mesmo
// endpoint REST do Google Gemini já usado em lib/consultorIA.ts, mas LIGANDO o
// grounding de busca web (tools: google_search) para que o modelo leia a PORTARIA
// VIGENTE em vez de responder pela memória de treino.
//
// IMPORTANTE: esta função apenas SUGERE. Nunca grava. O usuário revisa a fonte
// (portaria/data/URL) e decide aplicar na tela de Parâmetros MCMV.

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

export type FaixaChave = 'FAIXA_1' | 'FAIXA_2' | 'FAIXA_3' | 'FAIXA_4';

export interface ParametroFaixaSugerido {
  faixa: FaixaChave;
  tetoValorImovel: number;
  areaUtilMinima: number;
  percentualUnidadesAcessiveis: number;
}

export interface SugestaoParametros {
  configurado: boolean;
  erro?: boolean;
  mensagem?: string;
  faixas?: ParametroFaixaSugerido[];
  portariaReferencia?: string;
  dataVigencia?: string; // ISO ou texto
  fonteUrl?: string;
  confianca?: string;
  fontes?: { titulo?: string; url: string }[];
}

const PROMPT = `Você é um assistente regulatório da construção civil no Brasil. Pesquise na web as regras VIGENTES do programa Minha Casa Minha Vida (MCMV) da Caixa Econômica Federal referentes a EMPREENDIMENTOS/UNIDADES (não renda familiar).

Preciso, para CADA faixa (FAIXA_1, FAIXA_2, FAIXA_3, FAIXA_4), dos parâmetros construtivos atuais:
- tetoValorImovel: valor máximo do imóvel financiável na faixa, em reais (número, sem separador de milhar).
- areaUtilMinima: área útil mínima da unidade (casa) em m², conforme especificações/portarias vigentes.
- percentualUnidadesAcessiveis: percentual mínimo de unidades adaptáveis/acessíveis (número, ex.: 3).

Baseie-se na PORTARIA MAIS RECENTE em vigor (Ministério das Cidades / Caixa). Se algum valor não existir para uma faixa, use null.

Responda SOMENTE com um bloco JSON válido, sem texto fora do JSON, neste formato exato:
{
  "faixas": [
    {"faixa":"FAIXA_1","tetoValorImovel":0,"areaUtilMinima":0,"percentualUnidadesAcessiveis":3},
    {"faixa":"FAIXA_2","tetoValorImovel":0,"areaUtilMinima":0,"percentualUnidadesAcessiveis":3},
    {"faixa":"FAIXA_3","tetoValorImovel":0,"areaUtilMinima":0,"percentualUnidadesAcessiveis":3},
    {"faixa":"FAIXA_4","tetoValorImovel":0,"areaUtilMinima":0,"percentualUnidadesAcessiveis":3}
  ],
  "portariaReferencia":"<nº e data da portaria/base legal>",
  "dataVigencia":"<data de vigência>",
  "fonteUrl":"<URL oficial principal>",
  "confianca":"<alta|media|baixa e por quê>"
}`;

function extrairJSON(texto: string): any | null {
  // remove cercas de código e pega o primeiro objeto { ... }
  const limpo = texto.replace(/```json/gi, '').replace(/```/g, '').trim();
  const ini = limpo.indexOf('{');
  const fim = limpo.lastIndexOf('}');
  if (ini === -1 || fim === -1 || fim <= ini) return null;
  try {
    return JSON.parse(limpo.slice(ini, fim + 1));
  } catch {
    return null;
  }
}

const FAIXAS_VALIDAS: FaixaChave[] = ['FAIXA_1', 'FAIXA_2', 'FAIXA_3', 'FAIXA_4'];

export function iaConfigurada(): boolean {
  return !!GEMINI_API_KEY;
}

export async function consultarPortariaVigente(): Promise<SugestaoParametros> {
  if (!GEMINI_API_KEY) {
    return {
      configurado: false,
      mensagem:
        'A consulta por IA não está ligada. Um administrador precisa definir GEMINI_API_KEY no servidor. Você ainda pode editar os parâmetros manualmente.',
    };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: PROMPT }] }],
        tools: [{ google_search: {} }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
      }),
    });

    if (!res.ok) {
      const detalhe = await res.text().catch(() => '');
      const dica =
        res.status === 400
          ? ' (modelo pode não suportar google_search — ajuste GEMINI_MODEL para gemini-2.5-flash)'
          : res.status === 403
            ? ' (chave inválida ou sem permissão)'
            : '';
      return { configurado: true, erro: true, mensagem: `Erro ${res.status} ao consultar a IA${dica}.`, fonteUrl: detalhe.slice(0, 200) };
    }

    const data = await res.json();
    const candidate = data?.candidates?.[0];
    const texto: string = (candidate?.content?.parts || []).map((p: any) => p?.text || '').join('').trim();
    const parsed = extrairJSON(texto);

    if (!parsed || !Array.isArray(parsed.faixas)) {
      return { configurado: true, erro: true, mensagem: 'A IA não retornou os parâmetros em formato reconhecível. Tente novamente.' };
    }

    const faixas: ParametroFaixaSugerido[] = parsed.faixas
      .filter((f: any) => FAIXAS_VALIDAS.includes(f?.faixa))
      .map((f: any) => ({
        faixa: f.faixa as FaixaChave,
        tetoValorImovel: Number(f.tetoValorImovel) || 0,
        areaUtilMinima: Number(f.areaUtilMinima) || 0,
        percentualUnidadesAcessiveis: Number(f.percentualUnidadesAcessiveis) || 3,
      }));

    // fontes do grounding (quando disponíveis)
    const chunks = candidate?.groundingMetadata?.groundingChunks || [];
    const fontes = chunks
      .map((c: any) => (c?.web?.uri ? { titulo: c.web.title, url: c.web.uri } : null))
      .filter(Boolean)
      .slice(0, 8);

    return {
      configurado: true,
      faixas,
      portariaReferencia: parsed.portariaReferencia ? String(parsed.portariaReferencia) : undefined,
      dataVigencia: parsed.dataVigencia ? String(parsed.dataVigencia) : undefined,
      fonteUrl: parsed.fonteUrl ? String(parsed.fonteUrl) : undefined,
      confianca: parsed.confianca ? String(parsed.confianca) : undefined,
      fontes,
    };
  } catch (e: any) {
    return { configurado: true, erro: true, mensagem: `Falha de rede ao consultar a IA: ${String(e?.message || e).slice(0, 160)}` };
  }
}
