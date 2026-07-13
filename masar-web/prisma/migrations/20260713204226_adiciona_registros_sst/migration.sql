-- CreateEnum
CREATE TYPE "TipoAcidente" AS ENUM ('TIPICO', 'TRAJETO', 'DOENCA_OCUPACIONAL');

-- CreateEnum
CREATE TYPE "GravidadeAcidente" AS ENUM ('LEVE', 'MODERADO', 'GRAVE', 'FATAL');

-- CreateTable
CREATE TABLE "DialogoSeguranca" (
    "id" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tema" TEXT NOT NULL,
    "responsavel" TEXT NOT NULL,
    "participantes" JSONB,
    "observacoes" TEXT,
    "empreendimentoId" TEXT,
    "casaId" TEXT,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DialogoSeguranca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Acidente" (
    "id" TEXT NOT NULL,
    "trabalhadorId" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipo" "TipoAcidente" NOT NULL DEFAULT 'TIPICO',
    "gravidade" "GravidadeAcidente" NOT NULL DEFAULT 'LEVE',
    "descricao" TEXT NOT NULL,
    "parteCorpo" TEXT,
    "diasAfastamento" INTEGER NOT NULL DEFAULT 0,
    "catEmitida" BOOLEAN NOT NULL DEFAULT false,
    "numeroCat" TEXT,
    "empreendimentoId" TEXT,
    "casaId" TEXT,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Acidente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistNR" (
    "id" TEXT NOT NULL,
    "norma" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responsavel" TEXT NOT NULL,
    "itens" JSONB,
    "observacoes" TEXT,
    "empreendimentoId" TEXT,
    "casaId" TEXT,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChecklistNR_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DialogoSeguranca" ADD CONSTRAINT "DialogoSeguranca_empreendimentoId_fkey" FOREIGN KEY ("empreendimentoId") REFERENCES "Empreendimento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DialogoSeguranca" ADD CONSTRAINT "DialogoSeguranca_casaId_fkey" FOREIGN KEY ("casaId") REFERENCES "Casa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Acidente" ADD CONSTRAINT "Acidente_trabalhadorId_fkey" FOREIGN KEY ("trabalhadorId") REFERENCES "Trabalhador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Acidente" ADD CONSTRAINT "Acidente_empreendimentoId_fkey" FOREIGN KEY ("empreendimentoId") REFERENCES "Empreendimento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Acidente" ADD CONSTRAINT "Acidente_casaId_fkey" FOREIGN KEY ("casaId") REFERENCES "Casa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistNR" ADD CONSTRAINT "ChecklistNR_empreendimentoId_fkey" FOREIGN KEY ("empreendimentoId") REFERENCES "Empreendimento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistNR" ADD CONSTRAINT "ChecklistNR_casaId_fkey" FOREIGN KEY ("casaId") REFERENCES "Casa"("id") ON DELETE SET NULL ON UPDATE CASCADE;
