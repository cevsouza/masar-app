import { describe, it, expect } from 'vitest';
import { CATALOGO_MCMV, type ContextoAvaliacao } from './catalogo';
import { GUIA_MCMV } from './guia';

/**
 * A trava do alvará — decisão do dono do produto em 21/07/2026.
 *
 * O ponto delicado não é bloquear: é bloquear pelo risco CERTO. O marco
 * `ALVARA_PREFEITURA` registra um evento ("saiu o alvará") e não tem validade;
 * só o documento no cofre carrega vencimento. Travar apenas pelo marco deixaria
 * o sistema cego justamente para o caso caro — o alvará que vence no meio da
 * obra, quando ninguém está olhando.
 */

const item = CATALOGO_MCMV.find((c) => c.chave === 'alvara-construcao')!;

const ctx = (
  marcoAprovado: boolean,
  alvara: ContextoAvaliacao['alvara'],
): ContextoAvaliacao => ({
  faixaMCMV: 'FAIXA_2',
  parametro: null,
  casas: [],
  marcosAprovados: marcoAprovado ? ['ALVARA_PREFEITURA'] : [],
  totalAtividadesCronograma: 0,
  segurancaBloqueada: false,
  alvara,
});

const semDoc = { temDocumento: false, vencido: false, vencimento: null };
const docValido = { temDocumento: true, vencido: false, vencimento: new Date(2027, 0, 1) };
const docVencido = { temDocumento: true, vencido: true, vencimento: new Date(2026, 5, 30) };

describe('alvará de construção', () => {
  it('trava a liberação de medição', () => {
    expect(item.bloqueiaMedicao).toBe(true);
  });

  it('marco não aprovado: pendente', () => {
    const r = item.auto!(ctx(false, semDoc));
    expect(r.status).toBe('PENDENTE');
    expect(r.detalhe).toContain('marco do alvará');
  });

  it('alvará vencido no cofre: NÃO CONFORME, com a data', () => {
    // O caso que o marco sozinho não enxergava.
    const r = item.auto!(ctx(true, docVencido));
    expect(r.status).toBe('NAO_CONFORME');
    expect(r.detalhe).toContain('venceu');
    expect(r.detalhe).toContain('30/06/2026');
  });

  it('marco aprovado sem documento: CONFORME, com ressalva — NÃO bloqueia', () => {
    // Bloquear por documento ausente transformaria o dia do deploy num dia de
    // obras paradas em toda instância, por uma exigência que ninguém tinha como
    // cumprir antes. O aviso puxa para o cofre; a trava fica para o irregular.
    const r = item.auto!(ctx(true, semDoc));
    expect(r.status).toBe('CONFORME');
    expect(r.detalhe).toContain('Anexe o alvará no cofre');
  });

  it('marco aprovado e documento válido: conforme e sem ruído', () => {
    const r = item.auto!(ctx(true, docValido));
    expect(r.status).toBe('CONFORME');
    expect(r.detalhe).toBeUndefined();
  });

  it('o guia manda para o MARCO, não para o cofre — é o marco que destrava', () => {
    // Regressão de um defeito real: o guia mandava anexar no cofre, mas anexar
    // não destravava nada. Instrução errada é pior que instrução nenhuma.
    const g = GUIA_MCMV['alvara-construcao'];
    expect(g.href).toBe('/empreendimentos');
    expect(g.comoResolver).toContain('marco');
    expect(g.comoResolver).toContain('cofre'); // as duas coisas, na ordem certa
  });
});
