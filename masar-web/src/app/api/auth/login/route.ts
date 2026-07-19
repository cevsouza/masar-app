import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword, needsRehash, hashPassword, signSession } from '@/lib/auth';
import { computarModulosUsuario } from '@/lib/permissoesDb';
import { runComEmpresa, runSemEscopoDeEmpresa } from '@/lib/tenant';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Preencha todos os campos' }, { status: 400 });
    }

    const emailLower = email.toLowerCase().trim();
    const empresaEscolhida: string | undefined = body.empresaId;

    // O login é o ÚNICO ponto que consulta sem escopo de empresa: ainda não há
    // sessão, então não há como saber o tenant antes de achar o usuário.
    //
    // O MESMO E-MAIL PODE EXISTIR EM EMPRESAS DIFERENTES — e existe na vida
    // real: engenheiro que atende duas construtoras, ou um contato@ genérico.
    // Por isso buscamos TODOS os candidatos, não o primeiro.
    //
    // Antes daqui um findFirst pegava um registro qualquer. O resultado não era
    // vazamento, era IMPEDIMENTO DE ACESSO: a busca sempre devolvia a conta de
    // um dos clientes, a senha do outro nunca conferia, e a segunda pessoa via
    // "senha incorreta" para sempre — um chamado impossível de diagnosticar.
    const host = request.headers.get('host')?.split(':')[0] ?? '';
    const empresaDoDominio = host
      ? await runSemEscopoDeEmpresa(() =>
          db.empresa.findFirst({ where: { dominio: host, ativa: true }, select: { id: true } })
        )
      : null;

    // Filtro por domínio (instância white-label) ou pela empresa que o usuário
    // escolheu na segunda etapa. Sem nenhum dos dois, todos os candidatos.
    const empresaFiltro = empresaDoDominio?.id ?? empresaEscolhida;

    const candidatos = await runSemEscopoDeEmpresa(() =>
      db.user.findMany({
        where: { email: emailLower, ...(empresaFiltro ? { empresaId: empresaFiltro } : {}) },
      })
    );

    if (candidatos.length === 0) {
      return NextResponse.json({ error: 'E-mail ou senha incorretos' }, { status: 400 });
    }

    // NÃO reintroduzir auto-promoção por e-mail aqui.
    // Havia um bloco que promovia a ADMIN qualquer conta com um e-mail fixo do
    // fornecedor — e rodava ANTES da verificação de senha. Numa instância de
    // cliente isso é um superusuário do fornecedor dentro do sistema do cliente.
    // A role vem do banco; o primeiro admin é criado por scripts/provisionar-cliente.mjs.

    // A senha é conferida contra CADA candidato. Isso é o que resolve a
    // ambiguidade sem contar nada a quem não sabe a senha: e-mails iguais com
    // senhas diferentes se separam sozinhos aqui.
    const autenticados: typeof candidatos = [];
    for (const c of candidatos) {
      if (await verifyPassword(password, c.password)) autenticados.push(c);
    }

    if (autenticados.length === 0) {
      return NextResponse.json({ error: 'E-mail ou senha incorretos' }, { status: 400 });
    }

    // Mesmo e-mail E mesma senha em mais de uma empresa. Raro, mas aqui não há
    // como adivinhar — e só agora é seguro mostrar os nomes, porque quem chegou
    // até este ponto provou saber a senha de todas elas.
    if (autenticados.length > 1) {
      const empresas = await runSemEscopoDeEmpresa(() =>
        db.empresa.findMany({
          where: { id: { in: autenticados.map((a) => a.empresaId) }, ativa: true },
          select: { id: true, nome: true },
          orderBy: { nome: 'asc' },
        })
      );
      return NextResponse.json(
        { escolhaEmpresa: true, empresas },
        { status: 409 }
      );
    }

    const user = autenticados[0];

    // Migração transparente: regrava hashes antigos/fracos no formato forte.
    // Licenciamento: empresa desativada (contrato encerrado/suspenso) não entra.
    const empresa = await runSemEscopoDeEmpresa(() =>
      db.empresa.findUnique({
        where: { id: user.empresaId },
        select: { ativa: true, dataExpiracao: true },
      })
    );
    if (!empresa?.ativa) {
      return NextResponse.json({ error: 'Acesso suspenso. Fale com o administrador.' }, { status: 403 });
    }
    if (empresa.dataExpiracao && empresa.dataExpiracao < new Date()) {
      return NextResponse.json({ error: 'Licença expirada. Fale com o administrador.' }, { status: 403 });
    }

    // Daqui em diante já sabemos o tenant — tudo roda dentro do escopo dele.
    const modulos = await runComEmpresa(user.empresaId, async () => {
      if (needsRehash(user.password)) {
        try {
          const upgraded = await hashPassword(password);
          await db.user.update({ where: { id: user.id }, data: { password: upgraded } });
        } catch (rehashErr) {
          console.error('Falha ao migrar hash de senha (login não bloqueado):', rehashErr);
        }
      }
      // Módulos que o papel pode acessar (Fase 5.2) — gravados no token para o
      // middleware (edge) barrar por módulo sem tocar no banco.
      return computarModulosUsuario(user.role);
    });

    // Create session token
    const token = await signSession({
      userId: user.id,
      email: user.email,
      nome: user.nome,
      role: user.role,
      empresaId: user.empresaId,
      modulos,
    });

    // Save token in cookie
    const cookieStore = await cookies();
    cookieStore.set('masar_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return NextResponse.json({
      id: user.id,
      nome: user.nome,
      email: user.email,
    });
  } catch (error) {
    console.error('Erro no login:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
