/**
 * Leitura de CSV vindo de planilha de construtora — o formato real, não o ideal.
 *
 * Não usamos biblioteca de .xlsx aqui, e a razão é de segurança: o pacote mais
 * comum do ecossistema tem histórico de vulnerabilidade e a versão corrigida
 * não é publicada no npm. Num sistema que guarda dado de cliente, isso não
 * compensa — e "Salvar como CSV" é um clique em qualquer planilha.
 *
 * O que dá trabalho não é separar vírgulas, é o CSV que sai do Excel em
 * português:
 *
 *  - o separador é `;`, não `,`, porque a vírgula é o separador decimal;
 *  - o arquivo costuma vir em Windows-1252, não UTF-8 — é a origem do
 *    clássico "João" virar "Jo�o";
 *  - o Excel enfia um BOM no começo, que sem tratamento gruda na primeira
 *    coluna e faz "numero" deixar de bater com o cabeçalho esperado;
 *  - campos com aspas podem conter o separador e até quebra de linha dentro.
 *
 * Cada um desses transforma "importei e deu errado" numa ligação para o
 * suporte que não existe.
 *
 * Nota de manutenção: BOM e acentos combinantes são escritos como escape
 * (﻿, ̀-ͯ) e nunca como o caractere literal. Literal, eles são
 * invisíveis no editor — somem num copiar-e-colar e a função passa a não fazer
 * nada, sem erro nenhum.
 */

/** Uma linha já casada com o cabeçalho. */
export type LinhaCSV = Record<string, string>;

export interface ResultadoCSV {
  cabecalho: string[];
  linhas: LinhaCSV[];
  /** Separador detectado, para a tela poder explicar o que leu. */
  separador: string;
  /** True quando o arquivo teve de ser lido como Windows-1252. */
  encodingLatino: boolean;
}

/**
 * Decodifica o arquivo. Tenta UTF-8 estrito; se falhar, é planilha salva no
 * padrão do Windows em português — refaz como Windows-1252 em vez de entregar
 * nomes com caractere quebrado.
 */
export function decodificar(buffer: ArrayBuffer): { texto: string; encodingLatino: boolean } {
  try {
    const texto = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
    return { texto, encodingLatino: false };
  } catch {
    return {
      texto: new TextDecoder('windows-1252').decode(buffer),
      encodingLatino: true,
    };
  }
}

/**
 * Adivinha o separador contando ocorrências FORA de aspas na primeira linha.
 * Contar dentro de aspas erraria em "Rua Silva, 100".
 */
export function detectarSeparador(primeiraLinha: string): string {
  const candidatos = [';', ',', '\t'];
  let melhor = ';';
  let maior = -1;
  for (const sep of candidatos) {
    let n = 0;
    let dentroDeAspas = false;
    for (let i = 0; i < primeiraLinha.length; i++) {
      const c = primeiraLinha[i];
      if (c === '"') dentroDeAspas = !dentroDeAspas;
      else if (c === sep && !dentroDeAspas) n++;
    }
    if (n > maior) {
      maior = n;
      melhor = sep;
    }
  }
  return melhor;
}

/** Divide o texto em campos respeitando aspas, incluindo quebra de linha dentro. */
function dividirEmCampos(texto: string, sep: string): string[][] {
  const linhas: string[][] = [];
  let campo = '';
  let linha: string[] = [];
  let dentroDeAspas = false;

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];

    if (dentroDeAspas) {
      if (c === '"') {
        // "" dentro de campo entre aspas é uma aspa literal.
        if (texto[i + 1] === '"') {
          campo += '"';
          i++;
        } else {
          dentroDeAspas = false;
        }
      } else {
        campo += c;
      }
      continue;
    }

    if (c === '"') {
      dentroDeAspas = true;
    } else if (c === sep) {
      linha.push(campo);
      campo = '';
    } else if (c === '\n') {
      linha.push(campo);
      linhas.push(linha);
      linha = [];
      campo = '';
    } else if (c === '\r') {
      // CRLF: o \n seguinte fecha a linha.
    } else {
      campo += c;
    }
  }

  if (campo.length > 0 || linha.length > 0) {
    linha.push(campo);
    linhas.push(linha);
  }

  return linhas;
}

/** Normaliza um nome de coluna: sem acento, sem espaço, minúsculo. */
export function normalizarChave(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();
}

export function lerCSV(buffer: ArrayBuffer): ResultadoCSV {
  const { texto, encodingLatino } = decodificar(buffer);

  // O BOM do Excel gruda na primeira coluna e faz o cabeçalho não bater.
  const limpo = texto.replace(/^﻿/, '');

  const primeiraQuebra = limpo.indexOf('\n');
  const primeira = primeiraQuebra === -1 ? limpo : limpo.slice(0, primeiraQuebra);
  const separador = detectarSeparador(primeira);

  const bruto = dividirEmCampos(limpo, separador).filter(
    (l) => l.some((c) => c.trim() !== ''), // descarta linha totalmente vazia
  );

  if (bruto.length === 0) {
    return { cabecalho: [], linhas: [], separador, encodingLatino };
  }

  const cabecalho = bruto[0].map((c) => c.trim());
  const chaves = cabecalho.map(normalizarChave);

  const linhas: LinhaCSV[] = bruto.slice(1).map((cols) => {
    const obj: LinhaCSV = {};
    chaves.forEach((k, i) => {
      if (k) obj[k] = (cols[i] ?? '').trim();
    });
    return obj;
  });

  return { cabecalho, linhas, separador, encodingLatino };
}

/**
 * Número em formato brasileiro. "1.234,56" e "1234.56" são o mesmo valor, e
 * planilha de obra tem os dois — depende de quem digitou e de onde copiou.
 */
export function lerNumero(v: string | undefined | null): number | null {
  if (v == null) return null;
  const s = String(v).trim().replace(/\s|R\$|m²|m2/gi, '');
  if (!s) return null;

  const temVirgula = s.includes(',');
  const temPonto = s.includes('.');

  let normal = s;
  if (temVirgula && temPonto) {
    // O último separador que aparece é o decimal.
    normal =
      s.lastIndexOf(',') > s.lastIndexOf('.')
        ? s.replace(/\./g, '').replace(',', '.')
        : s.replace(/,/g, '');
  } else if (temVirgula) {
    normal = s.replace(',', '.');
  } else if (temPonto && /^\d{1,3}(\.\d{3})+$/.test(s)) {
    // Só ponto: pode ser decimal (1234.56) ou milhar (1.234). Trata como
    // milhar apenas no formato exato de grupos de 3.
    normal = s.replace(/\./g, '');
  }

  const n = Number(normal);
  return Number.isFinite(n) ? n : null;
}

/** Booleano tolerante: sim/não, s/n, x, true/false, 1/0. */
export function lerBooleano(v: string | undefined | null): boolean {
  const s = String(v ?? '')
    .trim()
    .toLowerCase();
  return ['sim', 's', 'x', 'true', '1', 'v', 'verdadeiro'].includes(s);
}
