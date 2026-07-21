import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { exigirAdminPlataforma } from '@/lib/plataforma';
import { runSemEscopoDeEmpresa, EMPRESA_RAIZ_ID } from '@/lib/tenant';
import { logger } from '@/lib/logger';
import { subdominioDoHost, validarSubdominio, normalizarSubdominio } from '@/lib/dominioPlataforma';
import { limparCacheDominios } from '@/lib/resend';

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

    // Peso da instância: decide qual dos dois caminhos de exclusão se aplica, e
    // é o que a tela mostra antes de alguém clicar em apagar.
    const [empreendimentos, casas, transacoes] = await runSemEscopoDeEmpresa(() =>
      Promise.all([
        db.empreendimento.count({ where: { empresaId: id } }),
        db.casa.count({ where: { empresaId: id } }),
        db.transacaoFinanceira.count({ where: { empresaId: id } }),
      ])
    );
    const diasVencido = empresa.dataExpiracao
      ? Math.floor((Date.now() - empresa.dataExpiracao.getTime()) / 86_400_000)
      : null;

    return NextResponse.json({
      id: empresa.id,
      nome: empresa.nome,
      conteudo: { empreendimentos, casas, transacoes },
      diasVencido,
      diasQuarentena: DIAS_QUARENTENA_ENCERRAMENTO,
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
      limiteUnidades: empresa.limiteUnidades,
      valorMensal: empresa.valorMensal,
      diaVencimento: empresa.diaVencimento,
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

/** Quarentena depois do vencimento antes que a instância possa ser destruída. */
const DIAS_QUARENTENA_ENCERRAMENTO = 90;

/**
 * APAGA uma instância. Dois caminhos, com exigências muito diferentes.
 *
 * CAMINHO 1 — instância VAZIA (nenhum empreendimento): apaga direto. É o teste
 * que sobrou ou o cadastro digitado errado; não há nada a perder.
 *
 * CAMINHO 2 — instância COM CONTEÚDO: só depois de encerramento consumado.
 * Exige, juntos: contrato vencido, instância já DESATIVADA, e a quarentena de
 * DIAS_QUARENTENA_ENCERRAMENTO dias corridos desde o vencimento.
 *
 * Por que não basta "vencido": vencimento quase sempre é atraso de pagamento,
 * não fim de contrato. Se vencer bastasse, um cliente que renova três dias
 * atrasado encontraria a obra apagada. A desativação manual é o ato humano que
 * diz "este contrato acabou de verdade", e a quarentena é o tempo de arrependimento.
 *
 * Por que apagar afinal: a Masar é OPERADORA dos dados, não controladora. Fim
 * do tratamento, os dados devem ser eliminados (LGPD art. 15/16) — guardar
 * indefinidamente o financeiro e os CPFs de um ex-cliente é passivo, não zelo.
 *
 * O cascade do schema leva toda a árvore do tenant junto, INCLUSIVE o
 * LogAuditoria dele. Por isso o que foi destruído é contado e registrado no log
 * da aplicação ANTES do delete: é o único rastro que sobrevive.
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await exigirAdminPlataforma();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    if (id === EMPRESA_RAIZ_ID) {
      return NextResponse.json(
        { error: 'A empresa raiz não pode ser apagada — é a sua própria operação.' },
        { status: 409 }
      );
    }

    const empresa = await runSemEscopoDeEmpresa(() => db.empresa.findUnique({ where: { id } }));
    if (!empresa) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });
    }

    if (String(body.confirmacaoNome ?? '').trim() !== empresa.nome) {
      return NextResponse.json(
        { error: 'Digite o nome da construtora exatamente como aparece para confirmar.' },
        { status: 400 }
      );
    }

    const [empreendimentos, casas, lancamentos, documentos, usuarios] = await runSemEscopoDeEmpresa(
      () =>
        Promise.all([
          db.empreendimento.count({ where: { empresaId: id } }),
          db.casa.count({ where: { empresaId: id } }),
          db.transacaoFinanceira.count({ where: { empresaId: id } }),
          db.documentoAnexo.count({ where: { empresaId: id } }),
          db.user.count({ where: { empresaId: id } }),
        ])
    );

    if (empreendimentos > 0) {
      // Caminho 2: encerramento consumado. As três condições valem juntas.
      const venceEm = empresa.dataExpiracao;
      const diasVencido = venceEm
        ? Math.floor((Date.now() - venceEm.getTime()) / 86_400_000)
        : null;

      const faltando: string[] = [];
      if (diasVencido === null) {
        faltando.push('o contrato não tem data de vencimento definida');
      } else if (diasVencido < 0) {
        faltando.push(`o contrato ainda está vigente (vence em ${-diasVencido} dias)`);
      } else if (diasVencido < DIAS_QUARENTENA_ENCERRAMENTO) {
        faltando.push(
          `a quarentena ainda não terminou (venceu há ${diasVencido} dias; ` +
            `faltam ${DIAS_QUARENTENA_ENCERRAMENTO - diasVencido})`
        );
      }
      if (empresa.ativa) {
        faltando.push('a instância ainda está marcada como ativa — desative primeiro');
      }

      if (faltando.length > 0) {
        return NextResponse.json(
          {
            error:
              `"${empresa.nome}" tem ${empreendimentos} empreendimento(s) e ${lancamentos} ` +
              `lançamento(s) financeiro(s). Instância com operação dentro só é apagada após ` +
              `encerramento consumado: contrato vencido, instância desativada e ` +
              `${DIAS_QUARENTENA_ENCERRAMENTO} dias de quarentena. Falta: ${faltando.join('; ')}.`,
          },
          { status: 409 }
        );
      }
    }

    // Contado ANTES do delete: o LogAuditoria do cliente some no cascade, então
    // esta linha é o único registro que resta de que a instância existiu.
    logger.warn(
      `[Plataforma] ${admin.email} APAGOU a instância "${empresa.nome}" (${empresa.slug}) — ` +
        `${empreendimentos} empreendimento(s), ${casas} casa(s), ${lancamentos} lançamento(s), ` +
        `${documentos} documento(s), ${usuarios} usuário(s). Vencimento: ` +
        `${empresa.dataExpiracao?.toISOString().slice(0, 10) ?? 'sem data'}.`
    );

    await runSemEscopoDeEmpresa(() => db.empresa.delete({ where: { id } }));

    return NextResponse.json({ success: true, nome: empresa.nome });
  } catch (error: any) {
    if (String(error?.message).includes('administrador da plataforma')) {
      return NextResponse.json({ error: 'Acesso restrito ao console.' }, { status: 403 });
    }
    logger.error('[Plataforma] Erro ao apagar empresa', error);
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

    // O slug é editável por causa da instância nova: a migração inicial cria a
    // empresa raiz como "Masar Empreendimentos"/`masar`, e é o slug `masar` que
    // acende o selo árabe. Numa instância comercial isso carimbaria a marca da
    // Masar no login de outro produto — renomear aqui é o que apaga o selo.
    if (body.slug !== undefined) {
      const novoSlug = normalizarSubdominio(String(body.slug));
      if (!novoSlug) {
        return NextResponse.json({ error: 'O identificador não pode ficar vazio.' }, { status: 400 });
      }
      if (novoSlug !== atual.slug) {
        const conflito = await runSemEscopoDeEmpresa(() =>
          db.empresa.findFirst({ where: { slug: novoSlug, NOT: { id } }, select: { nome: true } })
        );
        if (conflito) {
          return NextResponse.json(
            { error: `O identificador "${novoSlug}" já é usado por "${conflito.nome}".` },
            { status: 409 }
          );
        }
        dados.slug = novoSlug;
      }
    }

    if (body.cnpj !== undefined) dados.cnpj = String(body.cnpj).trim() || null;
    if (body.logoUrl !== undefined) dados.logoUrl = String(body.logoUrl).trim() || null;
    if (body.emailRemetente !== undefined) {
      const bruto = String(body.emailRemetente).trim();
      // Só o endereço, sem `Nome <...>`: o nome de exibição vem SEMPRE do nome
      // da empresa (lib/remetente), senão teríamos duas fontes para a mesma
      // coisa e a marca do e-mail poderia divergir da marca do sistema.
      if (bruto && !/^[^\s@<>",;]+@[^\s@<>",;.]+\.[^\s@<>",;]+$/.test(bruto)) {
        return NextResponse.json(
          { error: 'Informe apenas o endereço (ex.: contato@construtora.com.br), sem o nome.' },
          { status: 400 },
        );
      }
      dados.emailRemetente = bruto.toLowerCase() || null;
      // O remetente efetivo depende de quais domínios estão verificados no
      // Resend; sem limpar, a mudança demoraria o TTL do cache para valer.
      limparCacheDominios();
    }
    if (body.plano !== undefined) dados.plano = String(body.plano).trim() || 'PADRAO';

    if (body.limiteObras !== undefined) {
      const n = body.limiteObras === null || body.limiteObras === '' ? null : Number(body.limiteObras);
      if (n !== null && (!Number.isFinite(n) || n < 0)) {
        return NextResponse.json({ error: 'Limite de obras inválido.' }, { status: 400 });
      }
      dados.limiteObras = n;
    }

    // Exceção negociada ao teto de unidades do plano. Vazio = vale o plano;
    // ZERO é um valor legítimo (conta suspensa), por isso o teste é contra
    // null/'' e não contra falsy.
    if (body.limiteUnidades !== undefined) {
      const n =
        body.limiteUnidades === null || body.limiteUnidades === '' ? null : Number(body.limiteUnidades);
      if (n !== null && (!Number.isFinite(n) || n < 0)) {
        return NextResponse.json({ error: 'Limite de unidades inválido.' }, { status: 400 });
      }
      dados.limiteUnidades = n;
    }

    // Termos do contrato: é daqui que a geração mensal de cobranças tira valor
    // e vencimento.
    if (body.valorMensal !== undefined) {
      const n = body.valorMensal === null || body.valorMensal === '' ? null : Number(body.valorMensal);
      if (n !== null && (!Number.isFinite(n) || n < 0)) {
        return NextResponse.json({ error: 'Mensalidade inválida.' }, { status: 400 });
      }
      dados.valorMensal = n;
    }

    if (body.diaVencimento !== undefined) {
      const n =
        body.diaVencimento === null || body.diaVencimento === '' ? null : Number(body.diaVencimento);
      // Teto em 28 de propósito: 29/30/31 não existem em todo mês e o
      // vencimento escorregaria em fevereiro.
      if (n !== null && (!Number.isInteger(n) || n < 1 || n > 28)) {
        return NextResponse.json(
          { error: 'Dia de vencimento deve estar entre 1 e 28.' },
          { status: 400 },
        );
      }
      dados.diaVencimento = n;
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
        // Se o endereço cai sob o curinga da plataforma, vale a lista de nomes
        // reservados — senão a tela recusaria "admin" e o PATCH direto aceitaria.
        const sub = subdominioDoHost(dom);
        if (sub) {
          const problema = validarSubdominio(sub);
          if (problema) return NextResponse.json({ error: problema }, { status: 400 });
        }

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
