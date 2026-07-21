import { describe, it, expect } from 'vitest';
import { lerCSV, lerNumero, lerBooleano, normalizarChave, detectarSeparador } from './csv';
import { analisarCasas, modeloCSV } from './casas';

const buf = (s: string, latin = false) => {
  if (!latin) return new TextEncoder().encode(s).buffer as ArrayBuffer;
  // Simula planilha salva em Windows-1252 (o padrão do Excel em português).
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i) & 0xff;
  return bytes.buffer;
};

describe('CSV que o Excel brasileiro produz', () => {
  it('usa ponto-e-vírgula como separador, porque a vírgula é decimal', () => {
    const r = lerCSV(buf('numero;quadra;area\n01;A;48,50\n'));
    expect(r.separador).toBe(';');
    expect(r.linhas[0]).toEqual({ numero: '01', quadra: 'A', area: '48,50' });
  });

  it('ainda aceita vírgula e tabulação, para quem exportou de outro lugar', () => {
    expect(lerCSV(buf('numero,quadra\n01,A\n')).separador).toBe(',');
    expect(lerCSV(buf('numero\tquadra\n01\tA\n')).separador).toBe('\t');
  });

  it('não conta separador dentro de aspas ao adivinhar', () => {
    // "Rua Silva, 100" tem uma vírgula que não separa nada.
    expect(detectarSeparador('endereco;obs\n')).toBe(';');
    expect(detectarSeparador('"Rua Silva, 100";"Casa, esquina"')).toBe(';');
  });

  it('descarta o BOM, que senão gruda na primeira coluna', () => {
    // Sem tratar, a chave viraria "﻿numero" e o cabeçalho não bateria —
    // o sintoma é "o sistema diz que falta a coluna número, e ela está lá".
    const r = lerCSV(buf('﻿numero;quadra\n01;A\n'));
    expect(Object.keys(r.linhas[0])).toContain('numero');
    expect(r.linhas[0].numero).toBe('01');
  });

  it('lê arquivo em Windows-1252 sem quebrar acento', () => {
    const r = lerCSV(buf('numero;observacao\n01;Sacada com churrasqueira João\n', true));
    expect(r.encodingLatino).toBe(true);
    expect(r.linhas[0].observacao).toContain('João');
  });

  it('respeita aspas com separador e quebra de linha dentro', () => {
    const r = lerCSV(buf('numero;obs\n01;"Fundos; lateral"\n02;"Linha 1\nLinha 2"\n'));
    expect(r.linhas).toHaveLength(2);
    expect(r.linhas[0].obs).toBe('Fundos; lateral');
    expect(r.linhas[1].obs).toBe('Linha 1\nLinha 2');
  });

  it('aspas duplas escapadas viram uma aspa', () => {
    const r = lerCSV(buf('numero;obs\n01;"casa ""A"" do fundo"\n'));
    expect(r.linhas[0].obs).toBe('casa "A" do fundo');
  });

  it('CRLF do Windows não deixa \\r grudado no último campo', () => {
    const r = lerCSV(buf('numero;quadra\r\n01;A\r\n'));
    expect(r.linhas[0].quadra).toBe('A');
  });

  it('ignora linha totalmente vazia no fim do arquivo', () => {
    const r = lerCSV(buf('numero;quadra\n01;A\n\n;\n'));
    expect(r.linhas).toHaveLength(1);
  });
});

describe('cabeçalho', () => {
  it('casa a coluna independentemente de acento, espaço e caixa', () => {
    expect(normalizarChave('Área Construída')).toBe('areaconstruida');
    expect(normalizarChave('N°')).toBe('n');
    expect(normalizarChave(' QUADRA ')).toBe('quadra');
  });
});

describe('números da planilha de obra', () => {
  it('entende o formato brasileiro e o americano', () => {
    expect(lerNumero('48,50')).toBe(48.5);
    expect(lerNumero('48.50')).toBe(48.5);
    expect(lerNumero('1.234,56')).toBe(1234.56);
    expect(lerNumero('1,234.56')).toBe(1234.56);
  });

  it('trata milhar sem decimal', () => {
    expect(lerNumero('250.000')).toBe(250000);
  });

  it('tolera R$ e m² colados, que vêm de célula formatada', () => {
    expect(lerNumero('R$ 250.000,00')).toBe(250000);
    expect(lerNumero('48,5 m²')).toBe(48.5);
  });

  it('vazio é ausência, não zero', () => {
    // A diferença importa: zero é um valor declarado, ausência é dado que falta.
    expect(lerNumero('')).toBeNull();
    expect(lerNumero(null)).toBeNull();
    expect(lerNumero('abc')).toBeNull();
  });

  it('sim/não da planilha vira booleano', () => {
    expect(lerBooleano('Sim')).toBe(true);
    expect(lerBooleano('x')).toBe(true);
    expect(lerBooleano('não')).toBe(false);
    expect(lerBooleano('')).toBe(false);
  });
});

describe('conferência das unidades', () => {
  const analisar = (csv: string, existentes: { numero: string; quadra: string }[] = []) => {
    const r = lerCSV(buf(csv));
    return analisarCasas(r.linhas, r.cabecalho.map(normalizarChave), existentes);
  };

  it('aponta a casa pelo nome que o cliente reconhece, não pelo número da linha', () => {
    const a = analisar('numero;quadra;area\n12;;48\n');
    expect(a.linhas[0].erros[0]).toContain('casa 12');
    expect(a.linhas[0].erros[0]).toContain('sem quadra');
  });

  it('acusa duplicata DENTRO da planilha, citando as duas linhas', () => {
    const a = analisar('numero;quadra\n01;A\n01;A\n');
    expect(a.comErro).toBe(1);
    expect(a.linhas[1].erros[0]).toMatch(/aparece duas vezes.*linhas 2 e 3/);
  });

  it('acusa unidade que já existe no sistema', () => {
    const a = analisar('numero;quadra\n01;A\n', [{ numero: '01', quadra: 'a' }]);
    expect(a.linhas[0].erros[0]).toContain('já existe');
  });

  it('área e valor faltando são AVISO, não erro — a linha entra', () => {
    // Recusar a planilha inteira por isso é o que faz o cliente desistir da
    // migração e voltar para o Excel.
    const a = analisar('numero;quadra\n01;A\n');
    expect(a.comErro).toBe(0);
    expect(a.prontas).toBe(1);
    expect(a.linhas[0].avisos.join(' ')).toMatch(/sem área construída/);
    expect(a.linhas[0].avisos.join(' ')).toMatch(/sem valor de venda/);
  });

  it('área zerada é erro, porque é dado errado e não dado ausente', () => {
    const a = analisar('numero;quadra;area\n01;A;0\n');
    expect(a.linhas[0].erros[0]).toContain('zerada');
  });

  it('converte avanço 0,4 para 40% e avisa em vez de adivinhar calado', () => {
    const a = analisar('numero;quadra;percentual\n01;A;0,4\n');
    expect(a.linhas[0].dados.percentualObra).toBe(40);
    expect(a.linhas[0].avisos.join(' ')).toContain('foi lido como 40%');
  });

  it('avanço acima de 100% é erro', () => {
    const a = analisar('numero;quadra;percentual\n01;A;140\n');
    expect(a.linhas[0].erros[0]).toContain('acima de 100%');
  });

  it('etapa desconhecida não derruba a linha — entra como Backlog, avisando', () => {
    const a = analisar('numero;quadra;status\n01;A;Fundação\n');
    expect(a.linhas[0].dados.statusObra).toBe('BACKLOG');
    expect(a.linhas[0].avisos.join(' ')).toContain('não é uma das etapas');
  });

  it('aceita os nomes de coluna que a planilha do cliente já usa', () => {
    // A planilha existia antes do sistema. Exigir os nossos nomes é transferir
    // ao cliente o trabalho de traduzir.
    const a = analisar('unidade;bloco;metragem;dormitorios;preco\n07;B;52,3;3;310000\n');
    const d = a.linhas[0].dados;
    expect(d.numero).toBe('07');
    expect(d.quadra).toBe('B');
    expect(d.areaConstruida).toBe(52.3);
    expect(d.quantidadeQuartos).toBe(3);
    expect(d.valorVendaProjetado).toBe(310000);
    expect(a.comErro).toBe(0);
  });

  it('lista a coluna que não reconheceu, que é quase sempre nome errado', () => {
    const a = analisar('numero;quadra;aria_construida\n01;A;48\n');
    expect(a.colunasIgnoradas).toContain('ariaconstruida');
  });

  it('conta prontas, com erro e com aviso sem sobrepor', () => {
    const a = analisar('numero;quadra;area;valor_venda\n01;A;48;250000\n02;;48;250000\n03;C;;\n');
    expect(a.totalLinhas).toBe(3);
    expect(a.comErro).toBe(1);
    expect(a.prontas).toBe(2);
    expect(a.comAviso).toBe(1); // a 03; a 01 está completa
  });
});

describe('modelo de planilha', () => {
  it('sai no formato que o Excel em português abre sem perguntar nada', () => {
    const csv = modeloCSV();
    expect(csv.startsWith('﻿')).toBe(true); // BOM
    expect(csv).toContain(';');
    expect(csv).toContain('\r\n');
  });

  it('o próprio modelo passa na conferência sem erro', () => {
    // Se o exemplo que entregamos não passasse na nossa validação, o cliente
    // começaria a migração vendo o sistema recusar o arquivo que ele baixou.
    const r = lerCSV(new TextEncoder().encode(modeloCSV()).buffer as ArrayBuffer);
    const a = analisarCasas(r.linhas, r.cabecalho.map(normalizarChave));
    expect(a.comErro).toBe(0);
    expect(a.prontas).toBe(2);
    expect(a.colunasIgnoradas).toEqual([]);
  });
});
