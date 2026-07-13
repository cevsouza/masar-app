-- CreateEnum
CREATE TYPE "TipoASO" AS ENUM ('ADMISSIONAL', 'PERIODICO', 'RETORNO_AO_TRABALHO', 'MUDANCA_DE_FUNCAO', 'DEMISSIONAL');

-- CreateEnum
CREATE TYPE "ResultadoASO" AS ENUM ('APTO', 'APTO_COM_RESTRICAO', 'INAPTO');

-- CreateTable
CREATE TABLE "ASO" (
    "id" TEXT NOT NULL,
    "trabalhadorId" TEXT NOT NULL,
    "tipo" "TipoASO" NOT NULL DEFAULT 'PERIODICO',
    "dataRealizacao" TIMESTAMP(3) NOT NULL,
    "dataValidade" TIMESTAMP(3) NOT NULL,
    "resultado" "ResultadoASO" NOT NULL DEFAULT 'APTO',
    "medico" TEXT,
    "observacoes" TEXT,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ASO_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntregaEPI" (
    "id" TEXT NOT NULL,
    "trabalhadorId" TEXT NOT NULL,
    "equipamento" TEXT NOT NULL,
    "ca" TEXT,
    "quantidade" INTEGER NOT NULL DEFAULT 1,
    "dataEntrega" TIMESTAMP(3) NOT NULL,
    "dataValidade" TIMESTAMP(3),
    "devolvido" BOOLEAN NOT NULL DEFAULT false,
    "observacoes" TEXT,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EntregaEPI_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ASO" ADD CONSTRAINT "ASO_trabalhadorId_fkey" FOREIGN KEY ("trabalhadorId") REFERENCES "Trabalhador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntregaEPI" ADD CONSTRAINT "EntregaEPI_trabalhadorId_fkey" FOREIGN KEY ("trabalhadorId") REFERENCES "Trabalhador"("id") ON DELETE CASCADE ON UPDATE CASCADE;
