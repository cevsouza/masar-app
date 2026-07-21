import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '@/lib/db';
import { runComEmpresa, runSemEscopoDeEmpresa } from '@/lib/tenant';
import { estadoLicenca, bloqueioNovasUnidades } from '@/lib/licenca';

/**
 * A licença contra o banco de verdade.
 *
 * O teste puro (planos.test.ts) cobre a aritmética; este cobre o que ela não
 * alcança e é onde o erro seria caro:
 *
 *  1. o consumo é contado POR EMPRESA — as unidades do cliente vizinho não
 *     podem entrar na conta. O risco é concreto: a leitura da Empresa acontece
 *     em escopo IRRESTRITO (Empresa não pendura em empresaId), e uma contagem
 *     que caísse dentro desse bloco somaria a instância inteira e deixaria
 *     todo mundo estourado.
 *  2. a exceção negociada em Empresa.limiteUnidades realmente vence o plano.
 *
 * Roda contra o Postgres local (DATABASE_URL do .env).
 */

const SLUG_X = 'teste-licenca-x';
const SLUG_Y = 'teste-licenca-y';

let empresaX = '';
let empresaY = '';

/** Cria n casas dentro do contexto da empresa. */
async function criarCasas(empresaId: string, obraId: string, n: number, prefixo: string) {
  await runComEmpresa(empresaId, () =>
    db.casa.createMany({
      data: Array.from({ length: n }, (_, i) => ({
        numero: `${prefixo}${i + 1}`,
        quadra: 'A',
        empreendimentoId: obraId,
      })),
    }),
  );
}

beforeAll(async () => {
  await runSemEscopoDeEmpresa(async () => {
    await db.empresa.deleteMany({ where: { slug: { in: [SLUG_X, SLUG_Y] } } });
    const x = await db.empresa.create({
      data: { nome: 'Construtora X', slug: SLUG_X, plano: 'ESSENCIAL' },
    });
    const y = await db.empresa.create({
      data: { nome: 'Construtora Y', slug: SLUG_Y, plano: 'ESSENCIAL' },
    });
    empresaX = x.id;
    empresaY = y.id;
  });

  const obraX = await runComEmpresa(empresaX, () =>
    db.empreendimento.create({ data: { nome: 'Obra X', localizacao: 'São Paulo' } }),
  );
  const obraY = await runComEmpresa(empresaY, () =>
    db.empreendimento.create({ data: { nome: 'Obra Y', localizacao: 'Bragança Paulista' } }),
  );

  // X fica com 20 (80% do plano de 25); Y com 24.
  await criarCasas(empresaX, obraX.id, 20, 'X');
  await criarCasas(empresaY, obraY.id, 24, 'Y');
});

afterAll(async () => {
  await runSemEscopoDeEmpresa(async () => {
    await db.empresa.deleteMany({ where: { slug: { in: [SLUG_X, SLUG_Y] } } });
  });
});

describe('licença contra o banco', () => {
  it('conta as unidades da empresa, não as da instância inteira', async () => {
    const x = await runComEmpresa(empresaX, () => estadoLicenca());
    const y = await runComEmpresa(empresaY, () => estadoLicenca());

    // Se a contagem vazasse, ambas veriam 44 e as duas estariam estouradas.
    expect(x.consumo).toBe(20);
    expect(y.consumo).toBe(24);
    expect(x.limite).toBe(25);
  });

  it('avisa em 80% sem bloquear', async () => {
    const x = await runComEmpresa(empresaX, () => estadoLicenca());
    expect(x.percentual).toBe(80);
    expect(x.proximoDoLimite).toBe(true);
    expect(x.noLimite).toBe(false);

    const pode = await runComEmpresa(empresaX, () => bloqueioNovasUnidades(1));
    expect(pode.bloqueado).toBe(false);
  });

  it('deixa criar a última que cabe e barra a seguinte', async () => {
    const cabe = await runComEmpresa(empresaY, () => bloqueioNovasUnidades(1)); // 24 -> 25
    expect(cabe.bloqueado).toBe(false);

    const naoCabe = await runComEmpresa(empresaY, () => bloqueioNovasUnidades(2)); // 24 -> 26
    expect(naoCabe.bloqueado).toBe(true);
  });

  it('barra o lote que estoura e diz quantas cabem', async () => {
    const r = await runComEmpresa(empresaX, () => bloqueioNovasUnidades(30));
    expect(r.bloqueado).toBe(true);
    if (r.bloqueado) {
      expect(r.mensagem).toContain('só cabem 5');
      expect(r.mensagem).toContain('continuam funcionando');
    }
  });

  it('a exceção negociada na empresa vence o plano', async () => {
    await runSemEscopoDeEmpresa(() =>
      db.empresa.update({ where: { id: empresaX }, data: { limiteUnidades: 40 } }),
    );
    const x = await runComEmpresa(empresaX, () => estadoLicenca());
    expect(x.limite).toBe(40);
    expect(x.proximoDoLimite).toBe(false); // 20/40 = 50%

    await runSemEscopoDeEmpresa(() =>
      db.empresa.update({ where: { id: empresaX }, data: { limiteUnidades: null } }),
    );
  });
});
