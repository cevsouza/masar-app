import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/auth';
import { logMutation } from '@/lib/audit';

/**
 * Exclui uma movimentação de sócio e ESTORNA o efeito dela no saldo bancário.
 *
 * O POST em /api/socios/retiradas credita o saldo da conta principal em um APORTE
 * e debita em RETIRADA/PRO_LABORE. Aqui fazemos o inverso, para o saldo não ficar
 * "órfão" após a exclusão. O estorno é aplicado na primeira conta (mesma que o POST
 * usa via findFirst).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionToken = request.cookies.get('masar_session')?.value;
    const session = sessionToken ? await verifySession(sessionToken) : null;
    if (!session || !['ADMIN', 'FINANCEIRO'].includes(session.role || '')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const { id } = await params;

    const movimentacao = await db.movimentacaoSocio.findUnique({ where: { id } });
    if (!movimentacao) {
      return NextResponse.json({ error: 'Movimentação não encontrada' }, { status: 404 });
    }

    // Estorno: inverso do delta aplicado no POST (APORTE somou; retirada/pró-labore subtraiu).
    const conta = await db.contaBancaria.findFirst();
    const estorno = movimentacao.tipo === 'APORTE' ? -movimentacao.valor : movimentacao.valor;

    await db.$transaction([
      db.movimentacaoSocio.delete({ where: { id } }),
      ...(conta
        ? [db.contaBancaria.update({
            where: { id: conta.id },
            data: { saldoAtual: { increment: estorno } },
          })]
        : []),
    ]);

    // Trilha de auditoria: exclusão financeira não some sem registro.
    await logMutation({
      usuarioId: session.userId,
      usuarioNome: session.nome,
      acao: 'SOCIO_MOVIMENTACAO_DELETE',
      tabela: 'MovimentacaoSocio',
      registroId: id,
      valoresAntigos: {
        socioId: movimentacao.socioId,
        tipo: movimentacao.tipo,
        valor: movimentacao.valor,
        empreendimentoId: movimentacao.empreendimentoId,
        data: movimentacao.data,
      },
      valoresNovos: { estornoAplicado: estorno, contaId: conta?.id ?? null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir movimentação de sócio:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
