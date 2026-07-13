import { describe, it, expect } from 'vitest';
import {
  orcadoTotal,
  realizadoObra,
  custoAIncorrer,
  caixaLivre,
  retiradaBloqueada,
} from './caixaMath';

describe('orcadoTotal', () => {
  it('soma quantidade × custo unitário de cada item', () => {
    expect(orcadoTotal([
      { quantidadePlanejada: 120, custoUnitarioPrevisto: 38 },
      { quantidadePlanejada: 480, custoUnitarioPrevisto: 11.5 },
    ])).toBe(120 * 38 + 480 * 11.5);
  });

  it('retorna 0 para lista vazia', () => {
    expect(orcadoTotal([])).toBe(0);
  });
});

describe('realizadoObra', () => {
  it('soma apenas MATERIAL e MAO_DE_OBRA, ignorando outras categorias', () => {
    const transacoes = [
      { categoria: 'MATERIAL', valor: 3610 },
      { categoria: 'MAO_DE_OBRA', valor: 9500 },
      { categoria: 'TERRENO', valor: 90000 }, // não é custo físico de obra
      { categoria: 'PROJETOS', valor: 18000 }, // idem
    ];
    expect(realizadoObra(transacoes)).toBe(3610 + 9500);
  });

  it('retorna 0 quando não há transações de obra', () => {
    expect(realizadoObra([{ categoria: 'TAXA', valor: 500 }])).toBe(0);
  });
});

describe('custoAIncorrer', () => {
  it('é orçado menos realizado quando ainda falta gastar', () => {
    expect(custoAIncorrer(50000, 18000)).toBe(32000);
  });

  it('tem piso zero: obra que já gastou mais que o orçado não vira crédito', () => {
    expect(custoAIncorrer(20000, 25000)).toBe(0);
  });
});

describe('caixaLivre', () => {
  it('soma saldo e recebíveis e desconta o custo a incorrer', () => {
    expect(caixaLivre({ saldoBancario: 285000, recebiveisCurtoPrazo: 10000, custoAIncorrer: 32000 }))
      .toBe(263000);
  });

  it('fica negativo quando o custo a incorrer supera saldo + recebíveis (ilusão de liquidez)', () => {
    expect(caixaLivre({ saldoBancario: 78160, recebiveisCurtoPrazo: 0, custoAIncorrer: 120000 }))
      .toBe(-41840);
  });

  it('sem obras ativas, caixa livre é o próprio saldo bancário (caso do bug dos 78k)', () => {
    expect(caixaLivre({ saldoBancario: 78160, recebiveisCurtoPrazo: 0, custoAIncorrer: 0 }))
      .toBe(78160);
  });
});

describe('retiradaBloqueada (guardrail)', () => {
  it('bloqueia retirada acima do caixa livre', () => {
    expect(retiradaBloqueada(50000, 30000)).toBe(true);
  });

  it('permite retirada igual ou abaixo do caixa livre', () => {
    expect(retiradaBloqueada(30000, 30000)).toBe(false);
    expect(retiradaBloqueada(10000, 30000)).toBe(false);
  });

  it('bloqueia qualquer retirada quando o caixa livre está negativo', () => {
    expect(retiradaBloqueada(1, -5000)).toBe(true);
  });
});
