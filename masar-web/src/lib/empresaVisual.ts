import { headers } from 'next/headers';
import { db } from '@/lib/db';
import { runSemEscopoDeEmpresa, EMPRESA_RAIZ_ID } from '@/lib/tenant';

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
