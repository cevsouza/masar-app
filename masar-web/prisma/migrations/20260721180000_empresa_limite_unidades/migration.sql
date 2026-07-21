-- Excecao negociada ao teto de unidades do plano.
-- Anulavel de proposito: NULL significa "vale o teto do plano" (lib/planos.ts),
-- e nao "zero". Nenhum backfill: toda empresa existente segue pelo plano.
ALTER TABLE "Empresa" ADD COLUMN "limiteUnidades" INTEGER;
