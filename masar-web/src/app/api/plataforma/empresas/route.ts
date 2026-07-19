import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { exigirAdminPlataforma } from '@/lib/plataforma';
import { runSemEscopoDeEmpresa, runComEmpresa } from '@/lib/tenant';
import { logger } from '@/lib/logger';
import { hostDoSubdominio, subdominioSugerido, validarSubdominio } from '@/lib/dominioPlataforma';

/**
 * PROVISIONAMENTO DE CLIENTE pelo console — empresa + primeiro admin, num passo.
 *
 * Antes disto, criar um tenant exigia rodar scripts/provisionar-cliente.mjs na
 * máquina do operador, com a DATABASE_URL de produção em mãos. Funcionava, mas
 * obrigava a manusear a credencial do banco a cada cliente novo — exatamente o
 * hábito que a rotação de segredos existiu para eliminar. O script continua
 * valendo como bootstrap (o PRIMEIRO admin de plataforma ainda vem por ele),
 * mas do segundo cliente em diante ninguém mais precisa tocar em credencial.
 *
 * A senha do admin é GERADA aqui e devolvida UMA única vez. Senha escolhida por
 * pessoa para conta de terceiro costuma ser fraca ou reaproveitada; e devolver
 * uma vez é melhor que guardar em algum lugar para consultar depois.
 */

function normalizarSlug(v: string): string {
  return v
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

/** Senha forte, legível o suficiente para ser ditada por telefone se preciso. */
function gerarSenha(): string {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  return Array.from(bytes, (b) => alfabeto[b % alfabeto.length]).join('');
}

export async function POST(request: NextRequest) {
  try {
    const admin = await exigirAdminPlataforma();
    const body = await request.json();

    const nome = String(body.nome ?? '').trim();
    const slug = normalizarSlug(String(body.slug ?? body.nome ?? ''));
    const adminNome = String(body.adminNome ?? '').trim();
    const adminEmail = String(body.adminEmail ?? '').trim().toLowerCase();

    if (!nome || !slug || !adminNome || !adminEmail) {
      return NextResponse.json(
        { error: 'Nome da construtora, identificador, nome e e-mail do administrador são obrigatórios.' },
        { status: 400 }
      );
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(adminEmail)) {
      return NextResponse.json({ error: 'E-mail do administrador inválido.' }, { status: 400 });
    }

    const jaExiste = await runSemEscopoDeEmpresa(() => db.empresa.findUnique({ where: { slug } }));
    if (jaExiste) {
      return NextResponse.json(
        { error: `Já existe uma empresa com o identificador "${slug}". Escolha outro.` },
        { status: 409 }
      );
    }

    // Endereço próprio já no nascimento (Modelo A). Sem isto, o cliente abre a
    // tela de login e vê a marca da Masar — o white label só apareceria depois
    // de digitar a senha, que é tarde demais para causar a impressão certa.
    // Como o curinga já está apontado, não há passo de infraestrutura por cliente.
    const subdominio = body.subdominio !== undefined
      ? String(body.subdominio)
      : subdominioSugerido(slug);

    let dominio: string | null = null;
    if (subdominio) {
      const problema = validarSubdominio(subdominio);
      if (problema) return NextResponse.json({ error: problema }, { status: 400 });

      dominio = hostDoSubdominio(subdominio);
      const conflito = await runSemEscopoDeEmpresa(() =>
        db.empresa.findFirst({ where: { dominio }, select: { nome: true } })
      );
      if (conflito) {
        return NextResponse.json(
          { error: `O endereço ${dominio} já é usado por "${conflito.nome}". Escolha outro subdomínio.` },
          { status: 409 }
        );
      }
    }

    const senha = gerarSenha();
    const senhaHash = await hashPassword(senha);

    const empresa = await runSemEscopoDeEmpresa(() =>
      db.empresa.create({ data: { nome, slug, dominio } })
    );

    // O usuário nasce DENTRO do tenant recém-criado.
    await runComEmpresa(empresa.id, () =>
      db.user.create({
        data: { nome: adminNome, email: adminEmail, password: senhaHash, role: 'ADMIN' },
      })
    );

    logger.info(
      `[Plataforma] Empresa "${nome}" (${slug}) provisionada por ${admin.email} com admin ${adminEmail}`
    );

    // A senha volta UMA vez. Não fica gravada em lugar nenhum em texto.
    return NextResponse.json({
      success: true,
      empresa: { id: empresa.id, nome: empresa.nome, slug: empresa.slug, dominio: empresa.dominio },
      admin: { nome: adminNome, email: adminEmail, senhaProvisoria: senha },
    });
  } catch (error: any) {
    if (String(error?.message).includes('administrador da plataforma')) {
      return NextResponse.json({ error: 'Acesso restrito ao console da plataforma.' }, { status: 403 });
    }
    logger.error('[Plataforma] Erro ao provisionar empresa', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
