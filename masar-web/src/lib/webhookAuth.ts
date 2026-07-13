import { NextRequest } from 'next/server';

/**
 * Autorização de webhooks externos (WhatsApp CRM bot, ZapSign, etc.).
 *
 * Os handlers de webhook fazem mutações sensíveis (status de crédito, assinatura
 * de contrato, geração de recebível) e não têm sessão de usuário. Como o endpoint
 * precisa ser público para o callback externo chegar, a proteção é um segredo
 * compartilhado enviado no header `x-webhook-secret`, comparado a `WEBHOOK_SECRET`.
 *
 * Fail-closed: sem `WEBHOOK_SECRET` configurado, nenhum webhook é aceito.
 */
export function isWebhookAuthorized(request: NextRequest): boolean {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) return false;
  return request.headers.get('x-webhook-secret') === secret;
}
