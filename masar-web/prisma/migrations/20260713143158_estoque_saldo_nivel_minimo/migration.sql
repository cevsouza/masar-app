-- AlterTable
ALTER TABLE "InsumoPadrao" ADD COLUMN     "nivelMinimoEstoque" DOUBLE PRECISION,
ADD COLUMN     "saldoEstoque" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Backfill do saldo em cache a partir das movimentacoes existentes
-- (ENTRADA soma; SAIDA/PERDA subtraem). Idempotente: recalcula do zero.
UPDATE "InsumoPadrao" i
SET "saldoEstoque" = COALESCE(agg.saldo, 0)
FROM (
  SELECT "insumoId",
         SUM(CASE WHEN tipo = 'ENTRADA' THEN quantidade ELSE -quantidade END) AS saldo
  FROM "MovimentacaoEstoque"
  GROUP BY "insumoId"
) agg
WHERE i.id = agg."insumoId";
