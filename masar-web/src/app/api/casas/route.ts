import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { bloqueioNovasUnidades } from '@/lib/licenca';

// Lista enxuta de casas (id/numero/quadra/status), opcionalmente por empreendimento.
// Usada em seletores (ex.: Eficiência de material — Fase 6.1).
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const empreendimentoId = searchParams.get('empreendimentoId') || undefined;
    const casas = await db.casa.findMany({
      where: empreendimentoId ? { empreendimentoId } : {},
      select: { id: true, numero: true, quadra: true, statusObra: true, empreendimentoId: true },
      orderBy: [{ quadra: 'asc' }, { numero: 'asc' }],
    });
    return NextResponse.json(casas);
  } catch (error) {
    console.error('Erro ao listar casas:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      numero, 
      quadra, 
      empreendimentoId, 
      statusObra, 
      percentualObra,
      areaConstruida,
      areaLote,
      quantidadeQuartos,
      quantidadeSuites,
      quantidadeBanheiros,
      vagasGaragem,
      possuiQuintal,
      salaConjugada,
      unidadeAdaptavelMCMV
    } = body;

    if (!numero || !quadra || !empreendimentoId) {
      return NextResponse.json({ error: 'Número, quadra e ID do empreendimento são obrigatórios' }, { status: 400 });
    }

    // 0. Teto da licença (plano contratado). Vem antes da trava de estoque
    // físico porque é a restrição mais externa: não adianta caber no
    // empreendimento se não cabe no contrato.
    const licenca = await bloqueioNovasUnidades(1);
    if (licenca.bloqueado) {
      return NextResponse.json(
        { error: 'LIMITE_LICENCA_EXCEDIDO', message: licenca.mensagem },
        { status: 402 },
      );
    }

    // 1. Validar limite de casas do empreendimento (Trava de Estoque Físico)
    const empreendimento = await db.empreendimento.findUnique({
      where: { id: empreendimentoId },
      include: {
        _count: {
          select: { casas: true }
        }
      }
    });

    if (!empreendimento) {
      return NextResponse.json({ error: 'Empreendimento não encontrado' }, { status: 404 });
    }

    if (empreendimento.quantidadeCasasPrevistas !== null && 
        empreendimento._count.casas >= empreendimento.quantidadeCasasPrevistas) {
      return NextResponse.json({ 
        error: 'LIMITE_CASAS_EXCEDIDO', 
        message: `Limite de Casas Excedido: O empreendimento "${empreendimento.nome}" permite no máximo ${empreendimento.quantidadeCasasPrevistas} casas.` 
      }, { status: 400 });
    }

    const validStatuses = ['BACKLOG', 'APROVACOES', 'INFRAESTRUTURA', 'SUPRAESTRUTURA', 'INSTALACOES', 'ACABAMENTO', 'VISTORIA_CAIXA', 'CARTORIO', 'VISITAS', 'CONCLUIDA'];
    const statusObraValido = statusObra && validStatuses.includes(statusObra) 
      ? statusObra 
      : 'BACKLOG';

    const percentualFloat = percentualObra ? parseFloat(percentualObra) : 0.0;

    // Herança automática de tipologia padrão do empreendimento
    const finalAreaConstruida = areaConstruida ? parseFloat(areaConstruida) : (empreendimento.padraoAreaConstruida ? Number(empreendimento.padraoAreaConstruida) : null);
    const finalAreaLote = areaLote ? parseFloat(areaLote) : (empreendimento.padraoAreaLote ? Number(empreendimento.padraoAreaLote) : null);
    const finalQuartos = quantidadeQuartos !== undefined ? parseInt(quantidadeQuartos, 10) : (empreendimento.padraoQuantidadeQuartos ?? 0);
    const finalSuites = quantidadeSuites !== undefined ? parseInt(quantidadeSuites, 10) : (empreendimento.padraoQuantidadeSuites ?? 0);
    const finalBanheiros = quantidadeBanheiros !== undefined ? parseInt(quantidadeBanheiros, 10) : (empreendimento.padraoQuantidadeBanheiros ?? 0);
    const finalVagas = vagasGaragem !== undefined ? parseInt(vagasGaragem, 10) : (empreendimento.padraoVagasGaragem ?? 0);
    const finalQuintal = possuiQuintal !== undefined ? possuiQuintal === true : (empreendimento.padraoPossuiQuintal ?? false);
    const finalSalaConjugada = salaConjugada !== undefined ? salaConjugada === true : (empreendimento.padraoSalaConjugada ?? false);

    const casa = await db.casa.create({
      data: {
        numero,
        quadra,
        empreendimentoId,
        statusObra: statusObraValido,
        percentualObra: percentualFloat,
        areaConstruida: finalAreaConstruida,
        areaLote: finalAreaLote,
        quantidadeQuartos: finalQuartos,
        quantidadeSuites: finalSuites,
        quantidadeBanheiros: finalBanheiros,
        vagasGaragem: finalVagas,
        possuiQuintal: finalQuintal,
        salaConjugada: finalSalaConjugada,
        unidadeAdaptavelMCMV: unidadeAdaptavelMCMV === true,
      },
    });

    return NextResponse.json(casa, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar casa:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
