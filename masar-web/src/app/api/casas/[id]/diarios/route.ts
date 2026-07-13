import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: casaId } = await params;
    const body = await request.json();
    const { clima, efetivoTrabalhadores, atividadesExecutadas, ocorrencias } = body;

    if (!clima || !efetivoTrabalhadores || !atividadesExecutadas) {
      return NextResponse.json({ error: 'Clima, efetivo de trabalhadores e atividades executadas são obrigatórios' }, { status: 400 });
    }

    const validClimas = ['BOM', 'CHUVA', 'IMPRATICAVEL'];
    if (!validClimas.includes(clima)) {
      return NextResponse.json({ error: 'Clima inválido' }, { status: 400 });
    }

    const diario = await db.diarioDeObra.create({
      data: {
        casaId,
        clima,
        efetivoTrabalhadores: parseInt(efetivoTrabalhadores),
        atividadesExecutadas,
        ocorrencias: ocorrencias || '',
      }
    });

    // Avisar os sócios (ADMIN + FINANCEIRO) via sino quando o diário requer atenção:
    // houve ocorrência relatada OU a obra ficou paralisada (clima impraticável).
    const temOcorrencia = typeof ocorrencias === 'string' && ocorrencias.trim().length > 0;
    const obraParalisada = clima === 'IMPRATICAVEL';

    if (temOcorrencia || obraParalisada) {
      try {
        const casa = await db.casa.findUnique({
          where: { id: casaId },
          include: { empreendimento: { select: { nome: true } } },
        });

        const local = casa
          ? `Qd ${casa.quadra}, Casa ${casa.numero}${casa.empreendimento ? ` (${casa.empreendimento.nome})` : ''}`
          : 'obra';

        const motivo = obraParalisada
          ? 'obra paralisada (clima impraticável)'
          : 'ocorrência registrada';

        const trecho = temOcorrencia
          ? ` — "${ocorrencias.trim().slice(0, 100)}${ocorrencias.trim().length > 100 ? '…' : ''}"`
          : '';

        const mensagem = `🚧 Diário de Obra — ${local}: ${motivo}${trecho}`;

        const socios = await db.user.findMany({
          where: { role: { in: ['ADMIN', 'FINANCEIRO'] } },
          select: { id: true },
        });

        if (socios.length > 0) {
          await db.notificacao.createMany({
            data: socios.map((s) => ({
              usuarioId: s.id,
              mensagem,
              lida: false,
            })),
          });
        }
      } catch (notifErr) {
        // Não bloquear o registro do diário se a notificação falhar.
        console.error('Falha ao notificar sócios sobre diário de obra:', notifErr);
      }
    }

    return NextResponse.json(diario, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar diário de obra:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
