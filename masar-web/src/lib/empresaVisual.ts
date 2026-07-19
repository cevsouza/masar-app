import { headers } from 'next/headers';
import { db } from '@/lib/db';
import { runSemEscopoDeEmpresa, resolverEmpresaId, EMPRESA_RAIZ_ID } from '@/lib/tenant';

/**
 * Identidade visual do tenant, resolvida ANTES do login.
 *
 * Este é o ponto que faz o white label existir de verdade. Sem ele, o cliente
 * abre a tela de entrada, vê a marca de OUTRA construtora e digita a senha ali —
 * o que, além de constrangedor numa demonstração, é o tipo de coisa que faz um
 * comprador de licença desconfiar do produto inteiro.
 *
 * A resolução é pelo Host, porque na tela de login ainda não existe sessão nem
 * usuário: é o endereço que o cliente digitou que diz quem ele é.
 */

export interface IdentidadeVisual {
  empresaId: string | null;
  nome: string;
  logoUrl: string | null;
  corPrimaria: string;
  corSecundaria: string;
  /** Só a empresa raiz exibe o selo árabe "مسار" — é a marca da Masar, não do produto. */
  ehRaiz: boolean;
}

const PADRAO: IdentidadeVisual = {
  empresaId: null,
  nome: 'Masar Empreendimentos',
  logoUrl: null,
  corPrimaria: '#2563eb',
  corSecundaria: '#1e293b',
  ehRaiz: true,
};

function daEmpresa(e: {
  id: string;
  nome: string;
  slug: string;
  logoUrl: string | null;
  corPrimaria: string;
  corSecundaria: string;
}): IdentidadeVisual {
  return {
    empresaId: e.id,
    nome: e.nome,
    logoUrl: e.logoUrl,
    corPrimaria: e.corPrimaria,
    corSecundaria: e.corSecundaria,
    ehRaiz: e.id === EMPRESA_RAIZ_ID || e.slug === 'masar',
  };
}

const SELECAO = {
  id: true,
  nome: true,
  slug: true,
  logoUrl: true,
  corPrimaria: true,
  corSecundaria: true,
} as const;

/**
 * Resolve a identidade a partir do Host da requisição.
 *
 * Ordem: domínio próprio cadastrado → única empresa da instância → empresa raiz.
 *
 * O passo do meio importa mais do que parece: numa instância dedicada a um só
 * cliente (que é como os primeiros contratos serão entregues), não há domínio
 * cadastrado nem necessidade de haver — a marca certa é simplesmente a da única
 * empresa que existe ali.
 */
export async function identidadeVisualDoHost(): Promise<IdentidadeVisual> {
  try {
    // Tripwire de desenvolvimento. Chamar esta função COM sessão ativa é quase
    // sempre engano: numa instância compartilhada sem domínio por cliente ela
    // devolve a empresa raiz, e o resultado é plausível — a tela funciona,
    // só mostra a marca errada. Foi assim que a página de relatórios ficou
    // imprimindo "Masar" para qualquer construtora.
    // Dentro do app autenticado, o certo é identidadeVisualAtual().
    if (process.env.NODE_ENV !== 'production') {
      const sessao = await resolverEmpresaId().catch(() => null);
      if (sessao) {
        console.warn(
          '[empresaVisual] identidadeVisualDoHost() chamada com sessão ativa. ' +
            'Dentro do app use identidadeVisualAtual() — senão a marca sai a da empresa raiz.'
        );
      }
    }

    const host = (await headers()).get('host')?.split(':')[0] ?? '';

    return await runSemEscopoDeEmpresa(async () => {
      if (host) {
        const porDominio = await db.empresa.findFirst({
          where: { dominio: host, ativa: true },
          select: SELECAO,
        });
        if (porDominio) return daEmpresa(porDominio);
      }

      const ativas = await db.empresa.findMany({
        where: { ativa: true },
        select: SELECAO,
        take: 2,
      });
      if (ativas.length === 1) return daEmpresa(ativas[0]);

      const raiz = await db.empresa.findUnique({
        where: { id: EMPRESA_RAIZ_ID },
        select: SELECAO,
      });
      return raiz ? daEmpresa(raiz) : PADRAO;
    });
  } catch {
    // Tela de login não pode cair porque o banco piscou — ela é o caminho de
    // volta quando algo está errado. Sem banco, marca padrão e segue.
    return PADRAO;
  }
}

/**
 * Identidade da empresa do USUÁRIO LOGADO, caindo no Host quando não há sessão.
 *
 * Dentro do app é esta que vale, não a do Host. Numa instância compartilhada
 * sem domínio por cliente, `identidadeVisualDoHost()` devolve a empresa raiz —
 * então alguém logado na Construtora B veria a marca da A no cabeçalho, sem ter
 * como perceber em qual das duas está mexendo.
 */
export async function identidadeVisualAtual(): Promise<IdentidadeVisual> {
  try {
    const empresaId = await resolverEmpresaId();
    if (empresaId) return identidadeVisualDaEmpresa(empresaId);
  } catch {
    // sem sessão resolvível; cai no Host
  }
  return identidadeVisualDoHost();
}

/** Identidade de uma empresa já conhecida (usuário logado, e-mail, relatório). */
export async function identidadeVisualDaEmpresa(empresaId: string): Promise<IdentidadeVisual> {
  try {
    const e = await runSemEscopoDeEmpresa(() =>
      db.empresa.findUnique({ where: { id: empresaId }, select: SELECAO })
    );
    return e ? daEmpresa(e) : PADRAO;
  } catch {
    return PADRAO;
  }
}
