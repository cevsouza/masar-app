import { PrismaClient } from '@prisma/client';
import { resolverEmpresaId, escopoIrrestrito } from '@/lib/tenant';

/**
 * Client do Prisma com ISOLAMENTO POR EMPRESA aplicado automaticamente.
 *
 * Por que uma extensão e não `where: { empresaId }` em cada rota: são ~45
 * modelos e centenas de queries. Uma única esquecida mostra o financeiro de um
 * cliente para outro — isso é incidente de LGPD, não bug de tela. Filtro manual
 * não tem como ser auditado; aqui existe UM ponto para revisar.
 *
 * O que a extensão faz, por operação:
 *   - leitura (findMany, findFirst, count, aggregate, groupBy...): injeta
 *     empresaId no `where`;
 *   - findUnique/update/delete: idem (o Prisma 5+ aceita filtro não-único junto
 *     do único, então um id de outra empresa simplesmente não encontra nada);
 *   - create/createMany/upsert: injeta empresaId no `data`.
 *
 * Falha fechada: se não houver empresa resolvível, a operação é RECUSADA em vez
 * de rodar sem filtro. A única exceção é runSemEscopoDeEmpresa(), usada pela
 * administração da plataforma e pelo cron.
 *
 * LIMITE CONHECIDO: $queryRaw / $executeRaw NÃO passam por aqui. Toda query crua
 * precisa filtrar empresaId na mão.
 */

const globalForPrisma = global as unknown as { prisma: ReturnType<typeof criarClient> };

const LEITURAS = new Set([
  'findMany', 'findFirst', 'findFirstOrThrow', 'findUnique', 'findUniqueOrThrow',
  'count', 'aggregate', 'groupBy',
]);
const ESCRITAS_POR_WHERE = new Set(['update', 'updateMany', 'delete', 'deleteMany']);
const ESCRITAS_POR_DATA = new Set(['create', 'createMany', 'createManyAndReturn']);

function criarClient() {
  const base = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

  return base.$extends({
    name: 'isolamento-por-empresa',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          // A própria Empresa não é escopada por empresa.
          if (model === 'Empresa') return query(args);
          if (escopoIrrestrito()) return query(args);

          const empresaId = await resolverEmpresaId();
          if (!empresaId) {
            throw new Error(
              `[tenant] ${model}.${operation} sem empresa no contexto. ` +
                'Rota de API precisa de sessão válida; cron/script precisa de runComEmpresa().'
            );
          }

          const a: any = args ?? {};

          if (LEITURAS.has(operation) || ESCRITAS_POR_WHERE.has(operation)) {
            a.where = { ...(a.where ?? {}), empresaId };
            return query(a);
          }

          if (ESCRITAS_POR_DATA.has(operation)) {
            if (Array.isArray(a.data)) {
              a.data = a.data.map((d: any) => ({ ...d, empresaId }));
            } else {
              a.data = { ...(a.data ?? {}), empresaId };
            }
            return query(a);
          }

          if (operation === 'upsert') {
            a.where = { ...(a.where ?? {}), empresaId };
            a.create = { ...(a.create ?? {}), empresaId };
            return query(a);
          }

          return query(a);
        },
      },
    },
  });
}

export const db = globalForPrisma.prisma || criarClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

/**
 * Tipo do client dentro de um `db.$transaction(...)`.
 *
 * Substitui `Prisma.TransactionClient`: com a extensão aplicada, o client que o
 * Prisma entrega ao callback é o ESTENDIDO (com o isolamento por empresa), e o
 * tipo cru não bate mais. Helpers que recebem `tx` devem usar este tipo — assim
 * continuam funcionando tanto com um `tx` quanto com o `db` direto.
 */
export type ClienteTransacao = Omit<
  typeof db,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends' | '$use'
>;
