import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendEmail } from '@/lib/resend';

// Sócios/gestão que acompanham a operação recebem o sino a cada diário.
const SOCIO_ROLES = ['ADMIN', 'FINANCEIRO'] as const;
// Destinatário adicional de e-mails críticos (mesmo do cron diário).
const EXTRA_ALERT_EMAILS = ['cevsouza74@gmail.com'];

const CLIMA_LABEL: Record<string, string> = {
  BOM: 'tempo bom',
  CHUVA: 'chuva',
  IMPRATICAVEL: 'impraticável',
};

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

    // Todo diário registrado alimenta o sino dos sócios (ADMIN + FINANCEIRO), para
    // que saibam que algo foi lançado. Paralisação e ocorrência ganham destaque; além
    // disso, paralisação dispara e-mail imediato (impacta cronograma e caixa).
    const temOcorrencia = typeof ocorrencias === 'string' && ocorrencias.trim().length > 0;
    const obraParalisada = clima === 'IMPRATICAVEL';
    const ocorrenciaTexto = temOcorrencia ? ocorrencias.trim() : '';

    try {
      const casa = await db.casa.findUnique({
        where: { id: casaId },
        include: { empreendimento: { select: { nome: true } } },
      });

      const local = casa
        ? `Qd ${casa.quadra}, Casa ${casa.numero}${casa.empreendimento ? ` (${casa.empreendimento.nome})` : ''}`
        : 'obra';

      const trecho = temOcorrencia
        ? ` — "${ocorrenciaTexto.slice(0, 100)}${ocorrenciaTexto.length > 100 ? '…' : ''}"`
        : '';

      // Mensagem em camadas para preservar sinal no sino: paralisação > ocorrência > rotina.
      let mensagem: string;
      if (obraParalisada) {
        mensagem = `🔴 Diário — ${local}: obra PARALISADA (clima impraticável)${trecho}`;
      } else if (temOcorrencia) {
        mensagem = `🚧 Diário — ${local}: ocorrência registrada${trecho}`;
      } else {
        mensagem = `📋 Diário — ${local}: ${efetivoTrabalhadores} trab., ${CLIMA_LABEL[clima] || clima}`;
      }

      const socios = await db.user.findMany({
        where: { role: { in: [...SOCIO_ROLES] } },
        select: { id: true, email: true },
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

      // E-mail imediato apenas para paralisação de obra.
      if (obraParalisada) {
        const dataHoje = new Date().toLocaleDateString('pt-BR');
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1e293b;">
            <div style="background:#b91c1c; color:#fff; padding:16px 20px; border-radius:12px 12px 0 0;">
              <h2 style="margin:0; font-size:18px;">🔴 Obra paralisada</h2>
            </div>
            <div style="border:1px solid #e2e8f0; border-top:none; padding:20px; border-radius:0 0 12px 12px;">
              <p style="margin:0 0 12px;">Um Diário de Obra foi registrado hoje (${dataHoje}) indicando <strong>obra paralisada por clima impraticável</strong>.</p>
              <p style="margin:0 0 8px;"><strong>Local:</strong> ${local}</p>
              <p style="margin:0 0 8px;"><strong>Efetivo:</strong> ${efetivoTrabalhadores} trabalhador(es)</p>
              ${temOcorrencia ? `<p style="margin:0 0 8px;"><strong>Ocorrências:</strong> ${ocorrenciaTexto}</p>` : ''}
              <p style="margin:0 0 8px;"><strong>Atividades:</strong> ${String(atividadesExecutadas).slice(0, 300)}</p>
              <p style="margin:16px 0 0; font-size:12px; color:#64748b;">Paralisações impactam prazo e caixa — vale acompanhar no app.</p>
            </div>
          </div>
        `;

        const destinatarios = Array.from(
          new Set([
            ...socios.map((s) => s.email).filter((e): e is string => !!e),
            ...EXTRA_ALERT_EMAILS,
          ])
        );

        await Promise.all(
          destinatarios.map((to) =>
            sendEmail({
              to,
              subject: `🔴 Obra paralisada — ${local}`,
              html,
            })
          )
        );
      }
    } catch (notifErr) {
      // Não bloquear o registro do diário se a notificação/e-mail falhar.
      console.error('Falha ao notificar sócios sobre diário de obra:', notifErr);
    }

    return NextResponse.json(diario, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar diário de obra:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
