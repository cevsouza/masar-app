import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { fetchCoordinates } from '@/lib/geocoding';

export async function POST(request: NextRequest) {
  try {
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

    if (!nome || !localizacao) {
      return NextResponse.json({ error: 'Nome e localização são obrigatórios' }, { status: 400 });
    }

    const validStatuses = ['ESTUDO_VIABILIDADE', 'APROVACAO_PREFEITURA', 'APROVACAO_CAIXA', 'EM_OBRA'];
    const statusValido = statusLegal && validStatuses.includes(statusLegal) 
      ? statusLegal 
      : 'ESTUDO_VIABILIDADE';

    const orcamentoFloat = orcamento ? parseFloat(orcamento) : null;
    const inicioDate = dataInicio ? new Date(dataInicio) : null;
    const fimDate = dataFim ? new Date(dataFim) : null;
    
    let latFloat = latitude ? parseFloat(latitude) : null;
    let lngFloat = longitude ? parseFloat(longitude) : null;

    if (!latFloat && !lngFloat && cep) {
      const coords = await fetchCoordinates(cep, endereco || '');
      latFloat = coords.latitude;
      lngFloat = coords.longitude;
    }

    const areaDecimal = areaTotalTerreno ? parseFloat(areaTotalTerreno) : null;
    const casasPrevistasInt = quantidadeCasasPrevistas ? parseInt(quantidadeCasasPrevistas, 10) : null;
    const valorCompraFloat = valorCompraTerreno ? parseFloat(valorCompraTerreno) : null;
    const amenidadesArray = Array.isArray(amenidades) ? amenidades : [];

    const empreendimento = await db.empreendimento.create({
      data: {
        nome,
        localizacao,
        statusLegal: statusValido,
        dataInicio: inicioDate,
        dataFim: fimDate,
        orcamento: orcamentoFloat,
        endereco,
        cep,
        bairro,
        cidade,
        estado,
        latitude: latFloat,
        longitude: lngFloat,
        areaTotalTerreno: areaDecimal,
        quantidadeCasasPrevistas: casasPrevistasInt,
        proprietarioAnteriorTerreno,
        valorCompraTerreno: valorCompraFloat,
        amenidades: amenidadesArray
      },
    });

    // Auto-gerar as casas planejadas no Backlog na criação do empreendimento
    if (casasPrevistasInt && casasPrevistasInt > 0) {
      const housesData = Array.from({ length: casasPrevistasInt }, (_, index) => {
        const num = (index + 1).toString().padStart(2, '0');
        return {
          numero: num,
          quadra: 'A',
          statusObra: 'BACKLOG' as const,
          percentualObra: 0.0,
          empreendimentoId: empreendimento.id,
        };
      });
      await db.casa.createMany({
        data: housesData
      });
    }

    // Gatilho de Custo do Terreno
    if (valorCompraFloat && valorCompraFloat > 0) {
      const desc = `Aquisição do Terreno - ${nome}`;
      await db.custoGlobal.create({
        data: {
          descricao: desc,
          tipo: 'TERRENO',
          valor: valorCompraFloat
        }
      });
    }

    return NextResponse.json(empreendimento, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar empreendimento:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
