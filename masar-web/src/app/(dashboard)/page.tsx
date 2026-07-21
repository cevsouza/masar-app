import { db } from '@/lib/db';
import CashFlowChart from '@/components/CashFlowChart';
import {
  Building2,
  Home,
  Clock,
  AlertTriangle,
  TrendingUp,
  XCircle,
  ChevronRight,
  ShieldAlert,
  CalendarCheck2,
  FileWarning,
  Wallet,
  PiggyBank,
  Scale,
  HardHat,
  ArrowDownRight,
  ArrowUpRight,
  BookOpen
} from 'lucide-react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth';
import DashboardMilestones from '@/components/DashboardMilestones';
import PrimeiroAcesso from '@/components/PrimeiroAcesso';
import FaixaConfiguracaoInicial from '@/components/FaixaConfiguracaoInicial';
import { identidadeVisualAtual } from '@/lib/empresaVisual';
import { calcularFluxoCaixaProjetado } from '@/lib/cashFlowService';

export const revalidate = 0; // Disable server component caching to reflect real-time updates

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('masar_session')?.value;
  const session = sessionToken ? await verifySession(sessionToken) : null;
  const userRole = session?.role || 'COMERCIAL';
  const hasProjectsAccess = ['ADMIN', 'FINANCEIRO', 'ENGENHARIA'].includes(userRole);
  const hasFinanceAccess = ['ADMIN', 'FINANCEIRO'].includes(userRole);

  const today = new Date();

  // 1. Queries de leitura rápida direta no Prisma
  const totalCasas = await db.casa.count();
  const casasEmObra = await db.casa.count({
    where: {
      statusObra: { notIn: ['BACKLOG', 'CONCLUIDA'] }
    }
  });
  
  const totalEmpreendimentos = await db.empreendimento.count();

  // PRIMEIRO ACESSO: conta recém-provisionada, ainda sem nenhum empreendimento.
  //
  // Sai daqui antes das queries pesadas — nada abaixo tem o que somar, e o
  // cliente que acabou de assinar veria uma parede de indicadores zerados, que
  // se lê como "o sistema está quebrado". O assistente guiado já existe em
  // /gestao/onboarding; esta tela é a porta que leva até ele.
  if (totalEmpreendimentos === 0) {
    const marca = await identidadeVisualAtual();
    return (
      <PrimeiroAcesso
        marcaNome={marca.nome}
        podeConfigurar={['ADMIN', 'FINANCEIRO'].includes(userRole)}
        nomeUsuario={session?.nome}
      />
    );
  }

  // Soma de medições por status
  const resumoMedicoes = await db.medicaoCaixa.groupBy({
    by: ['status'],
    _sum: {
      valorLiberado: true
    }
  });

  const getSomaPorStatus = (status: 'PAGA' | 'AGUARDANDO' | 'GLOSADA_REPROVADA') => {
    const item = resumoMedicoes.find(r => r.status === status);
    return item?._sum.valorLiberado || 0;
  };

  const valorPago = getSomaPorStatus('PAGA');
  const valorPendente = getSomaPorStatus('AGUARDANDO');
  const valorGlosado = getSomaPorStatus('GLOSADA_REPROVADA');

  // Verificar se existe glosa ativa para alerta geral
  const hasGlosaAtiva = valorGlosado > 0;

  // 2. Leitura detalhada de Empreendimentos, Marcos Burocráticos e Casas
  const projectsWithMarcos = await db.empreendimento.findMany({
    include: {
      marcos: true,
      casas: {
        include: {
          medicoes: true
        }
      }
    }
  });

  const allCasas = await db.casa.findMany({
    include: {
      medicoes: true,
      empreendimento: true,
      cliente: true
    }
  });

  // RADAR 1: Empreendimentos ativos sem Alvará de Prefeitura aprovado
  const semAlvara = projectsWithMarcos.filter(p => {
    const isAtivo = p.statusLegal === 'EM_OBRA' || p.statusLegal === 'APROVACAO_CAIXA';
    const temAlvaraAprovado = p.marcos.some(m => m.tipo === 'ALVARA_PREFEITURA' && m.dataAprovacaoReal !== null);
    return isAtivo && !temAlvaraAprovado;
  });

  // RADAR 2: Casas com descompasso físico-financeiro superior a 10%
  const casasDescompasso = allCasas.filter(casa => {
    const totalMedido = casa.medicoes
      .filter(m => m.status === 'PAGA')
      .reduce((acc, m) => acc + m.percentualMedido, 0);
    return Math.abs(casa.percentualObra - totalMedido) > 10;
  });

  // RADAR 3: Casas prontas sem Habite-se aprovado (risco Juros de Obra CEF)
  const casasSemHabiteSe = allCasas.filter(casa => {
    const isPronta = casa.statusObra === 'CONCLUIDA';
    const projectMarcos = projectsWithMarcos.find(p => p.id === casa.empreendimentoId)?.marcos || [];
    const temHabiteseAprovado = projectMarcos.some(m => m.tipo === 'HABITESE' && m.dataAprovacaoReal !== null);
    return isPronta && !temHabiteseAprovado;
  });

  // Motor de SLA: Marcos Burocráticos Atrasados (protocolo + prazo esperado < hoje)
  const allMarcos = await db.marcoBurocratico.findMany({
    include: {
      empreendimento: true
    }
  });

  const marcosAtrasados = allMarcos.filter(m => {
    if (m.dataAprovacaoReal) return false;
    const dataLimite = new Date(m.dataProtocolo);
    dataLimite.setDate(dataLimite.getDate() + m.prazoEsperadoDias);
    return dataLimite < today;
  });

  // 3. Gráfico de Fluxo de Caixa Geral (Entradas vs. Saídas)
  const transacoesPagas = await db.transacaoFinanceira.findMany({
    where: { status: 'PAGO' }
  });

  const aportesSocios = await db.movimentacaoSocio.findMany({
    where: { tipo: 'APORTE' },
    select: { valor: true, data: true }
  });

  const retiradasSocios = await db.movimentacaoSocio.findMany({
    where: { tipo: { in: ['RETIRADA_LUCRO', 'PRO_LABORE'] } },
    select: { valor: true, data: true }
  });

  const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const agruparPorMes: Record<string, { previsto: number; realizado: number }> = {}; // previsto = Entradas, realizado = Saídas

  const getChave = (d: Date) => {
    const date = new Date(d);
    return `${mesesNomes[date.getMonth()]}/${date.getFullYear()}`;
  };

  transacoesPagas.forEach(t => {
    const dataFoco = t.dataPagamento || t.dataVencimento;
    const chave = getChave(dataFoco);
    if (!agruparPorMes[chave]) agruparPorMes[chave] = { previsto: 0, realizado: 0 };
    
    if (t.natureza === 'RECEITA') {
      agruparPorMes[chave].previsto += t.valor;
    } else {
      agruparPorMes[chave].realizado += t.valor;
    }
  });

  aportesSocios.forEach(ap => {
    const chave = getChave(ap.data);
    if (!agruparPorMes[chave]) agruparPorMes[chave] = { previsto: 0, realizado: 0 };
    agruparPorMes[chave].previsto += ap.valor;
  });

  retiradasSocios.forEach(r => {
    const chave = getChave(r.data);
    if (!agruparPorMes[chave]) agruparPorMes[chave] = { previsto: 0, realizado: 0 };
    agruparPorMes[chave].realizado += r.valor;
  });

  const chartData = Object.entries(agruparPorMes)
    .map(([mes, valores]) => ({
      mes,
      previsto: valores.previsto,
      realizado: valores.realizado,
    }))
    .sort((a, b) => {
      // Sort chronologically
      const parseMes = (m: string) => {
        const [mesN, ano] = m.split('/');
        const mesIdx = mesesNomes.indexOf(mesN);
        return parseInt(ano) * 12 + mesIdx;
      };
      return parseMes(a.mes) - parseMes(b.mes);
    })
    .slice(-6);

  const totalEntradasGerais = transacoesPagas.filter(t => t.natureza === 'RECEITA').reduce((acc: number, t: any) => acc + t.valor, 0) +
                              aportesSocios.reduce((acc: number, a: any) => acc + a.valor, 0);

  // Casas com problemas/gargalos (Glosadas ou Aguardando)
  const casasGargalo = await db.casa.findMany({
    where: {
      medicoes: {
        some: {
          status: { in: ['GLOSADA_REPROVADA', 'AGUARDANDO'] }
        }
      }
    },
    include: {
      empreendimento: true,
      cliente: true,
      medicoes: {
        orderBy: { dataMedicao: 'desc' }
      }
    }
  });

  const milestones = await db.milestone.findMany({
    include: {
      empreendimento: { select: { nome: true } },
      casa: { select: { numero: true, quadra: true } }
    },
    orderBy: { dataLimite: 'asc' }
  });

  const allEmpreendimentosList = await db.empreendimento.findMany({
    select: { id: true, nome: true },
    orderBy: { nome: 'asc' }
  });

  const allCasasForMilestone = await db.casa.findMany({
    select: { id: true, numero: true, quadra: true, empreendimentoId: true },
    orderBy: [
      { quadra: 'asc' },
      { numero: 'asc' }
    ]
  });

  // Feed de últimos diários de obra registrados no canteiro (visão do sócio)
  const diariosRecentes = await db.diarioDeObra.findMany({
    orderBy: { data: 'desc' },
    take: 12,
    include: {
      casa: {
        select: {
          numero: true,
          quadra: true,
          empreendimento: { select: { nome: true } },
        },
      },
    },
  });

  const serializedMilestones = milestones.map(m => ({
    id: m.id,
    titulo: m.titulo,
    descricao: m.descricao,
    categoria: m.categoria,
    dataLimite: m.dataLimite.toISOString(),
    dataConclusao: m.dataConclusao ? m.dataConclusao.toISOString() : null,
    concluido: m.concluido,
    empreendimentoId: m.empreendimentoId,
    empreendimento: m.empreendimento,
    casaId: m.casaId,
    casa: m.casa
  }));

  // ===== PAINEL DO SÓCIO: caixa, resultado e saúde de orçamento (só ADMIN/FINANCEIRO) =====
  let socioSnapshot: {
    saldoConta: number;
    caixaLivre: number;
    custoAIncorrer: number;
    runwayAlert: string | null;
    receitasRecebidas: number;
    despesasPagas: number;
    resultadoCaixa: number;
    orcadoAtivas: number;
    gastoAtivas: number;
    casasDentro: number;
    casasEstouradas: number;
    casasAtivas: number;
  } | null = null;

  if (hasFinanceAccess) {
    const fluxo = await calcularFluxoCaixaProjetado();

    const receitasRecebidas = transacoesPagas
      .filter(t => t.natureza === 'RECEITA')
      .reduce((acc, t) => acc + t.valor, 0);
    const despesasPagas = transacoesPagas
      .filter(t => t.natureza === 'DESPESA')
      .reduce((acc, t) => acc + t.valor, 0);

    // Saúde de orçamento das obras (regime de competência, consistente com a ficha da casa)
    const casasAtivasBudget = await db.casa.findMany({
      where: { statusObra: { notIn: ['CONCLUIDA'] } },
      include: {
        orcamento: { include: { itens: true } },
        transacoes: { where: { natureza: 'DESPESA' } }
      }
    });

    let orcadoAtivas = 0;
    let gastoAtivas = 0;
    let casasDentro = 0;
    let casasEstouradas = 0;
    casasAtivasBudget.forEach(c => {
      const orcado = c.orcamento?.itens.reduce((acc, it) => acc + (it.quantidadePlanejada * it.custoUnitarioPrevisto), 0) || 0;
      const gasto = c.transacoes.reduce((acc, t) => acc + t.valor, 0);
      orcadoAtivas += orcado;
      gastoAtivas += gasto;
      if (orcado > 0 && gasto > orcado) casasEstouradas += 1;
      else casasDentro += 1;
    });

    socioSnapshot = {
      saldoConta: fluxo.currentBalance,
      caixaLivre: fluxo.caixaLivreReal,
      custoAIncorrer: fluxo.custoAIncorrerTotal,
      runwayAlert: fluxo.runwayAlert,
      receitasRecebidas,
      despesasPagas,
      resultadoCaixa: receitasRecebidas - despesasPagas,
      orcadoAtivas,
      gastoAtivas,
      casasDentro,
      casasEstouradas,
      casasAtivas: casasAtivasBudget.length
    };
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(val);
  };

  const formatDate = (dateStr: string | Date) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const formatDateTime = (dateStr: string | Date) => {
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const CLIMA_UI: Record<string, { label: string; cls: string }> = {
    BOM: { label: 'Tempo bom', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    CHUVA: { label: 'Chuva', cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    IMPRATICAVEL: { label: 'Paralisada', cls: 'bg-red-500/10 text-red-400 border-red-500/20' },
  };

  return (
    <div className="space-y-6">
      {/* Cadastro ainda incompleto: leva de volta ao assistente guiado. */}
      <FaixaConfiguracaoInicial />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl font-sans">Dashboard Executivo</h1>
          <p className="text-sm text-slate-400 mt-1">
            Sua visão do dia: caixa, andamento das obras e o que precisa de atenção.
          </p>
        </div>
        <div className="text-xs text-slate-500 font-medium bg-[#151b2c] border border-[#1e293b] px-3.5 py-1.5 rounded-full self-start md:self-auto">
          Dados atualizados em tempo real
        </div>
      </div>

      {/* PAINEL DO SÓCIO: caixa, resultado e saúde das obras */}
      {socioSnapshot && (() => {
        const s = socioSnapshot;
        const percentConsumido = s.orcadoAtivas > 0 ? Math.min(100, (s.gastoAtivas / s.orcadoAtivas) * 100) : 0;
        const estourouGeral = s.gastoAtivas > s.orcadoAtivas && s.orcadoAtivas > 0;
        return (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Painel do Sócio</h3>

            {/* Runway (ruptura de caixa projetada) */}
            {s.runwayAlert && (
              <div className="bg-red-950/40 border border-red-500/30 rounded-2xl p-4 flex items-start gap-3">
                <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={20} />
                <div>
                  <h4 className="text-sm font-bold text-red-400 leading-tight">Atenção ao caixa</h4>
                  <p className="text-xs text-red-200/80 mt-1 leading-relaxed">{s.runwayAlert}</p>
                </div>
              </div>
            )}

            {/* Manchete de caixa e resultado */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Caixa livre (herói) */}
              <Link
                href="/financeiro?tab=projecao"
                className={`glassmorphism p-5 rounded-2xl border block transition hover:bg-slate-800/5 cursor-pointer ${s.caixaLivre >= 0 ? 'border-emerald-500/25 hover:border-emerald-500/40' : 'border-red-500/25 hover:border-red-500/40'}`}
              >
                <div className="flex justify-between items-start">
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Caixa livre hoje</span>
                  <span className={`p-2 rounded-lg ${s.caixaLivre >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}><PiggyBank size={18} /></span>
                </div>
                <h3 className={`text-2xl font-bold mt-3 ${s.caixaLivre >= 0 ? 'text-emerald-400' : 'text-red-500'}`}>{formatCurrency(s.caixaLivre)}</h3>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Saldo em conta + recebíveis de 30 dias, menos o custo de obra ainda a pagar ({formatCurrency(s.custoAIncorrer)}).
                </p>
              </Link>

              {/* Saldo em conta */}
              <Link
                href="/socios/caixa"
                className="glassmorphism p-5 rounded-2xl border border-slate-800 block transition hover:bg-slate-800/5 hover:border-blue-500/40 cursor-pointer"
              >
                <div className="flex justify-between items-start">
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Saldo em conta</span>
                  <span className="p-2 bg-blue-500/10 text-blue-400 rounded-lg"><Wallet size={18} /></span>
                </div>
                <h3 className="text-2xl font-bold text-white mt-3">{formatCurrency(s.saldoConta)}</h3>
                <p className="text-[11px] text-slate-500 mt-1">Somatório das contas bancárias da construtora.</p>
              </Link>

              {/* Resultado de caixa realizado */}
              <div className="glassmorphism p-5 rounded-2xl border border-slate-800">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Resultado de caixa</span>
                  <span className={`p-2 rounded-lg ${s.resultadoCaixa >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}><Scale size={18} /></span>
                </div>
                <h3 className={`text-2xl font-bold mt-3 ${s.resultadoCaixa >= 0 ? 'text-emerald-400' : 'text-red-500'}`}>{formatCurrency(s.resultadoCaixa)}</h3>
                <div className="flex items-center gap-3 text-[11px] mt-1.5">
                  <span className="flex items-center gap-1 text-emerald-400"><ArrowUpRight size={12} /> {formatCurrency(s.receitasRecebidas)}</span>
                  <span className="flex items-center gap-1 text-red-400"><ArrowDownRight size={12} /> {formatCurrency(s.despesasPagas)}</span>
                </div>
              </div>
            </div>

            {/* Saúde de orçamento das obras */}
            <Link
              href="/casas"
              className="glassmorphism p-5 rounded-2xl border border-slate-800 block transition hover:bg-slate-800/5 hover:border-indigo-500/40 cursor-pointer"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className={`p-2.5 rounded-xl ${estourouGeral ? 'bg-red-500/10 text-red-400' : 'bg-indigo-500/10 text-indigo-400'}`}><HardHat size={20} /></span>
                  <div>
                    <h4 className="text-sm font-bold text-white leading-tight">Saúde das obras</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {s.casasAtivas} casas em obra ·{' '}
                      <span className="text-emerald-400 font-semibold">{s.casasDentro} no orçamento</span>
                      {s.casasEstouradas > 0 && (
                        <> · <span className="text-red-400 font-semibold">{s.casasEstouradas} estourando</span></>
                      )}
                    </p>
                  </div>
                </div>
                <div className="text-left md:text-right shrink-0">
                  <p className="text-xs text-slate-400">
                    Gasto <span className="font-bold text-white">{formatCurrency(s.gastoAtivas)}</span> de <span className="font-semibold text-slate-300">{formatCurrency(s.orcadoAtivas)}</span> orçados
                  </p>
                  <p className={`text-xs font-bold mt-0.5 ${estourouGeral ? 'text-red-400' : 'text-slate-300'}`}>{percentConsumido.toFixed(0)}% consumido</p>
                </div>
              </div>
              <div className="mt-3 h-2 w-full bg-slate-800/60 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${estourouGeral ? 'bg-red-500' : percentConsumido > 85 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${percentConsumido}%` }}
                />
              </div>
            </Link>
          </div>
        );
      })()}

      {/* FEED: Últimos diários de obra registrados no canteiro */}
      <div className="glassmorphism rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-[#1e293b] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-amber-500/10 text-amber-400 rounded-lg"><BookOpen size={18} /></span>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">Diário de obras — últimos registros</h3>
              <p className="text-xs text-slate-400 mt-0.5">O que o canteiro apontou nas obras. Paralisação e ocorrência ficam em destaque.</p>
            </div>
          </div>
          <Link href="/canteiro/diario" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition shrink-0">
            Abrir diário
          </Link>
        </div>

        {diariosRecentes.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            Nenhum diário de obra registrado ainda.
          </div>
        ) : (
          <div className="divide-y divide-[#1e293b]">
            {diariosRecentes.map((d) => {
              const clima = CLIMA_UI[d.clima] || { label: d.clima, cls: 'bg-slate-500/10 text-slate-400 border-slate-500/20' };
              const temOcorrencia = d.ocorrencias && d.ocorrencias.trim().length > 0;
              const local = `Qd ${d.casa.quadra}, Casa ${d.casa.numero}`;
              return (
                <div key={d.id} className="p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3 hover:bg-slate-800/10 transition">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-white">{local}</span>
                      <span className="text-xs text-slate-400">({d.casa.empreendimento?.nome})</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${clima.cls}`}>{clima.label}</span>
                      {temOcorrencia && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-orange-500/10 text-orange-400 border-orange-500/20 flex items-center gap-1">
                          <AlertTriangle size={10} /> Ocorrência
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">{d.atividadesExecutadas}</p>
                    {temOcorrencia && (
                      <p className="text-xs text-orange-300/90 leading-relaxed line-clamp-2">
                        <span className="font-semibold">Ocorrência:</span> {d.ocorrencias}
                      </p>
                    )}
                  </div>
                  <div className="text-left sm:text-right shrink-0 space-y-0.5">
                    <p className="text-xs font-semibold text-slate-300">{formatDateTime(d.data)}</p>
                    <p className="text-[11px] text-slate-500">{d.efetivoTrabalhadores} trab.</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* RADARES DE RISCO (PREVENÇÃO DE PREJUÍZOS) */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Riscos a evitar</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* Radar 1: Projetos sem Alvará */}
          {hasProjectsAccess ? (
            <Link 
              href="/empreendimentos" 
              className={`glassmorphism p-5 rounded-2xl border transition hover:bg-slate-800/5 hover:border-indigo-500/40 block cursor-pointer ${semAlvara.length > 0 ? 'border-red-500/25 bg-red-950/5' : 'border-slate-800'}`}
            >
              <div className="flex items-center gap-3">
                <span className={`p-2 rounded-xl ${semAlvara.length > 0 ? 'bg-red-500/10 text-red-400 animate-pulse' : 'bg-emerald-500/10 text-emerald-400'}`}>
                  <ShieldAlert size={20} />
                </span>
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Alvarás Pendentes</h4>
                  <p className="text-xl font-extrabold text-white mt-1">
                    {semAlvara.length} <span className="text-[10px] text-slate-400 font-normal">projetos</span>
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                {semAlvara.length > 0 
                  ? `Projetos ativos em CAIXA/OBRA sem Alvará de Prefeitura aprovado: ${semAlvara.map(p => p.nome).join(', ')}.`
                  : 'Todos os projetos ativos possuem Alvarás de Prefeitura deferidos.'}
              </p>
            </Link>
          ) : (
            <div className={`glassmorphism p-5 rounded-2xl border ${semAlvara.length > 0 ? 'border-red-500/25 bg-red-950/5' : 'border-slate-800'} opacity-75`}>
              <div className="flex items-center gap-3">
                <span className={`p-2 rounded-xl ${semAlvara.length > 0 ? 'bg-red-500/10 text-red-400 animate-pulse' : 'bg-emerald-500/10 text-emerald-400'}`}>
                  <ShieldAlert size={20} />
                </span>
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Alvarás Pendentes</h4>
                  <p className="text-xl font-extrabold text-white mt-1">
                    {semAlvara.length} <span className="text-[10px] text-slate-400 font-normal">projetos</span>
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                {semAlvara.length > 0 
                  ? `Projetos ativos em CAIXA/OBRA sem Alvará de Prefeitura aprovado: ${semAlvara.map(p => p.nome).join(', ')}.`
                  : 'Todos os projetos ativos possuem Alvarás de Prefeitura deferidos.'}
              </p>
            </div>
          )}

          {/* Radar 2: Descompasso Físico-Financeiro */}
          <Link 
            href="#gargalos" 
            className={`glassmorphism p-5 rounded-2xl border transition hover:bg-slate-800/5 hover:border-indigo-500/40 block cursor-pointer ${casasDescompasso.length > 0 ? 'border-red-500/25 bg-red-950/5' : 'border-slate-800'}`}
          >
            <div className="flex items-center gap-3">
              <span className={`p-2 rounded-xl ${casasDescompasso.length > 0 ? 'bg-red-500/10 text-red-400 animate-pulse' : 'bg-emerald-500/10 text-emerald-400'}`}>
                <FileWarning size={20} />
              </span>
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Descompasso Obra</h4>
                <p className="text-xl font-extrabold text-white mt-1">
                  {casasDescompasso.length} <span className="text-[10px] text-slate-400 font-normal">casas</span>
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-3 leading-relaxed">
              {casasDescompasso.length > 0 
                ? 'Casas onde a obra física e o que a Caixa já pagou estão descasados em mais de 10% — risco de glosa na vistoria.'
                : 'Todas as unidades com a obra física alinhada ao que a Caixa já pagou.'}
            </p>
          </Link>

          {/* Radar 3: Casas prontas sem Habite-se */}
          {hasProjectsAccess ? (
            <Link 
              href="/empreendimentos" 
              className={`glassmorphism p-5 rounded-2xl border transition hover:bg-slate-800/5 hover:border-indigo-500/40 block cursor-pointer ${casasSemHabiteSe.length > 0 ? 'border-red-500/25 bg-red-950/5' : 'border-slate-800'}`}
            >
              <div className="flex items-center gap-3">
                <span className={`p-2 rounded-xl ${casasSemHabiteSe.length > 0 ? 'bg-red-500/10 text-red-400 animate-pulse' : 'bg-emerald-500/10 text-emerald-400'}`}>
                  <CalendarCheck2 size={20} />
                </span>
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Habite-se Atrasado</h4>
                  <p className="text-xl font-extrabold text-white mt-1">
                    {casasSemHabiteSe.length} <span className="text-[10px] text-slate-400 font-normal">unidades</span>
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                {casasSemHabiteSe.length > 0 
                  ? 'Casas prontas sem Habite-se emitido (cobrança continuada de juros de obra CEF aos adquirentes).'
                  : 'Nenhum risco de juros de obra estendido por falta de Habite-se.'}
              </p>
            </Link>
          ) : (
            <div className={`glassmorphism p-5 rounded-2xl border ${casasSemHabiteSe.length > 0 ? 'border-red-500/25 bg-red-950/5' : 'border-slate-800'} opacity-75`}>
              <div className="flex items-center gap-3">
                <span className={`p-2 rounded-xl ${casasSemHabiteSe.length > 0 ? 'bg-red-500/10 text-red-400 animate-pulse' : 'bg-emerald-500/10 text-emerald-400'}`}>
                  <CalendarCheck2 size={20} />
                </span>
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Habite-se Atrasado</h4>
                  <p className="text-xl font-extrabold text-white mt-1">
                    {casasSemHabiteSe.length} <span className="text-[10px] text-slate-400 font-normal">unidades</span>
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                {casasSemHabiteSe.length > 0 
                  ? 'Casas prontas sem Habite-se emitido (cobrança continuada de juros de obra CEF aos adquirentes).'
                  : 'Nenhum risco de juros de obra estendido por falta de Habite-se.'}
              </p>
            </div>
          )}

        </div>
      </div>

      {/* Alerta de Glosa (Crítico) */}
      {hasGlosaAtiva && (
        <div className="bg-red-950/40 border border-red-500/30 rounded-2xl p-5 flex items-start gap-4 animate-pulse">
          <div className="p-3 bg-red-900/40 border border-red-500/20 text-red-500 rounded-xl">
            <AlertTriangle size={24} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-red-400 leading-tight">Alerta de Fluxo de Caixa: Glosa de Medição</h3>
            <p className="text-sm text-red-200/80 mt-1.5 leading-relaxed">
              Há pelo menos uma medição que foi <strong>REPROVADA/GLOSADA</strong> pela Caixa Econômica Federal.
              Isso impede a liberação de recursos de <strong>{formatCurrency(valorGlosado)}</strong>, gerando um descompasso financeiro imediato.
            </p>
            <div className="mt-3.5 flex gap-3">
              <Link 
                href="#gargalos" 
                className="text-xs font-semibold bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg transition-all cursor-pointer"
              >
                Ver Gargalos
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* SLA Burocrático Alert */}
      {marcosAtrasados.length > 0 && (
        <div className="bg-amber-950/40 border border-amber-500/30 rounded-2xl p-5 flex items-start gap-4">
          <div className="p-3 bg-amber-900/40 border border-amber-500/20 text-amber-500 rounded-xl">
            <Clock size={24} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-amber-400 leading-tight">Prazos de licenças estourados</h3>
            <div className="text-sm text-amber-200/80 mt-1.5 space-y-1.5 leading-relaxed">
              <p>Estes marcos de licenciamento passaram do prazo e precisam de ação:</p>
              <ul className="list-disc pl-5 mt-1 space-y-1">
                {marcosAtrasados.map(m => {
                  const dataLimite = new Date(m.dataProtocolo);
                  dataLimite.setDate(dataLimite.getDate() + m.prazoEsperadoDias);
                  return (
                    <li key={m.id}>
                      <strong>{m.tipo.replace('_', ' ')}</strong> do projeto <em>{m.empreendimento.nome}</em> (Vencido em {formatDate(dataLimite)})
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Empreendimentos */}
        {hasProjectsAccess ? (
          <Link 
            href="/empreendimentos" 
            className="glassmorphism p-5 rounded-2xl space-y-4 block transition hover:bg-slate-800/5 hover:border-blue-500/40 cursor-pointer"
          >
            <div className="flex justify-between items-start">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Projetos Ativos</span>
              <span className="p-2 bg-blue-500/10 text-blue-400 rounded-lg"><Building2 size={18} /></span>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">{totalEmpreendimentos}</h3>
              <p className="text-xs text-slate-500 mt-1">Registrados na base de dados</p>
            </div>
          </Link>
        ) : (
          <div className="glassmorphism p-5 rounded-2xl space-y-4 opacity-75">
            <div className="flex justify-between items-start">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Projetos Ativos</span>
              <span className="p-2 bg-blue-500/10 text-blue-400 rounded-lg"><Building2 size={18} /></span>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">{totalEmpreendimentos}</h3>
              <p className="text-xs text-slate-500 mt-1">Registrados na base de dados</p>
            </div>
          </div>
        )}

        {/* Casas em Obra */}
        {hasProjectsAccess ? (
          <Link 
            href="/empreendimentos" 
            className="glassmorphism p-5 rounded-2xl space-y-4 block transition hover:bg-slate-800/5 hover:border-indigo-500/40 cursor-pointer"
          >
            <div className="flex justify-between items-start">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Casas em Obra</span>
              <span className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg"><Home size={18} /></span>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">{casasEmObra} <span className="text-xs text-slate-500 font-normal">/ {totalCasas}</span></h3>
              <p className="text-xs text-slate-500 mt-1">Com execução física ativa</p>
            </div>
          </Link>
        ) : (
          <div className="glassmorphism p-5 rounded-2xl space-y-4 opacity-75">
            <div className="flex justify-between items-start">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Casas em Obra</span>
              <span className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg"><Home size={18} /></span>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">{casasEmObra} <span className="text-xs text-slate-500 font-normal">/ {totalCasas}</span></h3>
              <p className="text-xs text-slate-500 mt-1">Com execução física ativa</p>
            </div>
          </div>
        )}

        {/* Medições Pendentes */}
        {hasProjectsAccess ? (
          <Link 
            href="/empreendimentos" 
            className="glassmorphism p-5 rounded-2xl space-y-4 block transition hover:bg-slate-800/5 hover:border-amber-500/40 cursor-pointer"
          >
            <div className="flex justify-between items-start">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Aguardando Caixa</span>
              <span className="p-2 bg-amber-500/10 text-amber-400 rounded-lg"><Clock size={18} /></span>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-amber-400">{formatCurrency(valorPendente)}</h3>
              <p className="text-xs text-slate-500 mt-1">Valor enviado em medição</p>
            </div>
          </Link>
        ) : (
          <div className="glassmorphism p-5 rounded-2xl space-y-4 opacity-75">
            <div className="flex justify-between items-start">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Aguardando Caixa</span>
              <span className="p-2 bg-amber-500/10 text-amber-400 rounded-lg"><Clock size={18} /></span>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-amber-400">{formatCurrency(valorPendente)}</h3>
              <p className="text-xs text-slate-500 mt-1">Valor enviado em medição</p>
            </div>
          </div>
        )}

        {/* Total Glosado */}
        <Link 
          href="#gargalos" 
          className={`glassmorphism p-5 rounded-2xl space-y-4 border transition hover:bg-slate-800/5 hover:border-red-500/40 cursor-pointer ${hasGlosaAtiva ? 'border-red-500/30' : ''}`}
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Valor Glosado</span>
            <span className={`p-2 rounded-lg ${hasGlosaAtiva ? 'bg-red-500/20 text-red-500' : 'bg-slate-500/10 text-slate-400'}`}><XCircle size={18} /></span>
          </div>
          <div>
            <h3 className={`text-2xl font-bold ${hasGlosaAtiva ? 'text-red-500' : 'text-slate-300'}`}>{formatCurrency(valorGlosado)}</h3>
            <p className="text-xs text-slate-500 mt-1">Retido/Reprovado pela CEF</p>
          </div>
        </Link>
      </div>

      {/* Gráfico de Fluxo de Caixa */}
      <div className="glassmorphism p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-white">Fluxo de Caixa Geral da Construtora</h3>
            <p className="text-xs text-slate-400 font-sans">
              Comparativo de receitas gerais (medições pagas, parcelas de compradores, aportes) versus despesas (obras, rateios, retiradas)
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md">
            <TrendingUp size={14} /> Entradas Consolidadas: {formatCurrency(totalEntradasGerais)}
          </div>
        </div>
        <CashFlowChart data={chartData} />
      </div>

  {/* Agenda de Marcos Críticos & Pitfalls */}
  <DashboardMilestones 
    initialMilestones={serializedMilestones} 
    empreendimentos={allEmpreendimentosList}
    casas={allCasasForMilestone}
  />

  {/* Lista de Gargalos Físicos / Financeiros */}
      <div id="gargalos" className="glassmorphism rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-[#1e293b]">
          <h3 className="text-lg font-bold text-white">Casas que precisam de atenção</h3>
          <p className="text-xs text-slate-400">Casas com medição pendente ou glosada, que travam a entrada de caixa</p>
        </div>
        
        {casasGargalo.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            Nenhum gargalo físico ou financeiro detectado no momento.
          </div>
        ) : (
          <div className="divide-y divide-[#1e293b]">
            {casasGargalo.map((casa) => {
              const ultimaMedicao = casa.medicoes[0]; // mais recente
              const isGlosada = ultimaMedicao?.status === 'GLOSADA_REPROVADA';

              return (
                <div key={casa.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-800/10 transition">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm font-bold text-white">
                        Casa {casa.numero} - Quadra {casa.quadra}
                      </span>
                      <span className="text-xs text-slate-500 font-medium text-slate-400">
                        ({casa.empreendimento.nome})
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span>Execução Física: <strong>{casa.percentualObra}%</strong> ({casa.statusObra.replace('_', ' ')})</span>
                      <span>•</span>
                      <span>Cliente: <strong>{casa.cliente?.nome || 'Estoque (Sem Venda)'}</strong></span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between md:justify-end gap-6">
                    <div className="text-left md:text-right">
                      <div className="flex items-center gap-2 md:justify-end">
                        <span className={`w-2.5 h-2.5 rounded-full ${isGlosada ? 'bg-red-500 animate-pulse' : 'bg-amber-500'}`} />
                        <span className={`text-xs font-bold ${isGlosada ? 'text-red-400' : 'text-amber-400'}`}>
                          {ultimaMedicao ? ultimaMedicao.status.replace('_', ' ') : 'N/A'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Valor: <span className="font-semibold text-slate-200">{formatCurrency(ultimaMedicao?.valorLiberado || 0)}</span> (Medido: {ultimaMedicao?.percentualMedido}%)
                      </p>
                    </div>

                    <Link 
                      href={`/casas/${casa.id}`}
                      className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition border border-slate-700/50 cursor-pointer"
                    >
                      <ChevronRight size={18} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
