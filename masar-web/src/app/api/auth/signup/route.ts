import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, signSession, verifySession } from '@/lib/auth';
import { sendEmail } from '@/lib/resend';
import { identidadeVisualDaEmpresa } from '@/lib/empresaVisual';
import { runSemEscopoDeEmpresa } from '@/lib/tenant';
import { logMutation } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nome, email, password, role } = body;

    if (!nome || !email || !password) {
      return NextResponse.json({ error: 'Preencha todos os campos obrigatórios' }, { status: 400 });
    }

    const emailLower = email.toLowerCase().trim();

    // 1. Bootstrapping e Travas de Criação de Contas
    const userCount = await db.user.count();
    const isFirstUser = userCount === 0;

    let requesterUserId: string | null = null;
    let requesterUserName: string | null = null;

    if (!isFirstUser) {
      // Se não for o primeiro usuário, apenas ADMIN logado pode registrar equipe
      const sessionToken = request.cookies.get('masar_session')?.value;
      if (!sessionToken) {
        return NextResponse.json({ 
          error: 'Cadastro público desabilitado. Apenas administradores logados podem criar novas contas.' 
        }, { status: 403 });
      }

      const session = await verifySession(sessionToken);
      if (!session || session.role !== 'ADMIN') {
        return NextResponse.json({ 
          error: 'Permissão negada. Apenas administradores logados podem criar novos usuários.' 
        }, { status: 403 });
      }

      requesterUserId = session.userId;
      requesterUserName = session.nome;
    }

    // Verificar duplicidade de e-mail
    const userExists = await db.user.findFirst({
      where: { email: emailLower },
    });

    if (userExists) {
      return NextResponse.json({ error: 'E-mail já cadastrado' }, { status: 400 });
    }

    // Definir papel (ADMIN para o primeiro usuário, caso contrário usa a role informada ou COMERCIAL)
    const assignedRole = isFirstUser ? 'ADMIN' : (role || 'COMERCIAL');

    // Hash da senha e criação do usuário
    const hashedPassword = await hashPassword(password);
    const user = await db.user.create({
      data: {
        nome,
        email: emailLower,
        password: hashedPassword,
        role: assignedRole,
      },
    });

    // 2. Registrar na Trilha Imutável de Auditoria
    await logMutation({
      usuarioId: requesterUserId || user.id,
      usuarioNome: requesterUserName || user.nome,
      acao: isFirstUser ? 'BOOTSTRAP_ADMIN_USER' : 'CREATE_TEAM_USER',
      tabela: 'User',
      registroId: user.id,
      valoresNovos: { id: user.id, nome: user.nome, email: user.email, role: user.role }
    });

    // 3. Enviar e-mail de Boas-vindas para novos membros de equipe cadastrados pelo Admin
    if (!isFirstUser) {
      // O convite chega em nome da construtora que contratou, não em nome do
      // fornecedor do software — o funcionário novo nem sabe que existimos.
      const marca = await identidadeVisualDaEmpresa(user.empresaId);
      // A URL do painel estava FIXA na instância da Masar — o funcionário do
      // cliente receberia um link para o sistema de outra empresa. Sai do
      // domínio próprio da empresa quando houver; senão, do host da requisição.
      const painelUrl = marca.empresaId
        ? await (async () => {
            const emp = await runSemEscopoDeEmpresa(() =>
              db.empresa.findUnique({ where: { id: marca.empresaId! }, select: { dominio: true } })
            );
            return emp?.dominio ? `https://${emp.dominio}/login` : `${request.nextUrl.origin}/login`;
          })()
        : `${request.nextUrl.origin}/login`;

      const emailHtml = `
        <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; rounded: 8px;">
          <h2 style="color: #4f46e5;">Bem-vindo à ${marca.nome}</h2>
          <p>Olá <strong>${user.nome}</strong>,</p>
          <p>Você foi adicionado à equipe da construtora no sistema de gestão de obras como <strong>${user.role}</strong>.</p>
          <p>Aqui estão suas credenciais de acesso para fazer o login:</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0; font-family: monospace;">
            <p style="margin: 0;"><strong>Painel:</strong> ${painelUrl}</p>
            <p style="margin: 5px 0 0 0;"><strong>Usuário (E-mail):</strong> ${user.email}</p>
            <p style="margin: 5px 0 0 0;"><strong>Senha Temporária:</strong> ${password}</p>
          </div>
          <p style="font-size: 12px; color: #ef4444;">Recomendamos alterar a sua senha no menu de perfil após o primeiro acesso.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 11px; color: #9ca3af;">${marca.nome} — Todos os direitos reservados.</p>
        </div>
      `;

      await sendEmail({
        to: user.email,
        subject: `Sua conta na ${marca.nome} foi criada!`,
        html: emailHtml
      });
    }

    return NextResponse.json({
      id: user.id,
      nome: user.nome,
      email: user.email,
      role: user.role,
    }, { status: 201 });
  } catch (error) {
    console.error('Erro no cadastro:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
