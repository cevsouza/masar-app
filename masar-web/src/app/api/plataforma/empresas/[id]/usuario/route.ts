import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { exigirAdminPlataforma } from '@/lib/plataforma';
import { runSemEscopoDeEmpresa, runComEmpresa } from '@/lib/tenant';
import { logger } from '@/lib/logger';

/**
 * Cria (ou reseta) um usuário ADMIN dentro de uma empresa JÁ EXISTENTE.
 *
 * Dois usos legítimos:
 *   1. Dar acesso à empresa raiz da própria plataforma, para montar uma
 *      instância de DEMONSTRAÇÃO — que é sua, não de cliente.
 *   2. Socorrer um cliente que perdeu o único admin (senha esquecida, pessoa
 *      que saiu da empresa). Sem isto, a única saída seria mexer no banco.
 *
 * Por que é sensível e por que é auditado: um admin da plataforma criando uma
 * conta DENTRO do tenant de um cliente é, na prática, uma porta para os dados
 * dele. A diferença entre suporte e abuso é o RASTRO. Por isso todo uso vai
 * para o LogAuditoria DO PRÓPRIO CLIENTE — onde ele vê — com o nome de quem
 * fez, exatamente como o acesso assistido.
 *
 * A senha é gerada aqui e devolvida UMA vez. Se já existir um usuário com o
 * e-mail, a senha dele é RESETADA (não cria duplicado).
 */

function gerarSenha(): string {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  return Array.from(bytes, (b) => alfabeto[b % alfabeto.length]).join('');
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await exigirAdminPlataforma();
    const { id } = await params;
    const body = await request.json();

    const nome = String(body.nome ?? '').trim();
    const email = String(body.email ?? '').trim().toLowerCase();

    if (!nome || !email) {
      return NextResponse.json({ error: 'Nome e e-mail são obrigatórios.' }, { status: 400 });
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: 'E-mail inválido.' }, { status: 400 });
    }

    const empresa = await runSemEscopoDeEmpresa(() =>
      db.empresa.findUnique({ where: { id }, select: { id: true, nome: true } })
    );
    if (!empresa) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });
    }

    const senha = gerarSenha();
    const senhaHash = await hashPassword(senha);

    // Dentro do escopo do tenant: cria o usuário, ou reseta a senha se o e-mail
    // já existe lá. O upsert usa a chave composta (empresaId, email) do schema.
    const resultado = await runComEmpresa(id, async () => {
      const existente = await db.user.findFirst({ where: { email } });

      const user = existente
        ? await db.user.update({
            where: { id: existente.id },
            data: { password: senhaHash, nome, role: 'ADMIN' },
          })
        : await db.user.create({
            data: { nome, email, password: senhaHash, role: 'ADMIN' },
          });

      // Rastro na auditoria do cliente — onde ele enxerga.
      const { logMutation } = await import('@/lib/audit');
      await logMutation({
        usuarioId: `PLATAFORMA:${admin.adminId}`,
        usuarioNome: `Suporte da plataforma: ${admin.nome}`,
        acao: existente ? 'SENHA_ADMIN_RESETADA' : 'USUARIO_ADMIN_CRIADO',
        tabela: 'User',
        registroId: user.id,
        valoresNovos: { email, nome, por: admin.email },
      });

      return { user, resetado: Boolean(existente) };
    });

    logger.info(
      `[Plataforma] ${admin.email} ${resultado.resetado ? 'resetou' : 'criou'} admin ${email} em "${empresa.nome}"`
    );

    return NextResponse.json({
      success: true,
      resetado: resultado.resetado,
      usuario: { nome, email, senhaProvisoria: senha },
    });
  } catch (error: any) {
    if (String(error?.message).includes('administrador da plataforma')) {
      return NextResponse.json({ error: 'Acesso restrito ao console.' }, { status: 403 });
    }
    logger.error('[Plataforma] Erro ao criar/resetar usuário', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
