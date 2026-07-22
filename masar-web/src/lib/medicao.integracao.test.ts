import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '@/lib/db';
import { runComEmpresa, runSemEscopoDeEmpresa } from '@/lib/tenant';

/**
 * A regra de "exatamente um dono" contra o banco.
 *
 * O TypeScript não consegue garantir isso — os dois campos são opcionais no
 * tipo. Quem garante é o CHECK da migration, e é ele que este teste exercita:
 * medição órfã (sem dono) ou ambígua (com dois) apareceria como valor sem
 * origem nos relatórios, e ninguém descobriria até fechar o mês.
 */

const SLUG = 'teste-medicao-vertical';
let empresaId = '';
let vertical = '';
let horizontal = '';
let casaHorizontal = '';

beforeAll(async () => {
  await runSemEscopoDeEmpresa(async () => {
    await db.empresa.deleteMany({ where: { slug: SLUG } });
    const e = await db.empresa.create({ data: { nome: 'Construtora Mista', slug: SLUG } });
    empresaId = e.id;
  });

  await runComEmpresa(empresaId, async () => {
    const v = await db.empreendimento.create({
      data: { nome: 'Edifício Aurora', localizacao: 'São Paulo', tipologia: 'VERTICAL' },
    });
    const h = await db.empreendimento.create({
      data: { nome: 'Residencial Bela Vista', localizacao: 'Guarulhos', tipologia: 'HORIZONTAL' },
    });
    const c = await db.casa.create({
      data: { empreendimentoId: h.id, numero: '01', quadra: 'A' },
    });
    vertical = v.id;
    horizontal = h.id;
    casaHorizontal = c.id;
  });
});

afterAll(async () => {
  await runSemEscopoDeEmpresa(() => db.empresa.deleteMany({ where: { slug: SLUG } }));
});

describe('medição por tipologia', () => {
  it('vertical: a medição pertence ao empreendimento, sem unidade', async () => {
    const m = await runComEmpresa(empresaId, () =>
      db.medicaoCaixa.create({
        data: {
          empreendimentoId: vertical,
          referencia: 'Torre A',
          percentualMedido: 35,
          valorLiberado: 900000,
        },
      }),
    );
    expect(m.casaId).toBeNull();
    expect(m.empreendimentoId).toBe(vertical);
    expect(m.referencia).toBe('Torre A');
  });

  it('horizontal: a medição pertence à unidade, sem empreendimento direto', async () => {
    const m = await runComEmpresa(empresaId, () =>
      db.medicaoCaixa.create({
        data: { casaId: casaHorizontal, percentualMedido: 40, valorLiberado: 120000 },
      }),
    );
    expect(m.empreendimentoId).toBeNull();
    expect(m.casaId).toBe(casaHorizontal);
  });

  it('o banco RECUSA medição com os dois donos', async () => {
    await expect(
      runComEmpresa(empresaId, () =>
        db.medicaoCaixa.create({
          data: {
            casaId: casaHorizontal,
            empreendimentoId: vertical,
            percentualMedido: 10,
            valorLiberado: 1000,
          },
        }),
      ),
    ).rejects.toThrow();
  });

  it('o banco RECUSA medição sem nenhum dono', async () => {
    await expect(
      runComEmpresa(empresaId, () =>
        db.medicaoCaixa.create({
          data: { percentualMedido: 10, valorLiberado: 1000 },
        }),
      ),
    ).rejects.toThrow();
  });

  it('as medições do vertical não aparecem penduradas em unidade nenhuma', async () => {
    const doVertical = await runComEmpresa(empresaId, () =>
      db.medicaoCaixa.count({ where: { empreendimentoId: vertical, casaId: null } }),
    );
    expect(doVertical).toBeGreaterThan(0);
  });
});
