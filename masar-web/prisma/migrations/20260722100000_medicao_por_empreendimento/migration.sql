-- Medicao passa a poder pertencer ao EMPREENDIMENTO (vertical) e nao so a uma
-- unidade (horizontal). Em predio nao existe "medicao do apartamento 101":
-- fundacao, estrutura e lajes servem todas as unidades, e o que o engenheiro
-- credenciado mede e o avanco da torre.
--
-- Nenhum backfill: toda linha existente tem casaId e continua valida.
ALTER TABLE "MedicaoCaixa" ALTER COLUMN "casaId" DROP NOT NULL;
ALTER TABLE "MedicaoCaixa" ADD COLUMN "empreendimentoId" TEXT;
ALTER TABLE "MedicaoCaixa" ADD COLUMN "referencia" TEXT;

ALTER TABLE "MedicaoCaixa"
  ADD CONSTRAINT "MedicaoCaixa_empreendimentoId_fkey"
  FOREIGN KEY ("empreendimentoId") REFERENCES "Empreendimento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "MedicaoCaixa_empreendimentoId_idx" ON "MedicaoCaixa"("empreendimentoId");

-- A regra que o TypeScript nao consegue garantir: exatamente UM dos dois.
-- Sem isto, uma medicao orfa (nenhum dos dois) ou ambigua (os dois) entraria
-- silenciosamente e apareceria como valor sem dono nos relatorios.
ALTER TABLE "MedicaoCaixa"
  ADD CONSTRAINT "MedicaoCaixa_dono_exclusivo"
  CHECK (("casaId" IS NOT NULL AND "empreendimentoId" IS NULL)
      OR ("casaId" IS NULL AND "empreendimentoId" IS NOT NULL));
