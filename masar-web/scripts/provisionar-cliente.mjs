#!/usr/bin/env node
/**
 * Provisiona a PRIMEIRA conta ADMIN de uma instância nova de cliente.
 *
 * Substitui o `/api/seed` neste cenário: aquele endpoint APAGA o banco e recria
 * os dados de demonstração da Masar (usuários "Julio Souza", empreendimentos
 * "Residencial Bela Vista" e "Jardim das Palmeiras"). Rodar o seed numa
 * instância de cliente entregaria dados de outra empresa — nunca faça isso.
 *
 * Este script é aditivo e defensivo: se já houver QUALQUER usuário no banco,
 * ele aborta sem escrever nada.
 *
 * Uso (a partir de masar-web/, com as migrations já aplicadas no banco alvo):
 *
 *   DATABASE_URL="postgresql://..." \
 *   ADMIN_NOME="Fulano de Tal" \
 *   ADMIN_EMAIL="fulano@construtora.com.br" \
 *   ADMIN_SENHA="<senha forte gerada na hora>" \
 *   node scripts/provisionar-cliente.mjs
 *
 * A senha é lida de variável de ambiente, nunca de argumento de linha de
 * comando (argv fica visível na lista de processos e no histórico do shell).
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
  const nome = exigir('ADMIN_NOME');
  const email = exigir('ADMIN_EMAIL').toLowerCase();
  const senha = exigir('ADMIN_SENHA');
  exigir('DATABASE_URL');

  if (senha.length < 12) {
    console.error('✗ ADMIN_SENHA deve ter pelo menos 12 caracteres.');
    process.exit(1);
  }

  const db = new PrismaClient();

  try {
    // Trava: instância de cliente tem que nascer vazia. Se já tem usuário, ou
    // este banco não é novo, ou o script já rodou — nos dois casos, não escreva.
    const existentes = await db.user.count();
    if (existentes > 0) {
      console.error(
        `✗ Abortado: o banco já tem ${existentes} usuário(s). ` +
        `Este script só provisiona instância nova e vazia.`
      );
      process.exit(1);
    }

    // Sanidade: banco novo não pode ter dado de operação de ninguém.
    const empreendimentos = await db.empreendimento.count();
    if (empreendimentos > 0) {
      console.error(
        `✗ Abortado: o banco já tem ${empreendimentos} empreendimento(s). ` +
        `Confirme que a DATABASE_URL aponta para a instância NOVA do cliente.`
      );
      process.exit(1);
    }

    const admin = await db.user.create({
      data: { nome, email, password: await hashPassword(senha), role: 'ADMIN' },
    });

    console.log('✓ Instância provisionada.');
    console.log(`  Admin: ${admin.nome} <${admin.email}> (role ADMIN)`);
    console.log('  Banco: vazio, exceto por este usuário.');
    console.log('');
    console.log('  Próximo passo: entregar a senha ao cliente por canal seguro');
    console.log('  e pedir que ele a troque no primeiro acesso.');
  } finally {
    await db.$disconnect();
  }
}

main().catch((erro) => {
  console.error('✗ Falhou:', erro.message);
  process.exit(1);
});
