-- CreateEnum
CREATE TYPE "NivelAcessoPlataforma" AS ENUM ('AGREGADO', 'FICHA', 'CONTEUDO');

-- CreateTable
CREATE TABLE "AdminPlataforma" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ultimoAcesso" TIMESTAMP(3),
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminPlataforma_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcessoAssistido" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "revogadoEm" TIMESTAMP(3),

    CONSTRAINT "AcessoAssistido_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminPlataforma_email_key" ON "AdminPlataforma"("email");

-- CreateIndex
CREATE INDEX "AdminPlataforma_email_idx" ON "AdminPlataforma"("email");

-- CreateIndex
CREATE INDEX "AcessoAssistido_adminId_idx" ON "AcessoAssistido"("adminId");

-- CreateIndex
CREATE INDEX "AcessoAssistido_empresaId_expiraEm_idx" ON "AcessoAssistido"("empresaId", "expiraEm");

-- AddForeignKey
ALTER TABLE "AcessoAssistido" ADD CONSTRAINT "AcessoAssistido_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "AdminPlataforma"("id") ON DELETE CASCADE ON UPDATE CASCADE;
