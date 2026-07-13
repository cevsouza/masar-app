import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/auth';
import { logMutation } from '@/lib/audit';
import { postLancamento } from '@/lib/ledger';

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('masar_session')?.value;
    const session = sessionToken ? await verifySession(sessionToken) : null;
    if (!session || !['ADMIN', 'FINANCEIRO'].includes(session.role || '')) {
      return NextResponse.json({ error: 'Acesso negado: Apenas administradores ou financeiro podem registrar lançamentos.' }, { status: 403 });
    }

    const body = await request.json();
    const {
      descricao,
      valor,
      dataVencimento,
      dataPagamento,
      natureza,
      status,
      categoria,
      empreendimentoId,
      casaId,
      clienteId,
      insumoId,
      quantidade
    } = body;

    if (!descricao || valor === undefined || !natureza || !status || !categoria || !empreendimentoId) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes: descricao, valor, natureza, status, categoria, empreendimentoId.' }, { status: 400 });
    }

    // 1. Criar transação em banco de dados
    const transacao = await db.$transaction(async (tx) => {
      const trx = await tx.transacaoFinanceira.create({
        data: {
          descricao,
          valor: parseFloat(valor),
          dataVencimento: new Date(dataVencimento),
          dataPagamento: dataPagamento ? new Date(dataPagamento) : null,
          natureza,
          status,
          categoria,
          empreendimentoId,
          casaId: casaId || null,
          clienteId: clienteId || null,
          insumoId: insumoId || null,
          quantidade: quantidade ? parseFloat(quantidade) : 1
        }
      });

      // 2. Se a transação já foi paga, lançar no razão do caixa (receita credita,
      // despesa debita). postLancamento cria a linha imutável e move o saldo.
      if (status === 'PAGO') {
        await postLancamento(tx, {
          valor: parseFloat(valor),
          tipo: natureza === 'RECEITA' ? 'CREDITO' : 'DEBITO',
          descricao,
          origem: natureza === 'RECEITA' ? 'RECEITA_PAGA' : 'DESPESA_PAGA',
          data: dataPagamento ? new Date(dataPagamento) : new Date(),
        });
      }

      return trx;
    });

    // 3. Log de auditoria
    await logMutation({
      usuarioId: session.userId,
      usuarioNome: session.nome,
      acao: 'CREATE',
      tabela: 'TransacaoFinanceira',
      registroId: transacao.id,
      valoresAntigos: null,
      valoresNovos: transacao
    });

    return NextResponse.json({ success: true, transacao });
  } catch (error: any) {
    console.error('Erro ao salvar lançamento financeiro:', error);
    return NextResponse.json({ error: 'Erro interno do servidor', message: error.message }, { status: 500 });
  }
}

// GET: Listar transações com filtros avançados para o Livro-Caixa
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const empreendimentoId = searchParams.get('empreendimentoId');
    const casaId = searchParams.get('casaId');
    const status = searchParams.get('status');
    const categoria = searchParams.get('categoria');

    const filter: any = {};
    if (empreendimentoId) filter.empreendimentoId = empreendimentoId;
    if (casaId) {
      if (casaId === 'null') filter.casaId = null;
      else filter.casaId = casaId;
    }
    if (status) filter.status = status;
    if (categoria) filter.categoria = categoria;

    const transacoes = await db.transacaoFinanceira.findMany({
      where: filter,
      orderBy: { dataVencimento: 'desc' },
      include: {
        casa: { select: { numero: true, quadra: true } },
        cliente: { select: { nome: true } }
      }
    });

    return NextResponse.json(transacoes);
  } catch (error: any) {
    console.error('Erro ao listar transações:', error);
    return NextResponse.json({ error: 'Erro interno do servidor', message: error.message }, { status: 500 });
  }
}
