-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "StatusLegal" AS ENUM ('ESTUDO_VIABILIDADE', 'APROVACAO_PREFEITURA', 'APROVACAO_CAIXA', 'EM_OBRA');

-- CreateEnum
CREATE TYPE "StatusCredito" AS ENUM ('DOCUMENTACAO_PENDENTE', 'EM_ANALISE_CAIXA', 'APROVADO_CONDICIONADO', 'APROVADO');

-- CreateEnum
CREATE TYPE "EtapaJornada" AS ENUM ('CAPTACAO', 'SIMULACAO_SICAQ', 'UPLOAD_DOCUMENTOS', 'APROVACAO_BANCARIA', 'ASSINATURA_DIGITAL', 'PAGAMENTO_ENTRADA', 'CHAVES_ENTREGUES');

-- CreateEnum
CREATE TYPE "StatusObra" AS ENUM ('BACKLOG', 'APROVACOES', 'INFRAESTRUTURA', 'SUPRAESTRUTURA', 'INSTALACOES', 'ACABAMENTO', 'VISTORIA_CAIXA', 'CARTORIO', 'VISITAS', 'CONCLUIDA');

-- CreateEnum
CREATE TYPE "StatusMedicao" AS ENUM ('AGUARDANDO', 'PAGA', 'GLOSADA_REPROVADA');

-- CreateEnum
CREATE TYPE "TipoMarco" AS ENUM ('ALVARA_PREFEITURA', 'PROJETO_CAIXA', 'HABITESE', 'CND_RECEITA');

-- CreateEnum
CREATE TYPE "UnidadeMedida" AS ENUM ('KG', 'SC', 'M3', 'HORA', 'EMPREITADA');

-- CreateEnum
CREATE TYPE "CategoriaInsumo" AS ENUM ('MATERIAL', 'EQUIPAMENTO', 'MAO_DE_OBRA', 'TAXA');

-- CreateEnum
CREATE TYPE "Clima" AS ENUM ('BOM', 'CHUVA', 'IMPRATICAVEL');

-- CreateEnum
CREATE TYPE "StatusContrato" AS ENUM ('EM_PROSPECCAO', 'SIMULACAO', 'ANALISE_CAIXA', 'ASSINADO_PROVISORIO', 'ASSINADO_CAIXA');

-- CreateEnum
CREATE TYPE "TipoMovimentacaoSocio" AS ENUM ('APORTE', 'RETIRADA_LUCRO', 'PRO_LABORE');

-- CreateEnum
CREATE TYPE "TipoCustoGlobal" AS ENUM ('TERRENO', 'PROJETOS', 'MARKETING', 'OUTRO');

-- CreateEnum
CREATE TYPE "RoleUsuario" AS ENUM ('ADMIN', 'FINANCEIRO', 'ENGENHARIA', 'COMERCIAL');

-- CreateEnum
CREATE TYPE "EscopoCronograma" AS ENUM ('GERAL', 'LOTE');

-- CreateEnum
CREATE TYPE "NaturezaFinanceira" AS ENUM ('RECEITA', 'DESPESA');

-- CreateEnum
CREATE TYPE "StatusFinanceiro" AS ENUM ('PENDENTE', 'PAGO', 'ATRASADO');

-- CreateEnum
CREATE TYPE "CategoriaFinanceira" AS ENUM ('TERRENO', 'IMPOSTOS', 'PROJETOS', 'MATERIAL', 'MAO_DE_OBRA', 'MEDICAO_CAIXA', 'ENTRADA_CLIENTE');

-- CreateEnum
CREATE TYPE "TipoDocumentoAnexo" AS ENUM ('PROJETO_ARQUITETONICO', 'PROJETO_ESTRUTURAL', 'PROJETO_HIDRAULICO', 'PROJETO_ELETRICO', 'MATRICULA_TERRENO', 'ALVARA_LOTEAMENTO', 'OUTRO');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "role" "RoleUsuario" NOT NULL DEFAULT 'COMERCIAL',
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Empreendimento" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "localizacao" TEXT NOT NULL,
    "statusLegal" "StatusLegal" NOT NULL DEFAULT 'ESTUDO_VIABILIDADE',
    "dataInicio" TIMESTAMP(3),
    "dataFim" TIMESTAMP(3),
    "orcamento" DOUBLE PRECISION,
    "temSondagemSolo" BOOLEAN NOT NULL DEFAULT false,
    "temInfraestruturaBasica" BOOLEAN NOT NULL DEFAULT false,
    "endereco" TEXT,
    "cep" TEXT,
    "bairro" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "areaTotalTerreno" DECIMAL(65,30),
    "quantidadeCasasPrevistas" INTEGER,
    "proprietarioAnteriorTerreno" TEXT,
    "valorCompraTerreno" DECIMAL(65,30),
    "amenidades" TEXT[],
    "padraoAreaConstruida" DECIMAL(65,30),
    "padraoAreaLote" DECIMAL(65,30),
    "padraoQuantidadeQuartos" INTEGER NOT NULL DEFAULT 0,
    "padraoQuantidadeSuites" INTEGER NOT NULL DEFAULT 0,
    "padraoQuantidadeBanheiros" INTEGER NOT NULL DEFAULT 0,
    "padraoVagasGaragem" INTEGER NOT NULL DEFAULT 0,
    "padraoPossuiQuintal" BOOLEAN NOT NULL DEFAULT false,
    "padraoSalaConjugada" BOOLEAN NOT NULL DEFAULT false,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataAtualizacao" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Empreendimento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarcoBurocratico" (
    "id" TEXT NOT NULL,
    "empreendimentoId" TEXT NOT NULL,
    "tipo" "TipoMarco" NOT NULL,
    "dataProtocolo" TIMESTAMP(3) NOT NULL,
    "prazoEsperadoDias" INTEGER NOT NULL,
    "dataAprovacaoReal" TIMESTAMP(3),
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataAtualizacao" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarcoBurocratico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "rg" TEXT,
    "contrachequeUrl" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "rendaComprovada" DOUBLE PRECISION NOT NULL,
    "statusCredito" "StatusCredito" NOT NULL DEFAULT 'DOCUMENTACAO_PENDENTE',
    "tokenAcessoPortal" TEXT,
    "etapaAtual" "EtapaJornada" NOT NULL DEFAULT 'CAPTACAO',
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataAtualizacao" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsumoPadrao" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "unidadeMedida" "UnidadeMedida" NOT NULL,
    "categoria" "CategoriaInsumo" NOT NULL,

    CONSTRAINT "InsumoPadrao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Casa" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "quadra" TEXT NOT NULL,
    "empreendimentoId" TEXT NOT NULL,
    "clienteId" TEXT,
    "statusObra" "StatusObra" NOT NULL DEFAULT 'BACKLOG',
    "percentualObra" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "prazoFisico" TIMESTAMP(3),
    "prazoFinanceiro" TIMESTAMP(3),
    "obstaculos" TEXT,
    "areaConstruida" DECIMAL(65,30),
    "areaLote" DECIMAL(65,30),
    "valorVendaProjetado" DECIMAL(65,30),
    "quantidadeQuartos" INTEGER NOT NULL DEFAULT 0,
    "quantidadeSuites" INTEGER NOT NULL DEFAULT 0,
    "quantidadeBanheiros" INTEGER NOT NULL DEFAULT 0,
    "vagasGaragem" INTEGER NOT NULL DEFAULT 0,
    "possuiQuintal" BOOLEAN NOT NULL DEFAULT false,
    "salaConjugada" BOOLEAN NOT NULL DEFAULT false,
    "liberadaVenda" BOOLEAN NOT NULL DEFAULT false,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataAtualizacao" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Casa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrcamentoCasa" (
    "id" TEXT NOT NULL,
    "casaId" TEXT NOT NULL,

    CONSTRAINT "OrcamentoCasa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemOrcamento" (
    "id" TEXT NOT NULL,
    "orcamentoCasaId" TEXT NOT NULL,
    "insumoId" TEXT NOT NULL,
    "quantidadePlanejada" DOUBLE PRECISION NOT NULL,
    "custoUnitarioPrevisto" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ItemOrcamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiarioDeObra" (
    "id" TEXT NOT NULL,
    "casaId" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clima" "Clima" NOT NULL,
    "efetivoTrabalhadores" INTEGER NOT NULL,
    "atividadesExecutadas" TEXT NOT NULL,
    "ocorrencias" TEXT NOT NULL,

    CONSTRAINT "DiarioDeObra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InfraestruturaUnidade" (
    "id" TEXT NOT NULL,
    "casaId" TEXT NOT NULL,
    "padraoEnergiaInstalado" BOOLEAN NOT NULL DEFAULT false,
    "ligacaoAguaConcluida" BOOLEAN NOT NULL DEFAULT false,
    "fossaFiltroEsgotoConcluido" BOOLEAN NOT NULL DEFAULT false,
    "numeroMedidorLuz" TEXT,
    "numeroMedidorAgua" TEXT,

    CONSTRAINT "InfraestruturaUnidade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicaoCaixa" (
    "id" TEXT NOT NULL,
    "casaId" TEXT NOT NULL,
    "percentualMedido" DOUBLE PRECISION NOT NULL,
    "valorLiberado" DOUBLE PRECISION NOT NULL,
    "status" "StatusMedicao" NOT NULL DEFAULT 'AGUARDANDO',
    "checklistSeguranca" JSONB,
    "dataMedicao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataAtualizacao" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicaoCaixa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Corretor" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "creci" TEXT NOT NULL,
    "comissaoPercentual" DOUBLE PRECISION NOT NULL DEFAULT 1.5,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Corretor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContratoVenda" (
    "id" TEXT NOT NULL,
    "casaId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "corretorId" TEXT,
    "valorVenda" DOUBLE PRECISION NOT NULL,
    "entrada" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "financiamento" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "fgts" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "subsidio" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "comissaoValor" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "comissaoPaga" BOOLEAN NOT NULL DEFAULT false,
    "status" "StatusContrato" NOT NULL DEFAULT 'EM_PROSPECCAO',
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataAtualizacao" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContratoVenda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContaBancaria" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "saldoAtual" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataAtualizacao" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContaBancaria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Socio" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "percentualCotas" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Socio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimentacaoSocio" (
    "id" TEXT NOT NULL,
    "socioId" TEXT NOT NULL,
    "empreendimentoId" TEXT,
    "tipo" "TipoMovimentacaoSocio" NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimentacaoSocio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransacaoFinanceira" (
    "id" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "dataVencimento" TIMESTAMP(3) NOT NULL,
    "dataPagamento" TIMESTAMP(3),
    "natureza" "NaturezaFinanceira" NOT NULL,
    "status" "StatusFinanceiro" NOT NULL DEFAULT 'PENDENTE',
    "categoria" "CategoriaFinanceira" NOT NULL,
    "empreendimentoId" TEXT NOT NULL,
    "casaId" TEXT,
    "clienteId" TEXT,
    "contratoId" TEXT,
    "insumoId" TEXT,
    "quantidade" DOUBLE PRECISION DEFAULT 1,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataAtualizacao" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransacaoFinanceira_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogAuditoria" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT,
    "usuarioNome" TEXT,
    "acao" TEXT NOT NULL,
    "tabela" TEXT NOT NULL,
    "registroId" TEXT,
    "valoresAntigos" JSONB,
    "valoresNovos" JSONB,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LogAuditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentoAnexo" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "caminhoArquivo" TEXT NOT NULL,
    "dataVencimento" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ATIVO',
    "tipo" "TipoDocumentoAnexo",
    "casaId" TEXT,
    "clienteId" TEXT,
    "empreendimentoId" TEXT,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentoAnexo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notificacao" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notificacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CotacaoMaterial" (
    "id" TEXT NOT NULL,
    "material" TEXT NOT NULL,
    "quantidade" DOUBLE PRECISION NOT NULL,
    "fornecedor" TEXT NOT NULL,
    "valorUnitario" DOUBLE PRECISION NOT NULL,
    "aprovado" BOOLEAN NOT NULL DEFAULT false,
    "empreendimentoId" TEXT NOT NULL,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataAtualizacao" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CotacaoMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PontoTrabalhador" (
    "id" TEXT NOT NULL,
    "trabalhadorNome" TEXT NOT NULL,
    "trabalhadorCpf" TEXT NOT NULL,
    "casaId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "dataRegistro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PontoTrabalhador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransacaoBancaria" (
    "id" TEXT NOT NULL,
    "contaBancariaId" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "descricao" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "conciliado" BOOLEAN NOT NULL DEFAULT false,
    "documentoIdentificador" TEXT,
    "origem" TEXT,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransacaoBancaria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Distrato" (
    "id" TEXT NOT NULL,
    "contratoId" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "multaCisao" DOUBLE PRECISION NOT NULL,
    "valorRestituido" DOUBLE PRECISION NOT NULL,
    "motivo" TEXT NOT NULL,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Distrato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssinaturaContrato" (
    "id" TEXT NOT NULL,
    "contratoId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "dataAssinatura" TIMESTAMP(3),
    "externalId" TEXT,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssinaturaContrato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsuarioCliente" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsuarioCliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolicitacaoCompra" (
    "id" TEXT NOT NULL,
    "casaId" TEXT,
    "empreendimentoId" TEXT,
    "insumoId" TEXT NOT NULL,
    "quantidadeSolicitada" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "dataNecessidade" TIMESTAMP(3) NOT NULL,
    "tokenCotacao" TEXT NOT NULL,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SolicitacaoCompra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CotacaoFornecedor" (
    "id" TEXT NOT NULL,
    "solicitacaoId" TEXT NOT NULL,
    "fornecedorNome" TEXT NOT NULL,
    "valorUnitario" DOUBLE PRECISION NOT NULL,
    "prazoEntregaDias" INTEGER NOT NULL,
    "comprovanteUrl" TEXT,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CotacaoFornecedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrdemCompra" (
    "id" TEXT NOT NULL,
    "cotacaoId" TEXT NOT NULL,
    "usuarioAprovadorId" TEXT,
    "statusEntrega" TEXT NOT NULL DEFAULT 'PENDENTE',
    "excepcionalAprovado" BOOLEAN NOT NULL DEFAULT false,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrdemCompra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimentacaoEstoque" (
    "id" TEXT NOT NULL,
    "insumoId" TEXT NOT NULL,
    "quantidade" DOUBLE PRECISION NOT NULL,
    "tipo" TEXT NOT NULL,
    "casaId" TEXT,
    "dataMovimentacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimentacaoEstoque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "categoria" TEXT NOT NULL DEFAULT 'PROJETO',
    "dataLimite" TIMESTAMP(3) NOT NULL,
    "dataConclusao" TIMESTAMP(3),
    "concluido" BOOLEAN NOT NULL DEFAULT false,
    "empreendimentoId" TEXT,
    "casaId" TEXT,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataAtualizacao" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AtividadeCronograma" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "escopo" "EscopoCronograma" NOT NULL,
    "status" "StatusObra" NOT NULL DEFAULT 'BACKLOG',
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "dataInicioPrevista" TIMESTAMP(3) NOT NULL,
    "dataFimPrevista" TIMESTAMP(3) NOT NULL,
    "dataInicioReal" TIMESTAMP(3),
    "dataFimReal" TIMESTAMP(3),
    "percentualConcluido" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "empreendimentoId" TEXT NOT NULL,
    "casaId" TEXT,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataAtualizacao" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AtividadeCronograma_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_cpf_key" ON "Cliente"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_email_key" ON "Cliente"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_tokenAcessoPortal_key" ON "Cliente"("tokenAcessoPortal");

-- CreateIndex
CREATE UNIQUE INDEX "InsumoPadrao_nome_key" ON "InsumoPadrao"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "OrcamentoCasa_casaId_key" ON "OrcamentoCasa"("casaId");

-- CreateIndex
CREATE UNIQUE INDEX "InfraestruturaUnidade_casaId_key" ON "InfraestruturaUnidade"("casaId");

-- CreateIndex
CREATE UNIQUE INDEX "Corretor_creci_key" ON "Corretor"("creci");

-- CreateIndex
CREATE UNIQUE INDEX "ContratoVenda_casaId_key" ON "ContratoVenda"("casaId");

-- CreateIndex
CREATE UNIQUE INDEX "ContaBancaria_nome_key" ON "ContaBancaria"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Socio_nome_key" ON "Socio"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "TransacaoBancaria_documentoIdentificador_key" ON "TransacaoBancaria"("documentoIdentificador");

-- CreateIndex
CREATE UNIQUE INDEX "Distrato_contratoId_key" ON "Distrato"("contratoId");

-- CreateIndex
CREATE UNIQUE INDEX "AssinaturaContrato_contratoId_key" ON "AssinaturaContrato"("contratoId");

-- CreateIndex
CREATE UNIQUE INDEX "UsuarioCliente_clienteId_key" ON "UsuarioCliente"("clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "UsuarioCliente_email_key" ON "UsuarioCliente"("email");

-- CreateIndex
CREATE UNIQUE INDEX "SolicitacaoCompra_tokenCotacao_key" ON "SolicitacaoCompra"("tokenCotacao");

-- CreateIndex
CREATE UNIQUE INDEX "OrdemCompra_cotacaoId_key" ON "OrdemCompra"("cotacaoId");

-- CreateIndex
CREATE INDEX "AtividadeCronograma_empreendimentoId_idx" ON "AtividadeCronograma"("empreendimentoId");

-- CreateIndex
CREATE INDEX "AtividadeCronograma_casaId_idx" ON "AtividadeCronograma"("casaId");

-- AddForeignKey
ALTER TABLE "MarcoBurocratico" ADD CONSTRAINT "MarcoBurocratico_empreendimentoId_fkey" FOREIGN KEY ("empreendimentoId") REFERENCES "Empreendimento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Casa" ADD CONSTRAINT "Casa_empreendimentoId_fkey" FOREIGN KEY ("empreendimentoId") REFERENCES "Empreendimento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Casa" ADD CONSTRAINT "Casa_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrcamentoCasa" ADD CONSTRAINT "OrcamentoCasa_casaId_fkey" FOREIGN KEY ("casaId") REFERENCES "Casa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemOrcamento" ADD CONSTRAINT "ItemOrcamento_orcamentoCasaId_fkey" FOREIGN KEY ("orcamentoCasaId") REFERENCES "OrcamentoCasa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemOrcamento" ADD CONSTRAINT "ItemOrcamento_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "InsumoPadrao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiarioDeObra" ADD CONSTRAINT "DiarioDeObra_casaId_fkey" FOREIGN KEY ("casaId") REFERENCES "Casa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfraestruturaUnidade" ADD CONSTRAINT "InfraestruturaUnidade_casaId_fkey" FOREIGN KEY ("casaId") REFERENCES "Casa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicaoCaixa" ADD CONSTRAINT "MedicaoCaixa_casaId_fkey" FOREIGN KEY ("casaId") REFERENCES "Casa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContratoVenda" ADD CONSTRAINT "ContratoVenda_casaId_fkey" FOREIGN KEY ("casaId") REFERENCES "Casa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContratoVenda" ADD CONSTRAINT "ContratoVenda_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContratoVenda" ADD CONSTRAINT "ContratoVenda_corretorId_fkey" FOREIGN KEY ("corretorId") REFERENCES "Corretor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentacaoSocio" ADD CONSTRAINT "MovimentacaoSocio_socioId_fkey" FOREIGN KEY ("socioId") REFERENCES "Socio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentacaoSocio" ADD CONSTRAINT "MovimentacaoSocio_empreendimentoId_fkey" FOREIGN KEY ("empreendimentoId") REFERENCES "Empreendimento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransacaoFinanceira" ADD CONSTRAINT "TransacaoFinanceira_empreendimentoId_fkey" FOREIGN KEY ("empreendimentoId") REFERENCES "Empreendimento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransacaoFinanceira" ADD CONSTRAINT "TransacaoFinanceira_casaId_fkey" FOREIGN KEY ("casaId") REFERENCES "Casa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransacaoFinanceira" ADD CONSTRAINT "TransacaoFinanceira_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransacaoFinanceira" ADD CONSTRAINT "TransacaoFinanceira_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "ContratoVenda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransacaoFinanceira" ADD CONSTRAINT "TransacaoFinanceira_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "InsumoPadrao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoAnexo" ADD CONSTRAINT "DocumentoAnexo_casaId_fkey" FOREIGN KEY ("casaId") REFERENCES "Casa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoAnexo" ADD CONSTRAINT "DocumentoAnexo_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoAnexo" ADD CONSTRAINT "DocumentoAnexo_empreendimentoId_fkey" FOREIGN KEY ("empreendimentoId") REFERENCES "Empreendimento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotacaoMaterial" ADD CONSTRAINT "CotacaoMaterial_empreendimentoId_fkey" FOREIGN KEY ("empreendimentoId") REFERENCES "Empreendimento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PontoTrabalhador" ADD CONSTRAINT "PontoTrabalhador_casaId_fkey" FOREIGN KEY ("casaId") REFERENCES "Casa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransacaoBancaria" ADD CONSTRAINT "TransacaoBancaria_contaBancariaId_fkey" FOREIGN KEY ("contaBancariaId") REFERENCES "ContaBancaria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Distrato" ADD CONSTRAINT "Distrato_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "ContratoVenda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssinaturaContrato" ADD CONSTRAINT "AssinaturaContrato_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "ContratoVenda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsuarioCliente" ADD CONSTRAINT "UsuarioCliente_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitacaoCompra" ADD CONSTRAINT "SolicitacaoCompra_casaId_fkey" FOREIGN KEY ("casaId") REFERENCES "Casa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitacaoCompra" ADD CONSTRAINT "SolicitacaoCompra_empreendimentoId_fkey" FOREIGN KEY ("empreendimentoId") REFERENCES "Empreendimento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitacaoCompra" ADD CONSTRAINT "SolicitacaoCompra_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "InsumoPadrao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotacaoFornecedor" ADD CONSTRAINT "CotacaoFornecedor_solicitacaoId_fkey" FOREIGN KEY ("solicitacaoId") REFERENCES "SolicitacaoCompra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdemCompra" ADD CONSTRAINT "OrdemCompra_cotacaoId_fkey" FOREIGN KEY ("cotacaoId") REFERENCES "CotacaoFornecedor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentacaoEstoque" ADD CONSTRAINT "MovimentacaoEstoque_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "InsumoPadrao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentacaoEstoque" ADD CONSTRAINT "MovimentacaoEstoque_casaId_fkey" FOREIGN KEY ("casaId") REFERENCES "Casa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_empreendimentoId_fkey" FOREIGN KEY ("empreendimentoId") REFERENCES "Empreendimento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_casaId_fkey" FOREIGN KEY ("casaId") REFERENCES "Casa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtividadeCronograma" ADD CONSTRAINT "AtividadeCronograma_empreendimentoId_fkey" FOREIGN KEY ("empreendimentoId") REFERENCES "Empreendimento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtividadeCronograma" ADD CONSTRAINT "AtividadeCronograma_casaId_fkey" FOREIGN KEY ("casaId") REFERENCES "Casa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

