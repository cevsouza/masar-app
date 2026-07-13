// Helpers de normalizacao do Fornecedor, compartilhados entre as rotas
// POST /api/fornecedores e PUT /api/fornecedores/[id].
import { TipoContaBancaria } from '@prisma/client';

export const TIPOS_CONTA: TipoContaBancaria[] = ['CORRENTE', 'POUPANCA'];

// Normaliza os campos recebidos do formulario para o shape do Prisma.
// Strings vazias viram null; numeros sao convertidos com seguranca.
export function parseFornecedorBody(body: any) {
  const str = (v: any) => {
    if (v === undefined || v === null) return null;
    const t = String(v).trim();
    return t === '' ? null : t;
  };
  const int = (v: any) => {
    if (v === undefined || v === null || v === '') return null;
    const n = parseInt(v, 10);
    return Number.isNaN(n) ? null : n;
  };
  const tipoContaRaw = str(body.tipoConta);
  const tipoConta =
    tipoContaRaw && TIPOS_CONTA.includes(tipoContaRaw as TipoContaBancaria)
      ? (tipoContaRaw as TipoContaBancaria)
      : null;

  // `nome` e obrigatorio no schema; devolvemos '' quando vazio e a rota valida.
  return {
    nome: str(body.nome) ?? '',
    cnpj: str(body.cnpj),
    cpf: str(body.cpf),
    email: str(body.email),
    telefone: str(body.telefone),
    ramo: str(body.ramo),
    logradouro: str(body.logradouro),
    numero: str(body.numero),
    bairro: str(body.bairro),
    cep: str(body.cep),
    cidade: str(body.cidade),
    estado: str(body.estado),
    banco: str(body.banco),
    agencia: str(body.agencia),
    conta: str(body.conta),
    tipoConta,
    chavePix: str(body.chavePix),
    prazoPagamentoDias: int(body.prazoPagamentoDias),
    prazoEntregaDias: int(body.prazoEntregaDias),
    avaliacao: int(body.avaliacao),
    observacoes: str(body.observacoes),
  };
}
