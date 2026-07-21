import { describe, it, expect } from 'vitest';
import { textoPrazo, ordenar, resumo, pendenciaSST, pendenciaMCMV } from './travaMedicao';
import { GUIA_MCMV, guiaDe, GUIA_PADRAO } from './mcmv/guia';
import { CATALOGO_MCMV } from './mcmv/catalogo';

const emDias = (n: number) => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d;
};

describe('textoPrazo', () => {
  it('fala em dias, não em data solta', () => {
    // Quem está com a medição travada não está com paciência de fazer a conta
    // entre a data de validade e hoje.
    expect(textoPrazo(emDias(-11))).toMatch(/^venceu há 11 dias/);
    expect(textoPrazo(emDias(-1))).toMatch(/^venceu ontem/);
    expect(textoPrazo(emDias(0))).toMatch(/^vence hoje/);
    expect(textoPrazo(emDias(1))).toMatch(/^vence amanhã/);
    expect(textoPrazo(emDias(9))).toMatch(/^vence em 9 dias/);
  });

  it('sempre mostra a data junto, para conferência', () => {
    expect(textoPrazo(emDias(-3))).toMatch(/\(\d{2}\/\d{2}\/\d{4}\)/);
  });

  it('sem data ou com data inválida, não inventa prazo', () => {
    expect(textoPrazo(null)).toBeUndefined();
    expect(textoPrazo(undefined)).toBeUndefined();
    expect(textoPrazo('não é data')).toBeUndefined();
  });
});

describe('ordem de atendimento', () => {
  it('o mais vencido vem primeiro — é a resposta a "por onde começo?"', () => {
    const p = ordenar([
      pendenciaSST('aso', 'ASO de Maria', emDias(-2)),
      pendenciaSST('aso', 'ASO de João', emDias(-30)),
      pendenciaSST('aso', 'ASO de Ana', emDias(5)),
    ]);
    expect(p.map((x) => x.titulo)).toEqual(['ASO de João', 'ASO de Maria', 'ASO de Ana']);
  });

  it('segurança de pessoas vem antes de documentação do empreendimento', () => {
    // O ASO embarga a obra hoje; o documento do empreendimento trava a
    // liberação. Os dois travam, mas não têm a mesma pressa.
    const p = ordenar([
      pendenciaMCMV('pbqp-h', 'PBQP-H / SiAC vigente'),
      pendenciaSST('epi', 'EPI capacete — João'),
    ]);
    expect(p[0].chave).toBe('epi');
  });

  it('item sem prazo não passa na frente de item vencido', () => {
    const p = ordenar([
      pendenciaSST('epi', 'EPI sem data'),
      pendenciaSST('aso', 'ASO de João', emDias(-1)),
    ]);
    expect(p[0].titulo).toBe('ASO de João');
  });
});

describe('resumo', () => {
  it('conta os vencidos separadamente', () => {
    const p = [
      pendenciaSST('aso', 'ASO de João', emDias(-3)),
      pendenciaSST('aso', 'ASO de Maria', emDias(4)),
    ];
    expect(resumo(p)).toBe('Faltam 2 itens para liberar esta medição — 1 já vencido.');
  });

  it('singular no caso de um item só', () => {
    expect(resumo([pendenciaSST('epi', 'EPI capacete')])).toBe(
      'Falta 1 item para liberar esta medição.',
    );
  });

  it('lista vazia não vira frase de bloqueio', () => {
    expect(resumo([])).toBe('Nenhuma pendência.');
  });
});

describe('guia', () => {
  it('toda pendência sai com por quê, como resolver e onde', () => {
    const p = pendenciaSST('aso', 'ASO de João', emDias(-1));
    expect(p.porque.length).toBeGreaterThan(30);
    expect(p.comoResolver.length).toBeGreaterThan(30);
    expect(p.href.startsWith('/')).toBe(true);
    expect(p.ondeLabel).toBeTruthy();
  });

  it('TODO item do catálogo que trava medição tem guia escrito', () => {
    // Sem isto, um item novo marcado como bloqueiaMedicao travaria a obra do
    // cliente devolvendo o texto genérico — que é exatamente o que estamos
    // saindo de trás.
    const semGuia = CATALOGO_MCMV.filter((c) => c.bloqueiaMedicao && !GUIA_MCMV[c.chave]).map(
      (c) => c.chave,
    );
    expect(semGuia).toEqual([]);
  });

  it('chave desconhecida cai no guia padrão, nunca em texto vazio', () => {
    expect(guiaDe('chave-que-nao-existe')).toBe(GUIA_PADRAO);
    expect(GUIA_PADRAO.comoResolver.length).toBeGreaterThan(30);
  });
});
