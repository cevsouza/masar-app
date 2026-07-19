import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
let resendClient: Resend | null = null;

if (resendApiKey) {
  resendClient = new Resend(resendApiKey);
}

// Remetente por instância. Cada cliente (white label) tem o seu próprio domínio
// verificado no Resend; sem a env, cai no remetente da instância original (Masar).
const DEFAULT_FROM = 'Masar Empreendimentos <nao-responda@masarempreendimentos.com.br>';
export const EMAIL_FROM = process.env.EMAIL_FROM || DEFAULT_FROM;

/**
 * Destinatários extras dos alertas, além dos usuários ADMIN/FINANCEIRO da própria
 * instância. VAZIO por padrão e de propósito: um e-mail fixo no código mandaria
 * dados da obra de um cliente para fora da empresa dele (vazamento/LGPD).
 * Definir `EXTRA_ALERT_EMAILS` (separado por vírgula) por instância.
 */
export function getExtraAlertEmails(): string[] {
  return (process.env.EXTRA_ALERT_EMAILS || '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  /** Sobrescreve o remetente (usado quando o tenant tem remetente próprio). */
  from?: string;
}

export async function sendEmail({ to, subject, html, from }: SendEmailParams) {
  try {
    if (resendClient) {
      const response = await resendClient.emails.send({
        from: from || EMAIL_FROM,
        to,
        subject,
        html,
      });
      console.log(`[Resend Email] Enviado com sucesso para ${to}. ID: ${response.data?.id}`);
      return { success: true, id: response.data?.id };
    } else {
      console.log('==================================================');
      console.log(`[Mock Email Triggered] - RESEND_API_KEY ausente`);
      console.log(`Para: ${to}`);
      console.log(`Assunto: ${subject}`);
      console.log(`HTML: \n${html}`);
      console.log('==================================================');
      return { success: true, mock: true };
    }
  } catch (error) {
    console.error('Falha ao enviar e-mail via Resend:', error);
    return { success: false, error };
  }
}
