import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: casaId } = await params;
    const body = await request.json();
    const { 
      padraoEnergiaInstalado, 
      ligacaoAguaConcluida, 
      fossaFiltroEsgotoConcluido, 
      numeroMedidorLuz, 
      numeroMedidorAgua 
    } = body;

    // Check if infra already exists
    const existingInfra = await db.infraestruturaUnidade.findUnique({
      where: { casaId }
    });

    let infra;
    if (existingInfra) {
      infra = await db.infraestruturaUnidade.update({
        where: { casaId },
        data: {
          padraoEnergiaInstalado: Boolean(padraoEnergiaInstalado),
          ligacaoAguaConcluida: Boolean(ligacaoAguaConcluida),
          fossaFiltroEsgotoConcluido: Boolean(fossaFiltroEsgotoConcluido),
          numeroMedidorLuz: numeroMedidorLuz || null,
          numeroMedidorAgua: numeroMedidorAgua || null,
        }
      });
    } else {
      infra = await db.infraestruturaUnidade.create({
        data: {
          casaId,
          padraoEnergiaInstalado: Boolean(padraoEnergiaInstalado),
          ligacaoAguaConcluida: Boolean(ligacaoAguaConcluida),
          fossaFiltroEsgotoConcluido: Boolean(fossaFiltroEsgotoConcluido),
          numeroMedidorLuz: numeroMedidorLuz || null,
          numeroMedidorAgua: numeroMedidorAgua || null,
        }
      });
    }

    return NextResponse.json(infra);
  } catch (error) {
    console.error('Erro ao atualizar infraestrutura da casa:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
