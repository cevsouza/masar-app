import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { bloqueioSegurancaMedicao } from '@/lib/sst';
import { bloqueioConformidadeMCMV } from '@/lib/mcmv/conformidade';
import { verifySession } from '@/lib/auth';
import { logMutation } from '@/lib/audit';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const casaId = id;
    const body = await request.json();
    const { percentualMedido, valorLiberado, status, checklistSeguranca, forcarLiberacao } = body;

    const percentualFloat = parseFloat(percentualMedido);
    if (isNaN(percentualFloat) || percentualFloat < 0 || percentualFloat > 100) {
      return NextResponse.json({ error: 'Percentual medido inválido (deve ser entre 0 e 100)' }, { status: 400 });
    }

    const valorFloat = parseFloat(valorLiberado);
    if (isNaN(valorFloat) || valorFloat < 0) {
      return NextResponse.json({ error: 'Valor liberado inválido' }, { status: 400 });
    }

    const statusValido = status && ['AGUARDANDO', 'PAGA', 'GLOSADA_REPROVADA'].includes(status)
      ? status
      : 'AGUARDANDO';

    // Trava SST: não cria medição já PAGA com trabalhador de ASO/EPI vencido.
    // Override exige ADMIN e fica auditado.
    if (statusValido === 'PAGA') {
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
          acao: 'MEDICAO_CRIADA_PAGA_EXCEPCIONAL_SST',
          tabela: 'MedicaoCaixa',
          registroId: casaId,
          valoresNovos: { forcarLiberacao: true, motivos: bloqueio.motivos },
        });
      }
    }

    // Trava de conformidade MCMV: só para empreendimentos no regime MCMV.
    if (statusValido === 'PAGA') {
      const casaComEmp = await db.casa.findUnique({
        where: { id: casaId },
        select: { empreendimento: { select: { id: true, regimeMCMV: true } } },
      });
      if (casaComEmp?.empreendimento?.regimeMCMV) {
        const bloqueioMcmv = await bloqueioConformidadeMCMV(casaComEmp.empreendimento.id);
        if (bloqueioMcmv.bloqueado) {
          const sessionToken = request.cookies.get('masar_session')?.value;
          const session = sessionToken ? await verifySession(sessionToken) : null;
          if (!forcarLiberacao || session?.role !== 'ADMIN') {
            return NextResponse.json({
              error: 'BLOQUEIO_CONFORMIDADE_MCMV',
              message: 'Liberação bloqueada: há exigências MCMV/Caixa obrigatórias fora de conformidade. Regularize na aba Conformidade MCMV ou libere excepcionalmente como ADMIN.',
              motivos: bloqueioMcmv.motivos,
            }, { status: 409 });
          }
          await logMutation({
            usuarioId: session.userId,
            usuarioNome: session.nome,
            acao: 'MEDICAO_CRIADA_PAGA_EXCEPCIONAL_MCMV',
            tabela: 'MedicaoCaixa',
            registroId: casaId,
            valoresNovos: { forcarLiberacao: true, motivos: bloqueioMcmv.motivos },
          });
        }
      }
    }

    const medicao = await db.medicaoCaixa.create({
      data: {
        casaId,
        percentualMedido: percentualFloat,
        valorLiberado: valorFloat,
        status: statusValido,
        checklistSeguranca: checklistSeguranca || null,
        dataMedicao: new Date(),
      },
    });

    return NextResponse.json(medicao, { status: 201 });
  } catch (error) {
    console.error('Erro ao registrar medição da Caixa:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
