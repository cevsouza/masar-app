-- CreateTable
CREATE TABLE "LinhaBaseObra" (
    "id" TEXT NOT NULL,
    "casaId" TEXT NOT NULL,
    "orcadoBaseline" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "prazoInicioBaseline" TIMESTAMP(3),
    "prazoFimBaseline" TIMESTAMP(3),
    "itensBaseline" JSONB,
    "dataSnapshot" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataAtualizacao" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LinhaBaseObra_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LinhaBaseObra_casaId_key" ON "LinhaBaseObra"("casaId");

-- AddForeignKey
ALTER TABLE "LinhaBaseObra" ADD CONSTRAINT "LinhaBaseObra_casaId_fkey" FOREIGN KEY ("casaId") REFERENCES "Casa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
