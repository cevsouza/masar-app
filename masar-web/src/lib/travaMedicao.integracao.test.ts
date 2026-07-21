import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '@/lib/db';
import { runComEmpresa, runSemEscopoDeEmpresa } from '@/lib/tenant';
import { bloqueioSegurancaMedicao } from '@/lib/sst';

/**
 * A trava, ponta a ponta, com um ASO de verdade vencido no banco.
 *
 * O teste puro prova que o guia existe; este prova que ele CHEGA — que
 * `bloqueioSegurancaMedicao` monta a pendência com o "por quê", o "como
 * resolver" e o link, em vez da string solta de antes. É o pedaço em que o
 * defeito voltaria sem ninguém notar: o guia continuaria escrito e o cliente
 * continuaria vendo "ASO vencido: João" e nada mais.
 */

const SLUG = 'teste-trava-medicao';
let empresaId = '';

beforeAll(async () => {
  await runSemEscopoDeEmpresa(async () => {
    await db.empresa.deleteMany({ where: { slug: SLUG } });
    const e = await db.empresa.create({ data: { nome: 'Construtora da Trava', slug: SLUG } });
    empresaId = e.id;
  });

  await runComEmpresa(empresaId, async () => {
    const t = await db.trabalhador.create({
      data: { nome: 'João da Silva', cpf: '000.000.000-99', funcao: 'Pedreiro' },
    });
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 11);
    await db.aSO.create({
      data: {
        trabalhadorId: t.id,
        tipo: 'PERIODICO',
        dataRealizacao: new Date(2025, 6, 1),
        dataValidade: ontem,
      },
    });
  });
});

afterAll(async () => {
  await runSemEscopoDeEmpresa(() => db.empresa.deleteMany({ where: { slug: SLUG } }));
});

describe('trava de medição instruída', () => {
  it('bloqueia e devolve a pendência com o que fazer a respeito', async () => {
    const r = await runComEmpresa(empresaId, () => bloqueioSegurancaMedicao());

    expect(r.bloqueado).toBe(true);
    expect(r.pendencias).toHaveLength(1);

    const p = r.pendencias[0];
    expect(p.chave).toBe('aso');
    expect(p.titulo).toContain('João da Silva');

    // O que diferencia "bloqueia" de "instrui":
    expect(p.prazo).toMatch(/venceu há 11 dias/);
    expect(p.porque).toMatch(/canteiro|fiscaliza|embarg/i);
    expect(p.comoResolver).toMatch(/exame|clínica|cadastre/i);
    expect(p.quantoTempo).toBeTruthy();
    expect(p.href).toBe('/trabalhadores');
  });

  it('mantém `motivos` em texto puro para o log de auditoria e o e-mail', async () => {
    // O override fica auditado com os motivos; trocar o formato quebraria o
    // registro de quem liberou o quê.
    const r = await runComEmpresa(empresaId, () => bloqueioSegurancaMedicao());
    expect(r.motivos).toHaveLength(1);
    expect(typeof r.motivos[0]).toBe('string');
    expect(r.motivos[0]).toContain('João da Silva');
  });

  it('empresa sem pendência não bloqueia nem inventa pendência', async () => {
    const outra = await runSemEscopoDeEmpresa(() =>
      db.empresa.create({ data: { nome: 'Limpa', slug: SLUG + '-limpa' } }),
    );
    const r = await runComEmpresa(outra.id, () => bloqueioSegurancaMedicao());
    expect(r.bloqueado).toBe(false);
    expect(r.pendencias).toEqual([]);
    await runSemEscopoDeEmpresa(() => db.empresa.delete({ where: { id: outra.id } }));
  });
});
