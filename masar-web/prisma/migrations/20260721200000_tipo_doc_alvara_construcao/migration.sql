-- Alvara de CONSTRUCAO como tipo proprio de documento.
-- Existe separado do ALVARA_LOTEAMENTO porque e o que vence no meio da obra:
-- o marco ALVARA_PREFEITURA diz que o alvara SAIU (evento unico, sem validade),
-- e so o documento no cofre carrega a data de vencimento que alimenta o alerta.
ALTER TYPE "TipoDocumentoAnexo" ADD VALUE IF NOT EXISTS 'ALVARA_CONSTRUCAO';
