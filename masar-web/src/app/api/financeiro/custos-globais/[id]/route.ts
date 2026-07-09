import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logMutation } from '@/lib/audit';
import { verifySession } from '@/lib/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sessionToken = request.cookies.get('masar_session')?.value;
    const session = sessionToken ? await verifySession(sessionToken) : null;
    if (!session || !['ADMIN', 'FINANCEIRO'].includes(session.role || '')) {
      return NextResponse.json({ error: 'Acesso negado: Apenas administradores ou financeiro podem excluir custos.' }, { status: 403 });
    }

    const current = await db.transacaoFinanceira.findUnique({
      where: { id }
    });

    if (!current) {
      return NextResponse.json({ error: 'Custo global não encontrado.' }, { status: 404 });
    }

    await db.transacaoFinanceira.delete({
      where: { id }
    });

    await logMutation({
      usuarioId: session.userId,
      usuarioNome: session.nome,
      acao: 'DELETE',
      tabela: 'TransacaoFinanceira',
      registroId: id,
      valoresAntigos: current,
      valoresNovos: null
    });

    return NextResponse.json({ success: true, message: 'Custo global excluído com sucesso do livro-caixa.' });
  } catch (error: any) {
    console.error('Erro ao excluir custo global:', error);
    return NextResponse.json({ error: 'Erro interno do servidor', message: error.message }, { status: 500 });
  }
}
