import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logMutation } from '@/lib/audit';
import { logger } from '@/lib/logger';
import { verifySession } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const traceId = crypto.randomUUID();
    const { id } = await params;
    const body = await request.json();
    const { statusObra, percentualObra, prazoFisico, prazoFinanceiro, obstaculos } = body;

    // Obter sessão para auditoria
    const sessionToken = request.cookies.get('masar_session')?.value;
    const session = sessionToken ? await verifySession(sessionToken) : null;
    const userId = session?.userId || 'SYSTEM';
    const userName = session?.nome || 'Sistema';

    const validStatuses = ['SEM_INICIO', 'FUNDACAO', 'ALVENARIA', 'COBERTURA', 'ACABAMENTO', 'CONCLUIDA'];
    if (!statusObra || !validStatuses.includes(statusObra)) {
      return NextResponse.json({ error: 'Status da obra inválido' }, { status: 400 });
    }

    const percentualFloat = parseFloat(percentualObra);
    if (isNaN(percentualFloat) || percentualFloat < 0 || percentualFloat > 100) {
      return NextResponse.json({ error: 'Percentual da obra inválido (deve ser entre 0 e 100)' }, { status: 400 });
    }

    // 1. Obter estado atual da casa para comparar percentuais
    const currentCasa = await db.casa.findUnique({
      where: { id },
      select: { percentualObra: true }
    });

    if (!currentCasa) {
      return NextResponse.json({ error: 'Casa não encontrada' }, { status: 404 });
    }

    // 2. Trava de Compliance de Obras (Mínimo de 3 fotos se estiver aumentando o progresso físico)
    if (percentualFloat > currentCasa.percentualObra) {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);

      // Conta documentos GED vinculados a esta casa e criados hoje
      const fotosDoDia = await db.documentoAnexo.count({
        where: {
          casaId: id,
          dataCriacao: {
            gte: startOfToday,
            lte: endOfToday
          }
        }
      });

      if (fotosDoDia < 3) {
        logger.warn(`[Compliance Obra] Tentativa bloqueada de aumentar progresso de ${currentCasa.percentualObra}% para ${percentualFloat}%. Fotos hoje: ${fotosDoDia}`, { traceId, casaId: id });
        return NextResponse.json({ 
          error: `Compliance de Canteiro: Você enviou apenas ${fotosDoDia} anexo(s) hoje. Para registrar o avanço físico da obra, é obrigatório anexar no mínimo 3 fotos do dia na pasta "Documentação (GED)" desta unidade.` 
        }, { status: 400 });
      }
    }

    const updateData: any = {
      statusObra,
      percentualObra: percentualFloat,
      obstaculos: obstaculos !== undefined ? obstaculos : undefined,
    };

    if (prazoFisico !== undefined) {
      updateData.prazoFisico = prazoFisico ? new Date(prazoFisico) : null;
    }
    if (prazoFinanceiro !== undefined) {
      updateData.prazoFinanceiro = prazoFinanceiro ? new Date(prazoFinanceiro) : null;
    }

    // 3. Atualizar e registrar na auditoria
    const casa = await db.casa.update({
      where: { id },
      data: updateData,
    });

    await logMutation({
      usuarioId: userId,
      usuarioNome: userName,
      acao: 'EVOLUCAO_FISICA_OBRA',
      tabela: 'Casa',
      registroId: id,
      valoresAntigos: { percentualObra: currentCasa.percentualObra },
      valoresNovos: { percentualObra: casa.percentualObra, statusObra: casa.statusObra }
    });

    logger.info(`[Compliance Obra] Progresso atualizado com sucesso para a casa ${id}. Novo percentual: ${casa.percentualObra}%`, { traceId });

    return NextResponse.json(casa);
  } catch (error: any) {
    console.error('Erro ao evoluir obra da casa:', error);
    return NextResponse.json({ error: 'Erro interno do servidor', message: error.message }, { status: 500 });
  }
}
