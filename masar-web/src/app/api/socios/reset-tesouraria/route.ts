import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/auth';
import { logMutation } from '@/lib/audit';
import { postLancamento } from '@/lib/ledger';

/**
 * Reset limpo da tesouraria societária.
 *
 * Apaga TODAS as movimentações de sócios (aportes, retiradas, pró-labore) e
 * zera o saldo de TODAS as contas bancárias — mantendo os sócios e suas cotas.
 *
 * A zeragem é feita via um lançamento de AJUSTE no razão (não sobrescrevendo o
 * saldo), para o histórico ficar preservado e `saldoAtual = Σrazão` continuar
 * valendo. Existe porque contas e movimentações de sócios são globais (não
 * pertencem a empreendimento), então apagar empreendimentos nunca as toca.
 */
export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('masar_session')?.value;
    const session = sessionToken ? await verifySession(sessionToken) : null;
    if (!session || !['ADMIN', 'FINANCEIRO'].includes(session.role || '')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const contas = await db.contaBancaria.findMany();
    const saldoAntesTotal = contas.reduce((acc, c) => acc + c.saldoAtual, 0);

    const { movimentacoesRemovidas, contasZeradas } = await db.$transaction(async (tx) => {
      const removidas = await tx.movimentacaoSocio.deleteMany();

      // Zera cada conta com saldo ≠ 0 via lançamento de ajuste (débito se positivo,
      // crédito se negativo). postLancamento também move o saldoAtual para 0.
      let zeradas = 0;
      for (const c of contas) {
        if (c.saldoAtual !== 0) {
          await postLancamento(tx, {
            contaId: c.id,
            valor: Math.abs(c.saldoAtual),
            tipo: c.saldoAtual > 0 ? 'DEBITO' : 'CREDITO',
            descricao: 'Ajuste de reset da tesouraria (zeragem de saldo)',
            origem: 'RESET_AJUSTE',
          });
          zeradas++;
        }
      }
      return { movimentacoesRemovidas: removidas, contasZeradas: zeradas };
    });

    // Trilha de auditoria: reset destrutivo fica registrado (quem, quando, o quê).
    await logMutation({
      usuarioId: session.userId,
      usuarioNome: session.nome,
      acao: 'SOCIO_TESOURARIA_RESET',
      tabela: 'MovimentacaoSocio,ContaBancaria',
      valoresAntigos: { saldoBancarioTotal: saldoAntesTotal },
      valoresNovos: {
        movimentacoesRemovidas: movimentacoesRemovidas.count,
        contasZeradas,
      },
    });

    return NextResponse.json({
      success: true,
      movimentacoesRemovidas: movimentacoesRemovidas.count,
      contasZeradas,
    });
  } catch (error) {
    console.error('Erro ao resetar tesouraria societária:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
