import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    // Os testes de isolamento batem no Postgres local de verdade — é o unico
    // jeito de provar que o filtro por empresa vale no banco, e nao so no mock.
    environment: 'node',
    testTimeout: 30_000,
  },
});
