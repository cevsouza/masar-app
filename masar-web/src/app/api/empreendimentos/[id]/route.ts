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
      amenidades
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

    function cityOrTown(val: any) {
      return val || null;
    }

    const updated = await db.empreendimento.update({
      where: { id },
      data: updateData
    });

    // Gatilho de Custo do Terreno (Sincronizar valor da compra)
    const finalValorCompra = updated.valorCompraTerreno ? Number(updated.valorCompraTerreno) : 0;
    if (finalValorCompra > 0) {
      const desc = `Aquisição do Terreno - ${updated.nome}`;
      const existingCost = await db.custoGlobal.findFirst({
        where: {
          descricao: desc,
          tipo: 'TERRENO'
        }
      });

      if (existingCost) {
        if (existingCost.valor !== finalValorCompra) {
          await db.custoGlobal.update({
            where: { id: existingCost.id },
            data: { valor: finalValorCompra }
          });
        }
      } else {
        await db.custoGlobal.create({
          data: {
            descricao: desc,
            tipo: 'TERRENO',
            valor: finalValorCompra
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
