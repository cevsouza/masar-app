import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logMutation } from '@/lib/audit';
import { verifySession } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sessionToken = request.cookies.get('masar_session')?.value;
    const session = sessionToken ? await verifySession(sessionToken) : null;
    if (!session || !['ADMIN', 'FINANCEIRO'].includes(session.role || '')) {
      return NextResponse.json({ error: 'Acesso negado: Apenas administradores ou financeiro podem registrar custos globais.' }, { status: 403 });
    }

    const project = await db.empreendimento.findUnique({
      where: { id }
    });

    if (!project) {
      return NextResponse.json({ error: 'Empreendimento não encontrado.' }, { status: 404 });
    }

    const body = await request.json();
    const { descricao, tipo, valor, data, realizado } = body;

    if (!descricao || !tipo || !valor) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes: descricao, tipo, valor.' }, { status: 400 });
    }

    // Map TipoCustoGlobal enum to CategoriaFinanceira
    let categoria: 'TERRENO' | 'PROJETOS' | 'MATERIAL' = 'MATERIAL';
    if (tipo === 'TERRENO') categoria = 'TERRENO';
    else if (tipo === 'PROJETOS') categoria = 'PROJETOS';

    const transacao = await db.transacaoFinanceira.create({
      data: {
        descricao: `Custo Global [${tipo}] - ${descricao}`,
        valor: parseFloat(valor),
        dataVencimento: data ? new Date(data) : new Date(),
        dataPagamento: realizado === true ? (data ? new Date(data) : new Date()) : null,
        natureza: 'DESPESA',
        status: realizado === true ? 'PAGO' : 'PENDENTE',
        categoria,
        empreendimentoId: id,
        casaId: null
      }
    });

    await logMutation({
      usuarioId: session.userId,
      usuarioNome: session.nome,
      acao: 'CREATE',
      tabela: 'TransacaoFinanceira',
      registroId: transacao.id,
      valoresAntigos: null,
      valoresNovos: transacao
    });

    // Map newCost compatibility for client response
    const legacyCost = {
      id: transacao.id,
      descricao: transacao.descricao,
      tipo,
      valor: transacao.valor,
      realizado: transacao.status === 'PAGO',
      data: transacao.dataVencimento,
      empreendimentoId: transacao.empreendimentoId
    };

    return NextResponse.json(legacyCost);
  } catch (error: any) {
    console.error('Erro ao adicionar custo global:', error);
    return NextResponse.json({ error: 'Erro interno do servidor', message: error.message }, { status: 500 });
  }
}
