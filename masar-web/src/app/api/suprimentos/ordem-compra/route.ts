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

      // Registrar movimentação de estoque de entrada
      await tx.movimentacaoEstoque.create({
        data: {
          insumoId: solicitacao.insumoId,
          quantidade: solicitacao.quantidadeSolicitada,
          tipo: 'ENTRADA',
          casaId: solicitacao.casaId || null
        }
      });

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
