import { describe, it, expect } from 'vitest';
import { ARTIGOS, buscar, porSlug, porCategoria } from './artigos';
import { CATALOGO_MCMV } from '@/lib/mcmv/catalogo';
import { GUIA_MCMV } from '@/lib/mcmv/guia';

describe('base de conhecimento', () => {
  it('cobre TODA exigência do MCMV que tem guia escrito', () => {
    // Base de conhecimento com buraco é pior do que sem: o cliente procura,
    // não acha, e conclui que a resposta não existe.
    const comGuia = CATALOGO_MCMV.filter((c) => GUIA_MCMV[c.chave]);
    for (const item of comGuia) {
      expect(porSlug(`mcmv-${item.chave}`), `falta artigo de ${item.chave}`).toBeDefined();
    }
  });

  it('os artigos de conformidade são GERADOS do guia, não copiados', () => {
    // Duas cópias do mesmo conhecimento divergem, e a errada será a que o
    // cliente ler. Este teste falha se alguém transformar o gerado em texto fixo.
    const a = porSlug('mcmv-pbqp-h');
    expect(a?.corpo.join(' ')).toContain(GUIA_MCMV['pbqp-h'].porque);
    expect(a?.corpo.join(' ')).toContain(GUIA_MCMV['pbqp-h'].comoResolver);
  });

  it('avisa quando o item trava a medição', () => {
    // Duas coisas que o leitor conflaciona: o SISTEMA travar e a CAIXA travar.
    // Um item pode não bloquear aqui e ainda derrubar a vistoria lá.
    expect(porSlug('mcmv-pbqp-h')?.corpo.join(' ')).toContain('O sistema bloqueia a liberação');
    const habite = porSlug('mcmv-habite-se')?.corpo.join(' ') ?? '';
    expect(habite).toContain('O sistema não bloqueia');
    expect(habite).toContain('do lado da Caixa');
  });

  it('nenhum artigo fica sem resumo, corpo ou termos de busca', () => {
    for (const a of ARTIGOS) {
      expect(a.resumo.length, a.slug).toBeGreaterThan(10);
      expect(a.corpo.length, a.slug).toBeGreaterThan(0);
      expect(a.termos.length, a.slug).toBeGreaterThan(0);
    }
  });

  it('slugs são únicos', () => {
    const slugs = ARTIGOS.map((a) => a.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe('busca', () => {
  it('acha pelo jeito que o cliente descreve o problema, não pelo nome técnico', () => {
    // Quem está com a medição travada digita "travou", não "conformidade MCMV".
    expect(buscar('travou')[0].slug).toBe('medicao-travada');
    expect(buscar('nao libera')[0].slug).toBe('medicao-travada');
    expect(buscar('excel')[0].slug).toBe('importar-planilha');
    expect(buscar('planilha')[0].slug).toBe('importar-planilha');
  });

  it('ignora acento e caixa', () => {
    expect(buscar('MEDIÇÃO').length).toBeGreaterThan(0);
    expect(buscar('medicao').length).toBeGreaterThan(0);
    expect(buscar('alvará').length).toBeGreaterThan(0);
  });

  it('acha a exigência específica pelo nome dela', () => {
    expect(buscar('alvara')[0].slug).toBe('mcmv-alvara-construcao');
    expect(buscar('habite-se')[0].slug).toBe('mcmv-habite-se');
  });

  it('título pesa mais que menção no corpo', () => {
    const r = buscar('importar planilha');
    expect(r[0].slug).toBe('importar-planilha');
  });

  it('consulta vazia devolve tudo; consulta sem match devolve nada', () => {
    expect(buscar('   ')).toHaveLength(ARTIGOS.length);
    expect(buscar('xyzabc123')).toHaveLength(0);
  });
});

describe('organização', () => {
  it('toda categoria listada tem pelo menos um artigo', () => {
    for (const g of porCategoria()) {
      expect(g.artigos.length, g.categoria).toBeGreaterThan(0);
    }
  });

  it('todo artigo aparece em exatamente uma categoria', () => {
    const total = porCategoria().reduce((s, g) => s + g.artigos.length, 0);
    expect(total).toBe(ARTIGOS.length);
  });

  it('links internos apontam para caminho do app', () => {
    for (const a of ARTIGOS) {
      if (a.href) expect(a.href.startsWith('/'), a.slug).toBe(true);
    }
  });
});
