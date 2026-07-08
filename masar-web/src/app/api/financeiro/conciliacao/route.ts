import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logMutation } from '@/lib/audit';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const traceId = crypto.randomUUID();
    logger.info('[Conciliação] Iniciando motor de conciliação bancária Open Finance', { traceId });

    // 1. Buscar transações de CRÉDITO não conciliadas
    const transacoes = await db.transacaoBancaria.findMany({
      where: {
        conciliado: false,
        tipo: 'CREDITO'
      },
      orderBy: { data: 'asc' }
    });

    let conciliadosContador = 0;

    for (const trx of transacoes) {
      // 2. Tentar encontrar uma conta a receber não paga
      // Critério: valor idêntico e vencimento próximo (tolerância de 7 dias)
      const dataMinima = new Date(trx.data);
      dataMinima.setDate(dataMinima.getDate() - 7);
      const dataMaxima = new Date(trx.data);
      dataMaxima.setDate(dataMaxima.getDate() + 7);

      const contaAReceber = await db.contasAReceberCliente.findFirst({
        where: {
          pago: false,
          valor: trx.valor,
          dataVencimento: {
            gte: dataMinima,
            lte: dataMaxima
          }
        },
        include: {
          contrato: {
            include: {
              cliente: true
            }
          }
        }
      });

      if (contaAReceber) {
        // 3. Executar conciliação em uma transação ACID
        await db.$transaction(async (tx) => {
          // Marcar conta a receber como paga
          await tx.contasAReceberCliente.update({
            where: { id: contaAReceber.id },
            data: { pago: true }
          });

          // Marcar transação como conciliada
          await tx.transacaoBancaria.update({
            where: { id: trx.id },
            data: { conciliado: true }
          });

          // Atualizar o saldo físico da conta bancária da transação
          await tx.contaBancaria.update({
            where: { id: trx.contaBancariaId },
            data: {
              saldoAtual: {
                increment: trx.valor
              }
            }
          });

          // Gravar na auditoria imutável
          await logMutation({
            usuarioId: 'SYSTEM_CONCILIATION_ENGINE',
            usuarioNome: 'Motor Conciliação Open Finance',
            acao: 'AUTO_CONCILIATION_MATCH',
            tabela: 'ContasAReceberCliente',
            registroId: contaAReceber.id,
            valoresAntigos: { pago: false },
            valoresNovos: { pago: true, transacaoBancariaId: trx.id }
          });
        });

        logger.info(`[Conciliação] Match efetuado com sucesso: Transação ${trx.id} conciliada com Parcela Cliente ${contaAReceber.id}`, {
          traceId,
          valor: trx.valor,
          cliente: contaAReceber.contrato.cliente.nome
        });

        conciliadosContador++;
      }
    }

    return NextResponse.json({
      success: true,
      transacoesProcessadas: transacoes.length,
      conciliacoesEfetuadas: conciliadosContador
    });
  } catch (error: any) {
    logger.error('[Conciliação] Erro no motor de conciliação bancária', error);
    return NextResponse.json({ error: 'Erro interno do servidor', message: error.message }, { status: 500 });
  }
}

// Permitir gatilho via chamada GET simplificada para testes de administrador
export async function GET(request: NextRequest) {
  return POST(request);
}
