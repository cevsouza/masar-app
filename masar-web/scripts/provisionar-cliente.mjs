#!/usr/bin/env node
/**
 * Provisiona uma EMPRESA (tenant) e a sua primeira conta ADMIN.
 *
 * Serve para dois casos:
 *   1. cliente novo entrando na instância multi-tenant;
 *   2. recolocar um admin num banco que foi esvaziado (é o caminho de volta
 *      para dentro do sistema quando não sobrou nenhum usuário).
 *
 * Substitui o `/api/seed` nos dois: aquele endpoint APAGA e recria dados de
 * demonstração fictícios ("Julio Souza", "Residencial Bela Vista"). Instância de
 * cliente nunca deve recebê-los.
 *
 * É aditivo e defensivo: se a empresa alvo JÁ tiver usuário, aborta sem escrever.
 *
 * Uso (a partir de masar-web/, com as migrations aplicadas no banco alvo):
 *
 *   DATABASE_URL="postgresql://..." \
 *   EMPRESA_NOME="Construtora Fulano" \
 *   EMPRESA_SLUG="fulano" \
 *   ADMIN_NOME="Fulano de Tal" \
 *   ADMIN_EMAIL="fulano@construtora.com.br" \
 *   ADMIN_SENHA="<senha forte gerada na hora>" \
 *   node scripts/provisionar-cliente.mjs
 *
 * Opcionais: EMPRESA_DOMINIO (domínio próprio, white label),
 *            EMPRESA_COR (cor primária, ex.: #2563eb).
 *
 * A senha vem de variável de ambiente, nunca de argumento — argv aparece na
 * lista de processos e no histórico do shell.
 *
 * NOTA: usa o PrismaClient CRU de propósito, sem a extensão de isolamento por
 * empresa (lib/db). A extensão exige um tenant já resolvido, e aqui estamos
 * justamente criando o primeiro — seria uma dependência circular.
 */

import { PrismaClient } from '@prisma/client';
import { webcrypto as crypto } from 'node:crypto';

// Mesmos parâmetros de src/lib/auth.ts — o formato é versionado
// (`pbkdf2$iteracoes$salt$hash`), então o login valida sem nenhuma adaptação.
const PBKDF2_ITERATIONS = 600_000;
const PBKDF2_HASH = 'SHA-256';
const DERIVED_KEY_BITS = 256;

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: PBKDF2_HASH },
    key,
    DERIVED_KEY_BITS
  );
  const saltStr = Buffer.from(salt).toString('base64url');
  const hashStr = Buffer.from(derivedBits).toString('base64url');
  return `pbkdf2$${PBKDF2_ITERATIONS}$${saltStr}$${hashStr}`;
}

function exigir(nome) {
  const valor = process.env[nome];
  if (!valor || !valor.trim()) {
    console.error(`✗ Variável de ambiente ${nome} não definida.`);
    process.exit(1);
  }
  return valor.trim();
}

async function main() {
  const empresaNome = exigir('EMPRESA_NOME');
  const empresaSlug = exigir('EMPRESA_SLUG').toLowerCase().replace(/[^a-z0-9-]/g, '');
  const nome = exigir('ADMIN_NOME');
  const email = exigir('ADMIN_EMAIL').toLowerCase();
  const senha = exigir('ADMIN_SENHA');
  exigir('DATABASE_URL');

  const dominio = process.env.EMPRESA_DOMINIO?.trim() || null;
  const cor = process.env.EMPRESA_COR?.trim() || undefined;

  if (!empresaSlug) {
    console.error('✗ EMPRESA_SLUG inválido (use letras, números e hífen).');
    process.exit(1);
  }
  if (senha.length < 12) {
    console.error('✗ ADMIN_SENHA deve ter pelo menos 12 caracteres.');
    process.exit(1);
  }

  const db = new PrismaClient();

  try {
    // A empresa pode já existir: a migration inicial cria a raiz ("masar"), e
    // recolocar um admin num banco esvaziado é justamente este caso.
    let empresa = await db.empresa.findUnique({ where: { slug: empresaSlug } });

    if (empresa) {
      // Trava: só provisionamos o PRIMEIRO admin. Se esta empresa já tem gente,
      // criar usuário por script é caminho errado — use a tela de usuários.
      const jaTem = await db.user.count({ where: { empresaId: empresa.id } });
      if (jaTem > 0) {
        console.error(
          `✗ Abortado: a empresa "${empresa.nome}" já tem ${jaTem} usuário(s). ` +
          `Este script só cria o primeiro acesso. Para adicionar gente, use a tela de usuários.`
        );
        process.exit(1);
      }
      console.log(`• Empresa "${empresa.nome}" já existia (slug ${empresaSlug}); reaproveitando.`);
    } else {
      empresa = await db.empresa.create({
        data: {
          nome: empresaNome,
          slug: empresaSlug,
          dominio,
          ...(cor ? { corPrimaria: cor } : {}),
        },
      });
      console.log(`✓ Empresa criada: ${empresa.nome} (slug ${empresa.slug})`);
    }

    // Sanidade: empresa nova não deveria ter dado de operação de ninguém.
    const empreendimentos = await db.empreendimento.count({ where: { empresaId: empresa.id } });
    if (empreendimentos > 0) {
      console.warn(
        `! Atenção: esta empresa já tem ${empreendimentos} empreendimento(s). ` +
        `Confirme que a DATABASE_URL e o EMPRESA_SLUG apontam para o alvo certo.`
      );
    }

    const admin = await db.user.create({
      data: {
        nome,
        email,
        password: await hashPassword(senha),
        role: 'ADMIN',
        empresaId: empresa.id,
      },
    });

    console.log('');
    console.log('✓ Provisionado.');
    console.log(`  Empresa: ${empresa.nome} (${empresa.slug})${dominio ? ` · ${dominio}` : ''}`);
    console.log(`  Admin:   ${admin.nome} <${admin.email}> (ADMIN)`);
    console.log('');
    console.log('  Entregue a senha por canal seguro e peça a troca no primeiro acesso.');
  } finally {
    await db.$disconnect();
  }
}

main().catch((erro) => {
  console.error('✗ Falhou:', erro.message);
  process.exit(1);
});
