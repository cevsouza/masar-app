import { describe, it, expect } from 'vitest';
import { empreendimentoDaMedicao, rotuloMedicao, nomeDoEmpreendimento, validarDono } from './medicao';

const empH = { id: 'e1', nome: 'Residencial Bela Vista', tipologia: 'HORIZONTAL' };
const empV = { id: 'e2', nome: 'Edifício Aurora', tipologia: 'VERTICAL' };

describe('de quem é a medição', () => {
  it('horizontal: resolve o empreendimento através da unidade', () => {
    const m = { casa: { numero: '12', quadra: 'A', empreendimento: empH } };
    expect(empreendimentoDaMedicao(m)?.nome).toBe('Residencial Bela Vista');
  });

  it('vertical: a medição aponta direto para o empreendimento', () => {
    const m = { empreendimento: empV, referencia: 'Torre A' };
    expect(empreendimentoDaMedicao(m)?.nome).toBe('Edifício Aurora');
  });

  it('sem nenhum dos dois, não inventa nome', () => {
    expect(empreendimentoDaMedicao({})).toBeNull();
    expect(nomeDoEmpreendimento({})).toBe('(sem empreendimento)');
  });
});

describe('rótulo da medição', () => {
  it('horizontal fala da casa', () => {
    const m = { casa: { numero: '12', quadra: 'A', empreendimento: empH } };
    expect(rotuloMedicao(m)).toBe('Casa 12 · Quadra A');
  });

  it('vertical com referência informada mostra a torre', () => {
    expect(rotuloMedicao({ empreendimento: empV, referencia: 'Torre A' })).toBe(
      'Edifício Aurora · Torre A',
    );
  });

  it('vertical sem referência mostra só o empreendimento — que é o que foi medido', () => {
    expect(rotuloMedicao({ empreendimento: empV })).toBe('Edifício Aurora');
    expect(rotuloMedicao({ empreendimento: empV, referencia: '   ' })).toBe('Edifício Aurora');
  });

  it('unidade de empreendimento vertical usa o vocabulário vertical', () => {
    // Caso de migração: uma medição por unidade criada antes de o
    // empreendimento virar vertical ainda precisa se ler direito.
    const m = { casa: { numero: '101', quadra: 'A', empreendimento: empV } };
    expect(rotuloMedicao(m)).toBe('Apto 101 · Bloco A');
  });

  it('medição sem origem é dita como tal, não como texto vazio', () => {
    expect(rotuloMedicao({})).toBe('Medição sem origem');
  });
});

describe('exatamente um dono', () => {
  it('aceita só a unidade, ou só o empreendimento', () => {
    expect(validarDono({ casaId: 'c1' })).toBeNull();
    expect(validarDono({ empreendimentoId: 'e1' })).toBeNull();
  });

  it('recusa os dois ao mesmo tempo', () => {
    expect(validarDono({ casaId: 'c1', empreendimentoId: 'e1' })).toMatch(/ao mesmo tempo/);
  });

  it('recusa nenhum — medição órfã vira valor sem dono no relatório', () => {
    expect(validarDono({})).toMatch(/Informe a unidade/);
    expect(validarDono({ casaId: null, empreendimentoId: null })).toBeTruthy();
  });
});
