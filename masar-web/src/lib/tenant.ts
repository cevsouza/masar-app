import { AsyncLocalStorage } from 'node:async_hooks';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth';

/**
 * Contexto de tenant (multi-empresa).
 *
 * O isolamento entre clientes NÃO depende de cada rota lembrar de filtrar por
 * empresa — isso é o que sempre vaza, porque basta uma query esquecida em ~45
 * modelos. Aqui resolvemos a empresa do request UMA vez e a extensão do Prisma
 * (lib/db) injeta o filtro em toda leitura e escrita.
 *
 * Duas formas de resolver, nesta ordem:
 *   1. contexto EXPLÍCITO via runComEmpresa() — usado por cron, scripts e seed,
 *      que rodam fora de um request e precisam dizer de quem é o dado;
 *   2. o cookie de sessão do request — o caminho normal das rotas de API e dos
 *      server components.
 *
 * Se nenhuma das duas resolver, é erro. Nunca "sem filtro".
 */

export interface ContextoTenant {
  empresaId: string;
  /** Ignora o escopo por empresa. Só para operações de plataforma (listar/criar empresas). */
  irrestrito?: boolean;
}

/**
 * O AsyncLocalStorage é fixado no globalThis, pelo mesmo motivo que o
 * PrismaClient já era em lib/db.
 *
 * Em desenvolvimento, o Next recarrega módulos e chega a instanciar o mesmo
 * arquivo mais de uma vez em grafos diferentes (rota de API, componente de
 * servidor, middleware). Com duas instâncias de AsyncLocalStorage vivas,
 * `storage.run()` grava numa e `storage.getStore()` lê da outra — o contexto
 * "existe" e mesmo assim aparece como ausente.
 *
 * O sintoma é traiçoeiro: a operação falha com "sem empresa no contexto"
 * exatamente onde o contexto foi definido. Foi o que derrubou o login inteiro
 * com HTTP 500.
 */
const globalParaTenant = globalThis as unknown as {
  __masarTenantStorage?: AsyncLocalStorage<ContextoTenant>;
};

const storage =
  globalParaTenant.__masarTenantStorage ?? new AsyncLocalStorage<ContextoTenant>();

if (process.env.NODE_ENV !== 'production') {
  globalParaTenant.__masarTenantStorage = storage;
}

/**
 * Roda `fn` com a empresa fixada. Para cron, scripts e provisionamento.
 *
 * O `await fn()` DENTRO do storage.run é essencial e não é estilo: as promises
 * do Prisma são lazy — a query só dispara quando alguém dá await. Se o await
 * acontecer fora daqui, o contexto já saiu de cena quando a query executa, e a
 * extensão recusa a operação por não achar empresa.
 */
export async function runComEmpresa<T>(empresaId: string, fn: () => T | Promise<T>): Promise<T> {
  return storage.run({ empresaId }, async () => await fn());
}

/**
 * Roda `fn` SEM escopo de empresa. Uso restrito: administração da plataforma
 * (CRUD de Empresa, provisionamento) e o cron, que varre todas as empresas.
 * Toda chamada some com o isolamento — por isso o nome é feio de propósito.
 */
export async function runSemEscopoDeEmpresa<T>(fn: () => T | Promise<T>): Promise<T> {
  return storage.run({ empresaId: '', irrestrito: true }, async () => await fn());
}

export function contextoExplicito(): ContextoTenant | undefined {
  return storage.getStore();
}

/**
 * Empresa do request, lida do cookie de sessão. Memoizado por request via
 * cache() do React, então o JWT é verificado uma vez, não a cada query.
 */
const empresaDoRequest = cache(async (): Promise<string | null> => {
  try {
    const jar = await cookies();
    // Dois cookies válidos: o do staff e o do portal do COMPRADOR. Sem o
    // segundo, toda query do portal do cliente é recusada pela extensão —
    // que foi exatamente o que aconteceu quando o isolamento entrou.
    const token = jar.get('masar_session')?.value ?? jar.get('masar_client_session')?.value;
    if (!token) return null;
    const sessao = await verifySession(token);
    if (!sessao) return null;
    if (sessao.empresaId) return sessao.empresaId;

    // Sessão de comprador emitida antes de carregar empresaId: descobre pelo
    // próprio UsuarioCliente.
    if (sessao.role === 'CLIENT' && sessao.id) {
      const { db } = await import('@/lib/db');
      const uc = await runSemEscopoDeEmpresa(() =>
        db.usuarioCliente.findUnique({ where: { id: sessao.id }, select: { empresaId: true } })
      );
      return uc?.empresaId ?? null;
    }

    // Sessão emitida ANTES do multi-tenant: o token não carrega empresaId.
    // Em vez de derrubar quem já estava logado, descobrimos a empresa pelo
    // próprio usuário. Só vale enquanto os tokens antigos não expiram (24h).
    if (!sessao.userId) return null;
    const { db } = await import('@/lib/db');
    const usuario = await runSemEscopoDeEmpresa(() =>
      db.user.findUnique({ where: { id: sessao.userId }, select: { empresaId: true } })
    );
    return usuario?.empresaId ?? null;
  } catch {
    // cookies() lança fora de um request (script, cron, build). Sem drama:
    // quem roda fora de request usa runComEmpresa().
    return null;
  }
});

/**
 * Resolve a empresa vigente. Retorna null quando não há como saber — cabe a
 * quem chama decidir se isso é erro (escrita) ou apenas "sem filtro possível".
 */
export async function resolverEmpresaId(): Promise<string | null> {
  const explicito = storage.getStore();
  if (explicito) return explicito.irrestrito ? null : explicito.empresaId;
  return empresaDoRequest();
}

/** True quando o contexto pediu explicitamente para ignorar o escopo. */
export function escopoIrrestrito(): boolean {
  return storage.getStore()?.irrestrito === true;
}

/** Como resolverEmpresaId(), mas explode se não der para resolver. */
export async function exigirEmpresaId(): Promise<string> {
  const id = await resolverEmpresaId();
  if (!id) {
    throw new Error(
      'Nenhuma empresa no contexto. Rota de API deve ter sessão válida; ' +
        'cron/script deve envolver a chamada em runComEmpresa(empresaId, ...).'
    );
  }
  return id;
}

/** A empresa raiz criada pela migration inicial (a própria Masar). */
export const EMPRESA_RAIZ_ID = '00000000-0000-0000-0000-000000000001';
