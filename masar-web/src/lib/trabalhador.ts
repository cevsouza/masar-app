// Normalizacao do Trabalhador, compartilhada entre POST /api/trabalhadores e PUT [id].
import { TipoVinculo } from '@prisma/client';

export const TIPOS_VINCULO: TipoVinculo[] = ['PROPRIO', 'TERCEIRO', 'EMPREITEIRO'];

export function parseTrabalhadorBody(body: any) {
  const str = (v: any) => {
    if (v === undefined || v === null) return null;
    const t = String(v).trim();
    return t === '' ? null : t;
  };

  const vinculoRaw = str(body.tipoVinculo);
  const tipoVinculo: TipoVinculo =
    vinculoRaw && TIPOS_VINCULO.includes(vinculoRaw as TipoVinculo) ? (vinculoRaw as TipoVinculo) : 'PROPRIO';

  const admissaoRaw = str(body.dataAdmissao);
  let dataAdmissao: Date | null = null;
  if (admissaoRaw) {
    const d = new Date(admissaoRaw);
    if (!isNaN(d.getTime())) dataAdmissao = d;
  }

  // `nome` e obrigatorio; devolvemos '' quando vazio e a rota valida.
  return {
    nome: str(body.nome) ?? '',
    cpf: str(body.cpf),
    rg: str(body.rg),
    funcao: str(body.funcao),
    tipoVinculo,
    empresa: str(body.empresa),
    telefone: str(body.telefone),
    dataAdmissao,
    observacoes: str(body.observacoes),
  };
}
