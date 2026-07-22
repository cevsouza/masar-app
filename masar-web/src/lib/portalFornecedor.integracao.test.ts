import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { signSession } from '@/lib/auth';
import { runComEmpresa, runSemEscopoDeEmpresa } from '@/lib/tenant';
import { POST } from '@/app/api/suprimentos/cotacao/route';

/**
 * Qual credencial abre a entrada de cotações.
 *
 * A rota tem DOIS callers, e por muito tempo os dois entraram pela mesma porta
 * destrancada — bastava um `solicitacaoId`, sem sessão nenhuma:
 *
 *   - o FORNECEDOR, pelo link que recebeu (não tem conta no sistema);
 *   - o STAFF de suprimentos, lançando uma proposta que chegou por telefone.
 *
 * Agora cada um tem a sua: token do link para o primeiro, sessão com módulo
 * `suprimentos` para o segundo. Id e token são ambos UUID e igualmente difíceis
 * de adivinhar; o que muda é a superfície de VAZAMENTO — o id circula no painel
 * da construtora, em respostas de API e em log, enquanto o token só existe no
 * link mandado ao fornecedor.
 *
 * Os testes que importam: postar o id SEM sessão tem de ser recusado, e o id no
 * campo do token também.
 */

const SLUG = 'teste-portal-fornecedor';
let empresaId = '';
let insumoId = '';
let cookieStaff = '';
let solicitacaoAberta = { id: '', token: '' };
let solicitacaoFechada = { id: '', token: '' };

function requisicao(campos: Record<string, string>, cookie?: string): NextRequest {
  const form = new FormData();
  for (const [k, v] of Object.entries(campos)) form.append(k, v);
  return new NextRequest('http://localhost/api/suprimentos/cotacao', {
    method: 'POST',
    body: form,
    ...(cookie ? { headers: { cookie: `masar_session=${cookie}` } } : {}),
  });
}

beforeAll(async () => {
  await runSemEscopoDeEmpresa(async () => {
    await db.empresa.deleteMany({ where: { slug: SLUG } });
    const e = await db.empresa.create({ data: { nome: 'Construtora do Portal', slug: SLUG } });
    empresaId = e.id;
  });

  await runComEmpresa(empresaId, async () => {
    const insumo = await db.insumoPadrao.create({
      data: { nome: 'Cimento CP-II', unidadeMedida: 'SC', categoria: 'MATERIAL' },
    });
    insumoId = insumo.id;

    const aberta = await db.solicitacaoCompra.create({
      data: {
        insumoId,
        quantidadeSolicitada: 100,
        status: 'PENDENTE',
        dataNecessidade: new Date(Date.now() + 7 * 86_400_000),
        tokenCotacao: `${SLUG}-aberta-${Date.now()}`,
      },
    });
    solicitacaoAberta = { id: aberta.id, token: aberta.tokenCotacao };

    const fechada = await db.solicitacaoCompra.create({
      data: {
        insumoId,
        quantidadeSolicitada: 50,
        status: 'APROVADA',
        dataNecessidade: new Date(Date.now() + 7 * 86_400_000),
        tokenCotacao: `${SLUG}-fechada-${Date.now()}`,
      },
    });
    solicitacaoFechada = { id: fechada.id, token: fechada.tokenCotacao };
  });

  // Sessão real, assinada com o mesmo JWT_SECRET da aplicação — é o caller
  // interno de verdade, não um mock do guarda.
  cookieStaff = await signSession({
    userId: 'staff-teste',
    email: 'suprimentos@teste.local',
    nome: 'Compradora',
    role: 'FINANCEIRO',
    empresaId,
    modulos: ['suprimentos'],
  });
});

afterAll(async () => {
  await runSemEscopoDeEmpresa(async () => {
    await db.empresa.deleteMany({ where: { slug: SLUG } });
  });
});

const PROPOSTA = { fornecedorNome: 'Madeireira São José', valorUnitario: '42.50', prazoEntregaDias: '5' };

describe('POST /api/suprimentos/cotacao', () => {
  it('aceita a proposta quando vem o token do link', async () => {
    const res = await POST(requisicao({ token: solicitacaoAberta.token, ...PROPOSTA }));
    expect(res.status).toBe(200);

    const gravadas = await runComEmpresa(empresaId, () =>
      db.cotacaoFornecedor.findMany({ where: { solicitacaoId: solicitacaoAberta.id } }),
    );
    expect(gravadas).toHaveLength(1);
    expect(gravadas[0].valorUnitario).toBe(42.5);

    // A solicitação avança de PENDENTE para EM_COTACAO — e segue aceitando.
    const sol = await runComEmpresa(empresaId, () =>
      db.solicitacaoCompra.findUnique({ where: { id: solicitacaoAberta.id } }),
    );
    expect(sol?.status).toBe('EM_COTACAO');
  });

  it('RECUSA o id da solicitação no lugar do token — a regressão que motivou a troca', async () => {
    const res = await POST(requisicao({ token: solicitacaoAberta.id, ...PROPOSTA }));
    expect(res.status).toBe(404);

    // E nada foi gravado: continua só a proposta legítima do teste anterior.
    const gravadas = await runComEmpresa(empresaId, () =>
      db.cotacaoFornecedor.findMany({ where: { solicitacaoId: solicitacaoAberta.id } }),
    );
    expect(gravadas).toHaveLength(1);
  });

  it('recusa token inexistente', async () => {
    const res = await POST(requisicao({ token: 'nao-existe-em-lugar-nenhum', ...PROPOSTA }));
    expect(res.status).toBe(404);
  });

  it('recusa proposta em solicitação já encerrada, mesmo com o token certo', async () => {
    // O token é @unique e permanente: sem esta trava, um fornecedor que recebeu
    // o link meses atrás continuaria lançando preço em processo já decidido.
    const res = await POST(requisicao({ token: solicitacaoFechada.token, ...PROPOSTA }));
    expect(res.status).toBe(409);
  });

  it('recusa envio sem credencial nenhuma', async () => {
    const res = await POST(requisicao({ ...PROPOSTA }));
    expect(res.status).toBe(400);
  });
});

describe('POST /api/suprimentos/cotacao — lançamento manual do staff', () => {
  it('RECUSA o id sem sessão — o caminho que estava aberto', async () => {
    const res = await POST(requisicao({ solicitacaoId: solicitacaoAberta.id, ...PROPOSTA }));
    expect(res.status).toBe(401);
  });

  it('recusa sessão sem o módulo de suprimentos', async () => {
    const semSuprimentos = await signSession({
      userId: 'staff-teste-2',
      email: 'vendas@teste.local',
      nome: 'Corretor',
      role: 'COMERCIAL',
      empresaId,
      modulos: ['comercial'],
    });
    const res = await POST(
      requisicao({ solicitacaoId: solicitacaoAberta.id, ...PROPOSTA }, semSuprimentos),
    );
    expect(res.status).toBe(403);
  });

  it('aceita o id quando vem sessão de suprimentos', async () => {
    const res = await POST(
      requisicao(
        { solicitacaoId: solicitacaoAberta.id, ...PROPOSTA, fornecedorNome: 'Proposta por telefone' },
        cookieStaff,
      ),
    );
    expect(res.status).toBe(200);

    const gravadas = await runComEmpresa(empresaId, () =>
      db.cotacaoFornecedor.findMany({ where: { solicitacaoId: solicitacaoAberta.id } }),
    );
    expect(gravadas.map((c) => c.fornecedorNome)).toContain('Proposta por telefone');
  });
});
