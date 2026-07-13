import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/auth';
import { calcularCaixaLivre } from '@/lib/socioGuardrail';
import { postLancamento } from '@/lib/ledger';

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('masar_session')?.value;
    const session = sessionToken ? await verifySession(sessionToken) : null;
    if (!session || !['ADMIN', 'FINANCEIRO'].includes(session.role || '')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const movimentacoes = await db.movimentacaoSocio.findMany({
      include: {
        socio: true,
        empreendimento: true,
      },
      orderBy: { data: 'desc' },
    });
    return NextResponse.json(movimentacoes);
  } catch (error) {
    console.error('Erro ao buscar movimentações de sócios:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('masar_session')?.value;
    const session = sessionToken ? await verifySession(sessionToken) : null;
    if (!session || !['ADMIN', 'FINANCEIRO'].includes(session.role || '')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { socioId, tipo, valor, empreendimentoId } = body;

    if (!socioId || !tipo || !valor) {
      return NextResponse.json({ error: 'Sócio, tipo e valor são obrigatórios' }, { status: 400 });
    }

    const valorFloat = parseFloat(valor);
    if (isNaN(valorFloat) || valorFloat <= 0) {
      return NextResponse.json({ error: 'Valor da movimentação inválido' }, { status: 400 });
    }

    // 1. Algoritmo de Caixa Livre e Custo a Incorrer (VITAL)
    if (tipo === 'RETIRADA_LUCRO') {
      const { caixaLivre, custoAIncorrer } = await calcularCaixaLivre();

      if (valorFloat > caixaLivre) {
        const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
        return NextResponse.json({ 
          error: `Erro: Margem de Caixa Comprometida. A retirada de lucro de ${formatCurrency(valorFloat)} foi bloqueada porque o saldo físico atual está retido para cobrir o Custo a Incorrer das obras em andamento (Falta gastar ${formatCurrency(custoAIncorrer)} nas unidades ativas).` 
        }, { status: 400 });
      }
    }

    // 2. Criar a movimentação E lançar no razão do caixa, atomicamente.
    // APORTE credita o caixa; RETIRADA_LUCRO e PRO_LABORE debitam.
    const tipoLancamento = tipo === 'APORTE' ? 'CREDITO' : 'DEBITO';
    const movimentacao = await db.$transaction(async (tx) => {
      const mov = await tx.movimentacaoSocio.create({
        data: {
          socioId,
          tipo,
          valor: valorFloat,
          empreendimentoId: empreendimentoId || null,
        },
        include: { socio: true }
      });

      await postLancamento(tx, {
        valor: valorFloat,
        tipo: tipoLancamento,
        descricao: `Movimentação de sócio (${tipo}) — ${mov.socio.nome}`,
        origem: `SOCIO_${tipo}`,
      });

      return mov;
    });

    return NextResponse.json(movimentacao, { status: 201 });
  } catch (error) {
    console.error('Erro ao processar movimentação societária:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
