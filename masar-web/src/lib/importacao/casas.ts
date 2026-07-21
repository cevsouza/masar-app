import { lerNumero, lerBooleano, type LinhaCSV } from '@/lib/importacao/csv';

/**
 * Conferência da planilha de unidades, ANTES de gravar qualquer coisa.
 *
 * O objetivo aqui não é rejeitar arquivo — é dizer, em linguagem de obra, o que
 * está faltando e onde. "Erro na linha 14: campo obrigatório ausente" manda o
 * cliente contar linhas na planilha; "A casa A-12 está sem quadra" ele resolve
 * sem sair da tela.
 *
 * Dois níveis, e a distinção é a coisa mais importante deste arquivo:
 *
 *  - ERRO impede a linha de entrar. Só para o que torna a unidade inutilizável
 *    ou ambígua: sem identificação, ou duplicada.
 *  - AVISO entra assim mesmo e fica anotado. Área, valor e tipologia faltando
 *    são AVISO de propósito — a construtora costuma cadastrar as casas antes de
 *    ter todos os números, e recusar a planilha inteira por causa disso é
 *    exatamente o tipo de rigidez que faz desistirem da migração e voltarem
 *    para o Excel.
 */

export const STATUS_VALIDOS = [
  'BACKLOG', 'APROVACOES', 'INFRAESTRUTURA', 'SUPRAESTRUTURA', 'INSTALACOES',
  'ACABAMENTO', 'VISTORIA_CAIXA', 'CARTORIO', 'VISITAS', 'CONCLUIDA',
] as const;

export interface CasaImportada {
  numero: string;
  quadra: string;
  areaConstruida: number | null;
  areaLote: number | null;
  quantidadeQuartos: number | null;
  quantidadeSuites: number | null;
  quantidadeBanheiros: number | null;
  vagasGaragem: number | null;
  valorVendaProjetado: number | null;
  unidadeAdaptavelMCMV: boolean;
  statusObra: string;
  percentualObra: number;
}

export interface LinhaAnalisada {
  /** Linha no arquivo, contando o cabeçalho — é o número que o cliente vê na planilha. */
  linhaNoArquivo: number;
  dados: CasaImportada;
  erros: string[];
  avisos: string[];
}

export interface AnaliseImportacao {
  linhas: LinhaAnalisada[];
  totalLinhas: number;
  prontas: number;
  comErro: number;
  comAviso: number;
  /** Colunas do arquivo que o sistema não reconheceu — provável erro de nome. */
  colunasIgnoradas: string[];
  /** Colunas conhecidas que não vieram no arquivo. */
  colunasAusentes: string[];
}

/**
 * Sinônimos aceitos por campo. Existem porque a planilha do cliente não foi
 * feita para este sistema: ela já existia, com os nomes que ele usa. Exigir os
 * nossos nomes é transferir para o cliente o trabalho de traduzir.
 */
const COLUNAS: Record<keyof CasaImportada, string[]> = {
  numero: ['numero', 'num', 'n', 'unidade', 'casa', 'lote'],
  quadra: ['quadra', 'qd', 'bloco', 'q'],
  areaConstruida: ['areaconstruida', 'area', 'areautil', 'areaprivativa', 'm2', 'metragem'],
  areaLote: ['arealote', 'areaterreno', 'terreno'],
  quantidadeQuartos: ['quartos', 'quantidadequartos', 'dormitorios', 'dorms'],
  quantidadeSuites: ['suites', 'quantidadesuites'],
  quantidadeBanheiros: ['banheiros', 'quantidadebanheiros', 'wc'],
  vagasGaragem: ['vagas', 'vagasgaragem', 'garagem'],
  valorVendaProjetado: ['valorvenda', 'valor', 'valordevenda', 'valorvendaprojetado', 'preco'],
  unidadeAdaptavelMCMV: ['adaptavel', 'unidadeadaptavel', 'acessivel', 'pcd'],
  statusObra: ['status', 'statusobra', 'etapa', 'fase'],
  percentualObra: ['percentual', 'percentualobra', 'avanco', 'execucao', 'andamento'],
};

/** Todos os nomes que o sistema reconhece, para apontar coluna com nome errado. */
const CONHECIDAS = new Set(Object.values(COLUNAS).flat());

function pegar(linha: LinhaCSV, campo: keyof CasaImportada): string | undefined {
  for (const nome of COLUNAS[campo]) {
    const v = linha[nome];
    if (v !== undefined && v !== '') return v;
  }
  return undefined;
}

/** Inteiro não-negativo, ou null. */
function inteiro(v: string | undefined): number | null {
  const n = lerNumero(v);
  if (n === null) return null;
  const i = Math.trunc(n);
  return i >= 0 ? i : null;
}

/** Normaliza o status para o enum; texto livre vira BACKLOG. */
function normalizarStatus(v: string | undefined): { status: string; aviso?: string } {
  if (!v) return { status: 'BACKLOG' };
  const chave = v
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z]/g, '_')
    .toUpperCase();
  const achado = STATUS_VALIDOS.find((s) => s === chave);
  if (achado) return { status: achado };
  return {
    status: 'BACKLOG',
    aviso: `Etapa "${v}" não é uma das etapas do sistema — entrou como Backlog. Ajuste depois na unidade.`,
  };
}

/** Identificador que o cliente reconhece na planilha dele. */
function apelido(numero: string, quadra: string): string {
  if (numero && quadra) return `casa ${numero} da quadra ${quadra}`;
  if (numero) return `casa ${numero}`;
  return 'unidade sem número';
}

export function analisarCasas(
  linhas: LinhaCSV[],
  cabecalhoNormalizado: string[],
  jaExistentes: { numero: string; quadra: string }[] = [],
): AnaliseImportacao {
  const chaveDe = (n: string, q: string) => `${n.trim().toUpperCase()}|${q.trim().toUpperCase()}`;
  const existentes = new Set(jaExistentes.map((c) => chaveDe(c.numero, c.quadra)));
  const vistasNoArquivo = new Map<string, number>();

  const analisadas: LinhaAnalisada[] = linhas.map((linha, i) => {
    const erros: string[] = [];
    const avisos: string[] = [];

    const numero = (pegar(linha, 'numero') ?? '').trim();
    const quadra = (pegar(linha, 'quadra') ?? '').trim();
    const nome = apelido(numero, quadra);
    const linhaNoArquivo = i + 2; // +1 do cabeçalho, +1 porque planilha começa em 1

    if (!numero) erros.push('Esta linha não tem número de unidade — sem ele não dá para identificar a casa.');
    if (!quadra) erros.push(`A ${nome} está sem quadra.`);

    if (numero && quadra) {
      const chave = chaveDe(numero, quadra);
      const jaVista = vistasNoArquivo.get(chave);
      if (jaVista !== undefined) {
        erros.push(`A ${nome} aparece duas vezes na planilha (linhas ${jaVista} e ${linhaNoArquivo}).`);
      } else {
        vistasNoArquivo.set(chave, linhaNoArquivo);
      }
      if (existentes.has(chave)) {
        erros.push(`A ${nome} já existe neste empreendimento. Ela não será importada de novo.`);
      }
    }

    const areaConstruida = lerNumero(pegar(linha, 'areaConstruida'));
    if (areaConstruida === null) {
      avisos.push(`A ${nome} está sem área construída — sem ela, custo por m² e área mínima do MCMV não fecham.`);
    } else if (areaConstruida <= 0) {
      erros.push(`A área da ${nome} está zerada ou negativa (${pegar(linha, 'areaConstruida')}).`);
    }

    const valor = lerNumero(pegar(linha, 'valorVendaProjetado'));
    if (valor === null) {
      avisos.push(`A ${nome} está sem valor de venda — é o que o sistema compara com o teto da faixa.`);
    }

    const pct = lerNumero(pegar(linha, 'percentualObra')) ?? 0;
    let percentualObra = pct;
    if (pct > 0 && pct <= 1) {
      // Planilha com "0,4" querendo dizer 40%. Converter calado seria adivinhar;
      // avisar e converter deixa o cliente conferir.
      percentualObra = pct * 100;
      avisos.push(`O avanço da ${nome} veio como ${pct} — foi lido como ${percentualObra}%.`);
    } else if (pct > 100) {
      erros.push(`O avanço da ${nome} é ${pct}%, acima de 100%.`);
      percentualObra = 100;
    }

    const { status, aviso: avisoStatus } = normalizarStatus(pegar(linha, 'statusObra'));
    if (avisoStatus) avisos.push(avisoStatus);

    return {
      linhaNoArquivo,
      erros,
      avisos,
      dados: {
        numero,
        quadra,
        areaConstruida,
        areaLote: lerNumero(pegar(linha, 'areaLote')),
        quantidadeQuartos: inteiro(pegar(linha, 'quantidadeQuartos')),
        quantidadeSuites: inteiro(pegar(linha, 'quantidadeSuites')),
        quantidadeBanheiros: inteiro(pegar(linha, 'quantidadeBanheiros')),
        vagasGaragem: inteiro(pegar(linha, 'vagasGaragem')),
        valorVendaProjetado: valor,
        unidadeAdaptavelMCMV: lerBooleano(pegar(linha, 'unidadeAdaptavelMCMV')),
        statusObra: status,
        percentualObra,
      },
    };
  });

  const colunasIgnoradas = cabecalhoNormalizado.filter((c) => c && !CONHECIDAS.has(c));
  const presentes = new Set(cabecalhoNormalizado);
  const colunasAusentes = (Object.keys(COLUNAS) as (keyof CasaImportada)[])
    .filter((campo) => !COLUNAS[campo].some((n) => presentes.has(n)))
    .map((campo) => COLUNAS[campo][0]);

  return {
    linhas: analisadas,
    totalLinhas: analisadas.length,
    prontas: analisadas.filter((l) => l.erros.length === 0).length,
    comErro: analisadas.filter((l) => l.erros.length > 0).length,
    comAviso: analisadas.filter((l) => l.erros.length === 0 && l.avisos.length > 0).length,
    colunasIgnoradas,
    colunasAusentes,
  };
}

/** Modelo de planilha para o cliente preencher — o ponto de partida sem ajuda. */
export function modeloCSV(): string {
  const cabecalho = [
    'numero', 'quadra', 'area_construida', 'area_lote', 'quartos', 'suites',
    'banheiros', 'vagas', 'valor_venda', 'adaptavel', 'status', 'percentual',
  ];
  const exemplo = [
    ['01', 'A', '48,50', '150', '2', '0', '1', '1', '250000', 'nao', 'BACKLOG', '0'],
    ['02', 'A', '48,50', '150', '2', '0', '1', '1', '250000', 'sim', 'INFRAESTRUTURA', '15'],
  ];
  // Ponto-e-vírgula e BOM: é o que o Excel em português abre sem perguntar nada.
  return '﻿' + [cabecalho, ...exemplo].map((l) => l.join(';')).join('\r\n') + '\r\n';
}
