import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { exigirAdminPlataforma } from '@/lib/plataforma';
import { runSemEscopoDeEmpresa, EMPRESA_RAIZ_ID } from '@/lib/tenant';
import { logger } from '@/lib/logger';

/**
 * Ficha do cliente (nível FICHA do control plane): identidade visual, domínio
 * próprio, plano e vigência.
 *
 * É aqui que o white label deixa de ser teoria. O motor de resolução de marca
 * já existia — o que faltava era um lugar para DEFINIR nome, logo, cores e
 * domínio sem editar o banco na unha.
 *
 * Note o que NÃO se edita: nada de dado de obra, financeiro ou documento. Esta
 * rota mexe em metadado do tenant, nunca no conteúdo dele — a mesma fronteira
 * do resto do control plane.
 */

const HEX = /^#[0-9a-fA-F]{6}$/;

function limparDominio(v: string): string {
  return v
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, '');
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await exigirAdminPlataforma();
    const { id } = await params;

    const empresa = await runSemEscopoDeEmpresa(() =>
      db.empresa.findUnique({ where: { id } })
    );
    if (!empresa) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });
    }

    return NextResponse.json({
      id: empresa.id,
      nome: empresa.nome,
      slug: empresa.slug,
      cnpj: empresa.cnpj,
      ativa: empresa.ativa,
      dominio: empresa.dominio,
      logoUrl: empresa.logoUrl,
      corPrimaria: empresa.corPrimaria,
      corSecundaria: empresa.corSecundaria,
      emailRemetente: empresa.emailRemetente,
      plano: empresa.plano,
      limiteObras: empresa.limiteObras,
      dataExpiracao: empresa.dataExpiracao ? empresa.dataExpiracao.toISOString() : null,
      ehRaiz: empresa.id === EMPRESA_RAIZ_ID,
    });
  } catch (error: any) {
    if (String(error?.message).includes('administrador da plataforma')) {
      return NextResponse.json({ error: 'Acesso restrito ao console.' }, { status: 403 });
    }
    logger.error('[Plataforma] Erro ao ler empresa', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await exigirAdminPlataforma();
    const { id } = await params;
    const body = await request.json();

    const atual = await runSemEscopoDeEmpresa(() => db.empresa.findUnique({ where: { id } }));
    if (!atual) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });
    }

    const dados: any = {};

    if (body.nome !== undefined) {
      const nome = String(body.nome).trim();
      if (!nome) return NextResponse.json({ error: 'O nome não pode ficar vazio.' }, { status: 400 });
      dados.nome = nome;
    }

    if (body.cnpj !== undefined) dados.cnpj = String(body.cnpj).trim() || null;
    if (body.logoUrl !== undefined) dados.logoUrl = String(body.logoUrl).trim() || null;
    if (body.emailRemetente !== undefined) {
      dados.emailRemetente = String(body.emailRemetente).trim() || null;
    }
    if (body.plano !== undefined) dados.plano = String(body.plano).trim() || 'PADRAO';

    if (body.limiteObras !== undefined) {
      const n = body.limiteObras === null || body.limiteObras === '' ? null : Number(body.limiteObras);
      if (n !== null && (!Number.isFinite(n) || n < 0)) {
        return NextResponse.json({ error: 'Limite de obras inválido.' }, { status: 400 });
      }
      dados.limiteObras = n;
    }

    for (const campo of ['corPrimaria', 'corSecundaria'] as const) {
      if (body[campo] !== undefined) {
        const cor = String(body[campo]).trim();
        if (!HEX.test(cor)) {
          return NextResponse.json(
            { error: `Cor inválida em ${campo}. Use o formato #RRGGBB.` },
            { status: 400 }
          );
        }
        dados[campo] = cor;
      }
    }

    if (body.dominio !== undefined) {
      const dom = limparDominio(String(body.dominio ?? ''));
      if (dom) {
        // Domínio é a chave que resolve o tenant no login. Duplicado faria duas
        // empresas disputarem a mesma porta de entrada.
        const conflito = await runSemEscopoDeEmpresa(() =>
          db.empresa.findFirst({ where: { dominio: dom, NOT: { id } }, select: { nome: true } })
        );
        if (conflito) {
          return NextResponse.json(
            { error: `O domínio "${dom}" já está em uso por "${conflito.nome}".` },
            { status: 409 }
          );
        }
      }
      dados.dominio = dom || null;
    }

    if (body.dataExpiracao !== undefined) {
      if (!body.dataExpiracao) {
        dados.dataExpiracao = null;
      } else {
        const d = new Date(body.dataExpiracao);
        if (Number.isNaN(d.getTime())) {
          return NextResponse.json({ error: 'Data de expiração inválida.' }, { status: 400 });
        }
        dados.dataExpiracao = d;
      }
    }

    if (body.ativa !== undefined) {
      const ativa = Boolean(body.ativa);
      // A empresa raiz é a operação do próprio dono do produto. Desativá-la
      // pelo console tiraria o acesso de quem está operando o console.
      if (!ativa && id === EMPRESA_RAIZ_ID) {
        return NextResponse.json(
          { error: 'A empresa raiz não pode ser desativada por aqui.' },
          { status: 409 }
        );
      }
      dados.ativa = ativa;
    }

    if (Object.keys(dados).length === 0) {
      return NextResponse.json({ error: 'Nada para alterar.' }, { status: 400 });
    }

    const atualizada = await runSemEscopoDeEmpresa(() =>
      db.empresa.update({ where: { id }, data: dados })
    );

    logger.info(
      `[Plataforma] ${admin.email} alterou "${atual.nome}": ${Object.keys(dados).join(', ')}`
    );

    return NextResponse.json({ success: true, nome: atualizada.nome });
  } catch (error: any) {
    if (String(error?.message).includes('administrador da plataforma')) {
      return NextResponse.json({ error: 'Acesso restrito ao console.' }, { status: 403 });
    }
    logger.error('[Plataforma] Erro ao alterar empresa', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
