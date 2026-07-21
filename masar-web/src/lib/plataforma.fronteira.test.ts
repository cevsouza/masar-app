import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { db } from '@/lib/db';
import { runSemEscopoDeEmpresa } from '@/lib/tenant';
import { signSession } from '@/lib/auth';

/**
 * TESTE DA FRONTEIRA DO CONTROL PLANE.
 *
 * O teste de vazamento entre clientes (tenant.isolamento) prova que cliente A
 * não vê o dado de B. Este aqui prova a OUTRA fronteira, que é onde o cockpit
 * de administração poderia estragar tudo:
 *
 *   1. um ADMIN de construtora não vira administrador da plataforma;
 *   2. desativar um admin de plataforma vale na hora, não quando o token expira;
 *   3. o conteúdo de um cliente só é acessível com concessão VIVA — sem ela,
 *      expirada ou revogada, a operação é recusada;
 *   4. o panorama agregado devolve contagem, nunca conteúdo.
 *
 * Sem estes testes, "o cockpit respeita o isolamento" é uma frase de documento.
 */

const SLUG = 'teste-plataforma-tenant';
const EMAIL_ADMIN = 'teste-admin-plataforma@exemplo.local';

let empresaId = '';
let adminId = '';
let tokenPlataforma = '';
let tokenTenantAdmin = '';

/** Troca o cookie que o next/headers devolve, para simular quem está pedindo. */
let cookieAtual: Record<string, string> = {};
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (nome: string) =>
      cookieAtual[nome] ? { name: nome, value: cookieAtual[nome] } : undefined,
  }),
}));

beforeAll(async () => {
  await runSemEscopoDeEmpresa(async () => {
    await db.empresa.deleteMany({ where: { slug: SLUG } });
    await db.adminPlataforma.deleteMany({ where: { email: EMAIL_ADMIN } });

    const empresa = await db.empresa.create({
      data: { nome: 'Construtora do Teste', slug: SLUG },
    });
    empresaId = empresa.id;

    const admin = await db.adminPlataforma.create({
      data: { nome: 'Admin Teste', email: EMAIL_ADMIN, password: 'nao-usado-aqui' },
    });
    adminId = admin.id;
  });

  const { assinarSessaoPlataforma } = await import('@/lib/plataforma');
  tokenPlataforma = await assinarSessaoPlataforma({
    id: adminId,
    nome: 'Admin Teste',
    email: EMAIL_ADMIN,
  });

  // Token EXATAMENTE como o login do staff emite para um ADMIN de construtora.
  tokenTenantAdmin = await signSession({
    userId: 'usuario-qualquer',
    nome: 'Dono da Construtora',
    role: 'ADMIN',
    empresaId,
  });
});

afterAll(async () => {
  await runSemEscopoDeEmpresa(async () => {
    await db.acessoAssistido.deleteMany({ where: { adminId } });
    await db.adminPlataforma.deleteMany({ where: { email: EMAIL_ADMIN } });
    await db.empresa.deleteMany({ where: { slug: SLUG } });
  });
});

describe('fronteira do control plane', () => {
  it('ADMIN de construtora NÃO vira administrador da plataforma', async () => {
    const { adminPlataformaAtual } = await import('@/lib/plataforma');

    // Token real de staff, com assinatura válida, posto no cookie do control
    // plane. Barrado porque não carrega adminId.
    cookieAtual = { masar_admin_session: tokenTenantAdmin };
    expect(await adminPlataformaAtual()).toBeNull();
  });

  it('token com adminId VÁLIDO mas sem o marcador de tipo é recusado', async () => {
    const { adminPlataformaAtual } = await import('@/lib/plataforma');

    // Este é o teste que realmente exercita o discriminador de tipo. O anterior
    // não exercitava: um token de staff nem tem `adminId`, então já morria na
    // checagem seguinte. Aqui o token é o pior caso possível — assinatura
    // legítima, adminId que EXISTE na tabela, tudo certo menos o `tipo`.
    const tokenSemTipo = await signSession({
      adminId,
      nome: 'Admin Teste',
      email: EMAIL_ADMIN,
    });

    cookieAtual = { masar_admin_session: tokenSemTipo };
    expect(await adminPlataformaAtual()).toBeNull();
  });

  it('token com adminId válido e tipo FORJADO de outra origem é recusado', async () => {
    const { adminPlataformaAtual } = await import('@/lib/plataforma');

    const tokenTipoErrado = await signSession({
      tipo: 'staff',
      adminId,
      nome: 'Admin Teste',
      email: EMAIL_ADMIN,
    });

    cookieAtual = { masar_admin_session: tokenTipoErrado };
    expect(await adminPlataformaAtual()).toBeNull();
  });

  it('sem cookie nenhum, não há admin de plataforma', async () => {
    const { adminPlataformaAtual } = await import('@/lib/plataforma');
    cookieAtual = {};
    expect(await adminPlataformaAtual()).toBeNull();
  });

  it('token de plataforma válido autentica', async () => {
    const { adminPlataformaAtual } = await import('@/lib/plataforma');
    cookieAtual = { masar_admin_session: tokenPlataforma };
    const sessao = await adminPlataformaAtual();
    expect(sessao?.adminId).toBe(adminId);
  });

  it('desativar o admin corta o acesso IMEDIATAMENTE, sem esperar o token expirar', async () => {
    const { adminPlataformaAtual } = await import('@/lib/plataforma');
    cookieAtual = { masar_admin_session: tokenPlataforma };

    await runSemEscopoDeEmpresa(() =>
      db.adminPlataforma.update({ where: { id: adminId }, data: { ativo: false } })
    );
    expect(await adminPlataformaAtual()).toBeNull();

    await runSemEscopoDeEmpresa(() =>
      db.adminPlataforma.update({ where: { id: adminId }, data: { ativo: true } })
    );
    expect((await adminPlataformaAtual())?.adminId).toBe(adminId);
  });

  it('SEM concessão, o conteúdo do cliente é recusado', async () => {
    const { runComAcessoAssistido } = await import('@/lib/plataforma');
    cookieAtual = { masar_admin_session: tokenPlataforma };

    await expect(
      runComAcessoAssistido(empresaId, () => db.empreendimento.count())
    ).rejects.toThrow(/sem acesso assistido vigente/i);
  });

  it('concessão EXPIRADA não serve', async () => {
    const { runComAcessoAssistido } = await import('@/lib/plataforma');
    cookieAtual = { masar_admin_session: tokenPlataforma };

    await runSemEscopoDeEmpresa(() =>
      db.acessoAssistido.create({
        data: {
          adminId,
          empresaId,
          motivo: 'investigar erro relatado pelo cliente',
          expiraEm: new Date(Date.now() - 60_000), // venceu há um minuto
        },
      })
    );

    await expect(
      runComAcessoAssistido(empresaId, () => db.empreendimento.count())
    ).rejects.toThrow(/sem acesso assistido vigente/i);
  });

  it('concessão REVOGADA não serve', async () => {
    const { runComAcessoAssistido } = await import('@/lib/plataforma');
    cookieAtual = { masar_admin_session: tokenPlataforma };

    await runSemEscopoDeEmpresa(() =>
      db.acessoAssistido.create({
        data: {
          adminId,
          empresaId,
          motivo: 'acesso revogado logo em seguida',
          expiraEm: new Date(Date.now() + 3_600_000),
          revogadoEm: new Date(),
        },
      })
    );

    await expect(
      runComAcessoAssistido(empresaId, () => db.empreendimento.count())
    ).rejects.toThrow(/sem acesso assistido vigente/i);
  });

  it('com concessão viva, o acesso funciona E fica registrado no log DO CLIENTE', async () => {
    const { concederAcessoAssistido, runComAcessoAssistido } = await import('@/lib/plataforma');
    cookieAtual = { masar_admin_session: tokenPlataforma };

    const concessao = await concederAcessoAssistido(
      empresaId,
      'cliente relatou medição travada indevidamente',
      30
    );
    expect(concessao.expiraEm.getTime()).toBeGreaterThan(Date.now());

    // Agora o conteúdo abre.
    await expect(
      runComAcessoAssistido(empresaId, () => db.empreendimento.count())
    ).resolves.toBeTypeOf('number');

    // E o cliente consegue ver que houve acesso, no log dele.
    const registros = await runSemEscopoDeEmpresa(() =>
      db.logAuditoria.findMany({
        where: { empresaId, acao: 'ACESSO_ASSISTIDO_CONCEDIDO' },
      })
    );
    expect(registros.length).toBeGreaterThan(0);
    expect(registros[0].usuarioNome).toContain('Suporte da plataforma');
  });

  it('motivo vazio ou curto demais é recusado', async () => {
    const { concederAcessoAssistido } = await import('@/lib/plataforma');
    cookieAtual = { masar_admin_session: tokenPlataforma };

    await expect(concederAcessoAssistido(empresaId, '   ')).rejects.toThrow(/motivo/i);
    await expect(concederAcessoAssistido(empresaId, 'erro')).rejects.toThrow(/motivo/i);
  });

  it('o panorama devolve CONTAGEM, nunca conteúdo do cliente', async () => {
    const { panoramaInstancias } = await import('@/lib/plataforma');
    cookieAtual = { masar_admin_session: tokenPlataforma };

    const panorama = await panoramaInstancias();
    const alvo = panorama.find((t) => t.empresaId === empresaId);
    expect(alvo).toBeDefined();

    // Lista FECHADA de propósito: se alguém acrescentar um campo ao panorama,
    // este teste quebra e obriga a decidir se aquilo é metadado ou conteúdo.
    // Já cumpriu esse papel duas vezes: quando `ultimaAtividade` foi adicionada
    // e quando entraram `limiteUnidades`/`percentualLicenca` — ambos aprovados
    // como metadado de LICENÇA (um teto e uma razão entre contagens; nenhum
    // dado de obra, cliente ou financeiro do tenant atravessa a fronteira).
    const campos = Object.keys(alvo!).sort();
    expect(campos).toEqual(
      [
        'ativa', 'dataExpiracao', 'empreendimentos', 'empresaId',
        'limiteUnidades', 'nome', 'percentualLicenca', 'plano', 'slug',
        'ultimaAtividade', 'unidades', 'usuarios',
      ].sort()
    );
    expect(typeof alvo!.unidades).toBe('number');
    // Números ou ausência — nunca objeto com detalhe do tenant.
    expect(alvo!.limiteUnidades === null || typeof alvo!.limiteUnidades === 'number').toBe(true);
    expect(alvo!.percentualLicenca === null || typeof alvo!.percentualLicenca === 'number').toBe(true);

    // `ultimaAtividade` é um TIMESTAMP — diz QUE houve atividade, nunca QUAL.
    // Se um dia virar objeto com ação/tabela/usuário, deixou de ser metadado.
    expect(
      alvo!.ultimaAtividade === null || alvo!.ultimaAtividade instanceof Date
    ).toBe(true);
  });

  it('o panorama exige admin de plataforma', async () => {
    const { panoramaInstancias } = await import('@/lib/plataforma');
    cookieAtual = { masar_admin_session: tokenTenantAdmin }; // token de construtora
    await expect(panoramaInstancias()).rejects.toThrow(/administrador da plataforma/i);
  });
});
