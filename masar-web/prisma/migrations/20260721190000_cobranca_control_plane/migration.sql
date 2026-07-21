-- Cobranca mensal do cliente. CONTROL PLANE: sem FK para Empresa, de proposito
-- (referencia solta, como AcessoAssistido) — o historico financeiro nao pode
-- sumir junto com a empresa, e a tabela nao e escopada pela extensao de tenant.
CREATE TYPE "StatusCobranca" AS ENUM ('PENDENTE', 'PAGA', 'CANCELADA');

CREATE TABLE "Cobranca" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "competencia" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "dataVencimento" TIMESTAMP(3) NOT NULL,
    "status" "StatusCobranca" NOT NULL DEFAULT 'PENDENTE',
    "dataPagamento" TIMESTAMP(3),
    "observacao" TEXT,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataAtualizacao" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cobranca_pkey" PRIMARY KEY ("id")
);

-- Uma cobranca por cliente por mes: e o que torna a geracao do mes repetivel
-- sem duplicar. Rodar duas vezes nao cobra duas vezes.
CREATE UNIQUE INDEX "Cobranca_empresaId_competencia_key" ON "Cobranca"("empresaId", "competencia");
CREATE INDEX "Cobranca_status_dataVencimento_idx" ON "Cobranca"("status", "dataVencimento");

-- Termos do contrato, na ficha do cliente: e daqui que a geracao mensal tira
-- valor e vencimento.
ALTER TABLE "Empresa" ADD COLUMN "valorMensal" DOUBLE PRECISION;
ALTER TABLE "Empresa" ADD COLUMN "diaVencimento" INTEGER;
