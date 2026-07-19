import { describe, it, expect } from 'vitest';
import {
  DOMINIO_BASE,
  hostDoSubdominio,
  subdominioDoHost,
  normalizarSubdominio,
  validarSubdominio,
  subdominioSugerido,
} from './dominioPlataforma';

/**
 * O endereço do cliente é gravado num campo só (`Empresa.dominio`), mas a ficha
 * mostra dois campos: "subdomínio na plataforma" e "domínio próprio". Quem
 * decide em qual dos dois o valor aparece é subdominioDoHost().
 *
 * Errar essa divisão não quebra nada visivelmente — a tela simplesmente mostra o
 * endereço no campo errado, o operador "corrige", e o cliente perde o acesso.
 * Por isso os casos de fronteira estão aqui.
 */
describe('subdomínio sobre o curinga da plataforma', () => {
  it('vai e volta', () => {
    expect(hostDoSubdominio('fulano')).toBe(`fulano.${DOMINIO_BASE}`);
    expect(subdominioDoHost(`fulano.${DOMINIO_BASE}`)).toBe('fulano');
  });

  it('trata domínio próprio do cliente como NÃO-subdomínio', () => {
    expect(subdominioDoHost('erp.construtorafulano.com.br')).toBeNull();
  });

  it('recusa nível aninhado — o certificado curinga não cobre a.b.base', () => {
    expect(subdominioDoHost(`a.b.${DOMINIO_BASE}`)).toBeNull();
  });

  it('não confunde o apex com um subdomínio vazio', () => {
    expect(subdominioDoHost(DOMINIO_BASE)).toBeNull();
  });

  it('não casa domínio que apenas TERMINA parecido', () => {
    // "xmasarempreendimentos.com.br" não pertence à base; sem o ponto do sufixo
    // um endsWith ingênuo aceitaria e entregaria a marca ao dono errado.
    expect(subdominioDoHost(`x${DOMINIO_BASE}`)).toBeNull();
  });

  it('ignora caixa alta e espaços', () => {
    expect(subdominioDoHost(`  FULANO.${DOMINIO_BASE.toUpperCase()}  `)).toBe('fulano');
  });

  it('devolve null para vazio', () => {
    expect(subdominioDoHost('')).toBeNull();
    expect(subdominioDoHost(null)).toBeNull();
  });
});

describe('normalização e validação', () => {
  it('limpa acento, espaço e símbolo', () => {
    expect(normalizarSubdominio('Construção Fulano & Cia')).toBe('construcao-fulano-cia');
  });

  it('recusa nome reservado da plataforma', () => {
    expect(validarSubdominio('admin')).toMatch(/reservado/i);
    expect(validarSubdominio('www')).toMatch(/reservado/i);
  });

  it('recusa curto demais', () => {
    expect(validarSubdominio('ab')).toBeTruthy();
  });

  it('aceita nome comum de construtora', () => {
    expect(validarSubdominio('construtorafulano')).toBeNull();
  });

  it('sugere vazio quando o slug cairia em reservado', () => {
    // "masar" é da casa: sugerir esse subdomínio a um cliente entregaria a ele o
    // endereço da própria operação do dono do produto.
    expect(subdominioSugerido('masar')).toBe('');
    expect(subdominioSugerido('construtora-fulano')).toBe('construtora-fulano');
  });
});
