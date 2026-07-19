// Transformacao unica do schema para multi-tenant (Fatia 1).
// Roda uma vez; fica versionado como registro de COMO o schema foi transformado.
//
// Regras:
//  - todo model (exceto Empresa) ganha `empresaId` + relacao + @@index([empresaId]);
//  - @unique de IDENTIFICADOR DE NEGOCIO vira @@unique([empresaId, campo]);
//  - @unique de CHAVE ESTRANGEIRA 1-1 (casaId, contratoId...) fica GLOBAL: a casa
//    ja pertence a uma empresa, entao a unicidade global e correta e o Prisma
//    precisa dela para enxergar a relacao 1-1;
//  - tokens secretos (tokenAcessoPortal, tokenCotacao) ficam GLOBAIS de proposito:
//    colisao de token entre tenants seria falha de seguranca, nao de modelagem.

import { readFileSync, writeFileSync } from 'node:fs';

const PATH = 'prisma/schema.prisma';
let schema = readFileSync(PATH, 'utf8');

// @unique de negocio -> composto com empresaId
const ESCOPAR = {
  User: ['email'],
  Cliente: ['cpf', 'email'],
  InsumoPadrao: ['nome'],
  Corretor: ['creci'],
  ContaBancaria: ['nome'],
  Socio: ['nome'],
  Trabalhador: ['cpf'],
  TransacaoBancaria: ['documentoIdentificador'],
  UsuarioCliente: ['email'],
  Fornecedor: ['cnpj', 'cpf'],
  NotaFiscalEntrada: ['chave'],
  ParametroMCMV: ['faixa'],
};

// Trabalhador ja tem um campo `empresa` (a empreiteira). Nome alternativo para
// nao colidir.
const NOME_RELACAO = (model) => (model === 'Trabalhador' ? 'empresaTenant' : 'empresa');

const PLURAL = {
  ASO: 'asos',
  PermissaoPapelModulo: 'permissoesPapelModulo',
  MetaEficiencia: 'metasEficiencia',
  ChecklistNR: 'checklistsNR',
};
const backRef = (m) => PLURAL[m] || m.charAt(0).toLowerCase() + m.slice(1) + 's';

const models = [];
schema = schema.replace(/^model (\w+) \{\n([\s\S]*?)^\}$/gm, (full, nome, corpo) => {
  if (nome === 'Empresa') return full;
  models.push(nome);

  let novo = corpo;
  const extras = [];

  // 1. @unique de negocio -> @@unique composto
  for (const campo of ESCOPAR[nome] || []) {
    const re = new RegExp(`^(\\s*${campo}\\s+[\\w?\\[\\]]+\\s*)@unique`, 'm');
    if (!re.test(novo)) throw new Error(`@unique nao encontrado: ${nome}.${campo}`);
    novo = novo.replace(re, '$1');
    extras.push(`  @@unique([empresaId, ${campo}])`);
  }

  // 2. @@unique existentes passam a incluir empresaId
  novo = novo.replace(/^\s*@@unique\(\[([^\]]+)\]\)/gm, (m, campos) => {
    if (campos.includes('empresaId')) return m;
    // ItemConformidadeMCMV ja e escopado por empreendimentoId
    if (campos.includes('empreendimentoId')) return m;
    return `  @@unique([empresaId, ${campos}])`;
  });

  // 3. singleton vira um por empresa
  if (nome === 'MetaEficiencia') extras.push('  @@unique([empresaId])');

  // 4. coluna + relacao, logo apos o @id
  const rel = NOME_RELACAO(nome);
  const linhaTenant =
    `  empresaId String\n` +
    `  ${rel} Empresa @relation(fields: [empresaId], references: [id], onDelete: Cascade)\n`;
  const posId = novo.match(/^.*@id.*\n/m);
  if (!posId) throw new Error(`sem @id: ${nome}`);
  novo = novo.replace(posId[0], posId[0] + linhaTenant);

  extras.push('  @@index([empresaId])');

  return `model ${nome} {\n${novo.replace(/\s*$/, '\n')}${extras.join('\n')}\n}`;
});

// Model Empresa: o tenant + os campos de white label.
const empresa = `
/// Tenant. Cada construtora cliente e uma Empresa; TODO dado do sistema pendura
/// aqui. O filtro por empresaId e injetado automaticamente pela extensao do
/// Prisma (lib/tenant) — nao depende de cada rota lembrar de filtrar.
model Empresa {
  id       String  @id @default(uuid())
  nome     String
  slug     String  @unique
  cnpj     String? @unique
  ativa    Boolean @default(true)

  // --- White label ---
  /// Dominio proprio do cliente (ex.: erp.construtorafulano.com.br). Resolve o
  /// tenant no login quando ha mais de uma empresa na mesma instancia.
  dominio        String? @unique
  logoUrl        String?
  corPrimaria    String  @default("#2563eb")
  corSecundaria  String  @default("#1e293b")
  /// Remetente dos e-mails desta empresa. Cai em EMAIL_FROM quando vazio.
  emailRemetente String?
  /// Destinatarios extras de alerta, separados por virgula.
  emailsAlerta   String?

  // --- Licenciamento ---
  plano           String    @default("PADRAO")
  limiteObras     Int?
  dataContratacao DateTime?
  dataExpiracao   DateTime?

  dataCriacao     DateTime @default(now())
  dataAtualizacao DateTime @updatedAt

${models.map((m) => `  ${backRef(m)} ${m}[]`).join('\n')}
}
`;

writeFileSync(PATH, schema.trimEnd() + '\n' + empresa);
console.log(`OK: ${models.length} models receberam empresaId`);
console.log(models.join(', '));
