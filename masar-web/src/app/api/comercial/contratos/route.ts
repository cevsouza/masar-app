import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const contratos = await db.contratoVenda.findMany({
      include: {
        casa: { include: { empreendimento: true } },
        cliente: true,
        corretor: true,
        transacoes: true,
      },
      orderBy: { dataCriacao: 'desc' },
    });
    return NextResponse.json(contratos);
  } catch (error) {
    console.error('Erro ao buscar contratos:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      casaId, 
      clienteId, 
      corretorId, 
      valorVenda, 
      entrada, 
      financiamento, 
      fgts, 
      subsidio, 
      status, 
      parcelas 
    } = body;

    if (!casaId || !clienteId || !valorVenda) {
      return NextResponse.json({ error: 'Casa, cliente e valor de venda são obrigatórios' }, { status: 400 });
    }

    const valorVendaFloat = parseFloat(valorVenda);
    const entradaFloat = parseFloat(entrada || 0);
    const financiamentoFloat = parseFloat(financiamento || 0);
    const fgtsFloat = parseFloat(fgts || 0);
    const subsidioFloat = parseFloat(subsidio || 0);

    // 1. Validar se a composição do VGV fecha
    const somaComposicao = entradaFloat + financiamentoFloat + fgtsFloat + subsidioFloat;
    if (Math.abs(valorVendaFloat - somaComposicao) > 0.01) {
      return NextResponse.json({ 
        error: `Erro de VGV: A soma de Entrada (R$ ${entradaFloat}), Financiamento (R$ ${financiamentoFloat}), FGTS (R$ ${fgtsFloat}) e Subsídio (R$ ${subsidioFloat}) deve ser exatamente igual ao Valor Geral de Venda (R$ ${valorVendaFloat}).` 
      }, { status: 400 });
    }

    // 2. Verificar se o cliente tem crédito no mínimo APROVADO_CONDICIONADO
    const cliente = await db.cliente.findUnique({ where: { id: clienteId } });
    if (!cliente) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    if (!['APROVADO_CONDICIONADO', 'APROVADO'].includes(cliente.statusCredito)) {
      return NextResponse.json({ 
        error: 'Bloqueio Comercial: O cliente selecionado deve possuir crédito Aprovado ou Aprovado Condicionado na Caixa.' 
      }, { status: 400 });
    }

    // 3. Obter corretor e calcular valor comissão
    let comissaoValor = 0;
    if (corretorId) {
      const corretor = await db.corretor.findUnique({ where: { id: corretorId } });
      if (corretor) {
        comissaoValor = (corretor.comissaoPercentual / 100) * valorVendaFloat;
      }
    }

    // 4. Criar contrato
    const contrato = await db.contratoVenda.create({
      data: {
        casaId,
        clienteId,
        corretorId: corretorId || null,
        valorVenda: valorVendaFloat,
        entrada: entradaFloat,
        financiamento: financiamentoFloat,
        fgts: fgtsFloat,
        subsidio: subsidioFloat,
        comissaoValor,
        status: status || 'EM_PROSPECCAO',
      }
    });

    // 5. Vincular adquirente na Casa correspondente
    await db.casa.update({
      where: { id: casaId },
      data: { clienteId }
    });

    // 6. Cadastrar parcelas a receber
    if (parcelas && Array.isArray(parcelas) && parcelas.length > 0) {
      const casa = await db.casa.findUnique({
        where: { id: casaId },
        select: { empreendimentoId: true }
      });

      const parcelasData = parcelas.map((p: any, index: number) => ({
        descricao: `Sinal/Entrada - Parcela ${index + 1}/${parcelas.length}`,
        valor: parseFloat(p.valor),
        dataVencimento: new Date(p.dataVencimento),
        natureza: 'RECEITA' as const,
        status: 'PENDENTE' as const,
        categoria: 'ENTRADA_CLIENTE' as const,
        empreendimentoId: casa?.empreendimentoId || '',
        casaId,
        clienteId,
        contratoId: contrato.id
      }));

      await db.transacaoFinanceira.createMany({
        data: parcelasData
      });
    }

    return NextResponse.json(contrato, { status: 201 });
  } catch (error) {
    console.error('Erro ao cadastrar contrato:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
