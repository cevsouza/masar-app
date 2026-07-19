-- Multi-tenant: introduz a Empresa (tenant) e escopa TODOS os dados a ela.
--
-- Ordem obrigatoria porque o banco JA TEM DADOS:
--   1. cria Empresa e insere a empresa raiz (a propria Masar);
--   2. adiciona empresaId ANULAVEL em cada tabela;
--   3. faz o backfill de tudo para a empresa raiz;
--   4. so entao aplica NOT NULL, indices e chaves estrangeiras.
-- Fazer ADD COLUMN NOT NULL direto (como o diff cru gera) quebraria na primeira tabela.
--
-- Os DROP INDEX abaixo removem @unique GLOBAIS que impediriam dois clientes de
-- cadastrar o mesmo CNPJ de fornecedor, o mesmo insumo ou o mesmo CPF. Eles voltam
-- logo em seguida como indices COMPOSTOS com empresaId.

-- 1. Remove os unique globais
DROP INDEX "Cliente_cpf_key";
DROP INDEX "Cliente_email_key";
DROP INDEX "ContaBancaria_nome_key";
DROP INDEX "Corretor_creci_key";
DROP INDEX "Fornecedor_cnpj_key";
DROP INDEX "Fornecedor_cpf_key";
DROP INDEX "InsumoPadrao_nome_key";
DROP INDEX "NotaFiscalEntrada_chave_key";
DROP INDEX "ParametroMCMV_faixa_key";
DROP INDEX "PermissaoPapelModulo_role_modulo_key";
DROP INDEX "Socio_nome_key";
DROP INDEX "Trabalhador_cpf_key";
DROP INDEX "TransacaoBancaria_documentoIdentificador_key";
DROP INDEX "User_email_key";
DROP INDEX "UsuarioCliente_email_key";

-- 2. Cria o tenant
CREATE TABLE "Empresa" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "cnpj" TEXT,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "dominio" TEXT,
    "logoUrl" TEXT,
    "corPrimaria" TEXT NOT NULL DEFAULT '#2563eb',
    "corSecundaria" TEXT NOT NULL DEFAULT '#1e293b',
    "emailRemetente" TEXT,
    "emailsAlerta" TEXT,
    "plano" TEXT NOT NULL DEFAULT 'PADRAO',
    "limiteObras" INTEGER,
    "dataContratacao" TIMESTAMP(3),
    "dataExpiracao" TIMESTAMP(3),
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataAtualizacao" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Empresa_pkey" PRIMARY KEY ("id")
);

INSERT INTO "Empresa" ("id", "nome", "slug", "ativa", "corPrimaria", "corSecundaria", "plano", "dataCriacao", "dataAtualizacao")
VALUES ('00000000-0000-0000-0000-000000000001', 'Masar Empreendimentos', 'masar', true, '#2563eb', '#1e293b', 'PADRAO', NOW(), NOW());

-- 3. Coluna anulavel em cada tabela
ALTER TABLE "ASO" ADD COLUMN "empresaId" TEXT;
ALTER TABLE "Acidente" ADD COLUMN "empresaId" TEXT;
ALTER TABLE "AssinaturaContrato" ADD COLUMN "empresaId" TEXT;
ALTER TABLE "AtividadeCronograma" ADD COLUMN "empresaId" TEXT;
ALTER TABLE "Casa" ADD COLUMN "empresaId" TEXT;
ALTER TABLE "ChecklistNR" ADD COLUMN "empresaId" TEXT;
ALTER TABLE "Cliente" ADD COLUMN "empresaId" TEXT;
ALTER TABLE "ContaBancaria" ADD COLUMN "empresaId" TEXT;
ALTER TABLE "ContratoVenda" ADD COLUMN "empresaId" TEXT;
ALTER TABLE "Corretor" ADD COLUMN "empresaId" TEXT;
ALTER TABLE "CotacaoFornecedor" ADD COLUMN "empresaId" TEXT;
ALTER TABLE "CotacaoMaterial" ADD COLUMN "empresaId" TEXT;
ALTER TABLE "DialogoSeguranca" ADD COLUMN "empresaId" TEXT;
ALTER TABLE "DiarioDeObra" ADD COLUMN "empresaId" TEXT;
ALTER TABLE "Distrato" ADD COLUMN "empresaId" TEXT;
ALTER TABLE "DocumentoAnexo" ADD COLUMN "empresaId" TEXT;
ALTER TABLE "Empreendimento" ADD COLUMN "empresaId" TEXT;
ALTER TABLE "EntregaEPI" ADD COLUMN "empresaId" TEXT;
ALTER TABLE "Fornecedor" ADD COLUMN "empresaId" TEXT;
ALTER TABLE "InfraestruturaUnidade" ADD COLUMN "empresaId" TEXT;
ALTER TABLE "InsumoPadrao" ADD COLUMN "empresaId" TEXT;
ALTER TABLE "ItemConformidadeMCMV" ADD COLUMN "empresaId" TEXT;
ALTER TABLE "ItemOrcamento" ADD COLUMN "empresaId" TEXT;
ALTER TABLE "LinhaBaseObra" ADD COLUMN "empresaId" TEXT;
ALTER TABLE "LogAuditoria" ADD COLUMN "empresaId" TEXT;
ALTER TABLE "MarcoBurocratico" ADD COLUMN "empresaId" TEXT;
ALTER TABLE "MedicaoCaixa" ADD COLUMN "empresaId" TEXT;
ALTER TABLE "MetaEficiencia" ADD COLUMN "empresaId" TEXT;
ALTER TABLE "Milestone" ADD COLUMN "empresaId" TEXT;
ALTER TABLE "MovimentacaoEstoque" ADD COLUMN "empresaId" TEXT;
ALTER TABLE "MovimentacaoSocio" ADD COLUMN "empresaId" TEXT;
ALTER TABLE "NotaFiscalEntrada" ADD COLUMN "empresaId" TEXT;
ALTER TABLE "Notificacao" ADD COLUMN "empresaId" TEXT;
ALTER TABLE "OrcamentoCasa" ADD COLUMN "empresaId" TEXT;
ALTER TABLE "OrdemCompra" ADD COLUMN "empresaId" TEXT;
ALTER TABLE "ParametroMCMV" ADD COLUMN "empresaId" TEXT;
ALTER TABLE "PermissaoPapelModulo" ADD COLUMN "empresaId" TEXT;
ALTER TABLE "PontoTrabalhador" ADD COLUMN "empresaId" TEXT;
ALTER TABLE "Socio" ADD COLUMN "empresaId" TEXT;
ALTER TABLE "SolicitacaoCompra" ADD COLUMN "empresaId" TEXT;
ALTER TABLE "Trabalhador" ADD COLUMN "empresaId" TEXT;
ALTER TABLE "TransacaoBancaria" ADD COLUMN "empresaId" TEXT;
ALTER TABLE "TransacaoFinanceira" ADD COLUMN "empresaId" TEXT;
ALTER TABLE "User" ADD COLUMN "empresaId" TEXT;
ALTER TABLE "UsuarioCliente" ADD COLUMN "empresaId" TEXT;

-- 4. Backfill: todo dado existente pertence a empresa raiz
UPDATE "ASO" SET "empresaId" = '00000000-0000-0000-0000-000000000001' WHERE "empresaId" IS NULL;
UPDATE "Acidente" SET "empresaId" = '00000000-0000-0000-0000-000000000001' WHERE "empresaId" IS NULL;
UPDATE "AssinaturaContrato" SET "empresaId" = '00000000-0000-0000-0000-000000000001' WHERE "empresaId" IS NULL;
UPDATE "AtividadeCronograma" SET "empresaId" = '00000000-0000-0000-0000-000000000001' WHERE "empresaId" IS NULL;
UPDATE "Casa" SET "empresaId" = '00000000-0000-0000-0000-000000000001' WHERE "empresaId" IS NULL;
UPDATE "ChecklistNR" SET "empresaId" = '00000000-0000-0000-0000-000000000001' WHERE "empresaId" IS NULL;
UPDATE "Cliente" SET "empresaId" = '00000000-0000-0000-0000-000000000001' WHERE "empresaId" IS NULL;
UPDATE "ContaBancaria" SET "empresaId" = '00000000-0000-0000-0000-000000000001' WHERE "empresaId" IS NULL;
UPDATE "ContratoVenda" SET "empresaId" = '00000000-0000-0000-0000-000000000001' WHERE "empresaId" IS NULL;
UPDATE "Corretor" SET "empresaId" = '00000000-0000-0000-0000-000000000001' WHERE "empresaId" IS NULL;
UPDATE "CotacaoFornecedor" SET "empresaId" = '00000000-0000-0000-0000-000000000001' WHERE "empresaId" IS NULL;
UPDATE "CotacaoMaterial" SET "empresaId" = '00000000-0000-0000-0000-000000000001' WHERE "empresaId" IS NULL;
UPDATE "DialogoSeguranca" SET "empresaId" = '00000000-0000-0000-0000-000000000001' WHERE "empresaId" IS NULL;
UPDATE "DiarioDeObra" SET "empresaId" = '00000000-0000-0000-0000-000000000001' WHERE "empresaId" IS NULL;
UPDATE "Distrato" SET "empresaId" = '00000000-0000-0000-0000-000000000001' WHERE "empresaId" IS NULL;
UPDATE "DocumentoAnexo" SET "empresaId" = '00000000-0000-0000-0000-000000000001' WHERE "empresaId" IS NULL;
UPDATE "Empreendimento" SET "empresaId" = '00000000-0000-0000-0000-000000000001' WHERE "empresaId" IS NULL;
UPDATE "EntregaEPI" SET "empresaId" = '00000000-0000-0000-0000-000000000001' WHERE "empresaId" IS NULL;
UPDATE "Fornecedor" SET "empresaId" = '00000000-0000-0000-0000-000000000001' WHERE "empresaId" IS NULL;
UPDATE "InfraestruturaUnidade" SET "empresaId" = '00000000-0000-0000-0000-000000000001' WHERE "empresaId" IS NULL;
UPDATE "InsumoPadrao" SET "empresaId" = '00000000-0000-0000-0000-000000000001' WHERE "empresaId" IS NULL;
UPDATE "ItemConformidadeMCMV" SET "empresaId" = '00000000-0000-0000-0000-000000000001' WHERE "empresaId" IS NULL;
UPDATE "ItemOrcamento" SET "empresaId" = '00000000-0000-0000-0000-000000000001' WHERE "empresaId" IS NULL;
UPDATE "LinhaBaseObra" SET "empresaId" = '00000000-0000-0000-0000-000000000001' WHERE "empresaId" IS NULL;
UPDATE "LogAuditoria" SET "empresaId" = '00000000-0000-0000-0000-000000000001' WHERE "empresaId" IS NULL;
UPDATE "MarcoBurocratico" SET "empresaId" = '00000000-0000-0000-0000-000000000001' WHERE "empresaId" IS NULL;
UPDATE "MedicaoCaixa" SET "empresaId" = '00000000-0000-0000-0000-000000000001' WHERE "empresaId" IS NULL;
UPDATE "MetaEficiencia" SET "empresaId" = '00000000-0000-0000-0000-000000000001' WHERE "empresaId" IS NULL;
UPDATE "Milestone" SET "empresaId" = '00000000-0000-0000-0000-000000000001' WHERE "empresaId" IS NULL;
UPDATE "MovimentacaoEstoque" SET "empresaId" = '00000000-0000-0000-0000-000000000001' WHERE "empresaId" IS NULL;
UPDATE "MovimentacaoSocio" SET "empresaId" = '00000000-0000-0000-0000-000000000001' WHERE "empresaId" IS NULL;
UPDATE "NotaFiscalEntrada" SET "empresaId" = '00000000-0000-0000-0000-000000000001' WHERE "empresaId" IS NULL;
UPDATE "Notificacao" SET "empresaId" = '00000000-0000-0000-0000-000000000001' WHERE "empresaId" IS NULL;
UPDATE "OrcamentoCasa" SET "empresaId" = '00000000-0000-0000-0000-000000000001' WHERE "empresaId" IS NULL;
UPDATE "OrdemCompra" SET "empresaId" = '00000000-0000-0000-0000-000000000001' WHERE "empresaId" IS NULL;
UPDATE "ParametroMCMV" SET "empresaId" = '00000000-0000-0000-0000-000000000001' WHERE "empresaId" IS NULL;
UPDATE "PermissaoPapelModulo" SET "empresaId" = '00000000-0000-0000-0000-000000000001' WHERE "empresaId" IS NULL;
UPDATE "PontoTrabalhador" SET "empresaId" = '00000000-0000-0000-0000-000000000001' WHERE "empresaId" IS NULL;
UPDATE "Socio" SET "empresaId" = '00000000-0000-0000-0000-000000000001' WHERE "empresaId" IS NULL;
UPDATE "SolicitacaoCompra" SET "empresaId" = '00000000-0000-0000-0000-000000000001' WHERE "empresaId" IS NULL;
UPDATE "Trabalhador" SET "empresaId" = '00000000-0000-0000-0000-000000000001' WHERE "empresaId" IS NULL;
UPDATE "TransacaoBancaria" SET "empresaId" = '00000000-0000-0000-0000-000000000001' WHERE "empresaId" IS NULL;
UPDATE "TransacaoFinanceira" SET "empresaId" = '00000000-0000-0000-0000-000000000001' WHERE "empresaId" IS NULL;
UPDATE "User" SET "empresaId" = '00000000-0000-0000-0000-000000000001' WHERE "empresaId" IS NULL;
UPDATE "UsuarioCliente" SET "empresaId" = '00000000-0000-0000-0000-000000000001' WHERE "empresaId" IS NULL;

-- 5. Agora sim, obrigatoria
ALTER TABLE "ASO" ALTER COLUMN "empresaId" SET NOT NULL;
ALTER TABLE "Acidente" ALTER COLUMN "empresaId" SET NOT NULL;
ALTER TABLE "AssinaturaContrato" ALTER COLUMN "empresaId" SET NOT NULL;
ALTER TABLE "AtividadeCronograma" ALTER COLUMN "empresaId" SET NOT NULL;
ALTER TABLE "Casa" ALTER COLUMN "empresaId" SET NOT NULL;
ALTER TABLE "ChecklistNR" ALTER COLUMN "empresaId" SET NOT NULL;
ALTER TABLE "Cliente" ALTER COLUMN "empresaId" SET NOT NULL;
ALTER TABLE "ContaBancaria" ALTER COLUMN "empresaId" SET NOT NULL;
ALTER TABLE "ContratoVenda" ALTER COLUMN "empresaId" SET NOT NULL;
ALTER TABLE "Corretor" ALTER COLUMN "empresaId" SET NOT NULL;
ALTER TABLE "CotacaoFornecedor" ALTER COLUMN "empresaId" SET NOT NULL;
ALTER TABLE "CotacaoMaterial" ALTER COLUMN "empresaId" SET NOT NULL;
ALTER TABLE "DialogoSeguranca" ALTER COLUMN "empresaId" SET NOT NULL;
ALTER TABLE "DiarioDeObra" ALTER COLUMN "empresaId" SET NOT NULL;
ALTER TABLE "Distrato" ALTER COLUMN "empresaId" SET NOT NULL;
ALTER TABLE "DocumentoAnexo" ALTER COLUMN "empresaId" SET NOT NULL;
ALTER TABLE "Empreendimento" ALTER COLUMN "empresaId" SET NOT NULL;
ALTER TABLE "EntregaEPI" ALTER COLUMN "empresaId" SET NOT NULL;
ALTER TABLE "Fornecedor" ALTER COLUMN "empresaId" SET NOT NULL;
ALTER TABLE "InfraestruturaUnidade" ALTER COLUMN "empresaId" SET NOT NULL;
ALTER TABLE "InsumoPadrao" ALTER COLUMN "empresaId" SET NOT NULL;
ALTER TABLE "ItemConformidadeMCMV" ALTER COLUMN "empresaId" SET NOT NULL;
ALTER TABLE "ItemOrcamento" ALTER COLUMN "empresaId" SET NOT NULL;
ALTER TABLE "LinhaBaseObra" ALTER COLUMN "empresaId" SET NOT NULL;
ALTER TABLE "LogAuditoria" ALTER COLUMN "empresaId" SET NOT NULL;
ALTER TABLE "MarcoBurocratico" ALTER COLUMN "empresaId" SET NOT NULL;
ALTER TABLE "MedicaoCaixa" ALTER COLUMN "empresaId" SET NOT NULL;
ALTER TABLE "MetaEficiencia" ALTER COLUMN "empresaId" SET NOT NULL;
ALTER TABLE "Milestone" ALTER COLUMN "empresaId" SET NOT NULL;
ALTER TABLE "MovimentacaoEstoque" ALTER COLUMN "empresaId" SET NOT NULL;
ALTER TABLE "MovimentacaoSocio" ALTER COLUMN "empresaId" SET NOT NULL;
ALTER TABLE "NotaFiscalEntrada" ALTER COLUMN "empresaId" SET NOT NULL;
ALTER TABLE "Notificacao" ALTER COLUMN "empresaId" SET NOT NULL;
ALTER TABLE "OrcamentoCasa" ALTER COLUMN "empresaId" SET NOT NULL;
ALTER TABLE "OrdemCompra" ALTER COLUMN "empresaId" SET NOT NULL;
ALTER TABLE "ParametroMCMV" ALTER COLUMN "empresaId" SET NOT NULL;
ALTER TABLE "PermissaoPapelModulo" ALTER COLUMN "empresaId" SET NOT NULL;
ALTER TABLE "PontoTrabalhador" ALTER COLUMN "empresaId" SET NOT NULL;
ALTER TABLE "Socio" ALTER COLUMN "empresaId" SET NOT NULL;
ALTER TABLE "SolicitacaoCompra" ALTER COLUMN "empresaId" SET NOT NULL;
ALTER TABLE "Trabalhador" ALTER COLUMN "empresaId" SET NOT NULL;
ALTER TABLE "TransacaoBancaria" ALTER COLUMN "empresaId" SET NOT NULL;
ALTER TABLE "TransacaoFinanceira" ALTER COLUMN "empresaId" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "empresaId" SET NOT NULL;
ALTER TABLE "UsuarioCliente" ALTER COLUMN "empresaId" SET NOT NULL;


-- 7. Indices (inclui os unique compostos com empresaId)
CREATE UNIQUE INDEX "Empresa_slug_key" ON "Empresa"("slug");
CREATE UNIQUE INDEX "Empresa_cnpj_key" ON "Empresa"("cnpj");
CREATE UNIQUE INDEX "Empresa_dominio_key" ON "Empresa"("dominio");
CREATE INDEX "ASO_empresaId_idx" ON "ASO"("empresaId");
CREATE INDEX "Acidente_empresaId_idx" ON "Acidente"("empresaId");
CREATE INDEX "AssinaturaContrato_empresaId_idx" ON "AssinaturaContrato"("empresaId");
CREATE INDEX "AtividadeCronograma_empresaId_idx" ON "AtividadeCronograma"("empresaId");
CREATE INDEX "Casa_empresaId_idx" ON "Casa"("empresaId");
CREATE INDEX "ChecklistNR_empresaId_idx" ON "ChecklistNR"("empresaId");
CREATE INDEX "Cliente_empresaId_idx" ON "Cliente"("empresaId");
CREATE UNIQUE INDEX "Cliente_empresaId_cpf_key" ON "Cliente"("empresaId", "cpf");
CREATE UNIQUE INDEX "Cliente_empresaId_email_key" ON "Cliente"("empresaId", "email");
CREATE INDEX "ContaBancaria_empresaId_idx" ON "ContaBancaria"("empresaId");
CREATE UNIQUE INDEX "ContaBancaria_empresaId_nome_key" ON "ContaBancaria"("empresaId", "nome");
CREATE INDEX "ContratoVenda_empresaId_idx" ON "ContratoVenda"("empresaId");
CREATE INDEX "Corretor_empresaId_idx" ON "Corretor"("empresaId");
CREATE UNIQUE INDEX "Corretor_empresaId_creci_key" ON "Corretor"("empresaId", "creci");
CREATE INDEX "CotacaoFornecedor_empresaId_idx" ON "CotacaoFornecedor"("empresaId");
CREATE INDEX "CotacaoMaterial_empresaId_idx" ON "CotacaoMaterial"("empresaId");
CREATE INDEX "DialogoSeguranca_empresaId_idx" ON "DialogoSeguranca"("empresaId");
CREATE INDEX "DiarioDeObra_empresaId_idx" ON "DiarioDeObra"("empresaId");
CREATE INDEX "Distrato_empresaId_idx" ON "Distrato"("empresaId");
CREATE INDEX "DocumentoAnexo_empresaId_idx" ON "DocumentoAnexo"("empresaId");
CREATE INDEX "Empreendimento_empresaId_idx" ON "Empreendimento"("empresaId");
CREATE INDEX "EntregaEPI_empresaId_idx" ON "EntregaEPI"("empresaId");
CREATE INDEX "Fornecedor_empresaId_idx" ON "Fornecedor"("empresaId");
CREATE UNIQUE INDEX "Fornecedor_empresaId_cnpj_key" ON "Fornecedor"("empresaId", "cnpj");
CREATE UNIQUE INDEX "Fornecedor_empresaId_cpf_key" ON "Fornecedor"("empresaId", "cpf");
CREATE INDEX "InfraestruturaUnidade_empresaId_idx" ON "InfraestruturaUnidade"("empresaId");
CREATE INDEX "InsumoPadrao_empresaId_idx" ON "InsumoPadrao"("empresaId");
CREATE UNIQUE INDEX "InsumoPadrao_empresaId_nome_key" ON "InsumoPadrao"("empresaId", "nome");
CREATE INDEX "ItemConformidadeMCMV_empresaId_idx" ON "ItemConformidadeMCMV"("empresaId");
CREATE INDEX "ItemOrcamento_empresaId_idx" ON "ItemOrcamento"("empresaId");
CREATE INDEX "LinhaBaseObra_empresaId_idx" ON "LinhaBaseObra"("empresaId");
CREATE INDEX "LogAuditoria_empresaId_idx" ON "LogAuditoria"("empresaId");
CREATE INDEX "MarcoBurocratico_empresaId_idx" ON "MarcoBurocratico"("empresaId");
CREATE INDEX "MedicaoCaixa_empresaId_idx" ON "MedicaoCaixa"("empresaId");
CREATE INDEX "MetaEficiencia_empresaId_idx" ON "MetaEficiencia"("empresaId");
CREATE UNIQUE INDEX "MetaEficiencia_empresaId_key" ON "MetaEficiencia"("empresaId");
CREATE INDEX "Milestone_empresaId_idx" ON "Milestone"("empresaId");
CREATE INDEX "MovimentacaoEstoque_empresaId_idx" ON "MovimentacaoEstoque"("empresaId");
CREATE INDEX "MovimentacaoSocio_empresaId_idx" ON "MovimentacaoSocio"("empresaId");
CREATE INDEX "NotaFiscalEntrada_empresaId_idx" ON "NotaFiscalEntrada"("empresaId");
CREATE UNIQUE INDEX "NotaFiscalEntrada_empresaId_chave_key" ON "NotaFiscalEntrada"("empresaId", "chave");
CREATE INDEX "Notificacao_empresaId_idx" ON "Notificacao"("empresaId");
CREATE INDEX "OrcamentoCasa_empresaId_idx" ON "OrcamentoCasa"("empresaId");
CREATE INDEX "OrdemCompra_empresaId_idx" ON "OrdemCompra"("empresaId");
CREATE INDEX "ParametroMCMV_empresaId_idx" ON "ParametroMCMV"("empresaId");
CREATE UNIQUE INDEX "ParametroMCMV_empresaId_faixa_key" ON "ParametroMCMV"("empresaId", "faixa");
CREATE INDEX "PermissaoPapelModulo_empresaId_idx" ON "PermissaoPapelModulo"("empresaId");
CREATE UNIQUE INDEX "PermissaoPapelModulo_empresaId_role_modulo_key" ON "PermissaoPapelModulo"("empresaId", "role", "modulo");
CREATE INDEX "PontoTrabalhador_empresaId_idx" ON "PontoTrabalhador"("empresaId");
CREATE INDEX "Socio_empresaId_idx" ON "Socio"("empresaId");
CREATE UNIQUE INDEX "Socio_empresaId_nome_key" ON "Socio"("empresaId", "nome");
CREATE INDEX "SolicitacaoCompra_empresaId_idx" ON "SolicitacaoCompra"("empresaId");
CREATE INDEX "Trabalhador_empresaId_idx" ON "Trabalhador"("empresaId");
CREATE UNIQUE INDEX "Trabalhador_empresaId_cpf_key" ON "Trabalhador"("empresaId", "cpf");
CREATE INDEX "TransacaoBancaria_empresaId_idx" ON "TransacaoBancaria"("empresaId");
CREATE UNIQUE INDEX "TransacaoBancaria_empresaId_documentoIdentificador_key" ON "TransacaoBancaria"("empresaId", "documentoIdentificador");
CREATE INDEX "TransacaoFinanceira_empresaId_idx" ON "TransacaoFinanceira"("empresaId");
CREATE INDEX "User_empresaId_idx" ON "User"("empresaId");
CREATE UNIQUE INDEX "User_empresaId_email_key" ON "User"("empresaId", "email");
CREATE INDEX "UsuarioCliente_empresaId_idx" ON "UsuarioCliente"("empresaId");
CREATE UNIQUE INDEX "UsuarioCliente_empresaId_email_key" ON "UsuarioCliente"("empresaId", "email");

-- 8. Chaves estrangeiras para Empresa
ALTER TABLE "PermissaoPapelModulo" ADD CONSTRAINT "PermissaoPapelModulo_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "User_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Empreendimento" ADD CONSTRAINT "Empreendimento_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarcoBurocratico" ADD CONSTRAINT "MarcoBurocratico_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InsumoPadrao" ADD CONSTRAINT "InsumoPadrao_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Casa" ADD CONSTRAINT "Casa_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrcamentoCasa" ADD CONSTRAINT "OrcamentoCasa_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ItemOrcamento" ADD CONSTRAINT "ItemOrcamento_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DiarioDeObra" ADD CONSTRAINT "DiarioDeObra_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InfraestruturaUnidade" ADD CONSTRAINT "InfraestruturaUnidade_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MedicaoCaixa" ADD CONSTRAINT "MedicaoCaixa_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Corretor" ADD CONSTRAINT "Corretor_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContratoVenda" ADD CONSTRAINT "ContratoVenda_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContaBancaria" ADD CONSTRAINT "ContaBancaria_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Socio" ADD CONSTRAINT "Socio_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MovimentacaoSocio" ADD CONSTRAINT "MovimentacaoSocio_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransacaoFinanceira" ADD CONSTRAINT "TransacaoFinanceira_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LogAuditoria" ADD CONSTRAINT "LogAuditoria_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentoAnexo" ADD CONSTRAINT "DocumentoAnexo_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notificacao" ADD CONSTRAINT "Notificacao_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CotacaoMaterial" ADD CONSTRAINT "CotacaoMaterial_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PontoTrabalhador" ADD CONSTRAINT "PontoTrabalhador_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Trabalhador" ADD CONSTRAINT "Trabalhador_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ASO" ADD CONSTRAINT "ASO_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EntregaEPI" ADD CONSTRAINT "EntregaEPI_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransacaoBancaria" ADD CONSTRAINT "TransacaoBancaria_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Distrato" ADD CONSTRAINT "Distrato_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssinaturaContrato" ADD CONSTRAINT "AssinaturaContrato_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UsuarioCliente" ADD CONSTRAINT "UsuarioCliente_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SolicitacaoCompra" ADD CONSTRAINT "SolicitacaoCompra_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CotacaoFornecedor" ADD CONSTRAINT "CotacaoFornecedor_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Fornecedor" ADD CONSTRAINT "Fornecedor_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotaFiscalEntrada" ADD CONSTRAINT "NotaFiscalEntrada_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrdemCompra" ADD CONSTRAINT "OrdemCompra_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MovimentacaoEstoque" ADD CONSTRAINT "MovimentacaoEstoque_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ParametroMCMV" ADD CONSTRAINT "ParametroMCMV_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ItemConformidadeMCMV" ADD CONSTRAINT "ItemConformidadeMCMV_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AtividadeCronograma" ADD CONSTRAINT "AtividadeCronograma_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LinhaBaseObra" ADD CONSTRAINT "LinhaBaseObra_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MetaEficiencia" ADD CONSTRAINT "MetaEficiencia_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DialogoSeguranca" ADD CONSTRAINT "DialogoSeguranca_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Acidente" ADD CONSTRAINT "Acidente_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChecklistNR" ADD CONSTRAINT "ChecklistNR_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
