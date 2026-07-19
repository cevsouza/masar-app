import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/auth';

// Este endpoint APAGA o banco inteiro. Três travas, todas obrigatórias:
//   1. É POST — era GET, e um GET destrutivo dispara por link, histórico ou prefetch
//      do navegador, sem o usuário clicar em nada.
//   2. Exige CLEAN_SECRET no ambiente E no corpo. Fail-closed: instância de cliente
//      simplesmente NÃO define a env, e aí a rota não existe na prática.
//   3. Exige sessão ADMIN.
// A conta preservada é a de QUEM EXECUTOU (antes eram dois e-mails fixos do fornecedor).
export async function POST(request: NextRequest) {
  try {
    const CLEAN_SECRET = process.env.CLEAN_SECRET;
    if (!CLEAN_SECRET) {
      return NextResponse.json(
        { error: 'Rota desabilitada nesta instância (CLEAN_SECRET não definido).' },
        { status: 404 }
      );
    }

    const sessionToken = request.cookies.get('masar_session')?.value;
    const session = sessionToken ? await verifySession(sessionToken) : null;
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    if (body?.secret !== CLEAN_SECRET) {
      return NextResponse.json({ error: 'Segredo inválido' }, { status: 403 });
    }

    // 1. Limpar todas as tabelas de dados na ordem de dependência para evitar violações de FK
    await db.logAuditoria.deleteMany();
    await db.documentoAnexo.deleteMany();
    await db.notificacao.deleteMany();

    await db.movimentacaoSocio.deleteMany();
    await db.socio.deleteMany();
    await db.contaBancaria.deleteMany();
    await db.transacaoFinanceira.deleteMany();
    await db.contratoVenda.deleteMany();
    await db.corretor.deleteMany();

    await db.diarioDeObra.deleteMany();
    await db.infraestruturaUnidade.deleteMany();
    await db.itemOrcamento.deleteMany();
    await db.orcamentoCasa.deleteMany();
    await db.insumoPadrao.deleteMany();
    await db.medicaoCaixa.deleteMany();
    await db.casa.deleteMany();
    await db.cliente.deleteMany();
    await db.marcoBurocratico.deleteMany();
    await db.empreendimento.deleteMany();

    // 2. Limpar os demais usuários, preservando APENAS quem executou a limpeza
    //    (evita ficar sem nenhum admin e não deixa e-mail de fornecedor no código).
    await db.user.deleteMany({
      where: { NOT: { id: session.userId } }
    });

    return new Response(
      `<!-- resposta HTML mantida por compatibilidade com o uso manual --><html>
        <head>
          <title>Banco de Dados Limpo</title>
          <style>
            body { font-family: sans-serif; background-color: #0f172a; color: #f1f5f9; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background-color: #1e293b; border: 1px solid #334155; padding: 2.5rem; border-radius: 1rem; text-align: center; max-width: 450px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3); }
            h1 { color: #10b981; font-size: 1.5rem; margin-top: 0; }
            p { font-size: 0.9rem; color: #94a3b8; line-height: 1.6; }
            a { display: inline-block; margin-top: 1.5rem; background-color: #3b82f6; color: white; text-decoration: none; padding: 0.6rem 1.2rem; border-radius: 0.5rem; font-size: 0.85rem; font-weight: bold; transition: background-color 0.2s; }
            a:hover { background-color: #2563eb; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>✓ Banco de Dados Limpo!</h1>
            <p>Todos os dados fictícios de teste (empreendimentos, orçamentos, vendas, movimentações financeiras e corretores) foram deletados com sucesso.</p>
            <p>A sua conta de administrador foi <strong>preservada</strong>. Todas as demais foram removidas.</p>
            <a href="/">Voltar ao Sistema</a>
          </div>
        </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  } catch (error: any) {
    console.error('Erro ao limpar banco de dados:', error);
    return NextResponse.json({ error: 'Erro interno do servidor', message: error.message }, { status: 500 });
  }
}
