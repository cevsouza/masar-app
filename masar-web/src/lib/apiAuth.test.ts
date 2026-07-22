import { describe, it, expect } from 'vitest';
import { podeAcessar, type SessaoStaff } from '@/lib/apiAuth';
import { DEFAULTS, TODOS_MODULOS } from '@/lib/permissoes';

/**
 * Decisão de acesso das rotas de API.
 *
 * O ponto destes testes não é "ADMIN passa" — é provar que a decisão da API
 * bate com a decisão das PÁGINAS. Enquanto as duas divergirem, esconder um
 * menu não esconde o dado.
 */

function sessao(role: string, modulos?: string[]): SessaoStaff {
  return { role, userId: 'u1', empresaId: 'e1', ...(modulos ? { modulos } : {}) };
}

describe('podeAcessar', () => {
  it('ADMIN entra em qualquer módulo', () => {
    for (const modulo of TODOS_MODULOS) {
      expect(podeAcessar(sessao('ADMIN'), { modulo })).toBe(true);
    }
  });

  it('ADMIN não fura exigência de papel', () => {
    // Módulo é permissão de área; papel é identidade. ADMIN é onipresente na
    // matriz, mas não vira "qualquer um" quando a rota pede um papel exato.
    expect(podeAcessar(sessao('ADMIN'), { papeis: ['FINANCEIRO'] })).toBe(false);
  });

  it('COMERCIAL não alcança o financeiro — que é o buraco que motivou o guarda', () => {
    expect(podeAcessar(sessao('COMERCIAL'), { modulo: 'financeiro' })).toBe(false);
    expect(podeAcessar(sessao('COMERCIAL'), { modulo: 'obras' })).toBe(false);
    expect(podeAcessar(sessao('COMERCIAL'), { modulo: 'comercial' })).toBe(true);
  });

  it('ENGENHARIA alcança obra e segurança, não o caixa', () => {
    expect(podeAcessar(sessao('ENGENHARIA'), { modulo: 'obras' })).toBe(true);
    expect(podeAcessar(sessao('ENGENHARIA'), { modulo: 'seguranca' })).toBe(true);
    expect(podeAcessar(sessao('ENGENHARIA'), { modulo: 'financeiro' })).toBe(false);
    expect(podeAcessar(sessao('ENGENHARIA'), { modulo: 'suprimentos' })).toBe(false);
  });

  it('o token manda: módulo revogado na matriz barra mesmo sendo default do papel', () => {
    // A matriz é editável pelo dono do produto. Se ele tirou "financeiro" do
    // FINANCEIRO, a API tem de obedecer — senão a tela de Permissões mente.
    const revogado = sessao('FINANCEIRO', ['obras', 'comercial']);
    expect(podeAcessar(revogado, { modulo: 'financeiro' })).toBe(false);
    expect(podeAcessar(revogado, { modulo: 'obras' })).toBe(true);
  });

  it('token antigo sem `modulos` cai no default do papel, não em acesso total', () => {
    // Cookie emitido antes da Fase 5.2 não tem a lista. Não pode derrubar quem
    // está logado, e muito menos liberar tudo.
    const antigo = sessao('ENGENHARIA');
    expect(antigo.modulos).toBeUndefined();
    expect(podeAcessar(antigo, { modulo: 'obras' })).toBe(true);
    expect(podeAcessar(antigo, { modulo: 'financeiro' })).toBe(false);
  });

  it('sessão sem módulo nenhum é barrada em tudo', () => {
    const vazio = sessao('FINANCEIRO', []);
    for (const modulo of TODOS_MODULOS) {
      expect(podeAcessar(vazio, { modulo })).toBe(false);
    }
  });

  it('módulo e papel juntos exigem os dois', () => {
    const engenheiro = sessao('ENGENHARIA');
    expect(podeAcessar(engenheiro, { modulo: 'obras', papeis: ['ADMIN'] })).toBe(false);
    expect(podeAcessar(engenheiro, { modulo: 'obras', papeis: ['ADMIN', 'ENGENHARIA'] })).toBe(true);
  });

  it('exigência vazia só cobra sessão válida', () => {
    expect(podeAcessar(sessao('COMERCIAL'), {})).toBe(true);
  });

  it('a decisão da API é a MESMA da matriz de páginas', () => {
    // Este é o teste que justifica a escolha de usar módulo em vez de lista de
    // papéis na mão: se um dia divergirem, some a garantia inteira.
    for (const [papel, modulosDoPapel] of Object.entries(DEFAULTS)) {
      for (const modulo of TODOS_MODULOS) {
        expect(
          podeAcessar(sessao(papel), { modulo }),
          `${papel} x ${modulo} divergiu do default da matriz`,
        ).toBe(modulosDoPapel.includes(modulo));
      }
    }
  });
});
