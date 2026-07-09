import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

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

    // 1. Obter todas as transações financeiras vinculadas a este empreendimento
    const transacoes = await db.transacaoFinanceira.findMany({
      where: { empreendimentoId }
    });

    // 2. Aportes de Sócios
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

    // 3. Retiradas de Sócios
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

    // Processar todas as TransacoesFinanceiras
    transacoes.forEach(t => {
      const dataFoco = t.status === 'PAGO' && t.dataPagamento ? t.dataPagamento : t.dataVencimento;
      const mesObj = getOrCreateMes(dataFoco);
      const isReal = t.status === 'PAGO';

      if (t.natureza === 'RECEITA') {
        if (t.categoria === 'MEDICAO_CAIXA') {
          if (isReal) {
            mesObj.entradasMedicoesReal += t.valor;
          } else {
            mesObj.entradasMedicoesPrev += t.valor;
          }
        } else if (t.categoria === 'ENTRADA_CLIENTE') {
          if (isReal) {
            mesObj.entradasClientesReal += t.valor;
          } else {
            mesObj.entradasClientesPrev += t.valor;
          }
        }
      } else {
        // Saídas/Despesas
        if (t.casaId !== null) {
          // Custo direto de obra da unidade
          if (isReal) {
            mesObj.saidasObraReal += t.valor;
          } else {
            mesObj.saidasObraPrev += t.valor;
          }
        } else {
          // Custo global / rateio (sem casaId)
          mesObj.saidasRateiosReal += t.valor;
        }
      }
    });

    // Processar Aportes
    aportes.forEach(a => {
      const mesObj = getOrCreateMes(a.data);
      mesObj.entradasAportesReal += a.valor;
    });

    // Processar Retiradas Sócios
    retiradas.forEach(r => {
      const mesObj = getOrCreateMes(r.data);
      mesObj.saidasRetiradasReal += r.valor;
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
