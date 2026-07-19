import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/auth';
import { logMutation } from '@/lib/audit';
import { logger } from '@/lib/logger';

/**
 * Registra que o contrato FOI ASSINADO — pela equipe da construtora.
 *
 * Por que não uma integração de assinatura eletrônica: existia um esboço
 * (webhook de retorno + model AssinaturaContrato) que nunca funcionou, porque
 * nada criava o registro nem chamava o fornecedor. O efeito colateral era pior
 * que o passo faltando: `ASSINADO_CAIXA` só era escrito por aquele webhook
 * morto, então NENHUM contrato chegava a assinado em uso real — e a trava de
 * comissão, que exige esse status, nunca podia ser liberada. A comissão do
 * corretor era impagável.
 *
 * Fechar a integração exigiria conta em fornecedor, chave de API e geração do
 * PDF do contrato POR CLIENTE — onboarding incompatível com um produto que se
 * vende sozinho. Construtora pequena assina em papel ou com a ferramenta dela;
 * o ERP deve REGISTRAR que assinou, não orquestrar a assinatura.
 *
 * O webhook segue no lugar, inerte e protegido por segredo, como ponto de
 * entrada caso um dia haja integração. Os dois caminhos convergem no mesmo
 * efeito.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contratoId } = await params;

    // Marcar como assinado LIBERA o pagamento de comissão. Não é uma edição
    // qualquer — exige papel explícito.
    const token = request.cookies.get('masar_session')?.value;
    const sessao = token ? await verifySession(token) : null;
    if (!sessao || !['ADMIN', 'COMERCIAL'].includes(sessao.role)) {
      return NextResponse.json(
        { error: 'Apenas ADMIN ou COMERCIAL podem registrar a assinatura do contrato.' },
        { status: 403 }
      );
    }

    const { dataAssinatura } = await request.json().catch(() => ({}));

    const contrato = await db.contratoVenda.findUnique({
      where: { id: contratoId },
      include: { casa: true },
    });
    if (!contrato) {
      return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 });
    }
    if (contrato.status === 'ASSINADO_CAIXA') {
      return NextResponse.json(
        { error: 'Este contrato já está registrado como assinado.' },
        { status: 409 }
      );
    }

    const quando = dataAssinatura ? new Date(dataAssinatura) : new Date();
    if (Number.isNaN(quando.getTime()) || quando > new Date()) {
      return NextResponse.json(
        { error: 'Data de assinatura inválida — não pode estar no futuro.' },
        { status: 400 }
      );
    }

    const statusAnterior = contrato.status;

    await db.$transaction(async (tx) => {
      await tx.contratoVenda.update({
        where: { id: contratoId },
        data: { status: 'ASSINADO_CAIXA' },
      });

      // Registro da assinatura. `upsert` porque em uso real nada cria este
      // registro antes — o esboço de integração nunca rodou.
      await tx.assinaturaContrato.upsert({
        where: { contratoId },
        create: { contratoId, status: 'ASSINADO', dataAssinatura: quando },
        update: { status: 'ASSINADO', dataAssinatura: quando },
      });

      // Jornada do comprador avança: o portal dele reflete na hora.
      await tx.cliente.update({
        where: { id: contrato.clienteId },
        data: { etapaAtual: 'PAGAMENTO_ENTRADA' },
      });

      // Sinal/entrada vira recebível, como faria a integração.
      if (contrato.entrada > 0) {
        const vencimento = new Date();
        vencimento.setDate(vencimento.getDate() + 3);
        await tx.transacaoFinanceira.create({
          data: {
            descricao: 'Sinal/Entrada de Contrato',
            valor: contrato.entrada,
            dataVencimento: vencimento,
            natureza: 'RECEITA',
            status: 'PENDENTE',
            categoria: 'ENTRADA_CLIENTE',
            empreendimentoId: contrato.casa.empreendimentoId,
            casaId: contrato.casaId,
            clienteId: contrato.clienteId,
            contratoId: contrato.id,
          },
        });
      }

      await logMutation({
        usuarioId: sessao.userId,
        usuarioNome: sessao.nome,
        acao: 'CONTRATO_ASSINATURA_REGISTRADA',
        tabela: 'ContratoVenda',
        registroId: contratoId,
        valoresAntigos: { status: statusAnterior },
        valoresNovos: {
          status: 'ASSINADO_CAIXA',
          dataAssinatura: quando.toISOString(),
          etapaAtual: 'PAGAMENTO_ENTRADA',
          origem: 'REGISTRO_MANUAL_EQUIPE',
        },
      });
    });

    logger.info(`[Comercial] Assinatura registrada no contrato ${contratoId} por ${sessao.nome}`);
    return NextResponse.json({ success: true, status: 'ASSINADO_CAIXA' });
  } catch (error: any) {
    logger.error('[Comercial] Erro ao registrar assinatura', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
