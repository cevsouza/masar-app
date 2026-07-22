import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { modulosPermitidos, TODOS_MODULOS } from '@/lib/permissoes';

/**
 * Guarda de acesso das rotas de API do staff.
 *
 * POR QUE ISTO EXISTE — o buraco que ele fecha:
 *
 * O middleware garante que existe UMA sessão válida, e nada além disso para as
 * rotas de API. A trava fina dele é por MÓDULO, e usa `moduloDaRota()`, cujos
 * prefixos são caminhos de PÁGINA (`/financeiro`, `/casas`, ...). Um caminho de
 * API nunca casa com esses prefixos: `moduloDaRota('/api/financeiro/dre')`
 * devolve `null`, e rota sem módulo passa direto.
 *
 * Resultado: barrar a PÁGINA `/financeiro` para um usuário COMERCIAL nunca
 * barrou a API `/api/financeiro/dre` para ele. A página some do menu, o dado
 * continua a um `fetch` de distância. O comentário no middleware ("Só barra
 * PÁGINAS — as APIs checam o papel") descrevia a intenção; a checagem em si
 * estava presente em parte das rotas e ausente em dezenas de outras, porque era
 * copiada à mão em cada arquivo.
 *
 * A REGRA AQUI: a API usa a MESMA matriz de permissões que governa as páginas.
 * O que o dono do produto marca na tela de Permissões passa a valer nos dois
 * lados — senão a tela mente sobre o que ela concede.
 *
 * De onde vêm os módulos: do próprio token, gravado no login (mesma fonte que o
 * middleware usa). Cookie antigo sem `modulos` cai no default do papel — não
 * derruba quem já estava logado. O preço é o mesmo que o middleware já paga:
 * mudança na matriz só vale no próximo login.
 */

export interface SessaoStaff {
  userId?: string;
  email?: string;
  nome?: string;
  role: string;
  empresaId?: string;
  modulos?: string[];
}

export type ResultadoAcesso =
  | { ok: true; sessao: SessaoStaff }
  | { ok: false; resposta: NextResponse };

export interface Exigencia {
  /** Módulo da matriz de permissões (ex.: 'financeiro'). */
  modulo?: string;
  /** Papéis aceitos. Quando os dois vêm, os DOIS precisam passar. */
  papeis?: readonly string[];
}

/** Lê e valida o cookie de sessão do staff. Null = sem sessão utilizável. */
export async function lerSessaoStaff(request: NextRequest): Promise<SessaoStaff | null> {
  const token = request.cookies.get('masar_session')?.value;
  if (!token) return null;
  const payload = await verifySession(token);
  if (!payload) return null;
  // Mesmo default do middleware: token sem papel é tratado como COMERCIAL (o
  // papel de menor alcance), nunca como ADMIN.
  return { ...payload, role: payload.role || 'COMERCIAL' } as SessaoStaff;
}

function modulosDaSessao(sessao: SessaoStaff): string[] {
  if (Array.isArray(sessao.modulos)) return sessao.modulos;
  return modulosPermitidos(sessao.role);
}

/**
 * Decisão pura — separada do HTTP para poder ser testada sem forjar request.
 * ADMIN passa em tudo, como na matriz.
 */
export function podeAcessar(sessao: SessaoStaff, exigencia: Exigencia): boolean {
  if (exigencia.papeis && !exigencia.papeis.includes(sessao.role)) return false;
  if (exigencia.modulo) {
    if (sessao.role === 'ADMIN') return true;
    if (!modulosDaSessao(sessao).includes(exigencia.modulo)) return false;
  }
  return true;
}

/**
 * O guarda propriamente dito. Uso na rota:
 *
 *   const auth = await exigirAcesso(request, { modulo: 'financeiro' });
 *   if (!auth.ok) return auth.resposta;
 *   // auth.sessao está disponível daqui para baixo
 *
 * Devolve 401 quando não há sessão e 403 quando há sessão sem direito — a
 * distinção importa para o cliente saber se deve reautenticar ou desistir.
 */
export async function exigirAcesso(
  request: NextRequest,
  exigencia: Exigencia,
): Promise<ResultadoAcesso> {
  if (exigencia.modulo && !TODOS_MODULOS.includes(exigencia.modulo)) {
    // Erro de programação, não de quem chamou: módulo inexistente jamais
    // passaria na matriz, e falhar em silêncio esconderia um typo.
    throw new Error(`Módulo desconhecido em exigirAcesso: "${exigencia.modulo}"`);
  }

  const sessao = await lerSessaoStaff(request);
  if (!sessao) {
    return {
      ok: false,
      resposta: NextResponse.json({ error: 'Sessão expirada ou ausente.' }, { status: 401 }),
    };
  }

  if (!podeAcessar(sessao, exigencia)) {
    return {
      ok: false,
      resposta: NextResponse.json({ error: 'Acesso negado.' }, { status: 403 }),
    };
  }

  return { ok: true, sessao };
}
