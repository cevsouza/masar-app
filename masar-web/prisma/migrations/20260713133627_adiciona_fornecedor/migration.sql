-- CreateEnum
CREATE TYPE "TipoContaBancaria" AS ENUM ('CORRENTE', 'POUPANCA');

-- AlterTable
ALTER TABLE "CotacaoFornecedor" ADD COLUMN     "fornecedorId" TEXT;

-- CreateTable
CREATE TABLE "Fornecedor" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT,
    "cpf" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "ramo" TEXT,
    "logradouro" TEXT,
    "numero" TEXT,
    "bairro" TEXT,
    "cep" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "banco" TEXT,
    "agencia" TEXT,
    "conta" TEXT,
    "tipoConta" "TipoContaBancaria",
    "chavePix" TEXT,
    "prazoPagamentoDias" INTEGER,
    "prazoEntregaDias" INTEGER,
    "avaliacao" INTEGER,
    "observacoes" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataAtualizacao" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fornecedor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Fornecedor_cnpj_key" ON "Fornecedor"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "Fornecedor_cpf_key" ON "Fornecedor"("cpf");

-- AddForeignKey
ALTER TABLE "CotacaoFornecedor" ADD CONSTRAINT "CotacaoFornecedor_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "Fornecedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
