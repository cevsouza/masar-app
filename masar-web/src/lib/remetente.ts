import { db } from '@/lib/db';
import { runSemEscopoDeEmpresa } from '@/lib/tenant';
import { EMAIL_FROM, dominiosVerificados } from '@/lib/resend';

/**
 * Quem assina o e-mail de cada cliente.
 *
 * O problema que isto resolve: `Empresa.emailRemetente` existia no banco, era
 * editável no console e **nenhum ponto de envio o lia** — os quatro chamavam
 * `sendEmail` sem `from`. Resultado: o alerta diário da Construtora Fulano
 * chegava assinado com a marca da instância. Campo que ninguém lê não é white
 * label, é anotação.
 *
 * A CHAVE DA SOLUÇÃO é uma distinção do próprio formato do e-mail: no cabeçalho
 * `From: Nome <endereco@dominio>`, o **nome de exibição é texto livre** e só o
 * **endereço** precisa de domínio verificado. É o nome que a caixa de entrada
 * mostra em negrito. Ou seja: dá para o e-mail chegar assinado "Construtora
 * Fulano" usando o endereço verificado da plataforma, sem o cliente configurar
 * DNS nenhum. Isso sozinho resolve o vazamento de marca para todo cliente.
 *
 * O endereço próprio continua valendo quando existe — mas só se o domínio
 * estiver mesmo verificado no Resend. Enviar de um domínio não verificado não
 * "chega com a marca errada": **não chega**. E o e-mail diário é o produto
 * vendido — perder entrega para ganhar marca seria o pior negócio possível.
 *
 * Quando o endereço próprio não pode assinar, ele vira `Reply-To`: a resposta
 * do destinatário chega no cliente de qualquer forma, sem exigir DNS.
 */

export interface Remetente {
  /** Valor pronto do cabeçalho From. */
  from: string;
  /** Para onde vão as respostas, quando difere do From. */
  replyTo?: string;
}

/** Extrai o endereço de um From no formato `Nome <a@b>` ou `a@b`. */
export function extrairEndereco(from: string): string {
  const m = /<([^>]+)>/.exec(from);
  return (m ? m[1] : from).trim().toLowerCase();
}

/** Domínio de um endereço de e-mail. Vazio se não parecer um endereço. */
export function dominioDe(endereco: string): string {
  const at = endereco.lastIndexOf('@');
  return at === -1 ? '' : endereco.slice(at + 1).trim().toLowerCase();
}

/**
 * Monta o From. Aspas no nome quando ele tem caractere que o RFC 5322 exige
 * citar — vírgula em "Fulano & Cia, Ltda" quebraria o cabeçalho em dois
 * destinatários se fosse escrita crua.
 */
export function montarFrom(nome: string, endereco: string): string {
  const limpo = nome.replace(/["\\]/g, '').trim();
  if (!limpo) return endereco;
  const precisaAspas = /[,;:<>@()[\]\\".]/.test(limpo);
  return precisaAspas ? `"${limpo}" <${endereco}>` : `${limpo} <${endereco}>`;
}

/**
 * Decide o remetente a partir dos dados já resolvidos.
 *
 * Separada da consulta ao banco de propósito: é a regra que precisa de teste, e
 * testá-la não deve exigir Postgres nem chamada ao Resend.
 */
export function decidirRemetente(
  nomeEmpresa: string,
  emailRemetente: string | null | undefined,
  padrao: string,
  verificados: Set<string>,
): Remetente {
  const enderecoPadrao = extrairEndereco(padrao);
  const proprio = emailRemetente?.trim().toLowerCase() || '';

  // Sem endereço próprio: o nome do cliente já vai no display name.
  if (!proprio) return { from: montarFrom(nomeEmpresa, enderecoPadrao) };

  // Com domínio verificado, o cliente assina de ponta a ponta.
  if (verificados.has(dominioDe(proprio))) {
    return { from: montarFrom(nomeEmpresa, proprio) };
  }

  // Cadastrado mas não verificado: enviar por ele seria não entregar. Assina
  // pela plataforma com o nome do cliente e devolve as respostas para ele.
  return { from: montarFrom(nomeEmpresa, enderecoPadrao), replyTo: proprio };
}

/**
 * Remetente de uma empresa. Falha para o padrão da instância em vez de lançar:
 * um e-mail com a marca genérica é um problema pequeno; um e-mail que não sai
 * por causa de uma consulta que falhou é o alerta diário que não chegou.
 */
export async function remetenteDaEmpresa(empresaId: string): Promise<Remetente> {
  try {
    const empresa = await runSemEscopoDeEmpresa(() =>
      db.empresa.findUnique({
        where: { id: empresaId },
        select: { nome: true, emailRemetente: true },
      }),
    );
    if (!empresa) return { from: EMAIL_FROM };

    return decidirRemetente(
      empresa.nome,
      empresa.emailRemetente,
      EMAIL_FROM,
      await dominiosVerificados(),
    );
  } catch {
    return { from: EMAIL_FROM };
  }
}
