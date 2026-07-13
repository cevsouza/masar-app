// Parser leve de NF-e (XML) — extrai só os campos que o ERP usa para gerar a
// conta a pagar e a entrada de estoque. Sem dependência externa; baseado em regex
// sobre as tags conhecidas do layout da NF-e. Robusto o suficiente para XMLs bem
// formados (nfeProc/NFe). Não valida assinatura nem o schema completo.

export interface NfeItem {
  descricao: string;
  quantidade: number;
  valor: number; // valor total do item (vProd)
  unidade: string | null;
}

export interface NfeParsed {
  chave: string | null;
  numero: string | null;
  serie: string | null;
  emitenteCnpj: string | null;
  emitenteNome: string | null;
  valorTotal: number;
  dataEmissao: Date | null;
  itens: NfeItem[];
}

function pegarBloco(xml: string, tag: string): string | null {
  const m = xml.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  return m ? m[1] : null;
}

function pegarTag(xml: string | null, tag: string): string | null {
  if (!xml) return null;
  const m = xml.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  return m ? m[1].trim() : null;
}

function paraNumero(v: string | null): number {
  if (!v) return 0;
  const n = parseFloat(v.replace(',', '.'));
  return Number.isNaN(n) ? 0 : n;
}

export function parseNfeXml(xml: string): NfeParsed {
  const infNFe = pegarBloco(xml, 'infNFe') || xml;

  // Chave: atributo Id="NFe<44 dígitos>" ou <chNFe>
  let chave: string | null = null;
  const idMatch = xml.match(/Id="NFe(\d{44})"/i);
  if (idMatch) chave = idMatch[1];
  else {
    const ch = pegarTag(xml, 'chNFe');
    if (ch && /^\d{44}$/.test(ch)) chave = ch;
  }

  const ide = pegarBloco(infNFe, 'ide');
  const emit = pegarBloco(infNFe, 'emit');
  const total = pegarBloco(infNFe, 'total');

  const numero = pegarTag(ide, 'nNF');
  const serie = pegarTag(ide, 'serie');
  const dhEmi = pegarTag(ide, 'dhEmi') || pegarTag(ide, 'dEmi');
  let dataEmissao: Date | null = null;
  if (dhEmi) {
    const d = new Date(dhEmi);
    if (!Number.isNaN(d.getTime())) dataEmissao = d;
  }

  const emitenteCnpj = pegarTag(emit, 'CNPJ');
  const emitenteNome = pegarTag(emit, 'xNome');

  // Valor total da nota: ICMSTot > vNF
  const valorTotal = paraNumero(pegarTag(total, 'vNF'));

  // Itens: cada <det> tem um <prod>
  const itens: NfeItem[] = [];
  const detRegex = /<det\b[^>]*>([\s\S]*?)<\/det>/gi;
  let m: RegExpExecArray | null;
  while ((m = detRegex.exec(infNFe)) !== null) {
    const prod = pegarBloco(m[1], 'prod');
    if (!prod) continue;
    const descricao = pegarTag(prod, 'xProd') || 'Item sem descrição';
    const quantidade = paraNumero(pegarTag(prod, 'qCom'));
    const valor = paraNumero(pegarTag(prod, 'vProd'));
    const unidade = pegarTag(prod, 'uCom');
    itens.push({ descricao, quantidade, valor, unidade });
  }

  return { chave, numero, serie, emitenteCnpj, emitenteNome, valorTotal, dataEmissao, itens };
}

// Normaliza CNPJ para só dígitos (para casar com o cadastro de Fornecedor).
export function soDigitos(v: string | null | undefined): string | null {
  if (!v) return null;
  const d = v.replace(/\D/g, '');
  return d || null;
}
