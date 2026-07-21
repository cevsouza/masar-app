/**
 * O que fazer quando algo trava — a camada que INSTRUI.
 *
 * A trava de medição já sabia o que estava errado ("ASO vencido: João Silva").
 * Isso basta para quem conhece a obra e tem alguém a quem ligar. Num produto
 * vendido sem suporte, não basta: a diferença entre "operação bloqueada" e
 * "falta o ASO do João, vence amanhã, agende o exame — leva 1 dia" é a
 * diferença entre uma ligação para o fornecedor e um cliente que se resolve.
 *
 * Este arquivo é separado do catálogo de propósito. O catálogo é a REGRA — o
 * que a Caixa exige e o que trava. Isto é o ENSINO — por que exige, como
 * resolver, quanto tempo leva. Mudam em ritmos diferentes e são revisados por
 * gente diferente: a regra por quem lê a portaria, o ensino por quem já viveu
 * a obra.
 *
 * REGRA DE HONESTIDADE ao editar: `porque` explica a consequência prática e
 * verificável. Não inventar número de portaria, artigo ou prazo regulamentar
 * que não se possa conferir — um cliente que segue uma instrução errada perde
 * mais do que perderia sem instrução nenhuma. Quando o prazo varia (e quase
 * sempre varia), diga que varia.
 */

export interface GuiaItem {
  /** Por que isto existe — a consequência prática de não ter. */
  porque: string;
  /** O passo concreto, na ordem de fazer. */
  comoResolver: string;
  /** Estimativa honesta, com a variação assumida. */
  quantoTempo: string;
  /** Para onde a tela manda o usuário. */
  href: string;
  ondeLabel: string;
}

/** Fallback: item sem guia escrito ainda não deve travar sem dizer nada. */
export const GUIA_PADRAO: GuiaItem = {
  porque:
    'É uma exigência do enquadramento MCMV/Caixa registrada no checklist de conformidade deste empreendimento.',
  comoResolver:
    'Abra a aba Conformidade MCMV do empreendimento, localize o item e veja a evidência que falta.',
  quantoTempo: 'Varia conforme o item.',
  href: '/gestao/prontidao-caixa',
  ondeLabel: 'Prontidão Caixa',
};

/**
 * Chaves de SST. Não vêm do catálogo MCMV — a trava de segurança é anterior e
 * independente do regime, e vale para qualquer obra.
 */
export const GUIA_SST: Record<'aso' | 'epi', GuiaItem> = {
  aso: {
    porque:
      'Sem Atestado de Saúde Ocupacional válido o trabalhador não pode estar no canteiro. ' +
      'Numa fiscalização do trabalho, ou em qualquer acidente, é o primeiro documento pedido — ' +
      'e obra embargada não recebe vistoria, o que empurra a medição para o mês seguinte.',
    comoResolver:
      'Agende o exame periódico com a clínica de medicina do trabalho, receba o ASO e ' +
      'cadastre-o no trabalhador com a nova data de validade. Enquanto isso, afaste-o da frente de serviço.',
    quantoTempo: 'De um a três dias úteis, conforme a agenda da clínica.',
    href: '/trabalhadores',
    ondeLabel: 'Trabalhadores',
  },
  epi: {
    porque:
      'A entrega de EPI precisa estar registrada e dentro da validade. É o que prova que o ' +
      'equipamento foi fornecido — sem o registro, para efeito de fiscalização é como se não tivesse sido.',
    comoResolver:
      'Substitua o equipamento vencido e registre a nova entrega no cadastro do trabalhador, ' +
      'com a data e o CA do equipamento.',
    quantoTempo: 'No mesmo dia, se houver estoque no almoxarifado.',
    href: '/trabalhadores',
    ondeLabel: 'Trabalhadores',
  },
};

/** Guia por chave do catálogo MCMV. */
export const GUIA_MCMV: Record<string, GuiaItem> = {
  // ── A. Habilitação da construtora ──────────────────────────────────────────
  'pbqp-h': {
    porque:
      'A certificação PBQP-H/SiAC é condição para a construtora operar em empreendimento financiado ' +
      'pela Caixa. Vencida, a habilitação da empresa cai — e o problema não é de uma unidade, é do contrato inteiro.',
    comoResolver:
      'Verifique a data de validade no certificado atual e acione o organismo certificador para a ' +
      'auditoria de manutenção. Depois anexe o certificado vigente no cofre de documentos.',
    quantoTempo:
      'Semanas. Renovação de certificação não se resolve na véspera — comece com pelo menos 60 dias de folga.',
    href: '/fiscal/documentos',
    ondeLabel: 'Cofre de documentos',
  },
  geric: {
    porque:
      'É a análise de risco de crédito da construtora. Sem ela aprovada, a Caixa não contrata o empreendimento.',
    comoResolver: 'Acione o gerente da conta na Caixa para saber o que está pendente na análise.',
    quantoTempo: 'Semanas, e depende do banco.',
    href: '/fiscal/documentos',
    ondeLabel: 'Cofre de documentos',
  },
  'cnd-federal': {
    porque:
      'Certidão negativa federal vencida trava liberação de recurso público e assinatura de aditivo.',
    comoResolver:
      'Emita a certidão no site da Receita Federal/PGFN e anexe no cofre. Se sair positiva, ' +
      'o problema é o débito por trás — resolva antes de tentar de novo.',
    quantoTempo: 'Minutos, quando não há débito. Dias ou mais, quando há.',
    href: '/fiscal/documentos',
    ondeLabel: 'Cofre de documentos',
  },
  'cnd-fgts': {
    porque:
      'O CRF do FGTS é verificado a cada liberação. É das certidões que mais vence sem ninguém notar, ' +
      'porque tem validade curta.',
    comoResolver: 'Emita o CRF no site da Caixa e anexe no cofre.',
    quantoTempo: 'Minutos, quando a empresa está em dia.',
    href: '/fiscal/documentos',
    ondeLabel: 'Cofre de documentos',
  },
  'cnd-trabalhista': {
    porque: 'A CNDT vencida ou positiva bloqueia contratação com recurso público.',
    comoResolver: 'Emita a CNDT no site do TST e anexe no cofre.',
    quantoTempo: 'Minutos, quando não há processo com débito.',
    href: '/fiscal/documentos',
    ondeLabel: 'Cofre de documentos',
  },
  'art-rrt': {
    porque:
      'A obra precisa de responsável técnico com anotação/registro de responsabilidade ativo. ' +
      'É o documento que diz quem responde tecnicamente pela execução.',
    comoResolver:
      'Emita a ART no CREA (ou RRT no CAU) para o responsável, pague a taxa e anexe o documento assinado.',
    quantoTempo: 'De um a poucos dias úteis.',
    href: '/fiscal/documentos',
    ondeLabel: 'Cofre de documentos',
  },

  // ── B. Habilitação do empreendimento ───────────────────────────────────────
  'matricula-terreno': {
    porque:
      'A matrícula atualizada prova a titularidade e a ausência de ônus sobre o terreno. ' +
      'Sem ela, não há garantia para o financiamento.',
    comoResolver: 'Peça a certidão atualizada no cartório de registro de imóveis e anexe no cofre.',
    quantoTempo: 'De um a cinco dias úteis, conforme o cartório.',
    href: '/fiscal/documentos',
    ondeLabel: 'Cofre de documentos',
  },
  'registro-incorporacao': {
    porque:
      'O registro de incorporação é o que autoriza a comercialização das unidades antes da conclusão.',
    comoResolver:
      'Reúna a documentação exigida pelo cartório, protocole o registro e anexe a certidão no cofre.',
    quantoTempo: 'Semanas.',
    href: '/fiscal/documentos',
    ondeLabel: 'Cofre de documentos',
  },
  'alvara-construcao': {
    porque:
      'Alvará vencido é obra irregular perante a prefeitura — e obra irregular não passa em vistoria. ' +
      'É uma das causas mais comuns de medição travada, porque o vencimento chega no meio da obra, ' +
      'quando ninguém está olhando para ele. Por isso este item bloqueia a liberação aqui dentro.',
    comoResolver:
      'São duas coisas, e só a primeira destrava: registre o marco "Alvará de Prefeitura" como ' +
      'aprovado na ficha do empreendimento. Depois anexe o alvará no cofre com a data de validade — ' +
      'é dela que sai o aviso antes de vencer. Se já venceu, protocole a renovação hoje: o tempo de ' +
      'análise corre com a obra irregular para efeito de vistoria.',
    quantoTempo: 'Semanas, e varia muito de município para município.',
    href: '/empreendimentos',
    ondeLabel: 'Marcos do empreendimento',
  },
  'projeto-caixa': {
    porque:
      'A aprovação do projeto na Caixa é o marco que autoriza o início das liberações. ' +
      'Sem ele, não há o que medir do ponto de vista do banco — a obra pode estar andando e o dinheiro não sai.',
    comoResolver:
      'Verifique com o engenheiro credenciado o que falta no projeto protocolado e registre o marco ' +
      'como aprovado quando sair a aprovação.',
    quantoTempo: 'Semanas, e depende de quantas rodadas de exigência vierem.',
    href: '/empreendimentos',
    ondeLabel: 'Marcos do empreendimento',
  },
  'faixa-definida': {
    porque:
      'A faixa define o teto de valor do imóvel, a alíquota do RET e as exigências que se aplicam. ' +
      'Sem faixa definida, o sistema não tem contra o que conferir — e nem você.',
    comoResolver:
      'Abra a ficha do empreendimento e selecione a faixa MCMV correspondente à renda do público-alvo.',
    quantoTempo: 'Minutos. É preenchimento, não trâmite.',
    href: '/empreendimentos',
    ondeLabel: 'Ficha do empreendimento',
  },

  // ── C. Projeto e unidade ───────────────────────────────────────────────────
  'teto-valor': {
    porque:
      'Unidade acima do teto da faixa não é financiável naquela faixa. Descobrir isso na análise do ' +
      'banco significa refazer o enquadramento ou o preço — depois de a obra já ter andado.',
    comoResolver:
      'Compare o valor de venda projetado de cada unidade com o teto da faixa. Ou ajuste o valor, ' +
      'ou reenquadre o empreendimento na faixa correta. Confira também se o teto cadastrado nos ' +
      'Parâmetros MCMV está atualizado — ele muda por portaria.',
    quantoTempo: 'Horas, se for ajuste de preço. Semanas, se exigir reenquadramento.',
    href: '/configuracoes/mcmv',
    ondeLabel: 'Parâmetros MCMV',
  },
  'area-minima': {
    porque: 'Unidade abaixo da área mínima da faixa não é aceita no programa.',
    comoResolver:
      'Confira a área útil cadastrada de cada unidade contra o mínimo da faixa. Divergência costuma ' +
      'ser erro de cadastro; quando é de projeto, é assunto para o projetista.',
    quantoTempo: 'Horas, quando é cadastro.',
    href: '/casas',
    ondeLabel: 'Unidades',
  },
  'especificacoes-minimas': {
    porque:
      'O programa define um padrão mínimo de acabamento. Entregar abaixo dele gera exigência na vistoria.',
    comoResolver: 'Anexe o memorial descritivo com as especificações no cofre de documentos.',
    quantoTempo: 'Horas, se o memorial já existe.',
    href: '/fiscal/documentos',
    ondeLabel: 'Cofre de documentos',
  },
  'desempenho-nbr15575': {
    porque:
      'O laudo de desempenho comprova que a edificação atende à norma. É cobrado na análise técnica.',
    comoResolver: 'Contrate o laboratório/consultor, obtenha o laudo e anexe no cofre.',
    quantoTempo: 'Semanas.',
    href: '/fiscal/documentos',
    ondeLabel: 'Cofre de documentos',
  },
  'acessibilidade-nbr9050': {
    porque:
      'A acessibilidade é verificada em projeto e em obra. Corrigir depois de executado é caro e atrasa a entrega.',
    comoResolver: 'Obtenha o laudo/declaração de conformidade com a NBR 9050 e anexe no cofre.',
    quantoTempo: 'Dias a semanas.',
    href: '/fiscal/documentos',
    ondeLabel: 'Cofre de documentos',
  },
  'unidades-acessiveis': {
    porque:
      'O programa exige um percentual mínimo de unidades adaptáveis. É requisito de projeto: ' +
      'não dá para resolver no acabamento.',
    comoResolver:
      'Marque quais unidades são adaptáveis no cadastro de cada casa até atingir o percentual exigido. ' +
      'Se nenhuma foi projetada assim, o assunto é com o projetista, não com o cadastro.',
    quantoTempo: 'Minutos, se as unidades existem no projeto.',
    href: '/casas',
    ondeLabel: 'Unidades',
  },

  // ── D. Execução e liberação ────────────────────────────────────────────────
  'cronograma-definido': {
    porque:
      'O cronograma físico-financeiro é a base da medição: é contra ele que o engenheiro credenciado ' +
      'compara o avanço. Sem cronograma, não há percentual a defender.',
    comoResolver: 'Cadastre as etapas com prazo e valor na aba Cronograma do empreendimento.',
    quantoTempo: 'Horas.',
    href: '/empreendimentos',
    ondeLabel: 'Cronograma',
  },
  'seguranca-em-dia': {
    porque:
      'Documentação de segurança vencida expõe a obra a embargo — e obra embargada não recebe vistoria.',
    comoResolver: 'Regularize os ASOs e EPIs vencidos no cadastro dos trabalhadores.',
    quantoTempo: 'De um a três dias úteis.',
    href: '/trabalhadores',
    ondeLabel: 'Trabalhadores',
  },
  'habite-se': {
    porque:
      'O habite-se e a averbação são o que permitem individualizar a matrícula e repassar a unidade ao comprador.',
    comoResolver: 'Solicite a vistoria da prefeitura, obtenha o habite-se e averbe no cartório.',
    quantoTempo: 'Semanas a meses.',
    href: '/fiscal/documentos',
    ondeLabel: 'Cofre de documentos',
  },
};

/** Guia de uma chave do catálogo, com fallback que nunca deixa a tela muda. */
export function guiaDe(chave: string): GuiaItem {
  return GUIA_MCMV[chave] ?? GUIA_PADRAO;
}
