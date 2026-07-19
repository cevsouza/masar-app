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
    
    logger.info('[Webhook WhatsApp] Recebido disparo do bot CRM', { traceId, body });

    const { clienteCpf, statusCredito } = body;

    if (!clienteCpf || !statusCredito) {
      return NextResponse.json({ error: 'Parâmetros clienteCpf e statusCredito são obrigatórios.' }, { status: 400 });
    }

    // Validar status recebido
    const validStatus = ['DOCUMENTACAO_PENDENTE', 'ANALISE_CAIXA', 'APROVADO_CONDICIONADO', 'APROVADO_CONCLUIDO'];
    if (!validStatus.includes(statusCredito)) {
      return NextResponse.json({ error: `Status inválido. Valores permitidos: ${validStatus.join(', ')}` }, { status: 400 });
    }

    // Localizar cliente
    const cliente = await db.cliente.findFirst({
      where: { cpf: clienteCpf }
    });

    if (!cliente) {
      return NextResponse.json({ error: `Cliente com CPF ${clienteCpf} não encontrado.` }, { status: 404 });
    }

    // Atualizar status de crédito
    const updatedCliente = await db.cliente.update({
      where: { id: cliente.id },
      data: { statusCredito: statusCredito as any }
    });

    // Gravar log de auditoria
    await logMutation({
      usuarioId: 'INTEGRACAO_WHATSAPP_BOT',
      usuarioNome: 'WhatsApp CRM Bot',
      acao: 'CRM_STATUS_WHATSAPP_UPDATE',
      tabela: 'Cliente',
      registroId: cliente.id,
      valoresAntigos: { statusCredito: cliente.statusCredito },
      valoresNovos: { statusCredito: updatedCliente.statusCredito }
    });

    logger.info(`[Webhook WhatsApp] Cliente ${cliente.nome} atualizado para status ${statusCredito}`, { traceId });

    return NextResponse.json({
      success: true,
      clienteId: cliente.id,
      novoStatus: updatedCliente.statusCredito
    });
  } catch (error: any) {
    logger.error('[Webhook WhatsApp] Falha ao processar webhook', error);
    return NextResponse.json({ error: 'Erro interno do servidor', message: error.message }, { status: 500 });
  }
}
