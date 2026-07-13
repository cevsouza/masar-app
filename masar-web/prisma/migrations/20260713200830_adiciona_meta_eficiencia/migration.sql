-- CreateTable
CREATE TABLE "MetaEficiencia" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "cpiMinimo" DOUBLE PRECISION NOT NULL DEFAULT 0.95,
    "spiMinimo" DOUBLE PRECISION NOT NULL DEFAULT 0.95,
    "maxInsumosEstouro" INTEGER NOT NULL DEFAULT 0,
    "alertarRuptura" BOOLEAN NOT NULL DEFAULT true,
    "dataAtualizacao" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetaEficiencia_pkey" PRIMARY KEY ("id")
);
