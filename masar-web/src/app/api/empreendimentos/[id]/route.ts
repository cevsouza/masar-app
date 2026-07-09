import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logMutation } from '@/lib/audit';
import { verifySession } from '@/lib/auth';
import { fetchCoordinates } from '@/lib/geocoding';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const {
      nome,
      localizacao,
      statusLegal,
      dataInicio,
      dataFim,
      orcamento,
      endereco,
      cep,
      bairro,
      cidade,
      estado,
      latitude,
      longitude,
      areaTotalTerreno,
      quantidadeCasasPrevistas,
      proprietarioAnteriorTerreno,
      valorCompraTerreno,
      amenidades,
      padraoAreaConstruida,
      padraoAreaLote,
      padraoQuantidadeQuartos,
      padraoQuantidadeSuites,
      padraoQuantidadeBanheiros,
      padraoVagasGaragem,
      padraoPossuiQuintal,
      padraoSalaConjugada,
      replicarTipologia
    } = body;

    // Obter dados atuais para log de auditoria e nome do projeto
    const current = await db.empreendimento.findUnique({
      where: { id }
    });

    if (!current) {
      return NextResponse.json({ error: 'Empreendimento não encontrado' }, { status: 404 });
    }

    const updateData: any = {};
    if (nome !== undefined) updateData.nome = nome;
    if (localizacao !== undefined) updateData.localizacao = localizacao;
    if (statusLegal !== undefined) updateData.statusLegal = statusLegal;
    if (dataInicio !== undefined) updateData.dataInicio = dataInicio ? new Date(dataInicio) : null;
    if (dataFim !== undefined) updateData.dataFim = dataFim ? new Date(dataFim) : null;
    if (orcamento !== undefined) updateData.orcamento = orcamento ? parseFloat(orcamento) : null;
    if (endereco !== undefined) updateData.endereco = endereco;
    if (cep !== undefined) updateData.cep = cep;
    if (bairro !== undefined) updateData.bairro = bairro;
    if (cidade !== undefined) updateData.cidade = cityOrTown(cidade);
    if (estado !== undefined) updateData.estado = estado;
    let latFloat = latitude !== undefined && latitude !== '' && latitude !== null ? parseFloat(latitude) : null;
    let lngFloat = longitude !== undefined && longitude !== '' && longitude !== null ? parseFloat(longitude) : null;

    if (!latFloat && !lngFloat && (cep !== undefined || endereco !== undefined)) {
      const finalCep = cep !== undefined ? cep : current.cep;
      const finalEndereco = endereco !== undefined ? endereco : current.endereco;
      
      if (finalCep) {
        const cepMudou = cep !== undefined && cep !== current.cep;
        const enderecoMudou = endereco !== undefined && endereco !== current.endereco;
        const semCoordenadas = !current.latitude || !current.longitude;

        if (cepMudou || enderecoMudou || semCoordenadas) {
          const coords = await fetchCoordinates(finalCep, finalEndereco || '');
          if (coords.latitude && coords.longitude) {
            latFloat = coords.latitude;
            lngFloat = coords.longitude;
          }
        }
      }
    }

    if (latitude !== undefined || latFloat !== null) updateData.latitude = latFloat;
    if (longitude !== undefined || lngFloat !== null) updateData.longitude = lngFloat;
    if (areaTotalTerreno !== undefined) updateData.areaTotalTerreno = areaTotalTerreno ? parseFloat(areaTotalTerreno) : null;
    if (quantidadeCasasPrevistas !== undefined) updateData.quantidadeCasasPrevistas = quantidadeCasasPrevistas ? parseInt(quantidadeCasasPrevistas, 10) : null;
    if (proprietarioAnteriorTerreno !== undefined) updateData.proprietarioAnteriorTerreno = proprietarioAnteriorTerreno;
    if (valorCompraTerreno !== undefined) updateData.valorCompraTerreno = valorCompraTerreno ? parseFloat(valorCompraTerreno) : null;
    if (amenidades !== undefined) updateData.amenidades = Array.isArray(amenidades) ? amenidades : [];
    
    if (padraoAreaConstruida !== undefined) updateData.padraoAreaConstruida = padraoAreaConstruida ? parseFloat(padraoAreaConstruida) : null;
    if (padraoAreaLote !== undefined) updateData.padraoAreaLote = padraoAreaLote ? parseFloat(padraoAreaLote) : null;
    if (padraoQuantidadeQuartos !== undefined) updateData.padraoQuantidadeQuartos = padraoQuantidadeQuartos ? parseInt(padraoQuantidadeQuartos, 10) : 0;
    if (padraoQuantidadeSuites !== undefined) updateData.padraoQuantidadeSuites = padraoQuantidadeSuites ? parseInt(padraoQuantidadeSuites, 10) : 0;
    if (padraoQuantidadeBanheiros !== undefined) updateData.padraoQuantidadeBanheiros = padraoQuantidadeBanheiros ? parseInt(padraoQuantidadeBanheiros, 10) : 0;
    if (padraoVagasGaragem !== undefined) updateData.padraoVagasGaragem = padraoVagasGaragem ? parseInt(padraoVagasGaragem, 10) : 0;
    if (padraoPossuiQuintal !== undefined) updateData.padraoPossuiQuintal = padraoPossuiQuintal === true;
    if (padraoSalaConjugada !== undefined) updateData.padraoSalaConjugada = padraoSalaConjugada === true;

    function cityOrTown(val: any) {
      return val || null;
    }

    const updated = await db.empreendimento.update({
      where: { id },
      data: updateData
    });

    // Auto-gerar casas faltantes se a quantidade de casas previstas for maior que a contagem atual
    if (updateData.quantidadeCasasPrevistas !== undefined && updateData.quantidadeCasasPrevistas > 0) {
      const targetCount = updateData.quantidadeCasasPrevistas;
      const currentCount = await db.casa.count({
        where: { empreendimentoId: id }
      });
      if (targetCount > currentCount) {
        const diff = targetCount - currentCount;
        const startNum = currentCount + 1;
        const housesData = Array.from({ length: diff }, (_, index) => {
          const num = (startNum + index).toString().padStart(2, '0');
          return {
            numero: num,
            quadra: 'A',
            statusObra: 'BACKLOG' as const,
            percentualObra: 0.0,
            empreendimentoId: id,
            areaConstruida: updated.padraoAreaConstruida,
            areaLote: updated.padraoAreaLote,
            quantidadeQuartos: updated.padraoQuantidadeQuartos ?? 0,
            quantidadeSuites: updated.padraoQuantidadeSuites ?? 0,
            quantidadeBanheiros: updated.padraoQuantidadeBanheiros ?? 0,
            vagasGaragem: updated.padraoVagasGaragem ?? 0,
            possuiQuintal: updated.padraoPossuiQuintal ?? false,
            salaConjugada: updated.padraoSalaConjugada ?? false,
          };
        });
        await db.casa.createMany({
          data: housesData
        });
      }
    }

    // Se a replicação em massa foi solicitada, sobrescrever todas as casas
    if (replicarTipologia === true) {
      await db.casa.updateMany({
        where: { empreendimentoId: id },
        data: {
          areaConstruida: updateData.padraoAreaConstruida !== undefined ? updateData.padraoAreaConstruida : undefined,
          areaLote: updateData.padraoAreaLote !== undefined ? updateData.padraoAreaLote : undefined,
          quantidadeQuartos: updateData.padraoQuantidadeQuartos !== undefined ? updateData.padraoQuantidadeQuartos : undefined,
          quantidadeSuites: updateData.padraoQuantidadeSuites !== undefined ? updateData.padraoQuantidadeSuites : undefined,
          quantidadeBanheiros: updateData.padraoQuantidadeBanheiros !== undefined ? updateData.padraoQuantidadeBanheiros : undefined,
          vagasGaragem: updateData.padraoVagasGaragem !== undefined ? updateData.padraoVagasGaragem : undefined,
          possuiQuintal: updateData.padraoPossuiQuintal !== undefined ? updateData.padraoPossuiQuintal : undefined,
          salaConjugada: updateData.padraoSalaConjugada !== undefined ? updateData.padraoSalaConjugada : undefined,
        }
      });
    }

    // Gatilho de Custo do Terreno (Sincronizar valor da compra)
    const finalValorCompra = updated.valorCompraTerreno ? Number(updated.valorCompraTerreno) : 0;
    if (finalValorCompra > 0) {
      const desc = `Aquisição do Terreno - ${updated.nome}`;
      const existingCost = await db.transacaoFinanceira.findFirst({
        where: {
          empreendimentoId: updated.id,
          categoria: 'TERRENO'
        }
      });

      if (existingCost) {
        if (existingCost.valor !== finalValorCompra || existingCost.descricao !== `Custo Global [TERRENO] - ${desc}`) {
          await db.transacaoFinanceira.update({
            where: { id: existingCost.id },
            data: { 
              valor: finalValorCompra,
              descricao: `Custo Global [TERRENO] - ${desc}`
            }
          });
        }
      } else {
        await db.transacaoFinanceira.create({
          data: {
            descricao: `Custo Global [TERRENO] - ${desc}`,
            valor: finalValorCompra,
            dataVencimento: new Date(),
            natureza: 'DESPESA',
            status: 'PENDENTE',
            categoria: 'TERRENO',
            empreendimentoId: updated.id
          }
        });
      }
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Erro ao atualizar empreendimento:', error);
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
      return NextResponse.json({ error: 'Acesso negado: Apenas administradores podem excluir empreendimentos.' }, { status: 403 });
    }

    const emp = await db.empreendimento.findUnique({
      where: { id }
    });

    if (!emp) {
      return NextResponse.json({ error: 'Empreendimento não encontrado.' }, { status: 404 });
    }

    // Excluir empreendimento
    await db.empreendimento.delete({
      where: { id }
    });

    await logMutation({
      usuarioId: session.userId,
      usuarioNome: session.nome,
      acao: 'DELETE',
      tabela: 'Empreendimento',
      registroId: id,
      valoresAntigos: emp,
      valoresNovos: null
    });

    return NextResponse.json({ success: true, message: 'Empreendimento excluído com sucesso.' });
  } catch (error: any) {
    console.error('Erro ao excluir empreendimento:', error);
    return NextResponse.json({ error: 'Erro interno do servidor', message: error.message }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const empreendimento = await db.empreendimento.findUnique({
      where: { id },
      include: {
        casas: {
          orderBy: [
            { quadra: 'asc' },
            { numero: 'asc' }
          ]
        }
      }
    });

    if (!empreendimento) {
      return NextResponse.json({ error: 'Empreendimento não encontrado' }, { status: 404 });
    }

    return NextResponse.json(empreendimento);
  } catch (error: any) {
    console.error('Erro ao buscar empreendimento:', error);
    return NextResponse.json({ error: 'Erro interno do servidor', message: error.message }, { status: 500 });
  }
}
