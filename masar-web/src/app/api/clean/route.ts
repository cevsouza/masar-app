import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // 0. Trava de segurança: só ADMIN autenticado pode limpar o banco.
    // (Antes este endpoint apagava TODO o banco sem nenhuma verificação de sessão.)
    const sessionToken = request.cookies.get('masar_session')?.value;
    const session = sessionToken ? await verifySession(sessionToken) : null;
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
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

    // 2. Limpar outros usuários cadastrados, preservando apenas as credenciais administrativas
    await db.user.deleteMany({
      where: {
        NOT: {
          email: {
            in: ['cevsouza@hotmail.com', 'cevsouza@hotmail']
          }
        }
      }
    });

    return new Response(
      `<html>
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
            <p>As contas administrativas de <strong>cevsouza@hotmail.com</strong> e <strong>cevsouza@hotmail</strong> foram <strong>preservadas</strong>.</p>
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
