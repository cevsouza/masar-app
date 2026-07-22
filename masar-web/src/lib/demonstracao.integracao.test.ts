import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '@/lib/db';
import { runComEmpresa, runSemEscopoDeEmpresa } from '@/lib/tenant';
import { criarCenarioDemonstracao } from '@/lib/demonstracao';
import { seedEficiencia, limparSeed } from '@/lib/seedEficiencia';
import { bloqueioSegurancaMedicao } from '@/lib/sst';
import { avaliarConformidade } from '@/lib/mcmv/conformidade';

/**
 * A demonstração precisa DEMONSTRAR — e é isso que este teste guarda.
 *
 * O seed anterior criava uma construtora plausível em que nenhuma das três
 * telas do kit funcionava: sem regime MCMV a Prontidão Caixa ficava vazia, e
 * sem trabalhador nem documento a trava de medição não tinha do que reclamar.
 * Abrir a demo na frente de um cliente e ver a medição ser liberada
 * normalmente é o pior desfecho possível para uma conversa de venda.
 *
 * Este teste falha se o cenário voltar a não travar.
 */

const SLUG = 'teste-demonstracao';
let empresaId = '';

beforeAll(async () => {
  await runSemEscopoDeEmpresa(async () => {
    await db.empresa.deleteMany({ where: { slug: SLUG } });
    const e = await db.empresa.create({ data: { nome: 'Construtora Modelo (teste)', slug: SLUG } });
    empresaId = e.id;
  });
});

afterAll(async () => {
  await runSemEscopoDeEmpresa(() => db.empresa.deleteMany({ where: { slug: SLUG } }));
});

describe('cenário de demonstração', () => {
  it('monta o empreendimento vertical em SP, com MCMV ligado', async () => {
    const r = await runComEmpresa(empresaId, () => criarCenarioDemonstracao());
    expect(r.unidades).toBe(48);

    const emp = await runComEmpresa(empresaId, () =>
      db.empreendimento.findFirst({ where: { nome: r.empreendimento } }),
    );
    // O público inicial constrói prédio. Mostrar "casa" e "quadra" para quem
    // faz apartamento é perder a conversa na primeira tela.
    expect(emp?.tipologia).toBe('VERTICAL');
    expect(emp?.regimeMCMV).toBe(true);
    expect(emp?.faixaMCMV).toBe('FAIXA_3');
    expect(emp?.cidade).toBe('São Paulo');
  });

  it('TELA 2 — a trava de medição dispara, que é o argumento de venda inteiro', async () => {
    const r = await runComEmpresa(empresaId, () => bloqueioSegurancaMedicao());
    expect(r.bloqueado).toBe(true);

    const texto = r.pendencias.map((p) => `${p.titulo} ${p.prazo}`).join(' | ');
    expect(texto).toContain('João Batista Ferreira');
    expect(texto).toMatch(/venceu há 11 dias/);

    // A pendência precisa vir INSTRUÍDA, senão a demonstração mostra um
    // bloqueio sem saída — que é pior do que não bloquear.
    const p = r.pendencias[0];
    expect(p.porque.length).toBeGreaterThan(30);
    expect(p.comoResolver.length).toBeGreaterThan(30);
    expect(p.href).toBe('/trabalhadores');
  });

  it('TELA 1 — a Prontidão Caixa tem conteúdo, com o alvará vencido travando', async () => {
    const emp = await runComEmpresa(empresaId, () =>
      db.empreendimento.findFirst({ where: { tipologia: 'VERTICAL' } }),
    );
    const c = await runComEmpresa(empresaId, () => avaliarConformidade(emp!.id));

    expect(c.regimeMCMV).toBe(true);
    expect(c.itens.length).toBeGreaterThan(15);
    // Nem 100% (não teria o que mostrar) nem 0% (pareceria empresa quebrada).
    expect(c.resumo.percentual).toBeGreaterThan(30);
    expect(c.resumo.percentual).toBeLessThan(100);

    const alvara = c.itens.find((i) => i.chave === 'alvara-construcao');
    expect(alvara?.status).toBe('NAO_CONFORME');
    expect(c.bloqueadores.join(' ')).toMatch(/[Aa]lvará/);
  });

  it('TELA 3 — há saídas concentradas antes da entrada da medição travada', async () => {
    const pendentes = await runComEmpresa(empresaId, () =>
      db.transacaoFinanceira.findMany({ where: { status: 'PENDENTE' } }),
    );
    const saidas = pendentes.filter((t) => t.natureza === 'DESPESA');
    const entradas = pendentes.filter((t) => t.natureza === 'RECEITA');

    expect(saidas.length).toBeGreaterThanOrEqual(4);
    expect(entradas.length).toBeGreaterThanOrEqual(1);

    // O fecho da conversa: o dinheiro que falta é o que está preso na pendência
    // da tela anterior. A entrada vence DEPOIS das saídas.
    const ultimaSaida = Math.max(...saidas.map((t) => t.dataVencimento.getTime()));
    const entradaMedicao = entradas.find((t) => t.descricao.includes('Medição 8'));
    expect(entradaMedicao).toBeDefined();
    expect(entradaMedicao!.dataVencimento.getTime()).toBeGreaterThan(ultimaSaida);
  });

  it('a medição AGUARDANDO existe, é da TORRE e não de uma unidade', async () => {
    const m = await runComEmpresa(empresaId, () =>
      db.medicaoCaixa.findFirst({ where: { status: 'AGUARDANDO' } }),
    );
    expect(m).toBeDefined();
    expect(m?.casaId).toBeNull();
    expect(m?.empreendimentoId).toBeTruthy();
    expect(m?.referencia).toContain('Torre A');
  });

  it('cria exatamente a equipe do roteiro, sem sobra', async () => {
    // Cinco pessoas: uma com o ASO vencido (a história) e quatro em dia (o
    // contraste que faz a primeira saltar na tela).
    const equipe = await runComEmpresa(empresaId, () => db.trabalhador.count());
    expect(equipe).toBe(5);

    // NOTA: quem garante que rodar de novo não empilha é a LIMPEZA do seed
    // (api/seed/route.ts), não esta função — ela só cria. Chamar
    // criarCenarioDemonstracao() duas vezes seguidas duplicaria de propósito;
    // o caminho de uso é sempre pelo seed, que apaga antes.
    const asos = await runComEmpresa(empresaId, () => db.aSO.count());
    expect(asos).toBe(5);
  });

  it('o BOTÃO da tela de permissões produz o cenário — não só o terminal', async () => {
    // A lição que já estava na memória e eu repeti: capacidade entregue como
    // comando de terminal não foi entregue. O caminho de uso real é o botão em
    // /permissoes, que chama seedEficiencia — então é ELE que precisa produzir
    // a demonstração comercial.
    await runComEmpresa(empresaId, () => limparSeed());
    const resumo: any = await runComEmpresa(empresaId, () => seedEficiencia());
    expect(resumo.demonstracaoComercial).toContain('Vista Paulista');

    const vertical = await runComEmpresa(empresaId, () =>
      db.empreendimento.findFirst({ where: { tipologia: 'VERTICAL' } }),
    );
    expect(vertical?.regimeMCMV).toBe(true);
  });

  it('e a LIMPEZA do botão remove o cenário junto, sem sobrar lixo', async () => {
    // Prefixo [SEED] em tudo que é nomeado: é o que faz limparSeed alcançar o
    // cenário. Sem isso, cada clique em "popular" empilharia um Vista Paulista
    // novo — e numa instância com cliente o lixo só sairia a mão.
    await runComEmpresa(empresaId, () => limparSeed());

    const sobrou = await runComEmpresa(empresaId, () =>
      db.empreendimento.count({ where: { tipologia: 'VERTICAL' } }),
    );
    expect(sobrou).toBe(0);

    const trabalhadores = await runComEmpresa(empresaId, () => db.trabalhador.count());
    expect(trabalhadores).toBe(0);
  });

  it('a limpeza do seed cobre TODO modelo que o cenário cria', async () => {
    // Este é o teste que de fato protege a repetibilidade: se alguém
    // acrescentar um modelo ao cenário e esquecer de apagá-lo no seed, a
    // demonstração passa a acumular lixo a cada execução.
    const rota = await import('node:fs').then((fs) =>
      fs.readFileSync('src/app/api/seed/route.ts', 'utf8'),
    );
    for (const modelo of [
      'aSO', 'entregaEPI', 'trabalhador', 'atividadeCronograma',
      'documentoAnexo', 'itemConformidadeMCMV', 'medicaoCaixa',
      'casa', 'empreendimento', 'transacaoFinanceira', 'marcoBurocratico',
    ]) {
      expect(rota, `falta db.${modelo}.deleteMany() no seed`).toContain(`db.${modelo}.deleteMany()`);
    }
  });
});
