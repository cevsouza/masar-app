import { describe, it, expect } from 'vitest';
import { competenciaAtual, normalizarCompetencia, vencimentoDe } from './cobranca';

describe('competência', () => {
  it('formata o mês corrente com dois dígitos', () => {
    expect(competenciaAtual(new Date(2026, 0, 15))).toBe('2026-01');
    expect(competenciaAtual(new Date(2026, 11, 1))).toBe('2026-12');
  });

  it('recusa formato torto', () => {
    expect(() => normalizarCompetencia('2026/08')).toThrow();
    expect(() => normalizarCompetencia('ago/2026')).toThrow();
    expect(() => normalizarCompetencia('2026-13')).toThrow();
    expect(() => normalizarCompetencia('2026-00')).toThrow();
  });

  it('aceita e devolve normalizado', () => {
    expect(normalizarCompetencia(' 2026-08 ')).toBe('2026-08');
  });
});

describe('vencimento', () => {
  it('monta a data no mês da competência', () => {
    const d = vencimentoDe('2026-08', 10);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(7); // agosto
    expect(d.getDate()).toBe(10);
  });

  it('nunca escorrega de mês, mesmo com dia impossível', () => {
    // Fevereiro é o caso que quebra: dia 31 viraria 3 de março e o cliente
    // receberia uma cobrança com vencimento no mês seguinte ao contratado.
    const d = vencimentoDe('2026-02', 31);
    expect(d.getMonth()).toBe(1); // continua fevereiro
    expect(d.getDate()).toBe(28);
  });

  it('não aceita dia zero ou negativo', () => {
    expect(vencimentoDe('2026-08', 0).getDate()).toBe(1);
    expect(vencimentoDe('2026-08', -5).getDate()).toBe(1);
  });
});
