import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logMutation } from '@/lib/audit';
import { logger } from '@/lib/logger';
import { sugerirTitulo, conciliar, naturezaEsperada, type TituloAberto } from '@/lib/conciliacao';

// Carrega os títulos em aberto uma vez (recebíveis e a pagar) para sugestão/casamento.
async function carregarTitulosAbertos(): Promise<TituloAberto[]> {
  const titulos = await db.transacaoFinanceira.findMany({
    where: { status: { in: ['PENDENTE', 'ATRASADO'] } },
    select: { id: true, valor: true, natureza: true, dataVencimento: true, descricao: true },
  });
  return titulos.map((t) => ({ ...t, natureza: t.natureza as string }));
}

// GET: lista as linhas de extrato ainda não conciliadas, cada uma com a sugestão
// de título (se houver), para revisão manual na tela de conciliação.
export async function GET() {
  try {
    const linhas = await db.transacaoBancaria.findMany({
      where: { conciliado: false },
      orderBy: { data: 'asc' },
    });

    const titulos = await carregarTitulosAbertos();

    const itens = linhas.map((l) => {
      const sugestao = sugerirTitulo(
        { id: l.id, contaBancariaId: l.contaBancariaId, data: l.data, valor: l.valor, tipo: l.tipo },
        titulos
      );
      return {
        id: l.id,
        data: l.data.toISOString(),
        descricao: l.descricao,
        valor: l.valor,
        tipo: l.tipo,
        origem: l.origem,
        naturezaEsperada: naturezaEsperada(l.tipo),
        sugestao: sugestao
          ? { id: sugestao.id, descricao: sugestao.descricao, valor: sugestao.valor, dataVencimento: sugestao.dataVencimento }
          : null,
      };
    });

    return NextResponse.json({
      pendentes: itens,
      totalPendentes: itens.length,
      comSugestao: itens.filter((i) => i.sugestao).length,
    });
  } catch (error: any) {
    logger.error('[Conciliação] Erro ao listar pendências', error);
    return NextResponse.json({ error: 'Erro interno do servidor', message: error.message }, { status: 500 });
  }
}

// POST: motor automático — casa TODA linha não conciliada (crédito->receita,
// débito->despesa) que tenha match único por valor e data. Cada casamento é ACID.
export async function POST() {
  try {
    const traceId = crypto.randomUUID();
    logger.info('[Conciliação] Rodando motor automático', { traceId });

    const linhas = await db.transacaoBancaria.findMany({
      where: { conciliado: false },
      orderBy: { data: 'asc' },
    });

    let conciliadosContador = 0;

    for (const l of linhas) {
      // Recarrega os títulos a cada iteração para não casar o mesmo título 2x.
      const titulos = await carregarTitulosAbertos();
      const linha = { id: l.id, contaBancariaId: l.contaBancariaId, data: l.data, valor: l.valor, tipo: l.tipo };
      const titulo = sugerirTitulo(linha, titulos);
      if (!titulo) continue;

      await db.$transaction(async (tx) => {
        await conciliar(tx, linha, titulo);
        await logMutation({
          usuarioId: 'SYSTEM_CONCILIATION_ENGINE',
          usuarioNome: 'Motor de Conciliação',
          acao: 'AUTO_CONCILIATION_MATCH',
          tabela: 'TransacaoFinanceira',
          registroId: titulo.id,
          valoresAntigos: { status: 'PENDENTE' },
          valoresNovos: { status: 'PAGO', transacaoBancariaId: l.id, tipo: l.tipo },
        });
      });
      conciliadosContador++;
    }

    return NextResponse.json({
      success: true,
      transacoesProcessadas: linhas.length,
      conciliacoesEfetuadas: conciliadosContador,
    });
  } catch (error: any) {
    logger.error('[Conciliação] Erro no motor automático', error);
    return NextResponse.json({ error: 'Erro interno do servidor', message: error.message }, { status: 500 });
  }
}
