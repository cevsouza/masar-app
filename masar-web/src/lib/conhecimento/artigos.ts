import { GUIA_MCMV } from '@/lib/mcmv/guia';
import { CATALOGO_MCMV, LABEL_CATEGORIA } from '@/lib/mcmv/catalogo';

/**
 * Base de conhecimento — o que substitui o suporte.
 *
 * A decisão de vender sem atendimento humano cria uma obrigação: o que o
 * cliente perguntaria ao telefone precisa estar escrito e ser achável no
 * momento em que ele trava. Uma base genérica ("clique em Salvar para salvar")
 * não substitui suporte nenhum — ela só existe para constar.
 *
 * DUAS ORIGENS, e a distinção é deliberada:
 *
 *  1. Os artigos de CONFORMIDADE são GERADOS do catálogo + do guia
 *     (lib/mcmv/guia.ts). Não são copiados: se o guia mudar, o artigo muda
 *     junto. Duas cópias do mesmo conhecimento divergem, e a que estiver errada
 *     será a que o cliente ler.
 *  2. Os artigos de PRODUTO são escritos aqui, porque explicam decisões do
 *     sistema que não estão em lugar nenhum do código.
 *
 * ⚠️ O QUE FALTA, e não é código: os artigos marcados com `precisaDoDono`
 * descrevem o que o sistema faz, mas o conhecimento que vale — o que a Caixa
 * cobra na prática, o que o engenheiro credenciado pede, o que de fato trava
 * uma medição — vem de quem viveu a obra. Enquanto não forem revisados, são
 * verdadeiros mas rasos.
 */

export type CategoriaArtigo = 'primeiros-passos' | 'conformidade' | 'medicao' | 'dados';

export const LABEL_CATEGORIA_ARTIGO: Record<CategoriaArtigo, string> = {
  'primeiros-passos': 'Primeiros passos',
  conformidade: 'Conformidade MCMV / Caixa',
  medicao: 'Medição e liberação',
  dados: 'Dados e cadastro',
};

export interface Artigo {
  slug: string;
  titulo: string;
  categoria: CategoriaArtigo;
  /** Uma frase: o que o leitor resolve lendo isto. */
  resumo: string;
  /** Parágrafos. Sem HTML — a tela cuida da apresentação. */
  corpo: string[];
  /** Termos que o cliente digitaria na busca, incluindo os "errados". */
  termos: string[];
  /** Link para a tela onde se resolve o assunto. */
  href?: string;
  ondeLabel?: string;
  /** Precisa da revisão de quem conhece a obra para deixar de ser raso. */
  precisaDoDono?: boolean;
}

// ── Artigos escritos ─────────────────────────────────────────────────────────

const ESCRITOS: Artigo[] = [
  {
    slug: 'por-onde-comecar',
    titulo: 'Por onde começar numa conta nova',
    categoria: 'primeiros-passos',
    resumo: 'A ordem que faz os indicadores fecharem, e por que ela é essa.',
    termos: ['comecar', 'inicio', 'primeiro acesso', 'conta nova', 'vazio', 'configurar'],
    href: '/gestao/onboarding',
    ondeLabel: 'Assistente de novo projeto',
    corpo: [
      'A ordem não é burocracia: cada passo alimenta o seguinte. Empreendimento primeiro, porque tudo pendura nele. Depois as unidades, porque sem elas nenhum indicador de obra tem do que falar. Depois orçamento e prazo, que é o que o sistema compara com o realizado.',
      'O assistente pede uma coisa de cada vez, na ordem certa, e abre a tela onde você preenche. Se preferir, dá para pular os passos recomendados e voltar depois — só os essenciais travam os indicadores.',
      'Se as unidades já existem numa planilha, não digite uma a uma: use a importação. Ela aceita os nomes de coluna que a sua planilha já usa.',
    ],
  },
  {
    slug: 'importar-planilha',
    titulo: 'Importar as unidades da minha planilha',
    categoria: 'dados',
    resumo: 'Como trazer a lista de casas do Excel sem digitar de novo.',
    termos: ['planilha', 'excel', 'importar', 'csv', 'migrar', 'importacao', 'subir'],
    href: '/importacao',
    ondeLabel: 'Importar planilha',
    corpo: [
      'O sistema lê arquivo CSV. No Excel, use "Salvar como" e escolha CSV — não precisa mudar mais nada.',
      'Você não precisa renomear coluna nenhuma. O sistema entende "unidade", "casa" ou "lote" como número; "bloco" ou "qd" como quadra; "metragem" ou "área" como área construída; "dormitórios" como quartos, e assim por diante. Se alguma coluna não for reconhecida, a tela avisa qual — quase sempre é só o nome escrito diferente.',
      'Só número e quadra são obrigatórios. Área, valor e tipologia podem entrar agora e ser completados depois: o sistema avisa que faltam, mas não recusa a linha. Isso é de propósito — construtora cadastra as casas antes de ter todos os números.',
      'Antes de gravar, você vê exatamente o que vai ser criado, com os problemas apontados pelo nome da casa ("a casa 03 está sem quadra") e não pelo número da linha. Dá para corrigir ali mesmo, na tabela, sem mexer no arquivo e subir de novo.',
      'Números em formato brasileiro funcionam: "48,50" é quarenta e oito e meio, e "R$ 250.000,00" é duzentos e cinquenta mil. Se o avanço vier como "0,4", o sistema lê como 40% e avisa que fez isso.',
    ],
  },
  {
    slug: 'medicao-travada',
    titulo: 'Minha medição não libera. E agora?',
    categoria: 'medicao',
    resumo: 'O que trava a liberação, por que trava, e como destravar.',
    termos: ['medicao', 'travou', 'bloqueado', 'nao libera', 'liberar', 'trava', 'impedido'],
    corpo: [
      'A liberação é bloqueada por dois motivos, e os dois aparecem na tela com o que fazer a respeito.',
      'O primeiro é segurança do trabalho: ASO ou EPI vencido. Sem ASO válido o trabalhador não pode estar no canteiro; em fiscalização ou acidente é o primeiro documento pedido, e obra embargada não recebe vistoria.',
      'O segundo é conformidade MCMV: exigências obrigatórias da Caixa fora de dia. A tela lista quais, explica por que cada uma trava, e leva à página onde se resolve.',
      'O bloqueio existe para chegar antes do banco. Uma medição liberada por dentro e travada por fora vira parcela não depositada — e a parcela do mês seguinte também não sai enquanto a anterior estiver pendente.',
      'Administradores podem liberar mesmo assim. Isso fica registrado no nome de quem liberou, no log de auditoria — não é uma saída escondida, é uma exceção assumida.',
    ],
    precisaDoDono: true,
  },
  {
    slug: 'o-que-conta-como-unidade',
    titulo: 'O que conta como unidade na minha licença',
    categoria: 'dados',
    resumo: 'Como o sistema conta as unidades do seu plano.',
    termos: ['licenca', 'plano', 'limite', 'unidades', 'teto', 'quantas casas', 'cobranca'],
    corpo: [
      'A contagem é de unidades cadastradas no sistema, incluindo as concluídas. Unidade que existe no cadastro conta, independentemente da etapa em que está.',
      'Quando o cadastro chega a 80% do teto do plano, o painel avisa. Ao atingir o teto, o cadastro de novas unidades é pausado — mas nada do que já existe para de funcionar: as obras seguem, os relatórios saem, os alertas continuam chegando.',
      'Se precisar de mais unidades, fale com o administrador da conta antes de chegar no limite. Ampliar o plano é imediato; descobrir o limite no meio de um lançamento não é.',
    ],
    precisaDoDono: true,
  },
  {
    slug: 'documentos-que-vencem',
    titulo: 'Por que o sistema cobra data de validade nos documentos',
    categoria: 'conformidade',
    resumo: 'O aviso que chega antes do vencimento é o motivo de o cofre existir.',
    termos: ['documento', 'vencimento', 'validade', 'cofre', 'ged', 'alerta', 'aviso'],
    href: '/fiscal/documentos',
    ondeLabel: 'Cofre de documentos',
    corpo: [
      'Guardar documento é a parte fácil — qualquer pasta faz isso. O que evita a obra parada é saber que ele vai vencer antes de alguém de fora perceber.',
      'Por isso a data de validade é pedida em cada documento: é dela que sai o alerta diário. Documento sem data entra no cofre, mas fica fora do aviso — e é exatamente o que some do radar.',
      'Certidões costumam ter validade curta e vencem sem ninguém notar. O alvará é o caso mais caro: vence no meio da obra e a renovação leva semanas, com a obra irregular perante a prefeitura enquanto isso.',
    ],
    precisaDoDono: true,
  },
  {
    slug: 'quem-ve-o-que',
    titulo: 'Quem enxerga os meus dados',
    categoria: 'dados',
    resumo: 'O que a empresa que fornece o sistema consegue e não consegue ver.',
    termos: ['privacidade', 'seguranca', 'dados', 'lgpd', 'acesso', 'quem ve'],
    corpo: [
      'Os dados de cada construtora ficam isolados dos das outras. Um cliente não enxerga, não altera e não apaga dado de outro, mesmo pedindo pelo identificador exato — isso é verificado por teste automático a cada alteração do sistema.',
      'Quem administra a plataforma vê, por padrão, apenas contagens e sinais de saúde: quantos empreendimentos, quantas unidades, quando houve a última atividade. Nenhum conteúdo de obra, financeiro ou de comprador.',
      'Para ver conteúdo — em um suporte que você mesmo pedir, por exemplo — é preciso uma autorização temporária com motivo declarado, que expira sozinha e fica registrada no log de auditoria da sua própria empresa, onde você consegue ler.',
    ],
  },
];

// ── Artigos gerados a partir do guia de conformidade ─────────────────────────

/**
 * Um artigo por exigência do MCMV, montado do catálogo + guia. Gerado, não
 * copiado: o guia é a fonte única, e o que aparece aqui é o mesmo texto que a
 * trava de medição mostra na hora do aperto.
 */
function artigosDeConformidade(): Artigo[] {
  return CATALOGO_MCMV.filter((item) => GUIA_MCMV[item.chave]).map((item) => {
    const g = GUIA_MCMV[item.chave];
    return {
      slug: `mcmv-${item.chave}`,
      titulo: item.titulo,
      categoria: 'conformidade' as const,
      resumo: item.descricao,
      termos: [item.chave.replace(/-/g, ' '), item.titulo.toLowerCase(), LABEL_CATEGORIA[item.categoria].toLowerCase()],
      href: g.href,
      ondeLabel: g.ondeLabel,
      corpo: [
        `**Por que é exigido.** ${g.porque}`,
        `**Como resolver.** ${g.comoResolver}`,
        `**Quanto tempo leva.** ${g.quantoTempo}`,
        // Duas coisas diferentes que o leitor conflaciona: o sistema travar, e a
        // Caixa travar. Um item pode não bloquear aqui e ainda assim derrubar a
        // vistoria lá — dizer só "não trava" faria o cliente relaxar com o
        // documento errado.
        item.bloqueiaMedicao
          ? '**O sistema bloqueia a liberação de medição por este item.** Enquanto não estiver conforme, a medição não é liberada aqui dentro.'
          : '**O sistema não bloqueia a liberação por este item** — mas ele entra na prontidão do empreendimento, e a pendência pode travar a vistoria do lado da Caixa.',
      ],
    };
  });
}

export const ARTIGOS: Artigo[] = [...ESCRITOS, ...artigosDeConformidade()];

/** Remove acento e caixa, para a busca funcionar como o cliente digita. */
function simplificar(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/**
 * Busca por título, resumo, corpo e termos.
 *
 * Os `termos` incluem de propósito as formas "erradas" — quem está com a
 * medição travada digita "travou", não "conformidade MCMV". Uma busca que só
 * casa o vocabulário do sistema não é achável por quem precisa dela.
 */
export function buscar(consulta: string): Artigo[] {
  const q = simplificar(consulta).trim();
  if (!q) return ARTIGOS;
  const palavras = q.split(/\s+/).filter(Boolean);

  return ARTIGOS.map((a) => {
    const alvo = simplificar(
      [a.titulo, a.resumo, a.termos.join(' '), a.corpo.join(' ')].join(' '),
    );
    const titulo = simplificar(a.titulo + ' ' + a.termos.join(' '));
    let peso = 0;
    for (const p of palavras) {
      if (titulo.includes(p)) peso += 3;
      else if (alvo.includes(p)) peso += 1;
    }
    return { a, peso };
  })
    .filter((x) => x.peso > 0)
    .sort((x, y) => y.peso - x.peso)
    .map((x) => x.a);
}

export function porSlug(slug: string): Artigo | undefined {
  return ARTIGOS.find((a) => a.slug === slug);
}

export function porCategoria(): { categoria: CategoriaArtigo; label: string; artigos: Artigo[] }[] {
  const ordem: CategoriaArtigo[] = ['primeiros-passos', 'medicao', 'conformidade', 'dados'];
  return ordem.map((c) => ({
    categoria: c,
    label: LABEL_CATEGORIA_ARTIGO[c],
    artigos: ARTIGOS.filter((a) => a.categoria === c),
  }));
}
