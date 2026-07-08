-- CreateTable
CREATE TABLE "Empreendimento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "localizacao" TEXT NOT NULL,
    "statusLegal" TEXT NOT NULL DEFAULT 'ESTUDO_VIABILIDADE',
    "dataCriacao" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataAtualizacao" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "rendaComprovada" REAL NOT NULL,
    "statusCredito" TEXT NOT NULL DEFAULT 'DOCUMENTACAO_PENDENTE',
    "dataCriacao" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataAtualizacao" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Casa" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numero" TEXT NOT NULL,
    "quadra" TEXT NOT NULL,
    "empreendimentoId" TEXT NOT NULL,
    "clienteId" TEXT,
    "statusObra" TEXT NOT NULL DEFAULT 'SEM_INICIO',
    "percentualObra" REAL NOT NULL DEFAULT 0.0,
    "dataCriacao" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataAtualizacao" DATETIME NOT NULL,
    CONSTRAINT "Casa_empreendimentoId_fkey" FOREIGN KEY ("empreendimentoId") REFERENCES "Empreendimento" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Casa_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MedicaoCaixa" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "casaId" TEXT NOT NULL,
    "percentualMedido" REAL NOT NULL,
    "valorLiberado" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AGUARDANDO',
    "dataMedicao" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataCriacao" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataAtualizacao" DATETIME NOT NULL,
    CONSTRAINT "MedicaoCaixa_casaId_fkey" FOREIGN KEY ("casaId") REFERENCES "Casa" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_cpf_key" ON "Cliente"("cpf");
