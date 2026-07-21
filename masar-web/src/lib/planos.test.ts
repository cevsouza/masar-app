import { describe, it, expect } from 'vitest';
import { planoDe, limiteEfetivo, decidirTeto, PLANOS } from './planos';

/**
 * A licença é a única regra do sistema cuja falha não aparece para ninguém:
 * o cliente segue trabalhando, o app segue funcionando, e a diferença só
 * aparece na fatura errada. Por isso a aritmética é testada aqui.
 */

describe('planoDe', () => {
  it('resolve as chaves da escada comercial', () => {
    expect(planoDe('ESSENCIAL').limiteUnidades).toBe(25);
    expect(planoDe('CRESCIMENTO').limiteUnidades).toBe(100);
    expect(planoDe('OPERACAO').limiteUnidades).toBe(300);
  });

  it('aceita chave suja (caixa e espaço) — vem de campo editado à mão no console', () => {
    expect(planoDe(' essencial ').chave).toBe('ESSENCIAL');
  });

  it('ESCALA (rótulo antigo do console) resolve para OPERACAO, não para "sem teto"', () => {
    // Regressão de um divergência real: o console gravava ESCALA e o catálogo
    // só conhecia OPERACAO, então o cliente do plano de 300 ficava sem teto.
    expect(planoDe('ESCALA').chave).toBe('OPERACAO');
    expect(planoDe('ESCALA').limiteUnidades).toBe(300);
  });

  it('cai em PADRAO sem teto quando a chave é desconhecida ou vazia', () => {
    // Fail-open aqui é deliberado: chave errada não pode travar a obra de um
    // cliente adimplente. O risco oposto (cobrar a menos) é conversa comercial.
    expect(planoDe(null).limiteUnidades).toBeNull();
    expect(planoDe('PLANO_QUE_NAO_EXISTE').chave).toBe('PADRAO');
  });
});

describe('limiteEfetivo', () => {
  it('a exceção negociada na empresa vence o teto do plano', () => {
    expect(limiteEfetivo('ESSENCIAL', 40)).toBe(40);
  });

  it('sem exceção, vale o plano', () => {
    expect(limiteEfetivo('ESSENCIAL', null)).toBe(25);
    expect(limiteEfetivo('ESSENCIAL', undefined)).toBe(25);
  });

  it('exceção ZERO é zero, não "vazio"', () => {
    // O bug clássico: `limite || plano` trataria 0 como ausente e liberaria 25
    // unidades para uma conta suspensa.
    expect(limiteEfetivo('ESSENCIAL', 0)).toBe(0);
  });
});

describe('decidirTeto', () => {
  it('deixa criar a última unidade que cabe', () => {
    expect(decidirTeto(24, 25, 1).bloqueado).toBe(false);
  });

  it('barra a primeira que não cabe', () => {
    expect(decidirTeto(25, 25, 1).bloqueado).toBe(true);
  });

  it('barra o lote que estoura, mesmo com espaço para parte dele', () => {
    // O caminho que quase passou despercebido: criar empreendimento com N casas
    // previstas cria as N de uma vez. Uma guarda de "cabe mais uma?" liberaria
    // o lote inteiro.
    const d = decidirTeto(20, 25, 30);
    expect(d.bloqueado).toBe(true);
    expect(d.cabem).toBe(5);
  });

  it('deixa passar o lote que cabe exatamente', () => {
    expect(decidirTeto(20, 25, 5).bloqueado).toBe(false);
  });

  it('nunca reporta espaço negativo para quem já passou do teto', () => {
    expect(decidirTeto(40, 25, 1).cabem).toBe(0);
  });

  it('sem teto, nada bloqueia', () => {
    expect(decidirTeto(9999, null, 500).bloqueado).toBe(false);
    expect(decidirTeto(9999, null, 1).percentual).toBeNull();
  });

  it('avisa a partir de 80% e para de avisar quando já bloqueia', () => {
    expect(decidirTeto(19, 25).proximoDoLimite).toBe(false); // 76%
    expect(decidirTeto(20, 25).proximoDoLimite).toBe(true);  // 80%
    expect(decidirTeto(25, 25).proximoDoLimite).toBe(false); // já é bloqueio, não aviso
  });

  it('teto zero não divide por zero', () => {
    const d = decidirTeto(0, 0, 1);
    expect(d.percentual).toBe(100);
    expect(d.bloqueado).toBe(true);
  });
});

describe('catálogo', () => {
  it('a empresa raiz de cada instância (PADRAO) não tem teto', () => {
    // Aplicar limite retroativo a quem já opera seria travar trabalho em
    // andamento por causa de uma migração.
    expect(PLANOS.PADRAO.limiteUnidades).toBeNull();
  });
});
