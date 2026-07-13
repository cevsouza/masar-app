-- CreateTable
CREATE TABLE "NotaFiscalEntrada" (
    "id" TEXT NOT NULL,
    "chave" TEXT,
    "numero" TEXT,
    "serie" TEXT,
    "emitenteCnpj" TEXT,
    "emitenteNome" TEXT,
    "valorTotal" DOUBLE PRECISION NOT NULL,
    "dataEmissao" TIMESTAMP(3),
    "fornecedorId" TEXT,
    "empreendimentoId" TEXT,
    "contaPagarId" TEXT,
    "itensGeraramEstoque" INTEGER NOT NULL DEFAULT 0,
    "itens" JSONB,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotaFiscalEntrada_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotaFiscalEntrada_chave_key" ON "NotaFiscalEntrada"("chave");

-- AddForeignKey
ALTER TABLE "NotaFiscalEntrada" ADD CONSTRAINT "NotaFiscalEntrada_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "Fornecedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotaFiscalEntrada" ADD CONSTRAINT "NotaFiscalEntrada_empreendimentoId_fkey" FOREIGN KEY ("empreendimentoId") REFERENCES "Empreendimento"("id") ON DELETE SET NULL ON UPDATE CASCADE;
