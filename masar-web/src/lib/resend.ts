import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
let resendClient: Resend | null = null;

if (resendApiKey) {
  resendClient = new Resend(resendApiKey);
}

// Remetente da INSTÂNCIA — o endereço verificado que sempre entrega. É o piso,
// não o teto: o remetente de cada cliente sai de lib/remetente, que usa este
// endereço com o NOME do cliente quando ele não tem domínio próprio verificado.
const DEFAULT_FROM = 'Masar Empreendimentos <nao-responda@masarempreendimentos.com.br>';
export const EMAIL_FROM = process.env.EMAIL_FROM || DEFAULT_FROM;

/**
 * Domínios que o Resend aceita como remetente nesta conta.
 *
 * Existe porque enviar de um domínio não verificado não entrega o e-mail com a
 * marca errada — simplesmente **não entrega**. Como o alerta diário é o produto
 * vendido, a decisão de qual endereço assina precisa ser tomada contra o estado
 * real da conta, não contra o que está digitado no console.
 *
 * Cache em memória: a resposta muda no dia em que alguém verifica um domínio,
 * não a cada e-mail. Falha devolve conjunto VAZIO, o que empurra todo mundo
 * para o endereço da instância — o caminho que sempre funciona.
 */
let cacheDominios: { valor: Set<string>; expiraEm: number } | null = null;
const TTL_DOMINIOS_MS = 10 * 60 * 1000;

export async function dominiosVerificados(): Promise<Set<string>> {
  if (cacheDominios && cacheDominios.expiraEm > Date.now()) return cacheDominios.valor;
  if (!resendClient) return new Set();

  try {
    const r = await resendClient.domains.list();
    const lista = (r.data?.data ?? []) as { name?: string; status?: string }[];
    const valor = new Set(
      lista
        .filter((d) => d.status === 'verified' && d.name)
        .map((d) => (d.name as string).trim().toLowerCase()),
    );
    cacheDominios = { valor, expiraEm: Date.now() + TTL_DOMINIOS_MS };
    return valor;
  } catch (e) {
    console.error('[Resend] Não foi possível listar domínios verificados:', e);
    return new Set();
  }
}

/** Zera o cache. Usado ao salvar o remetente de um cliente no console. */
export function limparCacheDominios() {
  cacheDominios = null;
}

/**
 * Endereço de um `Nome <a@b>`. Duplica de propósito o helper de lib/remetente:
 * importá-lo aqui fecharia o ciclo entre os dois módulos, e são três linhas.
 */
function extrairEnderecoLocal(from: string): string {
  const m = /<([^>]+)>/.exec(from);
  return (m ? m[1] : from).trim();
}

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
  /** Força o remetente. Vazio = resolvido pelo tenant do contexto. */
  from?: string;
  /** Força o Reply-To. Vazio = o que a resolução por tenant decidir. */
  replyTo?: string;
}

/**
 * Resolve quem assina, quando a chamada não disse.
 *
 * O padrão precisa ser o CERTO, e não o genérico: os quatro pontos de envio
 * deste sistema chamavam `sendEmail` sem `from`, e por isso o `emailRemetente`
 * de cada cliente ficou anos sem efeito nenhum. Deixar a marca do tenant
 * depender de cada chamada lembrar de passar um parâmetro é o mesmo defeito
 * esperando para acontecer de novo.
 *
 * Import dinâmico porque lib/remetente importa deste módulo — resolver o ciclo
 * aqui, na hora do uso, evita a dependência circular na carga.
 */
async function resolverRemetente(): Promise<{ from: string; replyTo?: string }> {
  try {
    const { resolverEmpresaId } = await import('@/lib/tenant');
    const empresaId = await resolverEmpresaId();
    if (!empresaId) return { from: EMAIL_FROM };
    const { remetenteDaEmpresa } = await import('@/lib/remetente');
    return await remetenteDaEmpresa(empresaId);
  } catch {
    // Sem contexto de empresa (script solto, chamada fora de request): o
    // endereço da instância é o certo, e nunca deixar de enviar por causa disto.
    return { from: EMAIL_FROM };
  }
}

export async function sendEmail({ to, subject, html, from, replyTo }: SendEmailParams) {
  const remetente = from ? { from, replyTo } : await resolverRemetente();
  const replyToFinal = replyTo ?? remetente.replyTo;

  try {
    if (resendClient) {
      const enviar = (de: string, responder?: string) =>
        resendClient!.emails.send({
          from: de,
          to,
          subject,
          html,
          ...(responder ? { replyTo: responder } : {}),
        });

      let response = await enviar(remetente.from, replyToFinal);

      // O SDK NÃO lança em erro de API: devolve `{ data, error }`. Sem esta
      // checagem, um envio recusado era registrado no log como "Enviado com
      // sucesso" — e a única forma de descobrir seria o cliente reclamar que
      // o alerta parou de chegar.
      // Compara ENDEREÇOS, não o cabeçalho inteiro: no caso comum o From é o
      // endereço da instância com o NOME do cliente, e as duas strings diferem
      // sem que haja nada a retentar — repetir o mesmo envio não conserta uma
      // falha que não é de remetente.
      const enderecoUsado = extrairEnderecoLocal(remetente.from).toLowerCase();
      const enderecoPadrao = extrairEnderecoLocal(EMAIL_FROM).toLowerCase();

      if (response.error && enderecoUsado !== enderecoPadrao) {
        // Quase sempre remetente não verificado. A marca é desejável; a entrega
        // é o produto. Reenvia pelo endereço da instância e deixa o rastro.
        console.error(
          `[Resend Email] Recusado com o remetente "${remetente.from}" (${response.error.message}). ` +
            `Reenviando por ${EMAIL_FROM}. Verifique o domínio no Resend.`,
        );
        response = await enviar(EMAIL_FROM, replyToFinal ?? extrairEnderecoLocal(remetente.from));
      }

      if (response.error) {
        console.error(`[Resend Email] Falha ao enviar para ${to}:`, response.error);
        return { success: false, error: response.error };
      }

      console.log(`[Resend Email] Enviado para ${to} como "${remetente.from}". ID: ${response.data?.id}`);
      return { success: true, id: response.data?.id };
    } else {
      console.log('==================================================');
      console.log(`[Mock Email Triggered] - RESEND_API_KEY ausente`);
      console.log(`De: ${remetente.from}${replyToFinal ? ` (responder para ${replyToFinal})` : ''}`);
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
