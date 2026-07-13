-- CreateEnum
CREATE TYPE "TipoVinculo" AS ENUM ('PROPRIO', 'TERCEIRO', 'EMPREITEIRO');

-- AlterTable
ALTER TABLE "PontoTrabalhador" ADD COLUMN     "trabalhadorId" TEXT;

-- CreateTable
CREATE TABLE "Trabalhador" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf" TEXT,
    "rg" TEXT,
    "funcao" TEXT,
    "tipoVinculo" "TipoVinculo" NOT NULL DEFAULT 'PROPRIO',
    "empresa" TEXT,
    "telefone" TEXT,
    "dataAdmissao" TIMESTAMP(3),
    "observacoes" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataAtualizacao" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trabalhador_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Trabalhador_cpf_key" ON "Trabalhador"("cpf");

-- AddForeignKey
ALTER TABLE "PontoTrabalhador" ADD CONSTRAINT "PontoTrabalhador_trabalhadorId_fkey" FOREIGN KEY ("trabalhadorId") REFERENCES "Trabalhador"("id") ON DELETE SET NULL ON UPDATE CASCADE;
