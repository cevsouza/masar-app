import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/auth';
import { logMutation } from '@/lib/audit';
import { conciliar, naturezaEsperada } from '@/lib/conciliacao';

// POST: conciliação MANUAL de uma linha de extrato com um título específico.
export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('masar_session')?.value;
    const session = sessionToken ? await verifySession(sessionToken) : null;
    if (!session || !['ADMIN', 'FINANCEIRO'].includes(session.role || '')) {
      return NextResponse.json({ error: 'Acesso negado: apenas ADMIN ou FINANCEIRO podem conciliar.' }, { status: 403 });
    }

    const { bancariaId, tituloId } = await request.json();
    if (!bancariaId || !tituloId) {
      return NextResponse.json({ error: 'bancariaId e tituloId são obrigatórios.' }, { status: 400 });
    }

    const linha = await db.transacaoBancaria.findUnique({ where: { id: bancariaId } });
    if (!linha) return NextResponse.json({ error: 'Linha de extrato não encontrada.' }, { status: 404 });
    if (linha.conciliado) return NextResponse.json({ error: 'Esta linha de extrato já foi conciliada.' }, { status: 409 });

    const titulo = await db.transacaoFinanceira.findUnique({ where: { id: tituloId } });
    if (!titulo) return NextResponse.json({ error: 'Título não encontrado.' }, { status: 404 });
    if (titulo.status === 'PAGO') return NextResponse.json({ error: 'Este título já foi baixado.' }, { status: 409 });

    // A direção precisa bater: crédito casa com receita, débito com despesa.
    if (titulo.natureza !== naturezaEsperada(linha.tipo)) {
      return NextResponse.json(
        { error: `Direção incompatível: uma linha de ${linha.tipo} só concilia com título de ${naturezaEsperada(linha.tipo)}.` },
        { status: 400 }
      );
    }

    await db.$transaction(async (tx) => {
      await conciliar(
        tx,
        { id: linha.id, contaBancariaId: linha.contaBancariaId, data: linha.data, valor: linha.valor, tipo: linha.tipo },
        { id: titulo.id, valor: titulo.valor, natureza: titulo.natureza as string, dataVencimento: titulo.dataVencimento, descricao: titulo.descricao }
      );
      await logMutation({
        usuarioId: session.userId,
        usuarioNome: session.nome,
        acao: 'CONCILIACAO_MANUAL',
        tabela: 'TransacaoFinanceira',
        registroId: titulo.id,
        valoresNovos: { status: 'PAGO', transacaoBancariaId: linha.id, tipo: linha.tipo, valor: linha.valor },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Conciliação] Erro na conciliação manual:', error);
    return NextResponse.json({ error: 'Erro interno do servidor', message: error.message }, { status: 500 });
  }
}
