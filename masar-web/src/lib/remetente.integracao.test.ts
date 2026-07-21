import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { db } from '@/lib/db';
import { runComEmpresa, runSemEscopoDeEmpresa } from '@/lib/tenant';
import { sendEmail } from '@/lib/resend';

/**
 * O CAMINHO PADRÃO, contra o banco de verdade.
 *
 * O teste puro cobre a regra de decisão; este cobre o que de fato estava
 * quebrado: os quatro pontos de envio chamam `sendEmail` SEM `from`, e por isso
 * o `emailRemetente` de cada cliente nunca teve efeito. Testar só a função de
 * decisão deixaria o defeito original passar de novo — ele não estava na regra,
 * estava em ninguém chamá-la.
 *
 * Roda sem RESEND_API_KEY (modo mock), então nenhum e-mail sai; o remetente
 * escolhido aparece no log, que é o que inspecionamos.
 */

const SLUG_SEM = 'teste-remetente-sem';
const SLUG_COM = 'teste-remetente-com';

let semProprio = '';
let comProprio = '';

beforeAll(async () => {
  await runSemEscopoDeEmpresa(async () => {
    await db.empresa.deleteMany({ where: { slug: { in: [SLUG_SEM, SLUG_COM] } } });
    const a = await db.empresa.create({
      data: { nome: 'Construtora Sem Domínio', slug: SLUG_SEM },
    });
    const b = await db.empresa.create({
      data: {
        nome: 'Construtora Com Domínio',
        slug: SLUG_COM,
        emailRemetente: 'contato@dominionaoverificado.com.br',
      },
    });
    semProprio = a.id;
    comProprio = b.id;
  });
});

afterAll(async () => {
  await runSemEscopoDeEmpresa(async () => {
    await db.empresa.deleteMany({ where: { slug: { in: [SLUG_SEM, SLUG_COM] } } });
  });
});

/** Captura as linhas do log do modo mock e devolve a que descreve o remetente. */
async function linhaDeRemetente(empresaId: string): Promise<string> {
  const linhas: string[] = [];
  const spy = vi.spyOn(console, 'log').mockImplementation((...a) => {
    linhas.push(a.join(' '));
  });
  try {
    await runComEmpresa(empresaId, () =>
      sendEmail({ to: 'destino@exemplo.local', subject: 'teste', html: '<p>x</p>' }),
    );
  } finally {
    spy.mockRestore();
  }
  return linhas.find((l) => l.startsWith('De:')) ?? '';
}

describe('remetente resolvido pelo contexto do tenant', () => {
  it('cliente sem endereço próprio sai com o NOME dele no endereço da plataforma', async () => {
    const de = await linhaDeRemetente(semProprio);
    expect(de).toContain('Construtora Sem Domínio <');
    // O defeito original: saía assinado com a marca da instância.
    expect(de).not.toMatch(/^De: (Masar|Novastrus) </);
  });

  it('endereço próprio não verificado vira Responder para, sem trocar o From', async () => {
    const de = await linhaDeRemetente(comProprio);
    expect(de).toContain('Construtora Com Domínio <');
    expect(de).toContain('responder para contato@dominionaoverificado.com.br');
    // Enviar por um domínio não verificado não entrega — e o e-mail diário é o
    // produto vendido.
    expect(de).not.toContain('De: Construtora Com Domínio <contato@dominionaoverificado');
  });

  it('fora de contexto de empresa, envia pelo endereço da instância em vez de falhar', async () => {
    const linhas: string[] = [];
    const spy = vi.spyOn(console, 'log').mockImplementation((...a) => linhas.push(a.join(' ')));
    try {
      const r = await sendEmail({ to: 'x@exemplo.local', subject: 't', html: '<p>x</p>' });
      expect(r.success).toBe(true);
    } finally {
      spy.mockRestore();
    }
    expect(linhas.find((l) => l.startsWith('De:'))).toBeTruthy();
  });
});
