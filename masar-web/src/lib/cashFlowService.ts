'use server';

import { db } from '@/lib/db';

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
  // 1. Obter o saldo atual de todas as contas bancárias (ou filtrado por empreendimento, se houver)
  // Como as contas bancárias são gerais da empresa, somamos o saldo de todas as contas
  const contas = await db.contaBancaria.findMany();
  const currentBalance = contas.reduce((sum, c) => sum + c.saldoAtual, 0);

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

  // 3. Buscar todas as Casas e Contratos para o cálculo do Custo a Incorrer e das Projeções da Caixa
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
      apropriacoes: true
    }
  });

  // Calcular o Custo a Incorrer Geral
  let totalOrcadoGeral = 0;
  let totalRealizadoGeral = 0;

  casas.forEach(c => {
    if (c.statusObra !== 'CONCLUIDA') {
      const orcado = c.orcamento?.itens.reduce((acc, it) => acc + (it.quantidadePlanejada * it.custoUnitarioPrevisto), 0) || 0;
      const realizado = c.apropriacoes.filter(ap => ap.aprovado).reduce((acc, ap) => acc + ap.custoTotal, 0) || 0;
      totalOrcadoGeral += orcado;
      totalRealizadoGeral += realizado;
    }
  });

  const custoAIncorrerTotal = Math.max(0, totalOrcadoGeral - totalRealizadoGeral);

  // 4. Recebíveis de Curto Prazo (próximos 30 dias)
  const limit30Days = new Date();
  limit30Days.setDate(limit30Days.getDate() + 30);
  
  const contasReceberFilter: any = { pago: false, dataVencimento: { lte: limit30Days } };
  if (empreendimentoId) {
    contasReceberFilter.contrato = { casa: { empreendimentoId } };
  }
  const contasReceberSum = await db.contasAReceberCliente.aggregate({
    where: contasReceberFilter,
    _sum: { valor: true }
  });
  const recebiveisCurtoPrazo = contasReceberSum._sum.valor || 0;
  const caixaLivreReal = (currentBalance + recebiveisCurtoPrazo) - custoAIncorrerTotal;

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
  let runningBalance = currentBalance; // Iniciamos a projeção a partir do saldo atual

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

    if (!isFuture) {
      // DADOS HISTÓRICOS (REALIZADOS)
      // Carregar todas as transações bancárias realizadas neste mês
      const transacoesFilter: any = {
        data: { gte: startOfMonth, lte: endOfMonth }
      };
      
      const transacoes = await db.transacaoBancaria.findMany({
        where: transacoesFilter
      });

      transacoes.forEach(t => {
        if (t.tipo === 'CREDITO') {
          receitasRealizadas += t.valor;
        } else {
          saidasRealizadas += t.valor;
        }
      });
    }

    if (isFuture || (date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear())) {
      // DADOS PROJETADOS (FUTUROS OU PARCIALMENTE FUTUROS NO MÊS ATUAL)
      // A. Recebíveis de Clientes (Boletos)
      const recFilter: any = {
        dataVencimento: { gte: startOfMonth, lte: endOfMonth },
        pago: false
      };
      if (empreendimentoId) {
        recFilter.contrato = { casa: { empreendimentoId } };
      }
      const recSum = await db.contasAReceberCliente.aggregate({
        where: recFilter,
        _sum: { valor: true }
      });
      receitasProjetadas += recSum._sum.valor || 0;

      // B. Receitas Projetadas CEF (Automação do Ciclo Fixo)
      for (const casa of casas) {
        if (casa.statusObra === 'CONCLUIDA') continue;

        // Financiamento Total (CEF repasses totais da unidade)
        const totalCEF = casa.contrato 
          ? casa.contrato.financiamento 
          : (Number(casa.valorVendaProjetado || 0) * 0.8);

        if (totalCEF <= 0) continue;

        // Soma das medições já aprovadas/pagas
        const totalPercentualPago = casa.medicoes
          .filter(m => m.status === 'PAGA')
          .reduce((sum, m) => sum + m.percentualMedido, 0);

        // Estágios e pesos do Minha Casa Minha Vida
        const estagios = [
          { nome: 'INFRAESTRUTURA', peso: 15, cum: 15, label: 'Infraestrutura' },
          { nome: 'SUPRAESTRUTURA', peso: 30, cum: 45, label: 'Alvenaria/Supraestrutura' },
          { nome: 'INSTALACOES', peso: 20, cum: 65, label: 'Instalações' },
          { nome: 'ACABAMENTO', peso: 25, cum: 90, label: 'Acabamentos' },
          { nome: 'VISTORIA_CAIXA', peso: 10, cum: 100, label: 'Vistoria Caixa' }
        ];

        for (const est of estagios) {
          // Se já foi pago, ignora
          if (totalPercentualPago >= est.cum) continue;

          // Determinar a data limite planejada desta etapa
          let dataPlanejada: Date | null = null;

          // 1. Tenta achar um Milestone customizado
          const matchedMilestone = milestones.find(m => 
            m.casaId === casa.id && 
            (m.titulo.toLowerCase().includes(est.nome.toLowerCase()) || 
             m.titulo.toLowerCase().includes(est.label.toLowerCase()))
          );

          if (matchedMilestone) {
            dataPlanejada = matchedMilestone.dataLimite;
          } else {
            // 2. Fallback baseado no prazo físico global da casa
            if (casa.prazoFisico) {
              const baseDate = new Date(casa.prazoFisico);
              if (est.nome === 'INFRAESTRUTURA') baseDate.setMonth(baseDate.getMonth() - 4);
              else if (est.nome === 'SUPRAESTRUTURA') baseDate.setMonth(baseDate.getMonth() - 3);
              else if (est.nome === 'INSTALACOES') baseDate.setMonth(baseDate.getMonth() - 2);
              else if (est.nome === 'ACABAMENTO') baseDate.setMonth(baseDate.getMonth() - 1);
              // Vistoria Caixa é no próprio prazo físico
              dataPlanejada = baseDate;
            } else {
              // 3. Fallback absoluto baseado na criação da casa
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
              // Pula para o dia 25 do próximo mês
              mesRepasse += 1;
              if (mesRepasse > 11) {
                mesRepasse = 0;
                anoRepasse += 1;
              }
            }

            // Verifica se a data de repasse coincide com o mês do loop
            if (mesRepasse === date.getMonth() && anoRepasse === date.getFullYear()) {
              const valorEstagio = totalCEF * (est.peso / 100);
              receitasProjetadas += valorEstagio;
            }
          }
        }
      }

      // C. Custos Globais Projetados (Terreno, Projetos orçados a pagar no mês)
      const globalCostsFilter: any = {
        realizado: false,
        data: { gte: startOfMonth, lte: endOfMonth }
      };
      if (empreendimentoId) {
        globalCostsFilter.empreendimentoId = empreendimentoId;
      }
      const globalCosts = await db.custoGlobal.findMany({
        where: globalCostsFilter
      });
      saidasProjetadas += globalCosts.reduce((sum, gc) => sum + gc.valor, 0);

      // D. Saídas de Obra Projetadas (Distribuição linear do Custo a Incorrer)
      // Distribuímos o custo a incorrer igualmente ao longo dos próximos 6 meses
      if (isFuture) {
        saidasProjetadas += (custoAIncorrerTotal / 6);
      }
    }

    // Calcular Saldo do Período e Acumulado
    const totalEntradas = isFuture ? receitasProjetadas : (receitasRealizadas + receitasProjetadas);
    const totalSaidas = isFuture ? saidasProjetadas : (saidasRealizadas + saidasProjetadas);
    const saldoPeriodo = totalEntradas - totalSaidas;

    // Se for um mês futuro, o saldo acumulado é o do mês anterior mais o saldo projetado do período
    // Se for o presente/passado, podemos usar o saldo calculado ou ajustar acumulado
    if (isFuture) {
      runningBalance += saldoPeriodo;
    } else {
      // Ajuste proporcional do caixa passado com transações reais
      runningBalance = runningBalance + saldoPeriodo;
    }

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
    runwayAlert = `Risco de Ruptura de Caixa detectado para o mês de ${mesRuptura.mes}. Saldo projetado: R$ ${mesRuptura.saldoAcumulado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
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
