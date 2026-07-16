import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logMutation } from '@/lib/audit';
import { verifySession } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sessionToken = request.cookies.get('masar_session')?.value;
    const session = sessionToken ? await verifySession(sessionToken) : null;
    if (!session || !['ADMIN', 'FINANCEIRO', 'ENGENHARIA'].includes(session.role)) {
      return NextResponse.json({ error: 'Acesso negado: Apenas administradores, financeiro ou engenharia podem editar casas.' }, { status: 403 });
    }

    const current = await db.casa.findUnique({
      where: { id }
    });

    if (!current) {
      return NextResponse.json({ error: 'Casa não encontrada' }, { status: 404 });
    }

    const body = await request.json();
    const {
      numero,
      quadra,
      statusObra,
      percentualObra,
      areaConstruida,
      areaLote,
      valorVendaProjetado,
      quantidadeQuartos,
      quantidadeSuites,
      quantidadeBanheiros,
      vagasGaragem,
      possuiQuintal,
      salaConjugada,
      liberadaVenda,
      unidadeAdaptavelMCMV
    } = body;

    const updateData: any = {};
    if (numero !== undefined) updateData.numero = numero;
    if (quadra !== undefined) updateData.quadra = quadra;
    if (statusObra !== undefined) updateData.statusObra = statusObra;
    if (percentualObra !== undefined) updateData.percentualObra = parseFloat(percentualObra);
    if (areaConstruida !== undefined) updateData.areaConstruida = areaConstruida ? parseFloat(areaConstruida) : null;
    if (areaLote !== undefined) updateData.areaLote = areaLote ? parseFloat(areaLote) : null;
    if (valorVendaProjetado !== undefined) updateData.valorVendaProjetado = valorVendaProjetado ? parseFloat(valorVendaProjetado) : null;
    if (quantidadeQuartos !== undefined) updateData.quantidadeQuartos = parseInt(quantidadeQuartos, 10) || 0;
    if (quantidadeSuites !== undefined) updateData.quantidadeSuites = parseInt(quantidadeSuites, 10) || 0;
    if (quantidadeBanheiros !== undefined) updateData.quantidadeBanheiros = parseInt(quantidadeBanheiros, 10) || 0;
    if (vagasGaragem !== undefined) updateData.vagasGaragem = parseInt(vagasGaragem, 10) || 0;
    if (possuiQuintal !== undefined) updateData.possuiQuintal = possuiQuintal === true;
    if (salaConjugada !== undefined) updateData.salaConjugada = salaConjugada === true;
    if (liberadaVenda !== undefined) updateData.liberadaVenda = liberadaVenda === true;
    if (unidadeAdaptavelMCMV !== undefined) updateData.unidadeAdaptavelMCMV = unidadeAdaptavelMCMV === true;

    const updated = await db.casa.update({
      where: { id },
      data: updateData
    });

    await logMutation({
      usuarioId: session.userId,
      usuarioNome: session.nome,
      acao: 'UPDATE',
      tabela: 'Casa',
      registroId: id,
      valoresAntigos: current,
      valoresNovos: updated
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Erro ao atualizar casa:', error);
    return NextResponse.json({ error: 'Erro interno do servidor', message: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sessionToken = request.cookies.get('masar_session')?.value;
    const session = sessionToken ? await verifySession(sessionToken) : null;
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado: Apenas administradores podem excluir casas.' }, { status: 403 });
    }

    const current = await db.casa.findUnique({
      where: { id }
    });

    if (!current) {
      return NextResponse.json({ error: 'Casa não encontrada.' }, { status: 404 });
    }

    await db.casa.delete({
      where: { id }
    });

    await logMutation({
      usuarioId: session.userId,
      usuarioNome: session.nome,
      acao: 'DELETE',
      tabela: 'Casa',
      registroId: id,
      valoresAntigos: current,
      valoresNovos: null
    });

    return NextResponse.json({ success: true, message: 'Casa excluída com sucesso.' });
  } catch (error: any) {
    console.error('Erro ao excluir casa:', error);
    return NextResponse.json({ error: 'Erro interno do servidor', message: error.message }, { status: 500 });
  }
}
