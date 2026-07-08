import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
let resendClient: Resend | null = null;

if (resendApiKey) {
  resendClient = new Resend(resendApiKey);
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  try {
    if (resendClient) {
      const response = await resendClient.emails.send({
        from: 'Masar ERP <onboarding@resend.dev>',
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
