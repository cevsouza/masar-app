import { db } from '@/lib/db';
import { exigirEmpresaId, runSemEscopoDeEmpresa } from '@/lib/tenant';
import { limiteEfetivo, planoDe, decidirTeto, AVISO_A_PARTIR_DE } from '@/lib/planos';

export { AVISO_A_PARTIR_DE };

/**
 * Licença do tenant: quanto do plano já foi consumido e o que isso impede.
 *
 * Antes disto, `plano` e `limiteObras` existiam como campos de cadastro e nada
 * mais — o console deixava escolher o plano de 25 unidades e o cliente
 * cadastrava 400 sem o sistema piscar. Campo que ninguém lê não é licença, é
 * anotação.
 *
 * REGRA DE RIGOR, e ela é deliberada: o teto barra apenas a CRIAÇÃO de novas
 * unidades. Nunca esconde dado, nunca bloqueia leitura, nunca trava o que já
 * existe. Um cliente adimplente que passou do teto no meio de uma obra precisa
 * continuar operando — a conversa de upgrade é comercial, e transformá-la em
 * obra parada é a forma mais rápida de perder o contrato que se queria
 * expandir.
 */

export interface EstadoLicenca {
  planoChave: string;
  planoRotulo: string;
  /** Teto de unidades. null = sem teto. */
  limite: number | null;
  /** Unidades já cadastradas. */
  consumo: number;
  /** 0..100. null quando não há teto. */
  percentual: number | null;
  /** Já bate ou passou do teto: criar nova unidade é recusado. */
  noLimite: boolean;
  /** ≥80% do teto: avisar, sem impedir. */
  proximoDoLimite: boolean;
  /** Dias até a licença expirar. null = sem data de expiração. Negativo = vencida. */
  diasParaVencer: number | null;
  dataExpiracao: Date | null;
}

const DIA_MS = 24 * 60 * 60 * 1000;

export async function estadoLicenca(empresaIdExplicito?: string): Promise<EstadoLicenca> {
  const empresaId = empresaIdExplicito ?? (await exigirEmpresaId());

  // A Empresa não pendura em empresaId — é o próprio tenant —, então a leitura
  // dela sai do escopo. A CONTAGEM fica FORA deste bloco de propósito: dentro
  // do escopo irrestrito, casa.count() somaria as unidades de todos os
  // clientes da instância e todo mundo apareceria estourado.
  const empresa = await runSemEscopoDeEmpresa(() =>
    db.empresa.findUnique({
      where: { id: empresaId },
      select: { plano: true, limiteUnidades: true, dataExpiracao: true },
    }),
  );

  const consumo = await db.casa.count();

  const plano = planoDe(empresa?.plano);
  const limite = limiteEfetivo(empresa?.plano, empresa?.limiteUnidades);
  const teto = decidirTeto(consumo, limite, 0);

  const dataExpiracao = empresa?.dataExpiracao ?? null;
  const diasParaVencer = dataExpiracao
    ? Math.ceil((dataExpiracao.getTime() - Date.now()) / DIA_MS)
    : null;

  return {
    planoChave: plano.chave,
    planoRotulo: plano.rotulo,
    limite,
    consumo,
    percentual: teto.percentual,
    // decidirTeto com quantidade 0 responde "já passou do teto?"; a pergunta
    // "cabe mais uma?" é de bloqueioNovasUnidades.
    noLimite: limite !== null && consumo >= limite,
    proximoDoLimite: teto.proximoDoLimite,
    diasParaVencer,
    dataExpiracao,
  };
}

/**
 * Guarda de criação de unidade, ciente da QUANTIDADE.
 *
 * A quantidade não é detalhe: unidade se cria em três caminhos neste sistema e
 * dois são em lote (criar empreendimento com N casas previstas, e aumentar N
 * depois). Uma guarda que só perguntasse "cabe mais uma?" deixaria o lote de
 * 400 passar inteiro — a licença pareceria aplicada sem estar.
 *
 * A mensagem é escrita para o USUÁRIO da construtora, que não escolheu o plano
 * e não decide o contrato: diz o número, o teto e a quem falar — não "erro de
 * licenciamento".
 */
export async function bloqueioNovasUnidades(quantidade = 1): Promise<
  { bloqueado: false } | { bloqueado: true; mensagem: string; estado: EstadoLicenca }
> {
  const estado = await estadoLicenca();
  const teto = decidirTeto(estado.consumo, estado.limite, quantidade);
  if (!teto.bloqueado) return { bloqueado: false };

  const cabem = teto.cabem;
  const emLote = quantidade > 1;

  const pedido = emLote
    ? `Você pediu ${quantidade} unidades e ${cabem === 0 ? 'não há espaço' : `só cabem ${cabem}`}. `
    : '';

  return {
    bloqueado: true,
    estado,
    mensagem:
      `Sua licença cobre ${estado.limite} ${estado.limite === 1 ? 'unidade' : 'unidades'} ` +
      `(plano ${estado.planoRotulo}) e você já tem ${estado.consumo} cadastrada${estado.consumo === 1 ? '' : 's'}. ` +
      pedido +
      `As unidades existentes continuam funcionando normalmente — só o cadastro de novas está pausado. ` +
      `Fale com o administrador da conta para ampliar o plano.`,
  };
}
