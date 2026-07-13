import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logMutation } from '@/lib/audit';
import { logger } from '@/lib/logger';
import { verifySession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const traceId = crypto.randomUUID();
    const body = await request.json();
    const { cotacaoId, excepcionalAprovado = false } = body;

    // 1. Validar autenticação
    const sessionToken = request.cookies.get('masar_session')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const session = await verifySession(sessionToken);
    if (!session || !['ADMIN', 'FINANCEIRO'].includes(session.role)) {
      return NextResponse.json({ error: 'Permissão insuficiente. Apenas ADMIN ou FINANCEIRO aprovam compras.' }, { status: 403 });
    }

    if (!cotacaoId) {
      return NextResponse.json({ error: 'Parâmetro cotacaoId é obrigatório.' }, { status: 400 });
    }

    // 2. Carregar cotação e solicitação de origem
    const cotacao = await db.cotacaoFornecedor.findUnique({
      where: { id: cotacaoId },
      include: {
        solicitacao: {
          include: {
            insumo: true
          }
        }
      }
    });

    if (!cotacao) {
      return NextResponse.json({ error: 'Cotação não encontrada.' }, { status: 404 });
    }

    const solicitacao = cotacao.solicitacao;

    // Se a solicitação estiver atrelada a uma casa, validar contra o orçamento
    if (solicitacao.casaId) {
      const orcamento = await db.orcamentoCasa.findUnique({
        where: { casaId: solicitacao.casaId },
        include: {
          itens: true
        }
      });

      if (orcamento) {
        // Localizar item do insumo no orçamento
        const itemOrcado = orcamento.itens.find(it => it.insumoId === solicitacao.insumoId);
        
        if (itemOrcado) {
          const valorLimiteInsumo = itemOrcado.custoUnitarioPrevisto * 1.05; // 5% de tolerância
          
          // Verificar estouro de preço
          const precoEstourado = cotacao.valorUnitario > valorLimiteInsumo;

          // Calcular quantidade total já comprada deste insumo para a casa
          const comprasAnteriores = await db.ordemCompra.findMany({
            where: {
              cotacao: {
                solicitacao: {
                  casaId: solicitacao.casaId,
                  insumoId: solicitacao.insumoId
                }
              }
            },
            include: {
              cotacao: {
                include: { solicitacao: true }
              }
            }
          });

          const totalQtdComprada = comprasAnteriores.reduce((acc, curr) => acc + curr.cotacao.solicitacao.quantidadeSolicitada, 0);
          const totalQtdComNova = totalQtdComprada + solicitacao.quantidadeSolicitada;
          
          // Verificar estouro de quantidade
          const quantidadeEstourada = totalQtdComNova > itemOrcado.quantidadePlanejada;

          if (precoEstourado || quantidadeEstourada) {
            // Se houver estouro, exige aprovação excepcional pelo ADMIN
            if (!excepcionalAprovado || session.role !== 'ADMIN') {
              logger.warn(`[Suprimentos] Bloqueio de Orçamento: Insumo ${solicitacao.insumo.nome}. Preço Cotado: R$ ${cotacao.valorUnitario} (Limite: R$ ${valorLimiteInsumo.toFixed(2)}). Quantidade: ${totalQtdComNova} (Limite: ${itemOrcado.quantidadePlanejada})`, { traceId, casaId: solicitacao.casaId });
              
              return NextResponse.json({
                error: 'ESTOURO_ORCAMENTO',
                message: `Estouro de Orçamento Detectado no insumo ${solicitacao.insumo.nome}.\n` +
                         `- Preço cotado (R$ ${cotacao.valorUnitario.toFixed(2)}) supera o orçado (R$ ${itemOrcado.custoUnitarioPrevisto.toFixed(2)}) + 5% de margem.\n` +
                         `- Quantidade total solicitada (${totalQtdComNova}) supera o planejado (${itemOrcado.quantidadePlanejada}).\n` +
                         `É necessária aprovação excepcional do Administrador Geral (ADMIN).`,
                precoEstourado,
                quantidadeEstourada
              }, { status: 409 }); // Conflict status code
            }

            logger.info(`[Suprimentos] APROVAÇÃO EXCEPCIONAL concedida por ADMIN ${session.nome} para Ordem de Compra da cotação ${cotacao.id}`, { traceId });
          }
        }
      }
    }

    // 3. Aprovar ordem em uma transação ACID
    const ordem = await db.$transaction(async (tx) => {
      // Criar ordem de compra
      const oc = await tx.ordemCompra.create({
        data: {
          cotacaoId: cotacao.id,
          usuarioAprovadorId: session.userId,
          excepcionalAprovado: excepcionalAprovado
        }
      });

      // Atualizar status da solicitação
      await tx.solicitacaoCompra.update({
        where: { id: solicitacao.id },
        data: { status: 'APROVADA' }
      });

      // Obs: a entrada de estoque e a conta a pagar NAO sao geradas aqui.
      // A ordem nasce com statusEntrega=PENDENTE (pedido emitido). O estoque
      // (ENTRADA) e a conta a pagar so entram quando a mercadoria e recebida,
      // via PATCH desta rota (marcar como entregue) — separacao pedido x recebimento.

      // Gravar na auditoria
      await logMutation({
        usuarioId: session.userId,
        usuarioNome: session.nome,
        acao: excepcionalAprovado ? 'SUPRIMENTOS_APROVACAO_EXCEPCIONAL' : 'SUPRIMENTOS_ORDEM_COMPRA_CRIADA',
        tabela: 'OrdemCompra',
        registroId: oc.id,
        valoresNovos: {
          cotacaoId: cotacao.id,
          quantidade: solicitacao.quantidadeSolicitada,
          valorUnitario: cotacao.valorUnitario,
          excepcionalAprovado
        }
      });

      return oc;
    });

    return NextResponse.json({ success: true, ordemCompraId: ordem.id });
  } catch (error: any) {
    logger.error('[Suprimentos] Erro ao aprovar ordem de compra', error);
    return NextResponse.json({ error: 'Erro interno do servidor', message: error.message }, { status: 500 });
  }
}

// Mapeia a categoria do insumo para a categoria financeira do lancamento.
function categoriaFinanceiraDoInsumo(catInsumo: string): 'MATERIAL' | 'MAO_DE_OBRA' | 'IMPOSTOS' {
  switch (catInsumo) {
    case 'MAO_DE_OBRA':
      return 'MAO_DE_OBRA';
    case 'TAXA':
      return 'IMPOSTOS';
    default:
      return 'MATERIAL'; // MATERIAL e EQUIPAMENTO caem em MATERIAL
  }
}

// PATCH: marca a Ordem de Compra como ENTREGUE (recebimento de mercadoria).
// Gera, de forma atomica e idempotente, a ENTRADA no estoque e a conta a pagar.
export async function PATCH(request: NextRequest) {
  try {
    const traceId = crypto.randomUUID();

    const sessionToken = request.cookies.get('masar_session')?.value;
    const session = sessionToken ? await verifySession(sessionToken) : null;
    if (!session || !['ADMIN', 'FINANCEIRO'].includes(session.role)) {
      return NextResponse.json({ error: 'Permissão insuficiente. Apenas ADMIN ou FINANCEIRO registram o recebimento.' }, { status: 403 });
    }

    const body = await request.json();
    const { ordemCompraId } = body;
    if (!ordemCompraId) {
      return NextResponse.json({ error: 'Parâmetro ordemCompraId é obrigatório.' }, { status: 400 });
    }

    const oc = await db.ordemCompra.findUnique({
      where: { id: ordemCompraId },
      include: {
        cotacao: {
          include: {
            fornecedor: true,
            solicitacao: {
              include: {
                insumo: true,
                casa: { select: { empreendimentoId: true } },
              },
            },
          },
        },
      },
    });

    if (!oc) {
      return NextResponse.json({ error: 'Ordem de compra não encontrada.' }, { status: 404 });
    }
    if (oc.statusEntrega === 'ENTREGUE') {
      return NextResponse.json({ error: 'Esta ordem de compra já foi recebida.' }, { status: 409 });
    }

    const cotacao = oc.cotacao;
    const solicitacao = cotacao.solicitacao;

    // A conta a pagar exige empreendimento: resolve pela solicitacao ou pela casa.
    const empreendimentoId = solicitacao.empreendimentoId || solicitacao.casa?.empreendimentoId || null;
    if (!empreendimentoId) {
      return NextResponse.json({ error: 'Não foi possível gerar a conta a pagar: a requisição não está vinculada a um empreendimento ou casa.' }, { status: 400 });
    }

    const quantidade = solicitacao.quantidadeSolicitada;
    const valorTotal = cotacao.valorUnitario * quantidade;

    // Vencimento = data do recebimento + prazo de pagamento do fornecedor cadastrado
    // (0 = à vista, vence na entrega).
    const prazoPagamentoDias = cotacao.fornecedor?.prazoPagamentoDias ?? 0;
    const dataRecebimento = new Date();
    const dataVencimento = new Date(dataRecebimento);
    dataVencimento.setDate(dataVencimento.getDate() + prazoPagamentoDias);

    const resultado = await db.$transaction(async (tx) => {
      // 1. Marca como entregue
      await tx.ordemCompra.update({
        where: { id: oc.id },
        data: { statusEntrega: 'ENTREGUE' },
      });

      // 2. Entrada no estoque
      const mov = await tx.movimentacaoEstoque.create({
        data: {
          insumoId: solicitacao.insumoId,
          quantidade,
          tipo: 'ENTRADA',
          casaId: solicitacao.casaId || null,
        },
      });

      // 3. Conta a pagar (despesa pendente — vai pro razão só quando for paga)
      const contaPagar = await tx.transacaoFinanceira.create({
        data: {
          descricao: `Compra: ${solicitacao.insumo.nome} — ${cotacao.fornecedorNome}`,
          valor: valorTotal,
          dataVencimento,
          natureza: 'DESPESA',
          status: 'PENDENTE',
          categoria: categoriaFinanceiraDoInsumo(solicitacao.insumo.categoria),
          empreendimentoId,
          casaId: solicitacao.casaId || null,
          insumoId: solicitacao.insumoId,
          quantidade,
        },
      });

      await logMutation({
        usuarioId: session.userId,
        usuarioNome: session.nome,
        acao: 'SUPRIMENTOS_ORDEM_COMPRA_ENTREGUE',
        tabela: 'OrdemCompra',
        registroId: oc.id,
        valoresNovos: {
          statusEntrega: 'ENTREGUE',
          movimentacaoEstoqueId: mov.id,
          contaPagarId: contaPagar.id,
          valorTotal,
          dataVencimento,
        },
      });

      return { movId: mov.id, contaPagarId: contaPagar.id };
    });

    logger.info(`[Suprimentos] OC ${oc.id} recebida: estoque ENTRADA ${resultado.movId}, conta a pagar ${resultado.contaPagarId} (R$ ${valorTotal.toFixed(2)}, vence ${dataVencimento.toLocaleDateString('pt-BR')})`, { traceId });

    return NextResponse.json({ success: true, ...resultado });
  } catch (error: any) {
    logger.error('[Suprimentos] Erro ao marcar ordem de compra como entregue', error);
    return NextResponse.json({ error: 'Erro interno do servidor', message: error.message }, { status: 500 });
  }
}
