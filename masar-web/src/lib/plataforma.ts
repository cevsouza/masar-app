import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { signSession, verifySession } from '@/lib/auth';
import { runComEmpresa, runSemEscopoDeEmpresa } from '@/lib/tenant';

/**
 * CONTROL PLANE — autenticação e limites do administrador da plataforma.
 *
 * O princípio que sustenta este arquivo: o isolamento entre clientes protege
 * CLIENTE CONTRA CLIENTE. O control plane é outra camada — somos nós operando a
 * própria plataforma. Ela não fere o isolamento desde que respeite a fronteira
 * entre METADADO (quantas casas, saúde da instância, plano, vigência) e
 * CONTEÚDO (o financeiro, os CPFs, os documentos da obra).
 *
 * Metadado é livre. Conteúdo exige concessão explícita, temporária e registrada
 * no log do PRÓPRIO CLIENTE — é o que faz a frase "não navego nos seus dados"
 * ser verificável em vez de retórica.
 *
 * Na LGPD, a construtora é CONTROLADORA e nós somos OPERADOR: processar para
 * prestar o serviço é legítimo; passear no dado dela não é.
 */

/** Cookie próprio. Nunca reaproveitar o do staff nem o do comprador. */
export const COOKIE_ADMIN = 'masar_admin_session';

/**
 * Marcador de tipo dentro do token.
 *
 * Sem isto, um token de ADMIN de construtora colocado no cookie de plataforma
 * passaria na verificação de assinatura (é a mesma chave) e viraria acesso
 * total. O discriminador é o que impede a promoção lateral.
 */
const TIPO_TOKEN = 'plataforma';

export type NivelAcesso = 'AGREGADO' | 'FICHA' | 'CONTEUDO';

export interface SessaoPlataforma {
  adminId: string;
  nome: string;
  email: string;
}

export async function assinarSessaoPlataforma(admin: {
  id: string;
  nome: string;
  email: string;
}): Promise<string> {
  return signSession({
    tipo: TIPO_TOKEN,
    adminId: admin.id,
    nome: admin.nome,
    email: admin.email,
  });
}

/**
 * Resolve o admin de plataforma da requisição, ou null.
 *
 * Confere as três coisas, nesta ordem: token válido, tipo correto, e o admin
 * ainda existir e estar ATIVO no banco. O terceiro passo importa — desativar um
 * admin tem que valer imediatamente, não quando o token expirar.
 */
export async function adminPlataformaAtual(): Promise<SessaoPlataforma | null> {
  try {
    const token = (await cookies()).get(COOKIE_ADMIN)?.value;
    if (!token) return null;

    const payload = await verifySession(token);
    if (!payload || payload.tipo !== TIPO_TOKEN || !payload.adminId) return null;

    const admin = await db.adminPlataforma.findUnique({
      where: { id: payload.adminId },
      select: { id: true, nome: true, email: true, ativo: true },
    });
    if (!admin?.ativo) return null;

    return { adminId: admin.id, nome: admin.nome, email: admin.email };
  } catch {
    return null;
  }
}

/** Como adminPlataformaAtual(), mas recusa em vez de devolver null. */
export async function exigirAdminPlataforma(): Promise<SessaoPlataforma> {
  const admin = await adminPlataformaAtual();
  if (!admin) throw new Error('[plataforma] acesso restrito ao administrador da plataforma');
  return admin;
}

// ---------------------------------------------------------------------------
// Nível 3 — acesso assistido ao CONTEÚDO (break-glass)
// ---------------------------------------------------------------------------

export interface ConcessaoAcesso {
  id: string;
  empresaId: string;
  motivo: string;
  expiraEm: Date;
}

/**
 * Abre uma janela de acesso ao conteúdo de um tenant.
 *
 * Três exigências deliberadas: motivo escrito (não aceita vazio), prazo curto
 * (teto de 8 horas) e registro no log de auditoria DO CLIENTE — é lá que ele
 * enxerga. Um acesso que o cliente não consegue auditar não é assistido, é
 * simplesmente acesso.
 */
export async function concederAcessoAssistido(
  empresaId: string,
  motivo: string,
  minutos = 60
): Promise<ConcessaoAcesso> {
  const admin = await exigirAdminPlataforma();

  const motivoLimpo = motivo?.trim() ?? '';
  if (motivoLimpo.length < 10) {
    throw new Error('[plataforma] motivo do acesso é obrigatório (mínimo 10 caracteres)');
  }

  const minutosValidos = Math.min(Math.max(minutos, 5), 8 * 60);
  const expiraEm = new Date(Date.now() + minutosValidos * 60_000);

  const concessao = await db.acessoAssistido.create({
    data: { adminId: admin.adminId, empresaId, motivo: motivoLimpo, expiraEm },
  });

  // O registro vai para a auditoria do cliente, dentro do tenant dele.
  await runComEmpresa(empresaId, async () => {
    const { logMutation } = await import('@/lib/audit');
    await logMutation({
      usuarioId: `PLATAFORMA:${admin.adminId}`,
      usuarioNome: `Suporte da plataforma: ${admin.nome}`,
      acao: 'ACESSO_ASSISTIDO_CONCEDIDO',
      tabela: 'AcessoAssistido',
      registroId: concessao.id,
      valoresNovos: {
        motivo: motivoLimpo,
        expiraEm: expiraEm.toISOString(),
        admin: admin.email,
      },
    });
  });

  return {
    id: concessao.id,
    empresaId: concessao.empresaId,
    motivo: concessao.motivo,
    expiraEm: concessao.expiraEm,
  };
}

/** Concessão viva para este admin nesta empresa, ou null. */
export async function concessaoVigente(empresaId: string): Promise<ConcessaoAcesso | null> {
  const admin = await adminPlataformaAtual();
  if (!admin) return null;

  const c = await db.acessoAssistido.findFirst({
    where: {
      adminId: admin.adminId,
      empresaId,
      revogadoEm: null,
      expiraEm: { gt: new Date() },
    },
    orderBy: { criadoEm: 'desc' },
  });

  return c ? { id: c.id, empresaId: c.empresaId, motivo: c.motivo, expiraEm: c.expiraEm } : null;
}

/**
 * Roda `fn` dentro do tenant, mas SÓ com concessão viva.
 *
 * É a única porta pela qual o control plane toca conteúdo de cliente. Sem
 * concessão válida e não expirada, recusa — e recusar é o comportamento
 * correto, não um obstáculo a contornar.
 */
export async function runComAcessoAssistido<T>(
  empresaId: string,
  fn: () => T | Promise<T>
): Promise<T> {
  const concessao = await concessaoVigente(empresaId);
  if (!concessao) {
    throw new Error(
      '[plataforma] sem acesso assistido vigente para esta empresa. ' +
        'Conceda um acesso com motivo e prazo antes de consultar conteúdo do cliente.'
    );
  }
  return runComEmpresa(empresaId, fn);
}

// ---------------------------------------------------------------------------
// Nível 1 — panorama agregado (metadado apenas)
// ---------------------------------------------------------------------------

export interface ResumoTenant {
  empresaId: string;
  nome: string;
  slug: string;
  ativa: boolean;
  plano: string;
  dataExpiracao: Date | null;
  empreendimentos: number;
  unidades: number;
  usuarios: number;
  /**
   * Data do último registro de auditoria do tenant.
   *
   * É um TIMESTAMP, não conteúdo — não diz o que foi feito, só que houve
   * atividade. E é o melhor sinal barato de abandono: cliente que parou de
   * mexer no sistema está a caminho do cancelamento, e dá para agir antes.
   */
  ultimaAtividade: Date | null;
}

/**
 * Panorama de todas as instâncias — CONTAGENS, nunca conteúdo.
 *
 * Este é o nível padrão do cockpit e o que sustenta a promessa ao cliente:
 * daqui dá para saber que a construtora X tem 47 unidades e o contrato vence em
 * 60 dias, e não dá para saber quanto ela tem a pagar nem quem comprou a casa.
 */
export async function panoramaInstancias(): Promise<ResumoTenant[]> {
  await exigirAdminPlataforma();

  return runSemEscopoDeEmpresa(async () => {
    const empresas = await db.empresa.findMany({
      select: {
        id: true,
        nome: true,
        slug: true,
        ativa: true,
        plano: true,
        dataExpiracao: true,
      },
      orderBy: { nome: 'asc' },
    });

    return Promise.all(
      empresas.map(async (e) => {
        // Só o TIMESTAMP do último registro. Nenhum campo de conteúdo é lido.
        const ultimo = await db.logAuditoria.findFirst({
          where: { empresaId: e.id },
          orderBy: { data: 'desc' },
          select: { data: true },
        });

        return {
          empresaId: e.id,
          nome: e.nome,
          slug: e.slug,
          ativa: e.ativa,
          plano: e.plano,
          dataExpiracao: e.dataExpiracao,
          empreendimentos: await db.empreendimento.count({ where: { empresaId: e.id } }),
          unidades: await db.casa.count({ where: { empresaId: e.id } }),
          usuarios: await db.user.count({ where: { empresaId: e.id } }),
          ultimaAtividade: ultimo?.data ?? null,
        };
      })
    );
  });
}
