// Camada compartilhada de acesso ao Google Gemini (Generative Language API).
//
// Motivação: os nomes de modelo do Gemini mudam com o tempo (o Google
// descontinua versões — ex.: "gemini-2.0-flash is no longer available"). Em vez
// de embutir uma lista fixa que envelhece, aqui DESCOBRIMOS dinamicamente os
// modelos disponíveis para a chave (endpoint ListModels) e escolhemos um que
// suporte generateContent, preferindo os "flash" (mais rápidos/baratos). Isso
// mantém a IA funcionando mesmo quando o modelo configurado é retirado.

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const BASE = 'https://generativelanguage.googleapis.com/v1beta';

export function iaConfigurada(): boolean {
  return !!GEMINI_API_KEY;
}

let cacheModelos: { ts: number; modelos: string[] } | null = null;

// Ordena os modelos: "flash" primeiro (custo/latência), versões estáveis antes
// de preview/exp, e nomes maiores por último (costumam ser variantes específicas).
function rank(nome: string): number {
  let s = nome.includes('flash') ? 0 : 10;
  if (/(preview|exp|thinking|lite|vision)/.test(nome)) s += 3;
  return s;
}

async function descobrirModelos(): Promise<string[]> {
  if (cacheModelos && Date.now() - cacheModelos.ts < 10 * 60 * 1000) return cacheModelos.modelos;
  try {
    const r = await fetch(`${BASE}/models?pageSize=1000&key=${GEMINI_API_KEY}`);
    if (!r.ok) return [];
    const data = await r.json();
    const modelos: string[] = (data?.models || [])
      .filter((m: any) => (m?.supportedGenerationMethods || []).includes('generateContent'))
      .map((m: any) => String(m?.name || '').replace(/^models\//, ''))
      .filter(Boolean)
      .filter((n: string) => n.startsWith('gemini'))
      .sort((a: string, b: string) => rank(a) - rank(b) || a.length - b.length);
    cacheModelos = { ts: Date.now(), modelos };
    return modelos;
  } catch {
    return [];
  }
}

export interface GeminiResultado {
  ok: boolean;
  status: number;
  data?: any;
  erro?: string;
  modeloUsado?: string;
}

/**
 * Chama generateContent com fallback automático de modelo. Tenta o modelo
 * configurado; se ele não existir mais (404), descobre os modelos válidos da
 * chave e tenta cada um. Erros que não são de modelo (403 chave, 429 cota, 400)
 * interrompem — não adianta trocar de modelo.
 */
export async function chamarGemini(body: unknown): Promise<GeminiResultado> {
  if (!GEMINI_API_KEY) return { ok: false, status: 0, erro: 'GEMINI_API_KEY ausente' };
  const bodyStr = JSON.stringify(body);

  const tentar = (modelo: string) =>
    fetch(`${BASE}/models/${modelo}:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: bodyStr,
    });

  let ultimoStatus = 0;
  let ultimoErro = '';

  // 1) modelo configurado
  let r = await tentar(GEMINI_MODEL);
  if (r.ok) return { ok: true, status: 200, data: await r.json(), modeloUsado: GEMINI_MODEL };
  ultimoStatus = r.status;
  ultimoErro = (await r.text().catch(() => '')).slice(0, 300);
  if (r.status !== 404) return { ok: false, status: ultimoStatus, erro: ultimoErro };

  // 2) modelo configurado não existe: descobre e tenta os disponíveis
  const modelos = await descobrirModelos();
  for (const m of modelos) {
    if (m === GEMINI_MODEL) continue;
    r = await tentar(m);
    if (r.ok) return { ok: true, status: 200, data: await r.json(), modeloUsado: m };
    ultimoStatus = r.status;
    ultimoErro = (await r.text().catch(() => '')).slice(0, 300);
    if (r.status !== 404) break; // 403/429/400 não se resolvem trocando de modelo
  }

  return { ok: false, status: ultimoStatus, erro: ultimoErro };
}
