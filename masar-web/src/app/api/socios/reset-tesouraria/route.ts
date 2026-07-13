import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/auth';
import { logMutation } from '@/lib/audit';

/**
 * Reset limpo da tesouraria societária.
 *
 * Apaga TODAS as movimentações de sócios (aportes, retiradas, pró-labore) e
 * zera o saldo de TODAS as contas bancárias — mantendo os sócios e suas cotas.
 *
 * Existe porque contas bancárias e movimentações de sócios são globais (não
 * pertencem a nenhum empreendimento), então apagar empreendimentos no kanban
 * nunca as toca. Este é o "recomeçar do zero" da tesouraria.
 */
export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('masar_session')?.value;
    const session = sessionToken ? await verifySession(sessionToken) : null;
    if (!session || !['ADMIN', 'FINANCEIRO'].includes(session.role || '')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    // Saldo total antes de zerar, para a trilha de auditoria.
    const saldoAntes = await db.contaBancaria.aggregate({ _sum: { saldoAtual: true } });

    const [movimentacoesRemovidas, contasZeradas] = await db.$transaction([
      db.movimentacaoSocio.deleteMany(),
      db.contaBancaria.updateMany({ data: { saldoAtual: 0 } }),
    ]);

    // Trilha de auditoria: reset destrutivo fica registrado (quem, quando, o quê).
    await logMutation({
      usuarioId: session.userId,
      usuarioNome: session.nome,
      acao: 'SOCIO_TESOURARIA_RESET',
      tabela: 'MovimentacaoSocio,ContaBancaria',
      valoresAntigos: { saldoBancarioTotal: saldoAntes._sum.saldoAtual || 0 },
      valoresNovos: {
        movimentacoesRemovidas: movimentacoesRemovidas.count,
        contasZeradas: contasZeradas.count,
      },
    });

    return NextResponse.json({
      success: true,
      movimentacoesRemovidas: movimentacoesRemovidas.count,
      contasZeradas: contasZeradas.count,
    });
  } catch (error) {
    console.error('Erro ao resetar tesouraria societária:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
