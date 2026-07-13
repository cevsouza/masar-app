import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { registerFinancialTransaction } from '@/lib/transactions';
import { bloqueioSegurancaMedicao } from '@/lib/sst';
import { verifySession } from '@/lib/auth';
import { logMutation } from '@/lib/audit';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, forcarLiberacao } = body;

    if (!status || !['AGUARDANDO', 'PAGA', 'GLOSADA_REPROVADA'].includes(status)) {
      return NextResponse.json({ error: 'Status inválido' }, { status: 400 });
    }

    const current = await db.medicaoCaixa.findUnique({
      where: { id },
      include: {
        casa: {
          include: {
            empreendimento: true
          }
        }
      }
    });

    if (!current) {
      return NextResponse.json({ error: 'Medição não encontrada' }, { status: 404 });
    }

    const isNewlyPaid = current.status !== 'PAGA' && status === 'PAGA';

    // Trava SST: não libera medição (PAGA) com trabalhador de ASO/EPI vencido.
    // Override exige ADMIN e fica auditado.
    if (isNewlyPaid) {
      const bloqueio = await bloqueioSegurancaMedicao();
      if (bloqueio.bloqueado) {
        const sessionToken = request.cookies.get('masar_session')?.value;
        const session = sessionToken ? await verifySession(sessionToken) : null;
        if (!forcarLiberacao || session?.role !== 'ADMIN') {
          return NextResponse.json({
            error: 'BLOQUEIO_SEGURANCA',
            message: 'Liberação bloqueada: há trabalhadores com segurança fora de dia (ASO/EPI vencido). Regularize ou libere excepcionalmente como ADMIN.',
            motivos: bloqueio.motivos,
          }, { status: 409 });
        }
        await logMutation({
          usuarioId: session.userId,
          usuarioNome: session.nome,
          acao: 'MEDICAO_LIBERADA_EXCEPCIONAL_SST',
          tabela: 'MedicaoCaixa',
          registroId: id,
          valoresNovos: { forcarLiberacao: true, motivos: bloqueio.motivos },
        });
      }
    }

    const medicao = await db.medicaoCaixa.update({
      where: { id },
      data: { status },
    });

    const isNewlyReverted = current.status === 'PAGA' && status !== 'PAGA';

    if (isNewlyPaid) {
      await registerFinancialTransaction(
        medicao.valorLiberado,
        'CREDITO',
        `Liberação Medição CEF - Lote Qd ${current.casa.quadra}, Casa ${current.casa.numero} | Projeto: ${current.casa.empreendimento.nome}`
      );
    } else if (isNewlyReverted) {
      await registerFinancialTransaction(
        medicao.valorLiberado,
        'DEBITO',
        `Estorno Medição CEF - Lote Qd ${current.casa.quadra}, Casa ${current.casa.numero} | Projeto: ${current.casa.empreendimento.nome}`
      );
    }

    return NextResponse.json(medicao);
  } catch (error) {
    console.error('Erro ao atualizar status da medição:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
