import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/auth';
import { logMutation } from '@/lib/audit';
import { postLancamento } from '@/lib/ledger';
import { exigirAcesso } from '@/lib/apiAuth';

// Faixa de aging de um título em aberto, a partir dos dias de atraso (base: hoje).
function faixaAging(diasVencido: number): 'A_VENCER' | 'D_1_30' | 'D_31_60' | 'D_60_MAIS' {
  if (diasVencido <= 0) return 'A_VENCER';
  if (diasVencido <= 30) return 'D_1_30';
  if (diasVencido <= 60) return 'D_31_60';
  return 'D_60_MAIS';
}

function inicioDoDia(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

// GET: títulos em aberto (contas a pagar/receber) com faixa de aging e totais.
export async function GET(request: NextRequest) {
  const auth = await exigirAcesso(request, { modulo: 'financeiro' });
  if (!auth.ok) return auth.resposta;

  try {
    const { searchParams } = new URL(request.url);
    const empreendimentoId = searchParams.get('empreendimentoId');
    const natureza = searchParams.get('natureza'); // DESPESA | RECEITA | null (ambos)

    const where: any = { status: { in: ['PENDENTE', 'ATRASADO'] } };
    if (empreendimentoId) where.empreendimentoId = empreendimentoId;
    if (natureza === 'DESPESA' || natureza === 'RECEITA') where.natureza = natureza;

    const titulos = await db.transacaoFinanceira.findMany({
      where,
      orderBy: { dataVencimento: 'asc' },
      include: {
        casa: { select: { numero: true, quadra: true } },
        cliente: { select: { nome: true } },
        empreendimento: { select: { nome: true } },
      },
    });

    const hoje = inicioDoDia(new Date());

    const itens = titulos.map((t) => {
      const venc = inicioDoDia(t.dataVencimento);
      const diasVencido = Math.round((hoje.getTime() - venc.getTime()) / 86400000);
      return {
        id: t.id,
        descricao: t.descricao,
        valor: t.valor,
        natureza: t.natureza,
        categoria: t.categoria,
        dataVencimento: t.dataVencimento.toISOString(),
        casaId: t.casaId,
        casa: t.casa,
        cliente: t.cliente,
        empreendimento: t.empreendimento,
        diasVencido,
        faixa: faixaAging(diasVencido),
      };
    });

    // Totais por natureza e por faixa de aging.
    const resumo = {
      pagar: { total: 0, A_VENCER: 0, D_1_30: 0, D_31_60: 0, D_60_MAIS: 0, count: 0 },
      receber: { total: 0, A_VENCER: 0, D_1_30: 0, D_31_60: 0, D_60_MAIS: 0, count: 0 },
    };
    for (const it of itens) {
      const alvo = it.natureza === 'DESPESA' ? resumo.pagar : resumo.receber;
      alvo.total += it.valor;
      alvo[it.faixa] += it.valor;
      alvo.count += 1;
    }

    return NextResponse.json({ itens, resumo });
  } catch (error: any) {
    console.error('Erro ao listar contas em aberto:', error);
    return NextResponse.json({ error: 'Erro interno do servidor', message: error.message }, { status: 500 });
  }
}

// PATCH: dar baixa em um título (marca PAGO + posta no razão do caixa).
export async function PATCH(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('masar_session')?.value;
    const session = sessionToken ? await verifySession(sessionToken) : null;
    if (!session || !['ADMIN', 'FINANCEIRO'].includes(session.role || '')) {
      return NextResponse.json({ error: 'Acesso negado: apenas ADMIN ou FINANCEIRO podem dar baixa em títulos.' }, { status: 403 });
    }

    const body = await request.json();
    const { id, dataPagamento } = body;
    if (!id) {
      return NextResponse.json({ error: 'ID do título é obrigatório.' }, { status: 400 });
    }

    const titulo = await db.transacaoFinanceira.findUnique({ where: { id } });
    if (!titulo) {
      return NextResponse.json({ error: 'Título não encontrado.' }, { status: 404 });
    }
    if (titulo.status === 'PAGO') {
      return NextResponse.json({ error: 'Este título já foi baixado.' }, { status: 409 });
    }

    const dataPg = dataPagamento ? new Date(dataPagamento) : new Date();

    const atualizado = await db.$transaction(async (tx) => {
      const trx = await tx.transacaoFinanceira.update({
        where: { id },
        data: { status: 'PAGO', dataPagamento: dataPg },
      });

      // Receita credita, despesa debita o razão do caixa (saldo em cache).
      await postLancamento(tx, {
        valor: titulo.valor,
        tipo: titulo.natureza === 'RECEITA' ? 'CREDITO' : 'DEBITO',
        descricao: titulo.descricao,
        origem: titulo.natureza === 'RECEITA' ? 'RECEITA_PAGA' : 'DESPESA_PAGA',
        data: dataPg,
      });

      return trx;
    });

    await logMutation({
      usuarioId: session.userId,
      usuarioNome: session.nome,
      acao: 'BAIXA_TITULO',
      tabela: 'TransacaoFinanceira',
      registroId: id,
      valoresNovos: { status: 'PAGO', dataPagamento: dataPg, valor: titulo.valor, natureza: titulo.natureza },
    });

    return NextResponse.json({ success: true, transacao: atualizado });
  } catch (error: any) {
    console.error('Erro ao dar baixa no título:', error);
    return NextResponse.json({ error: 'Erro interno do servidor', message: error.message }, { status: 500 });
  }
}
