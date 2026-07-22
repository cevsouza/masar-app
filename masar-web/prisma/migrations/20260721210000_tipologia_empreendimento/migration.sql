-- Tipologia do empreendimento: muda o VOCABULARIO das telas, nao a regra.
-- HORIZONTAL como padrao preserva exatamente o comportamento atual.
CREATE TYPE "TipologiaEmpreendimento" AS ENUM ('HORIZONTAL', 'VERTICAL');
ALTER TABLE "Empreendimento" ADD COLUMN "tipologia" "TipologiaEmpreendimento" NOT NULL DEFAULT 'HORIZONTAL';
