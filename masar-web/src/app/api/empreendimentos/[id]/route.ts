import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logMutation } from '@/lib/audit';

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
    if (latitude !== undefined) updateData.latitude = latitude ? parseFloat(latitude) : null;
    if (longitude !== undefined) updateData.longitude = longitude ? parseFloat(longitude) : null;
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
      const existingCost = await db.custoGlobal.findFirst({
        where: {
          empreendimentoId: updated.id,
          tipo: 'TERRENO'
        }
      });

      if (existingCost) {
        if (existingCost.valor !== finalValorCompra || existingCost.descricao !== desc) {
          await db.custoGlobal.update({
            where: { id: existingCost.id },
            data: { 
              valor: finalValorCompra,
              descricao: desc
            }
          });
        }
      } else {
        await db.custoGlobal.create({
          data: {
            descricao: desc,
            tipo: 'TERRENO',
            valor: finalValorCompra,
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
