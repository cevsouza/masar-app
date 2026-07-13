import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/auth';
import { logMutation } from '@/lib/audit';
import { calcularCaixaLivre } from '@/lib/socioGuardrail';
import { postLancamento } from '@/lib/ledger';

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('masar_session')?.value;
    const session = sessionToken ? await verifySession(sessionToken) : null;
    if (!session || !['ADMIN', 'FINANCEIRO'].includes(session.role || '')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { empreendimentoId, valorTotal } = body;

    if (!empreendimentoId || valorTotal === undefined) {
      return NextResponse.json({ error: 'Empreendimento e valor total são obrigatórios.' }, { status: 400 });
    }

    const valorFloat = parseFloat(valorTotal);
    if (isNaN(valorFloat) || valorFloat <= 0) {
      return NextResponse.json({ error: 'Valor total inválido.' }, { status: 400 });
    }

    const empreendimento = await db.empreendimento.findUnique({ where: { id: empreendimentoId } });
    if (!empreendimento) {
      return NextResponse.json({ error: 'Empreendimento não encontrado.' }, { status: 404 });
    }

    const socios = await db.socio.findMany({ where: { percentualCotas: { gt: 0 } } });
    if (socios.length === 0) {
      return NextResponse.json({ error: 'Nenhum sócio com participação cadastrada para distribuir o lucro.' }, { status: 400 });
    }

    // Trava de segurança: não distribuir mais do que o caixa livre real suporta
    const { caixaLivre, custoAIncorrer } = await calcularCaixaLivre();
    if (valorFloat > caixaLivre) {
      return NextResponse.json({
        error: `Erro: Margem de Caixa Comprometida. A distribuição de ${formatCurrency(valorFloat)} foi bloqueada porque o saldo físico atual está retido para cobrir o Custo a Incorrer das obras em andamento (Falta gastar ${formatCurrency(custoAIncorrer)} nas unidades ativas).`
      }, { status: 400 });
    }

    // Normaliza pelas cotas totais cadastradas, para nunca sobrar/faltar centavos
    // caso os percentuais dos sócios não somem exatamente 100%.
    const totalCotas = socios.reduce((sum, s) => sum + s.percentualCotas, 0);

    const distribuicao = socios.map(s => ({
      socioId: s.id,
      nome: s.nome,
      percentualCotas: s.percentualCotas,
      valor: Math.round((valorFloat * (s.percentualCotas / totalCotas)) * 100) / 100
    }));

    const movimentacoes = await db.$transaction(async (tx) => {
      const created = [];
      for (const d of distribuicao) {
        const mov = await tx.movimentacaoSocio.create({
          data: {
            socioId: d.socioId,
            tipo: 'RETIRADA_LUCRO',
            valor: d.valor,
            empreendimentoId
          }
        });
        created.push(mov);
      }

      // Débito único no razão pelo total distribuído.
      await postLancamento(tx, {
        valor: valorFloat,
        tipo: 'DEBITO',
        descricao: `Distribuição de lucro entre sócios — ${empreendimento.nome}`,
        origem: 'DISTRIBUICAO_LUCRO',
      });

      return created;
    });

    await logMutation({
      usuarioId: session.userId,
      usuarioNome: session.nome,
      acao: 'CREATE',
      tabela: 'MovimentacaoSocio',
      registroId: empreendimentoId,
      valoresNovos: { tipo: 'DISTRIBUICAO_LUCRO', empreendimentoId, valorTotal: valorFloat, distribuicao }
    });

    return NextResponse.json({ success: true, distribuicao, movimentacoes }, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao distribuir lucro entre sócios:', error);
    return NextResponse.json({ error: 'Erro interno do servidor', message: error.message }, { status: 500 });
  }
}
