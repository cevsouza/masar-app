import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logMutation } from '@/lib/audit';
import { logger } from '@/lib/logger';
import { verifySession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const traceId = crypto.randomUUID();
    const body = await request.json();
    const { trabalhadorNome, trabalhadorCpf, casaId, tipo } = body;

    // Autenticação para validar quem registrou o ponto
    const sessionToken = request.cookies.get('masar_session')?.value;
    const session = sessionToken ? await verifySession(sessionToken) : null;
    const userId = session?.userId || 'SYSTEM_SCANNER';
    const userName = session?.nome || 'Dispositivo Canteiro';

    if (!trabalhadorNome || !trabalhadorCpf || !casaId || !tipo) {
      return NextResponse.json({ error: 'Todos os campos (trabalhadorNome, trabalhadorCpf, casaId, tipo) são obrigatórios.' }, { status: 400 });
    }

    if (!['ENTRADA', 'SAIDA'].includes(tipo)) {
      return NextResponse.json({ error: 'Tipo de ponto inválido. Escolha ENTRADA ou SAIDA.' }, { status: 400 });
    }

    // Verificar se a casa existe
    const casa = await db.casa.findUnique({
      where: { id: casaId },
      include: { empreendimento: true }
    });

    if (!casa) {
      return NextResponse.json({ error: 'Unidade (Casa) de destino não encontrada.' }, { status: 404 });
    }

    // Registrar o ponto
    const ponto = await db.pontoTrabalhador.create({
      data: {
        trabalhadorNome,
        trabalhadorCpf,
        casaId,
        tipo
      }
    });

    // Gravar log de auditoria
    await logMutation({
      usuarioId: userId,
      usuarioNome: userName,
      acao: `CLOCK_PONTO_${tipo}`,
      tabela: 'PontoTrabalhador',
      registroId: ponto.id,
      valoresNovos: {
        trabalhadorNome,
        trabalhadorCpf: '[MASCARADO]',
        casaNumero: casa.numero,
        empreendimento: casa.empreendimento.nome
      }
    });

    logger.info(`[Ponto Canteiro] Ponto de ${tipo} registrado para ${trabalhadorNome} (CPF: [MASCARADO]) na Casa ${casa.numero}`, { traceId });

    return NextResponse.json({
      success: true,
      ponto: {
        id: ponto.id,
        trabalhadorNome: ponto.trabalhadorNome,
        tipo: ponto.tipo,
        dataRegistro: ponto.dataRegistro
      }
    });
  } catch (error: any) {
    logger.error('[Ponto Canteiro] Falha ao registrar ponto de trabalhador', error);
    return NextResponse.json({ error: 'Erro interno do servidor', message: error.message }, { status: 500 });
  }
}
