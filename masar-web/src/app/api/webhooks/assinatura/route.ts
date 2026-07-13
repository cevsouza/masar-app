import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logMutation } from '@/lib/audit';
import { logger } from '@/lib/logger';
import { isWebhookAuthorized } from '@/lib/webhookAuth';

export async function POST(request: NextRequest) {
  try {
    if (!isWebhookAuthorized(request)) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const traceId = crypto.randomUUID();
    const body = await request.json();

    logger.info('[Webhook Assinatura] Recebido disparo ZapSign', { traceId, body });

    // ZapSign geralmente envia tokens identificadores ou IDs no payload
    const { token, status } = body; // token do documento ZapSign e status ("signed", etc.)

    if (!token || !status) {
      return NextResponse.json({ error: 'Parâmetros token e status são obrigatórios' }, { status: 400 });
    }

    // Buscar a assinatura pelo token/externalId
    const assinatura = await db.assinaturaContrato.findFirst({
      where: { externalId: token },
      include: { contrato: true }
    });

    if (!assinatura) {
      return NextResponse.json({ error: `Assinatura com token ZapSign ${token} não encontrada.` }, { status: 404 });
    }

    if (status === 'signed') {
      // 1. Atualizar contrato e registro de assinatura eletrônica
      await db.$transaction(async (tx) => {
        // Atualizar status do ContratoVenda para ASSINADO_CAIXA
        const contrato = await tx.contratoVenda.update({
          where: { id: assinatura.contratoId },
          data: { status: 'ASSINADO_CAIXA' },
          include: { casa: true }
        });

        // Atualizar registro de assinatura
        await tx.assinaturaContrato.update({
          where: { id: assinatura.id },
          data: {
            status: 'ASSINADO',
            dataAssinatura: new Date()
          }
        });

        // Avançar etapa de jornada do cliente para PAGAMENTO_ENTRADA
        await tx.cliente.update({
          where: { id: contrato.clienteId },
          data: { etapaAtual: 'PAGAMENTO_ENTRADA' }
        });

        // Gerar o boleto de sinal/entrada (Parcela 0) se houver valor de entrada
        if (contrato.entrada > 0) {
          const vencimentoSinal = new Date();
          vencimentoSinal.setDate(vencimentoSinal.getDate() + 3); // 3 dias de prazo
          
          await tx.transacaoFinanceira.create({
            data: {
              descricao: 'Sinal/Entrada de Contrato',
              valor: contrato.entrada,
              dataVencimento: vencimentoSinal,
              natureza: 'RECEITA',
              status: 'PENDENTE',
              categoria: 'ENTRADA_CLIENTE',
              empreendimentoId: contrato.casa.empreendimentoId,
              casaId: contrato.casaId,
              clienteId: contrato.clienteId,
              contratoId: contrato.id
            }
          });
        }

        // Registrar log de auditoria
        await logMutation({
          usuarioId: 'ZAP_SIGN_WEBHOOK',
          usuarioNome: 'ZapSign Webhook',
          acao: 'ELECTRONIC_SIGNATURE_COMPLETED_JORNADA_ADVANCE',
          tabela: 'ContratoVenda',
          registroId: assinatura.contratoId,
          valoresAntigos: { status: assinatura.contrato.status },
          valoresNovos: { status: 'ASSINADO_CAIXA', etapaAtual: 'PAGAMENTO_ENTRADA' }
        });
      });

      logger.info(`[Webhook Assinatura] Contrato ${assinatura.contratoId} assinado e atualizado via ZapSign`, { traceId });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error('[Webhook Assinatura] Erro no webhook de assinatura eletrônica', error);
    return NextResponse.json({ error: 'Erro interno do servidor', message: error.message }, { status: 500 });
  }
}
