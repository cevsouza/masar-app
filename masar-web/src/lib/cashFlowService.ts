'use server';

import { db } from '@/lib/db';
import { calcularCaixaLivre } from '@/lib/caixa';

export interface CashFlowMonth {
  mes: string;          // Formato: "Mês/Ano" (ex: "Mai/26")
  ano: number;
  mesNum: number;       // 0-11
  receitasRealizadas: number;
  receitasProjetadas: number;
  saidasRealizadas: number;
  saidasProjetadas: number;
  saldoPeriodo: number;
  saldoAcumulado: number;
  isFuture: boolean;
}

export interface CashFlowResult {
  timeline: CashFlowMonth[];
  currentBalance: number;
  caixaLivreReal: number;
  custoAIncorrerTotal: number;
  recebiveisCurtoPrazo: number;
  runwayAlert: string | null;
}

export async function calcularFluxoCaixaProjetado(empreendimentoId?: string): Promise<CashFlowResult> {
  // 1. Snapshot de caixa livre — FONTE ÚNICA de verdade (ver lib/caixa.ts)
  const snapshot = await calcularCaixaLivre(empreendimentoId);
  const currentBalance = snapshot.saldoBancario;
  const custoAIncorrerTotal = snapshot.custoAIncorrer;
  const recebiveisCurtoPrazo = snapshot.recebiveisCurtoPrazo;
  const caixaLivreReal = snapshot.caixaLivre;

  // 2. Determinar a janela de tempo: 3 meses passados + mês atual + 6 meses futuros (total 10 meses)
  const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const today = new Date();
  const timelineMonths: { date: Date; isFuture: boolean }[] = [];

  // 3 meses passados
  for (let i = 3; i > 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    timelineMonths.push({ date: d, isFuture: false });
  }
  // Mês atual
  timelineMonths.push({ date: new Date(today.getFullYear(), today.getMonth(), 1), isFuture: false });
  // 6 meses futuros
  for (let i = 1; i <= 6; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    timelineMonths.push({ date: d, isFuture: true });
  }

  // 3. Buscar todas as Casas e Contratos para o cálculo do Custo a Incorrer
  const casaFilter: any = {};
  if (empreendimentoId) {
    casaFilter.empreendimentoId = empreendimentoId;
  }

  const casas = await db.casa.findMany({
    where: casaFilter,
    include: {
      medicoes: true,
      contrato: true,
      orcamento: {
        include: { itens: true }
      },
      transacoes: {
        where: {
          natureza: 'DESPESA',
          status: 'PAGO'
        }
      }
    }
  });

  // (custo a incorrer, recebíveis de 30d e caixa livre já vêm do snapshot acima)

  // 5. Carregar todos os Milestones do cronograma físico das casas (para o Ciclo Caixa CEF)
  const milestoneFilter: any = { concluido: false };
  if (empreendimentoId) {
    milestoneFilter.empreendimentoId = empreendimentoId;
  } else {
    milestoneFilter.casaId = { not: null };
  }
  const milestones = await db.milestone.findMany({
    where: milestoneFilter
  });

  // 6. Loop de processamento de cada mês da timeline
  const timeline: CashFlowMonth[] = [];
  let runningBalance = currentBalance;

  for (const item of timelineMonths) {
    const { date, isFuture } = item;
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

    const mesNome = mesesNomes[date.getMonth()];
    const ano = date.getFullYear();
    const label = `${mesNome}/${ano.toString().slice(-2)}`;

    let receitasRealizadas = 0;
    let saidasRealizadas = 0;
    let receitasProjetadas = 0;
    let saidasProjetadas = 0;

    // A. DADOS REALIZADOS (HISTÓRICOS)
    // Transações efetivamente pagas/recebidas ocorridas neste mês
    const transacoesPagasFilter: any = {
      status: 'PAGO',
      dataPagamento: { gte: startOfMonth, lte: endOfMonth }
    };
    if (empreendimentoId) {
      transacoesPagasFilter.empreendimentoId = empreendimentoId;
    }
    const transacoesRealizadas = await db.transacaoFinanceira.findMany({
      where: transacoesPagasFilter
    });

    transacoesRealizadas.forEach(t => {
      if (t.natureza === 'RECEITA') {
        receitasRealizadas += t.valor;
      } else {
        saidasRealizadas += t.valor;
      }
    });

    // B. DADOS PROJETADOS (MÊS CORRENTE E FUTUROS)
    if (isFuture || (date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear())) {
      // 1. Receitas Pendentes/Projetadas de Clientes (Boletos)
      const recFilter: any = {
        natureza: 'RECEITA',
        status: 'PENDENTE',
        categoria: 'ENTRADA_CLIENTE',
        dataVencimento: { gte: startOfMonth, lte: endOfMonth }
      };
      if (empreendimentoId) {
        recFilter.empreendimentoId = empreendimentoId;
      }
      const recSum = await db.transacaoFinanceira.aggregate({
        where: recFilter,
        _sum: { valor: true }
      });
      receitasProjetadas += recSum._sum.valor || 0;

      // 2. Receitas Projetadas CEF (Automação do Ciclo Fixo)
      for (const casa of casas) {
        if (casa.statusObra === 'CONCLUIDA') continue;

        const totalCEF = casa.contrato 
          ? casa.contrato.financiamento 
          : (Number(casa.valorVendaProjetado || 0) * 0.8);

        if (totalCEF <= 0) continue;

        // Soma das medições já pagas
        const totalPercentualPago = casa.medicoes
          .filter(m => m.status === 'PAGA')
          .reduce((sum, m) => sum + m.percentualMedido, 0);

        const estagios = [
          { nome: 'INFRAESTRUTURA', peso: 15, cum: 15, label: 'Infraestrutura' },
          { nome: 'SUPRAESTRUTURA', peso: 30, cum: 45, label: 'Alvenaria/Supraestrutura' },
          { nome: 'INSTALACOES', peso: 20, cum: 65, label: 'Instalações' },
          { nome: 'ACABAMENTO', peso: 25, cum: 90, label: 'Acabamentos' },
          { nome: 'VISTORIA_CAIXA', peso: 10, cum: 100, label: 'Vistoria Caixa' }
        ];

        for (const est of estagios) {
          if (totalPercentualPago >= est.cum) continue;

          let dataPlanejada: Date | null = null;

          const matchedMilestone = milestones.find(m => 
            m.casaId === casa.id && 
            (m.titulo.toLowerCase().includes(est.nome.toLowerCase()) || 
             m.titulo.toLowerCase().includes(est.label.toLowerCase()))
          );

          if (matchedMilestone) {
            dataPlanejada = matchedMilestone.dataLimite;
          } else {
            if (casa.prazoFisico) {
              const baseDate = new Date(casa.prazoFisico);
              if (est.nome === 'INFRAESTRUTURA') baseDate.setMonth(baseDate.getMonth() - 4);
              else if (est.nome === 'SUPRAESTRUTURA') baseDate.setMonth(baseDate.getMonth() - 3);
              else if (est.nome === 'INSTALACOES') baseDate.setMonth(baseDate.getMonth() - 2);
              else if (est.nome === 'ACABAMENTO') baseDate.setMonth(baseDate.getMonth() - 1);
              dataPlanejada = baseDate;
            } else {
              const baseDate = new Date(casa.dataCriacao);
              if (est.nome === 'INFRAESTRUTURA') baseDate.setMonth(baseDate.getMonth() + 2);
              else if (est.nome === 'SUPRAESTRUTURA') baseDate.setMonth(baseDate.getMonth() + 4);
              else if (est.nome === 'INSTALACOES') baseDate.setMonth(baseDate.getMonth() + 6);
              else if (est.nome === 'ACABAMENTO') baseDate.setMonth(baseDate.getMonth() + 8);
              else baseDate.setMonth(baseDate.getMonth() + 9);
              dataPlanejada = baseDate;
            }
          }

          if (dataPlanejada) {
            // Regra do Ciclo Fixo (Corte no dia 15, repasse no dia 25)
            const diaCorte = dataPlanejada.getDate();
            let mesRepasse = dataPlanejada.getMonth();
            let anoRepasse = dataPlanejada.getFullYear();

            if (diaCorte > 15) {
              mesRepasse += 1;
              if (mesRepasse > 11) {
                mesRepasse = 0;
                anoRepasse += 1;
              }
            }

            if (mesRepasse === date.getMonth() && anoRepasse === date.getFullYear()) {
              const valorEstagio = totalCEF * (est.peso / 100);
              receitasProjetadas += valorEstagio;
            }
          }
        }
      }

      // 3. Custos Globais/Macros Projetados (Pendentes, sem casaId)
      const globalCostsFilter: any = {
        natureza: 'DESPESA',
        status: 'PENDENTE',
        casaId: null,
        dataVencimento: { gte: startOfMonth, lte: endOfMonth }
      };
      if (empreendimentoId) {
        globalCostsFilter.empreendimentoId = empreendimentoId;
      }
      const globalCosts = await db.transacaoFinanceira.findMany({
        where: globalCostsFilter
      });
      saidasProjetadas += globalCosts.reduce((sum, gc) => sum + gc.valor, 0);

      // 4. Saídas de Obra Projetadas (Distribuição linear do Custo a Incorrer de obra nos meses futuros)
      if (isFuture) {
        saidasProjetadas += (custoAIncorrerTotal / 6);
      }
    }

    const totalEntradas = isFuture ? receitasProjetadas : (receitasRealizadas + receitasProjetadas);
    const totalSaidas = isFuture ? saidasProjetadas : (saidasRealizadas + saidasProjetadas);
    const saldoPeriodo = totalEntradas - totalSaidas;

    runningBalance += saldoPeriodo;

    timeline.push({
      mes: label,
      ano,
      mesNum: date.getMonth(),
      receitasRealizadas,
      receitasProjetadas,
      saidasRealizadas,
      saidasProjetadas,
      saldoPeriodo,
      saldoAcumulado: runningBalance,
      isFuture
    });
  }

  // 7. Alerta de Runway (Ruptura de Caixa)
  let runwayAlert: string | null = null;
  const mesRuptura = timeline.find(m => m.isFuture && m.saldoAcumulado < 0);
  if (mesRuptura) {
    runwayAlert = `Risco de Ruptura de Caixa detectado para o mês de ${mesRuptura.mes}. Saldo acumulado projetado: R$ ${mesRuptura.saldoAcumulado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  }

  return {
    timeline,
    currentBalance,
    caixaLivreReal,
    custoAIncorrerTotal,
    recebiveisCurtoPrazo,
    runwayAlert
  };
}
