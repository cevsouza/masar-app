import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '@/lib/db';
import { runComEmpresa, runSemEscopoDeEmpresa, EMPRESA_RAIZ_ID } from '@/lib/tenant';

/**
 * TESTE DE VAZAMENTO ENTRE CLIENTES.
 *
 * Este é o teste que justifica a arquitetura. Multi-tenant não se prova com
 * "tem uma coluna empresaId" — prova-se mostrando que, no banco de verdade, o
 * cliente A não enxerga, não altera e não apaga o dado do cliente B, mesmo
 * quando pede pelo ID exato.
 *
 * Roda contra o Postgres local (DATABASE_URL do .env). Cria duas empresas de
 * teste e apaga tudo no final.
 */

const SLUG_A = 'teste-isolamento-a';
const SLUG_B = 'teste-isolamento-b';

let empresaA = '';
let empresaB = '';
let obraDeB = '';

beforeAll(async () => {
  await runSemEscopoDeEmpresa(async () => {
    // limpa restos de execuções anteriores
    await db.empresa.deleteMany({ where: { slug: { in: [SLUG_A, SLUG_B] } } });

    const a = await db.empresa.create({ data: { nome: 'Construtora A', slug: SLUG_A } });
    const b = await db.empresa.create({ data: { nome: 'Construtora B', slug: SLUG_B } });
    empresaA = a.id;
    empresaB = b.id;
  });

  // Cada empresa cria a sua obra, dentro do próprio contexto.
  await runComEmpresa(empresaA, () =>
    db.empreendimento.create({ data: { nome: 'Obra da A', localizacao: 'Bragança Paulista' } })
  );
  const obra = await runComEmpresa(empresaB, () =>
    db.empreendimento.create({ data: { nome: 'Obra da B', localizacao: 'Atibaia' } })
  );
  obraDeB = obra.id;
});

afterAll(async () => {
  await runSemEscopoDeEmpresa(async () => {
    await db.empresa.deleteMany({ where: { slug: { in: [SLUG_A, SLUG_B] } } });
  });
  await db.$disconnect();
});

describe('isolamento entre empresas', () => {
  it('listagem só traz a obra da própria empresa', async () => {
    const daA = await runComEmpresa(empresaA, () => db.empreendimento.findMany());
    expect(daA).toHaveLength(1);
    expect(daA[0].nome).toBe('Obra da A');

    const daB = await runComEmpresa(empresaB, () => db.empreendimento.findMany());
    expect(daB).toHaveLength(1);
    expect(daB[0].nome).toBe('Obra da B');
  });

  it('buscar pelo ID EXATO da outra empresa não encontra nada', async () => {
    // O caso perigoso de verdade: o id vaza numa URL e o outro cliente tenta abrir.
    const achou = await runComEmpresa(empresaA, () =>
      db.empreendimento.findFirst({ where: { id: obraDeB } })
    );
    expect(achou).toBeNull();
  });

  it('contagem não enxerga a outra empresa', async () => {
    const total = await runComEmpresa(empresaA, () => db.empreendimento.count());
    expect(total).toBe(1);
  });

  it('não consegue ALTERAR registro da outra empresa', async () => {
    await runComEmpresa(empresaA, () =>
      db.empreendimento.updateMany({ where: { id: obraDeB }, data: { nome: 'INVADIDO' } })
    );
    const intacto = await runSemEscopoDeEmpresa(() =>
      db.empreendimento.findUnique({ where: { id: obraDeB } })
    );
    expect(intacto?.nome).toBe('Obra da B');
  });

  it('não consegue APAGAR registro da outra empresa', async () => {
    await runComEmpresa(empresaA, () =>
      db.empreendimento.deleteMany({ where: { id: obraDeB } })
    );
    const aindaExiste = await runSemEscopoDeEmpresa(() =>
      db.empreendimento.findUnique({ where: { id: obraDeB } })
    );
    expect(aindaExiste).not.toBeNull();
  });

  it('escrita forjando empresaId de outra empresa é sobrescrita pelo contexto', async () => {
    // Mesmo que a rota passe empresaId à mão (bug ou má-fé), o contexto vence.
    const criada = await runComEmpresa(empresaA, () =>
      db.empreendimento.create({
        data: { nome: 'Tentativa', localizacao: 'X', empresaId: empresaB } as any,
      })
    );
    expect(criada.empresaId).toBe(empresaA);
  });

  it('sem empresa no contexto, a operação é RECUSADA (falha fechada)', async () => {
    // Fora de request e sem runComEmpresa: não pode rodar "sem filtro".
    await expect(db.empreendimento.findMany()).rejects.toThrow(/sem empresa no contexto/i);
  });

  it('a empresa raiz (Masar) continua com os dados dela', async () => {
    const total = await runComEmpresa(EMPRESA_RAIZ_ID, () => db.empreendimento.count());
    expect(total).toBeGreaterThan(0);
  });
});
