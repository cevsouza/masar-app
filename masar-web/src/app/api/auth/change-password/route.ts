import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySession, hashPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('masar_session')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const session = await verifySession(sessionToken);
    if (!session) {
      return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 });
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Preencha todos os campos' }, { status: 400 });
    }

    // Find user
    const user = await db.user.findUnique({
      where: { id: session.userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Verify current password
    const hashedCurrentPassword = await hashPassword(currentPassword);
    if (user.password !== hashedCurrentPassword) {
      return NextResponse.json({ error: 'Senha atual incorreta' }, { status: 400 });
    }

    // Hash and update to new password
    const hashedNewPassword = await hashPassword(newPassword);
    await db.user.update({
      where: { id: session.userId },
      data: { password: hashedNewPassword },
    });

    return NextResponse.json({ success: true, message: 'Senha alterada com sucesso' });
  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
