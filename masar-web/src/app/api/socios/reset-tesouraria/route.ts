import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/auth';

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

    const [movimentacoesRemovidas, contasZeradas] = await db.$transaction([
      db.movimentacaoSocio.deleteMany(),
      db.contaBancaria.updateMany({ data: { saldoAtual: 0 } }),
    ]);

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
