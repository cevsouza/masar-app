import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/auth';
import { logMutation } from '@/lib/audit';
import { apurarRET, descricaoRET } from '@/lib/ret';

// POST: gera a guia de RET de uma competência como conta a pagar (DESPESA IMPOSTOS).
// Valor = RET pendente do mês (devido − já gerado). Vencimento = dia 20 do mês seguinte.
export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('masar_session')?.value;
    const session = sessionToken ? await verifySession(sessionToken) : null;
    if (!session || !['ADMIN', 'FINANCEIRO'].includes(session.role || '')) {
      return NextResponse.json({ error: 'Acesso negado: apenas ADMIN ou FINANCEIRO geram guias.' }, { status: 403 });
    }

    const { empreendimentoId, competencia } = await request.json(); // competencia = 'YYYY-MM'
    if (!empreendimentoId || !competencia || !/^\d{4}-\d{2}$/.test(competencia)) {
      return NextResponse.json({ error: 'empreendimentoId e competencia (YYYY-MM) são obrigatórios.' }, { status: 400 });
    }

    const apuracao = await apurarRET(empreendimentoId);
    if (!apuracao) {
      return NextResponse.json({ error: 'Empreendimento não encontrado' }, { status: 404 });
    }

    const mes = apuracao.meses.find((m) => m.competencia === competencia);
    if (!mes || mes.pendente <= 0) {
      return NextResponse.json({ error: 'Não há RET pendente para esta competência.' }, { status: 400 });
    }

    // Vencimento: dia 20 do mês seguinte à competência.
    const [ano, m] = competencia.split('-').map(Number);
    const dataVencimento = new Date(ano, m, 20); // m (1-based) => próximo mês em Date (0-based)

    const conta = await db.transacaoFinanceira.create({
      data: {
        descricao: descricaoRET(competencia, apuracao.empreendimentoNome),
        valor: mes.pendente,
        dataVencimento,
        natureza: 'DESPESA',
        status: 'PENDENTE',
        categoria: 'IMPOSTOS',
        empreendimentoId,
        quantidade: 1,
      },
    });

    await logMutation({
      usuarioId: session.userId,
      usuarioNome: session.nome,
      acao: 'GERAR_GUIA_RET',
      tabela: 'TransacaoFinanceira',
      registroId: conta.id,
      valoresNovos: { competencia, valor: mes.pendente, aliquota: apuracao.aliquota },
    });

    return NextResponse.json({ success: true, contaPagarId: conta.id, valor: mes.pendente, dataVencimento });
  } catch (error: any) {
    console.error('[Fiscal] Erro ao gerar guia RET:', error);
    return NextResponse.json({ error: 'Erro interno do servidor', message: error.message }, { status: 500 });
  }
}
