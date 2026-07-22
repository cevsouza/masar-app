import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/auth';
import { logMutation } from '@/lib/audit';
import { bloqueioSegurancaMedicao } from '@/lib/sst';
import { bloqueioConformidadeMCMV } from '@/lib/mcmv/conformidade';

export const dynamic = 'force-dynamic';

/**
 * Medição do EMPREENDIMENTO — o caminho do vertical.
 *
 * Espelha `POST /api/casas/[id]/medicoes`, que é o caminho do horizontal. Os
 * dois existem porque a obra é diferente, não porque a regra é: em prédio,
 * fundação, estrutura e lajes servem todas as unidades ao mesmo tempo, e o que
 * o engenheiro credenciado mede é o avanço da torre. Medir 200 apartamentos
 * separadamente produziria 200 registros que não correspondem a nada.
 *
 * As travas são as MESMAS — segurança do trabalho e conformidade MCMV. Fazer a
 * regra depender da tipologia seria criar dois produtos para manter.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { percentualMedido, valorLiberado, status, referencia, forcarLiberacao } = body;

    const emp = await db.empreendimento.findUnique({
      where: { id },
      select: { id: true, nome: true, tipologia: true, regimeMCMV: true },
    });
    if (!emp) {
      return NextResponse.json({ error: 'Empreendimento não encontrado' }, { status: 404 });
    }

    if (emp.tipologia !== 'VERTICAL') {
      return NextResponse.json(
        {
          error: 'TIPOLOGIA_INCOMPATIVEL',
          message:
            'Este empreendimento é de casas. A medição é registrada em cada unidade, que é como o engenheiro credenciado mede numa obra horizontal.',
        },
        { status: 400 },
      );
    }

    const pct = Number(percentualMedido);
    const valor = Number(valorLiberado);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      return NextResponse.json({ error: 'Percentual medido deve estar entre 0 e 100.' }, { status: 400 });
    }
    if (!Number.isFinite(valor) || valor < 0) {
      return NextResponse.json({ error: 'Valor liberado inválido.' }, { status: 400 });
    }

    const statusFinal = ['AGUARDANDO', 'PAGA', 'GLOSADA_REPROVADA'].includes(status)
      ? status
      : 'AGUARDANDO';
    const liberando = statusFinal === 'PAGA';

    const sessionToken = request.cookies.get('masar_session')?.value;
    const session = sessionToken ? await verifySession(sessionToken) : null;

    // Trava de segurança do trabalho — vale para qualquer obra.
    if (liberando) {
      const bloqueio = await bloqueioSegurancaMedicao();
      if (bloqueio.bloqueado) {
        if (!forcarLiberacao || session?.role !== 'ADMIN') {
          return NextResponse.json(
            {
              error: 'BLOQUEIO_SEGURANCA',
              message:
                'Liberação bloqueada: há trabalhadores com segurança fora de dia (ASO/EPI vencido). Regularize ou libere excepcionalmente como ADMIN.',
              motivos: bloqueio.motivos,
              pendencias: bloqueio.pendencias,
            },
            { status: 409 },
          );
        }
        await logMutation({
          usuarioId: session.userId,
          usuarioNome: session.nome,
          acao: 'MEDICAO_LIBERADA_EXCEPCIONAL_SST',
          tabela: 'MedicaoCaixa',
          registroId: emp.id,
          valoresNovos: { forcarLiberacao: true, motivos: bloqueio.motivos, empreendimento: emp.nome },
        });
      }
    }

    // Trava de conformidade MCMV — idêntica à do horizontal.
    if (liberando && emp.regimeMCMV) {
      const bloqueioMcmv = await bloqueioConformidadeMCMV(emp.id);
      if (bloqueioMcmv.bloqueado) {
        if (!forcarLiberacao || session?.role !== 'ADMIN') {
          return NextResponse.json(
            {
              error: 'BLOQUEIO_CONFORMIDADE_MCMV',
              message:
                'Liberação bloqueada: há exigências MCMV/Caixa obrigatórias fora de conformidade. Regularize na aba Conformidade MCMV ou libere excepcionalmente como ADMIN.',
              motivos: bloqueioMcmv.motivos,
              pendencias: bloqueioMcmv.pendencias,
            },
            { status: 409 },
          );
        }
        await logMutation({
          usuarioId: session.userId,
          usuarioNome: session.nome,
          acao: 'MEDICAO_LIBERADA_EXCEPCIONAL_MCMV',
          tabela: 'MedicaoCaixa',
          registroId: emp.id,
          valoresNovos: { forcarLiberacao: true, motivos: bloqueioMcmv.motivos, empreendimento: emp.nome },
        });
      }
    }

    const medicao = await db.medicaoCaixa.create({
      data: {
        empreendimentoId: emp.id,
        percentualMedido: pct,
        valorLiberado: valor,
        status: statusFinal,
        referencia: typeof referencia === 'string' && referencia.trim() ? referencia.trim() : null,
      },
    });

    return NextResponse.json(medicao, { status: 201 });
  } catch (error) {
    console.error('Erro ao registrar medição do empreendimento:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

/** Medições do empreendimento (só as de torre; as por unidade ficam na unidade). */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const medicoes = await db.medicaoCaixa.findMany({
      where: { empreendimentoId: id },
      orderBy: { dataMedicao: 'desc' },
    });
    return NextResponse.json(medicoes);
  } catch (error) {
    console.error('Erro ao listar medições do empreendimento:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
