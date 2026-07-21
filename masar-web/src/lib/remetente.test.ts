import { describe, it, expect } from 'vitest';
import { decidirRemetente, montarFrom, extrairEndereco, dominioDe } from './remetente';

const PADRAO = 'Novastrus <nao-responda@novastrus.com.br>';

describe('montarFrom', () => {
  it('põe o nome antes do endereço', () => {
    expect(montarFrom('Construtora Fulano', 'a@b.com')).toBe('Construtora Fulano <a@b.com>');
  });

  it('cita o nome quando ele tem caractere que quebraria o cabeçalho', () => {
    // "Fulano & Cia, Ltda" sem aspas viraria DOIS endereços para o servidor de
    // e-mail — a vírgula é separador de lista no RFC 5322.
    expect(montarFrom('Fulano & Cia, Ltda', 'a@b.com')).toBe('"Fulano & Cia, Ltda" <a@b.com>');
    expect(montarFrom('Construtora S.A.', 'a@b.com')).toBe('"Construtora S.A." <a@b.com>');
  });

  it('remove aspas e barras do nome em vez de deixá-las escapar', () => {
    expect(montarFrom('Fulano "O Bom"', 'a@b.com')).toBe('Fulano O Bom <a@b.com>');
  });

  it('sem nome, devolve só o endereço', () => {
    expect(montarFrom('   ', 'a@b.com')).toBe('a@b.com');
  });
});

describe('extração', () => {
  it('tira o endereço de um From completo ou cru', () => {
    expect(extrairEndereco('Novastrus <x@y.com.br>')).toBe('x@y.com.br');
    expect(extrairEndereco('x@y.com.br')).toBe('x@y.com.br');
  });

  it('pega o domínio depois do último @', () => {
    expect(dominioDe('contato@construtora.com.br')).toBe('construtora.com.br');
    expect(dominioDe('sem-arroba')).toBe('');
  });
});

describe('decidirRemetente', () => {
  const verificados = new Set(['novastrus.com.br', 'construtorafulano.com.br']);

  it('sem endereço próprio: nome do cliente no endereço da plataforma', () => {
    // Este é o caso da esmagadora maioria dos clientes, e é o que resolve o
    // vazamento de marca sem exigir DNS nenhum: o nome de exibição é texto
    // livre, só o endereço precisa de domínio verificado.
    const r = decidirRemetente('Construtora Fulano', null, PADRAO, verificados);
    expect(r.from).toBe('Construtora Fulano <nao-responda@novastrus.com.br>');
    expect(r.replyTo).toBeUndefined();
  });

  it('com domínio verificado: o cliente assina de ponta a ponta', () => {
    const r = decidirRemetente(
      'Construtora Fulano',
      'contato@construtorafulano.com.br',
      PADRAO,
      verificados,
    );
    expect(r.from).toBe('Construtora Fulano <contato@construtorafulano.com.br>');
    expect(r.replyTo).toBeUndefined();
  });

  it('cadastrado mas NÃO verificado: não envia por ele; vira Responder para', () => {
    // A regra que protege o produto: enviar de domínio não verificado não faz o
    // e-mail chegar com a marca errada — faz ele NÃO CHEGAR. O alerta diário é
    // o que foi vendido.
    const r = decidirRemetente(
      'Construtora Fulano',
      'contato@aindanaoverificado.com.br',
      PADRAO,
      verificados,
    );
    expect(r.from).toBe('Construtora Fulano <nao-responda@novastrus.com.br>');
    expect(r.replyTo).toBe('contato@aindanaoverificado.com.br');
  });

  it('conjunto de verificados vazio (falha na consulta) não impede o envio', () => {
    const r = decidirRemetente('Construtora Fulano', 'contato@x.com.br', PADRAO, new Set());
    expect(extrairEndereco(r.from)).toBe('nao-responda@novastrus.com.br');
    expect(r.replyTo).toBe('contato@x.com.br');
  });

  it('normaliza caixa do endereço cadastrado', () => {
    const r = decidirRemetente(
      'Construtora Fulano',
      '  CONTATO@ConstrutoraFulano.com.br ',
      PADRAO,
      verificados,
    );
    expect(r.from).toBe('Construtora Fulano <contato@construtorafulano.com.br>');
  });

  it('a marca do e-mail é sempre a do tenant, nunca a da instância', () => {
    // Regressão do defeito original: os quatro pontos de envio chamavam
    // sendEmail sem `from` e todo cliente saía assinado como a instância.
    for (const proprio of [null, 'contato@construtorafulano.com.br', 'x@naoverificado.com']) {
      const r = decidirRemetente('Construtora Fulano', proprio, PADRAO, verificados);
      expect(r.from.startsWith('Construtora Fulano')).toBe(true);
      expect(r.from).not.toContain('Novastrus <');
    }
  });
});
