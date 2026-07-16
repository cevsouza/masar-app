-- CreateEnum
CREATE TYPE "FaixaMCMV" AS ENUM ('FAIXA_1', 'FAIXA_2', 'FAIXA_3', 'FAIXA_4');

-- CreateEnum
CREATE TYPE "StatusConformidade" AS ENUM ('PENDENTE', 'EM_ANDAMENTO', 'CONFORME', 'NAO_CONFORME', 'NAO_APLICAVEL');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TipoDocumentoAnexo" ADD VALUE 'PBQP_H_SIAC';
ALTER TYPE "TipoDocumentoAnexo" ADD VALUE 'LAUDO_DESEMPENHO_NBR15575';
ALTER TYPE "TipoDocumentoAnexo" ADD VALUE 'LAUDO_ACESSIBILIDADE_NBR9050';
ALTER TYPE "TipoDocumentoAnexo" ADD VALUE 'ART_RRT';
ALTER TYPE "TipoDocumentoAnexo" ADD VALUE 'CND_FEDERAL';
ALTER TYPE "TipoDocumentoAnexo" ADD VALUE 'CND_FGTS';
ALTER TYPE "TipoDocumentoAnexo" ADD VALUE 'CND_TRABALHISTA';
ALTER TYPE "TipoDocumentoAnexo" ADD VALUE 'REGISTRO_INCORPORACAO';
ALTER TYPE "TipoDocumentoAnexo" ADD VALUE 'ESPECIFICACOES_MINIMAS';

-- AlterTable
ALTER TABLE "Empreendimento" ADD COLUMN     "faixaMCMV" "FaixaMCMV",
ADD COLUMN     "regimeMCMV" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ParametroMCMV" (
    "id" TEXT NOT NULL,
    "faixa" "FaixaMCMV" NOT NULL,
    "tetoValorImovel" DECIMAL(65,30) NOT NULL,
    "areaUtilMinima" DECIMAL(65,30) NOT NULL,
    "percentualUnidadesAcessiveis" DOUBLE PRECISION NOT NULL DEFAULT 3,
    "portariaReferencia" TEXT,
    "dataVigencia" TIMESTAMP(3),
    "fonteUrl" TEXT,
    "atualizadoPor" TEXT,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParametroMCMV_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemConformidadeMCMV" (
    "id" TEXT NOT NULL,
    "empreendimentoId" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "status" "StatusConformidade" NOT NULL DEFAULT 'PENDENTE',
    "observacao" TEXT,
    "documentoId" TEXT,
    "dataVerificacao" TIMESTAMP(3),
    "verificadoPor" TEXT,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataAtualizacao" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemConformidadeMCMV_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ParametroMCMV_faixa_key" ON "ParametroMCMV"("faixa");

-- CreateIndex
CREATE INDEX "ItemConformidadeMCMV_empreendimentoId_idx" ON "ItemConformidadeMCMV"("empreendimentoId");

-- CreateIndex
CREATE UNIQUE INDEX "ItemConformidadeMCMV_empreendimentoId_chave_key" ON "ItemConformidadeMCMV"("empreendimentoId", "chave");

-- AddForeignKey
ALTER TABLE "ItemConformidadeMCMV" ADD CONSTRAINT "ItemConformidadeMCMV_empreendimentoId_fkey" FOREIGN KEY ("empreendimentoId") REFERENCES "Empreendimento"("id") ON DELETE CASCADE ON UPDATE CASCADE;
