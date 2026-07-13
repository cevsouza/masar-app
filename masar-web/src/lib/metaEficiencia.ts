import { db } from '@/lib/db';
import { calcularEvm } from '@/lib/evm';
import { calcularEficienciaMaterial } from '@/lib/eficiencia';
import { calcularFluxoCaixaSemanal } from '@/lib/fluxoProjetado';

/**
 * Metas de eficiência + avaliação diária (Fase 6.5).
 *
 * Consolida os motores da Fase 6 (EVM, eficiência de material, fluxo de caixa)
 * e compara contra as metas configuradas (MetaEficiencia, singleton). Serve o
 * painel de eficiência e os alertas do cron diário.
 */

export type SeveridadeMeta = 'CRITICO' | 'ATENCAO';
export type StatusPainel = 'CRITICO' | 'ATENCAO' | 'OK';

export interface Violacao {
  chave: string;
  label: string;
  meta: string;
  atual: string;
  severidade: SeveridadeMeta;
}

// Retorna a config de metas, criando o registro default na primeira vez.
export async function getMetaEficiencia() {
  const existing = await db.metaEficiencia.findUnique({ where: { id: 'default' } });
  if (existing) return existing;
  return db.metaEficiencia.create({ data: { id: 'default' } });
}

export async function avaliarMetas() {
  const meta = await getMetaEficiencia();
  const [evm, material, fluxo] = await Promise.all([
    calcularEvm({}),
    calcularEficienciaMaterial({}),
    calcularFluxoCaixaSemanal({}),
  ]);

  const cpi = evm.resumo.cpiGeral as number | null;
  const spi = evm.resumo.spiGeral as number | null;
  const insumosEstouro = material.resumo.insumosEstouro;
  const semanaRuptura = fluxo.resumo.semanaRuptura;

  const violacoes: Violacao[] = [];

  if (cpi != null && cpi < meta.cpiMinimo) {
    violacoes.push({
      chave: 'cpi',
      label: 'Eficiência de custo abaixo da meta (gastando mais do que entregou)',
      meta: meta.cpiMinimo.toFixed(2),
      atual: cpi.toFixed(2),
      severidade: cpi < meta.cpiMinimo * 0.85 ? 'CRITICO' : 'ATENCAO',
    });
  }
  if (spi != null && spi < meta.spiMinimo) {
    violacoes.push({
      chave: 'spi',
      label: 'Eficiência de prazo abaixo da meta (cronograma atrasado)',
      meta: meta.spiMinimo.toFixed(2),
      atual: spi.toFixed(2),
      severidade: spi < meta.spiMinimo * 0.85 ? 'CRITICO' : 'ATENCAO',
    });
  }
  if (insumosEstouro > meta.maxInsumosEstouro) {
    violacoes.push({
      chave: 'estoque',
      label: 'Insumos com consumo acima do planejado (estouro físico)',
      meta: `≤ ${meta.maxInsumosEstouro}`,
      atual: String(insumosEstouro),
      severidade: 'ATENCAO',
    });
  }
  if (meta.alertarRuptura && semanaRuptura) {
    violacoes.push({
      chave: 'caixa',
      label: 'Ruptura de caixa projetada no horizonte',
      meta: 'sem ruptura',
      atual: `semana de ${semanaRuptura}`,
      severidade: 'CRITICO',
    });
  }

  const status: StatusPainel = violacoes.some((v) => v.severidade === 'CRITICO')
    ? 'CRITICO'
    : violacoes.length > 0
      ? 'ATENCAO'
      : 'OK';

  return {
    meta,
    status,
    violacoes,
    indicadores: {
      cpiGeral: cpi,
      spiGeral: spi,
      insumosEstouro,
      semanaRuptura,
      menorSaldo: fluxo.resumo.menorSaldo,
      eacGeral: evm.resumo.eacGeral,
      vacGeral: evm.resumo.vacGeral,
    },
  };
}
