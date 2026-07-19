import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { logger } from '@/lib/logger';

/**
 * Cria a PRIMEIRA conta de administrador da plataforma — e só a primeira.
 *
 * Por que existe: antes, o unico caminho era rodar scripts/criar-admin-plataforma.mjs
 * num terminal, com a DATABASE_URL de producao em maos. Isso pressupoe que o
 * dono do produto seja desenvolvedor e tenha o repositorio na maquina — o que
 * nao vale nem para ele hoje, nem para um comprador de licenca amanha.
 *
 * TRES TRAVAS, todas obrigatorias:
 *   1. so roda se `PLATAFORMA_BOOTSTRAP_SECRET` existir no ambiente. Fail-closed:
 *      sem a variavel, a rota nao existe na pratica;
 *   2. o segredo tem que bater;
 *   3. **recusa se JA existir qualquer administrador de plataforma.** Esta e a
 *      trava que impede a rota de virar porta dos fundos: ela e util exatamente
 *      uma vez na vida da instancia e depois se fecha sozinha, mesmo que alguem
 *      esqueca a variavel definida.
 *
 * O script continua no repositorio como alternativa para quem prefere terminal.
 */
export async function POST(request: NextRequest) {
  try {
    const segredoEsperado = process.env.PLATAFORMA_BOOTSTRAP_SECRET;
    if (!segredoEsperado) {
      return NextResponse.json(
        { error: 'Bootstrap desabilitado nesta instância (PLATAFORMA_BOOTSTRAP_SECRET não definido).' },
        { status: 404 }
      );
    }

    const { segredo, nome, email, senha } = await request.json();

    if (String(segredo ?? '') !== segredoEsperado) {
      logger.warn('[Plataforma] tentativa de bootstrap com chave incorreta');
      return NextResponse.json({ error: 'Chave de liberação incorreta.' }, { status: 403 });
    }

    // A trava que fecha a porta para sempre.
    const jaExistem = await db.adminPlataforma.count();
    if (jaExistem > 0) {
      logger.warn('[Plataforma] bootstrap recusado: já existe administrador');
      return NextResponse.json(
        {
          error:
            'Já existe administrador da plataforma. Esta página só funciona na primeira vez. ' +
            'Para criar outros administradores, use o console.',
        },
        { status: 409 }
      );
    }

    const nomeLimpo = String(nome ?? '').trim();
    const emailLimpo = String(email ?? '').trim().toLowerCase();
    const senhaLimpa = String(senha ?? '');

    if (!nomeLimpo || !emailLimpo) {
      return NextResponse.json({ error: 'Nome e e-mail são obrigatórios.' }, { status: 400 });
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailLimpo)) {
      return NextResponse.json({ error: 'E-mail inválido.' }, { status: 400 });
    }
    if (senhaLimpa.length < 14) {
      return NextResponse.json(
        { error: 'A senha precisa de pelo menos 14 caracteres — esta conta enxerga todas as instâncias.' },
        { status: 400 }
      );
    }

    const admin = await db.adminPlataforma.create({
      data: { nome: nomeLimpo, email: emailLimpo, password: await hashPassword(senhaLimpa) },
    });

    logger.info(`[Plataforma] Primeiro administrador criado via bootstrap: ${admin.email}`);
    return NextResponse.json({ success: true, email: admin.email });
  } catch (error: any) {
    logger.error('[Plataforma] Erro no bootstrap', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
