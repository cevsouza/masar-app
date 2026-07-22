import { describe, it, expect } from 'vitest';
import { vocabulario, rotuloUnidade, LABEL_TIPOLOGIA } from './vocabulario';

describe('vocabulário por tipologia', () => {
  it('horizontal fala a língua da obra de casas', () => {
    const v = vocabulario('HORIZONTAL');
    expect(v.unidade).toBe('Casa');
    expect(v.agrupador).toBe('Quadra');
    expect(v.temLote).toBe(true);
    expect(v.temQuintal).toBe(true);
  });

  it('vertical não mostra lote nem quintal', () => {
    // O motivo de este módulo existir: o construtor de prédio via "quintal" na
    // demonstração e concluía que o produto não era para ele.
    const v = vocabulario('VERTICAL');
    expect(v.unidade).toBe('Apartamento');
    expect(v.agrupador).toBe('Bloco');
    expect(v.temLote).toBe(false);
    expect(v.temQuintal).toBe(false);
  });

  it('sem tipologia, mantém o comportamento atual (horizontal)', () => {
    // Falhar para um neutro deixaria a tela de todo cliente atual mais fria
    // sem que ninguém tivesse pedido.
    expect(vocabulario(undefined).unidade).toBe('Casa');
    expect(vocabulario(null).unidade).toBe('Casa');
    expect(vocabulario('QUALQUER_COISA').unidade).toBe('Casa');
  });
});

describe('rótulo da unidade', () => {
  const casa = { numero: '101', quadra: 'A' };

  it('monta o texto certo em cada tipologia', () => {
    expect(rotuloUnidade(casa, 'HORIZONTAL')).toBe('Casa 101 · Quadra A');
    expect(rotuloUnidade(casa, 'VERTICAL')).toBe('Apto 101 · Bloco A');
  });

  it('é a fonte única do texto — sem tipologia, não quebra', () => {
    expect(rotuloUnidade(casa)).toBe('Casa 101 · Quadra A');
  });
});

describe('rótulos da tipologia', () => {
  it('descrevem em linguagem de construtor, não de banco de dados', () => {
    expect(LABEL_TIPOLOGIA.HORIZONTAL).toMatch(/horizontal/i);
    expect(LABEL_TIPOLOGIA.VERTICAL).toMatch(/apartamento/i);
  });
});
