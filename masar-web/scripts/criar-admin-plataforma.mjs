#!/usr/bin/env node
/**
 * Cria um administrador do CONTROL PLANE (a plataforma, não uma construtora).
 *
 * Este é o ÚNICO caminho para criar essa conta. Não existe auto-cadastro por
 * HTTP de propósito: um endpoint de registro no control plane seria uma porta
 * para alguém virar dono de todos os clientes de uma vez. Aqui a barreira é ter
 * a DATABASE_URL em mãos — quem tem isso já tem o banco.
 *
 * Uso (a partir de masar-web/):
 *
 *   DATABASE_URL="postgresql://..." \
 *   ADMIN_NOME="Seu Nome" \
 *   ADMIN_EMAIL="voce@dominio.com.br" \
 *   ADMIN_SENHA="<senha forte gerada na hora>" \
 *   node scripts/criar-admin-plataforma.mjs
 *
 * A senha vem de variável de ambiente, nunca de argumento — argv aparece na
 * lista de processos e no histórico do shell.
 */

import { PrismaClient } from '@prisma/client';
import { webcrypto as crypto } from 'node:crypto';

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
  return `pbkdf2$${PBKDF2_ITERATIONS}$${Buffer.from(salt).toString('base64url')}$${Buffer.from(derivedBits).toString('base64url')}`;
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
  const nome = exigir('ADMIN_NOME');
  const email = exigir('ADMIN_EMAIL').toLowerCase();
  const senha = exigir('ADMIN_SENHA');
  exigir('DATABASE_URL');

  if (senha.length < 14) {
    console.error('✗ ADMIN_SENHA deve ter pelo menos 14 caracteres — esta conta enxerga todos os clientes.');
    process.exit(1);
  }

  const db = new PrismaClient();
  try {
    const existente = await db.adminPlataforma.findUnique({ where: { email } });
    if (existente) {
      console.error(`✗ Abortado: já existe administrador de plataforma com o e-mail ${email}.`);
      process.exit(1);
    }

    const admin = await db.adminPlataforma.create({
      data: { nome, email, password: await hashPassword(senha) },
    });

    const total = await db.adminPlataforma.count();

    console.log('✓ Administrador da plataforma criado.');
    console.log(`  ${admin.nome} <${admin.email}>`);
    console.log(`  Total de admins de plataforma: ${total}`);
    console.log('');
    console.log('  Esta conta NÃO pertence a nenhuma construtora e não aparece');
    console.log('  na tela de usuários de nenhum cliente. Acesso em /plataforma.');
  } finally {
    await db.$disconnect();
  }
}

main().catch((erro) => {
  console.error('✗ Falhou:', erro.message);
  process.exit(1);
});
