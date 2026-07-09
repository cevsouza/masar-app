import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/auth';
import { logMutation } from '@/lib/audit';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: empreendimentoId } = await params;
    const sessionToken = request.cookies.get('masar_session')?.value;
    const session = sessionToken ? await verifySession(sessionToken) : null;
    if (!session || !['ADMIN', 'FINANCEIRO', 'ENGENHARIA'].includes(session.role || '')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const emp = await db.empreendimento.findUnique({
      where: { id: empreendimentoId },
      include: {
        casas: true,
        custosGlobais: true
      }
    });

    if (!emp) {
      return NextResponse.json({ error: 'Empreendimento não encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const { precoVendaProjetado, itensOrcamento } = body;

    const vgvUnitario = parseFloat(precoVendaProjetado || '0');
    const itemsList = Array.isArray(itensOrcamento) ? itensOrcamento : [];

    if (vgvUnitario <= 0 || itemsList.length === 0) {
      return NextResponse.json({ error: 'Por favor, informe um preço de venda válido e pelo menos um item de orçamento.' }, { status: 400 });
    }

    // Calcular o custo padrão de uma única casa
    const custoCasaUnitario = itemsList.reduce((acc, item) => {
      const q = parseFloat(item.quantidadePlanejada || '0');
      const c = parseFloat(item.custoUnitarioPrevisto || '0');
      return acc + (q * c);
    }, 0);

    const totalCasas = emp.casas.length;
    const totalOrcamentoCasas = totalCasas * custoCasaUnitario;

    // Calcular o orçamento total do empreendimento (Custos Globais Orçados + Custos Diretos de Obras das Casas)
    const totalCustosGlobaisOrcados = emp.custosGlobais
      .filter(cg => !cg.realizado)
      .reduce((acc, cg) => acc + cg.valor, 0);

    const orcamentoTotalEmpreendimento = totalOrcamentoCasas + totalCustosGlobaisOrcados;

    // Executar a replicação de orçamento em uma transação ACID
    await db.$transaction(async (tx) => {
      // 1. Atualizar o orçamento e dados gerais no Empreendimento
      await tx.empreendimento.update({
        where: { id: empreendimentoId },
        data: {
          orcamento: orcamentoTotalEmpreendimento
        }
      });

      // 2. Para cada casa do projeto, atualizar o valor projetado e seu orçamento de itens
      for (const casa of emp.casas) {
        // Atualizar o preço de venda projetado da casa
        await tx.casa.update({
          where: { id: casa.id },
          data: {
            valorVendaProjetado: vgvUnitario
          }
        });

        // Apagar orçamento prévio da casa (e seus itens filhos por cascade)
        await tx.orcamentoCasa.deleteMany({
          where: { casaId: casa.id }
        });

        // Criar o novo Orçamento da Casa
        const novoOrcamento = await tx.orcamentoCasa.create({
          data: {
            casaId: casa.id
          }
        });

        // Criar os itens filhos
        if (itemsList.length > 0) {
          await tx.itemOrcamento.createMany({
            data: itemsList.map(item => ({
              orcamentoCasaId: novoOrcamento.id,
              insumoId: item.insumoId,
              quantidadePlanejada: parseFloat(item.quantidadePlanejada),
              custoUnitarioPrevisto: parseFloat(item.custoUnitarioPrevisto)
            }))
          });
        }
      }
    });

    await logMutation({
      usuarioId: session.userId,
      usuarioNome: session.nome,
      acao: 'CREATE_FEASIBILITY_STUDY',
      tabela: 'Empreendimento',
      registroId: empreendimentoId,
      valoresNovos: {
        precoVendaProjetado: vgvUnitario,
        custoUnitarioCasa: custoCasaUnitario,
        totalCasas,
        orcamentoTotalCalculado: orcamentoTotalEmpreendimento
      }
    });

    return NextResponse.json({
      success: true,
      orcamentoTotalCalculado: orcamentoTotalEmpreendimento,
      custoUnitarioCasa: custoCasaUnitario,
      totalReplicado: totalCasas
    });
  } catch (error: any) {
    console.error('Erro ao gerar estudo de viabilidade:', error);
    return NextResponse.json({ error: 'Erro interno no servidor', message: error.message }, { status: 500 });
  }
}
