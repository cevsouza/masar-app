import { db } from '@/lib/db';

// Janela padrão de alerta de vencimento (dias).
export const DIAS_ALERTA_VENCIMENTO = 30;

export type StatusValidade = 'VENCIDO' | 'A_VENCER' | 'OK';

function inicioDoDia(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/**
 * Classifica uma data de validade: VENCIDO (passou), A_VENCER (<= janela) ou OK.
 * Data nula (ex.: EPI sem validade) é tratada como OK.
 */
export function statusValidade(dataValidade: Date | null | undefined, dias = DIAS_ALERTA_VENCIMENTO): StatusValidade {
  if (!dataValidade) return 'OK';
  const hoje = inicioDoDia(new Date());
  const venc = inicioDoDia(new Date(dataValidade));
  const diffDias = Math.round((venc.getTime() - hoje.getTime()) / 86400000);
  if (diffDias < 0) return 'VENCIDO';
  if (diffDias <= dias) return 'A_VENCER';
  return 'OK';
}

/**
 * Busca ASOs e EPIs vencidos ou a vencer (dentro da janela) de trabalhadores ativos.
 * Reutilizado pelo endpoint /api/sst/vencimentos e pelo cron diário.
 */
export async function buscarVencimentosSST(dias = DIAS_ALERTA_VENCIMENTO) {
  const hoje = inicioDoDia(new Date());
  const limite = new Date(hoje);
  limite.setDate(limite.getDate() + dias);

  const asos = await db.aSO.findMany({
    where: {
      dataValidade: { lte: limite },
      trabalhador: { ativo: true },
    },
    include: { trabalhador: { select: { id: true, nome: true, cpf: true } } },
    orderBy: { dataValidade: 'asc' },
  });

  const epis = await db.entregaEPI.findMany({
    where: {
      devolvido: false,
      dataValidade: { not: null, lte: limite },
      trabalhador: { ativo: true },
    },
    include: { trabalhador: { select: { id: true, nome: true, cpf: true } } },
    orderBy: { dataValidade: 'asc' },
  });

  const asosItens = asos.map((a) => ({
    id: a.id,
    trabalhadorId: a.trabalhadorId,
    trabalhadorNome: a.trabalhador.nome,
    tipo: a.tipo,
    dataValidade: a.dataValidade,
    status: statusValidade(a.dataValidade, dias),
  }));

  const episItens = epis.map((e) => ({
    id: e.id,
    trabalhadorId: e.trabalhadorId,
    trabalhadorNome: e.trabalhador.nome,
    equipamento: e.equipamento,
    dataValidade: e.dataValidade,
    status: statusValidade(e.dataValidade, dias),
  }));

  return {
    asos: asosItens,
    epis: episItens,
    asosVencidos: asosItens.filter((a) => a.status === 'VENCIDO'),
    asosAVencer: asosItens.filter((a) => a.status === 'A_VENCER'),
    episVencidos: episItens.filter((e) => e.status === 'VENCIDO'),
    episAVencer: episItens.filter((e) => e.status === 'A_VENCER'),
  };
}
