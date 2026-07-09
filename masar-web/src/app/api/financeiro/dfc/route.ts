import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { CategoriaInsumo } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const empreendimentoId = searchParams.get('empreendimentoId');

    if (!empreendimentoId) {
      return NextResponse.json({ error: 'ID do empreendimento é obrigatório' }, { status: 400 });
    }

    const emp = await db.empreendimento.findUnique({
      where: { id: empreendimentoId },
      include: { casas: true }
    });

    if (!emp) {
      return NextResponse.json({ error: 'Empreendimento não encontrado' }, { status: 404 });
    }

    // 1. Receitas de Clientes (Contas a Receber do contrato de venda)
    const contasReceber = await db.contasAReceberCliente.findMany({
      where: {
        contrato: {
          casa: { empreendimentoId }
        }
      },
      select: {
        valor: true,
        dataVencimento: true,
        pago: true
      }
    });

    // 2. Repasses da Caixa (Medições Caixa)
    const medicoes = await db.medicaoCaixa.findMany({
      where: {
        casa: { empreendimentoId }
      },
      select: {
        valorLiberado: true,
        dataMedicao: true,
        status: true
      }
    });

    // 3. Aportes de Sócios
    const aportes = await db.movimentacaoSocio.findMany({
      where: {
        empreendimentoId,
        tipo: 'APORTE'
      },
      select: {
        valor: true,
        data: true
      }
    });

    // 4. Custos Diretos de Construção (Apropriações de Custo)
    const apropriacoes = await db.apropriacaoCusto.findMany({
      where: {
        casa: { empreendimentoId }
      },
      select: {
        custoTotal: true,
        dataAplicacao: true,
        aprovado: true
      }
    });

    // 5. Retiradas de Sócios (Saídas financeiras)
    const retiradas = await db.movimentacaoSocio.findMany({
      where: {
        empreendimentoId,
        tipo: { in: ['RETIRADA_LUCRO', 'PRO_LABORE'] }
      },
      select: {
        valor: true,
        data: true
      }
    });

    // 6. Custos Globais (Terreno, Projetos, Mkt, etc.)
    const totalHouses = await db.casa.count();
    const projectHouses = emp.casas.length;

    const custosGlobais = await db.custoGlobal.findMany({
      where: {
        OR: [
          { empreendimentoId },
          { empreendimentoId: null }
        ]
      }
    });

    const rateados = custosGlobais.map(c => {
      const valor = c.empreendimentoId 
        ? c.valor 
        : (totalHouses > 0 ? (c.valor / totalHouses) * projectHouses : 0);
      return {
        valor,
        data: c.data
      };
    });

    // Agrupamento por Mês
    const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const DFCData: Record<string, {
      mes: string;
      ordem: number;
      entradasMedicoesReal: number;
      entradasMedicoesPrev: number;
      entradasClientesReal: number;
      entradasClientesPrev: number;
      entradasAportesReal: number;
      saidasObraReal: number;
      saidasObraPrev: number;
      saidasRateiosReal: number;
      saidasRetiradasReal: number;
      saldoLiquido: number;
    }> = {};

    const getChaveMes = (d: Date) => {
      const date = new Date(d);
      return {
        chave: `${mesesNomes[date.getMonth()]}/${date.getFullYear()}`,
        ordem: date.getFullYear() * 12 + date.getMonth()
      };
    };

    const getOrCreateMes = (date: Date) => {
      const { chave, ordem } = getChaveMes(date);
      if (!DFCData[chave]) {
        DFCData[chave] = {
          mes: chave,
          ordem,
          entradasMedicoesReal: 0,
          entradasMedicoesPrev: 0,
          entradasClientesReal: 0,
          entradasClientesPrev: 0,
          entradasAportesReal: 0,
          saidasObraReal: 0,
          saidasObraPrev: 0,
          saidasRateiosReal: 0,
          saidasRetiradasReal: 0,
          saldoLiquido: 0
        };
      }
      return DFCData[chave];
    };

    // Processar Medições Caixa
    medicoes.forEach(m => {
      const mesObj = getOrCreateMes(m.dataMedicao);
      if (m.status === 'PAGA') {
        mesObj.entradasMedicoesReal += m.valorLiberado;
      } else {
        mesObj.entradasMedicoesPrev += m.valorLiberado;
      }
    });

    // Processar Contas a Receber Clientes
    contasReceber.forEach(c => {
      const mesObj = getOrCreateMes(c.dataVencimento);
      if (c.pago) {
        mesObj.entradasClientesReal += c.valor;
      } else {
        mesObj.entradasClientesPrev += c.valor;
      }
    });

    // Processar Aportes
    aportes.forEach(a => {
      const mesObj = getOrCreateMes(a.data);
      mesObj.entradasAportesReal += a.valor;
    });

    // Processar Apropriações Obra (Realizado)
    apropriacoes.forEach(ap => {
      const mesObj = getOrCreateMes(ap.dataAplicacao);
      if (ap.aprovado) {
        mesObj.saidasObraReal += ap.custoTotal;
      } else {
        mesObj.saidasObraPrev += ap.custoTotal; // pendente aprov
      }
    });

    // Processar Retiradas Sócios
    retiradas.forEach(r => {
      const mesObj = getOrCreateMes(r.data);
      mesObj.saidasRetiradasReal += r.valor;
    });

    // Processar Custos Globais / Rateios
    rateados.forEach(rt => {
      const mesObj = getOrCreateMes(rt.data);
      mesObj.saidasRateiosReal += rt.valor;
    });

    // Ordenar e calcular saldos líquidos e acumulados
    const dfcSorted = Object.values(DFCData)
      .sort((a, b) => a.ordem - b.ordem);

    let saldoAcumulado = 0;
    const finalData = dfcSorted.map(item => {
      const totalEntradas = item.entradasMedicoesReal + item.entradasClientesReal + item.entradasAportesReal;
      const totalSaidas = item.saidasObraReal + item.saidasRateiosReal + item.saidasRetiradasReal;
      item.saldoLiquido = totalEntradas - totalSaidas;
      saldoAcumulado += item.saldoLiquido;
      return {
        ...item,
        saldoAcumulado
      };
    });

    return NextResponse.json(finalData);
  } catch (error: any) {
    console.error('Erro ao compilar DFC:', error);
    return NextResponse.json({ error: 'Erro interno do servidor', message: error.message }, { status: 500 });
  }
}
