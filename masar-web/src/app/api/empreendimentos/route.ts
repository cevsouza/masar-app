import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { fetchCoordinates } from '@/lib/geocoding';
import { CHAVES_CATALOGO } from '@/lib/mcmv/catalogo';
import { bloqueioNovasUnidades } from '@/lib/licenca';

const FAIXAS_MCMV = ['FAIXA_1', 'FAIXA_2', 'FAIXA_3', 'FAIXA_4'];

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
      amenidades,
      regimeMCMV,
      faixaMCMV,
      tipologia
    } = body;

    if (!nome || !localizacao) {
      return NextResponse.json({ error: 'Nome e localização são obrigatórios' }, { status: 400 });
    }

    const ehMCMV = regimeMCMV === true;
    // Tipologia só muda o vocabulário das telas. Valor desconhecido cai em
    // HORIZONTAL, que é o padrão do banco e o comportamento de sempre.
    const tipologiaFinal = tipologia === 'VERTICAL' ? 'VERTICAL' : 'HORIZONTAL';
    const faixaValida = faixaMCMV && FAIXAS_MCMV.includes(faixaMCMV) ? faixaMCMV : null;
    // RET social (1%) para a faixa de interesse social; demais mantêm o padrão (4%).
    const aliquotaRET = ehMCMV && faixaValida === 'FAIXA_1' ? 1.0 : 4.0;

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

    // Teto da licença. Este caminho cria as casas EM LOTE logo abaixo, então a
    // verificação é pela quantidade prevista — e vem ANTES de criar o
    // empreendimento, para não deixar um empreendimento órfão sem as unidades
    // que o justificavam.
    if (casasPrevistasInt && casasPrevistasInt > 0) {
      const licenca = await bloqueioNovasUnidades(casasPrevistasInt);
      if (licenca.bloqueado) {
        return NextResponse.json(
          { error: 'LIMITE_LICENCA_EXCEDIDO', message: licenca.mensagem },
          { status: 402 },
        );
      }
    }

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
        amenidades: amenidadesArray,
        regimeMCMV: ehMCMV,
        faixaMCMV: ehMCMV ? faixaValida : null,
        tipologia: tipologiaFinal,
        aliquotaRET
      },
    });

    // Regime MCMV: semeia o checklist de conformidade (1 item por chave do catálogo).
    if (ehMCMV) {
      await db.itemConformidadeMCMV.createMany({
        data: CHAVES_CATALOGO.map((chave) => ({ empreendimentoId: empreendimento.id, chave })),
        skipDuplicates: true,
      });
    }

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
      await db.transacaoFinanceira.create({
        data: {
          descricao: `Custo Global [TERRENO] - ${desc}`,
          valor: valorCompraFloat,
          dataVencimento: new Date(),
          natureza: 'DESPESA',
          status: 'PENDENTE',
          categoria: 'TERRENO',
          empreendimentoId: empreendimento.id
        }
      });
    }

    return NextResponse.json(empreendimento, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar empreendimento:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const empreendimentos = await db.empreendimento.findMany({
      orderBy: { nome: 'asc' }
    });
    return NextResponse.json(empreendimentos);
  } catch (error) {
    console.error('Erro ao listar empreendimentos:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
