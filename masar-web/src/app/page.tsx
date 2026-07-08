import { db } from '@/lib/db';
import CashFlowChart from '@/components/CashFlowChart';
import { 
  Building2, 
  Home, 
  Clock, 
  AlertTriangle, 
  TrendingUp, 
  XCircle,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';

export const revalidate = 0; // Disable server component caching to reflect real-time updates

export default async function DashboardPage() {
  // 1. Queries de leitura rápida direta no Prisma
  const totalCasas = await db.casa.count();
  const casasEmObra = await db.casa.count({
    where: {
      statusObra: { notIn: ['SEM_INICIO', 'CONCLUIDA'] }
    }
  });
  
  const totalEmpreendimentos = await db.empreendimento.count();

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

  // 2. Gráfico de Fluxo de Caixa (Realizado vs. Previsto)
  const medicoes = await db.medicaoCaixa.findMany({
    orderBy: { dataMedicao: 'asc' },
  });

  const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const agruparPorMes: Record<string, { previsto: number; realizado: number }> = {};

  medicoes.forEach(med => {
    const date = new Date(med.dataMedicao);
    const mesNome = mesesNomes[date.getMonth()];
    const ano = date.getFullYear();
    const chave = `${mesNome}/${ano}`;

    if (!agruparPorMes[chave]) {
      agruparPorMes[chave] = { previsto: 0, realizado: 0 };
    }

    agruparPorMes[chave].previsto += med.valorLiberado;
    if (med.status === 'PAGA') {
      agruparPorMes[chave].realizado += med.valorLiberado;
    }
  });

  const chartData = Object.entries(agruparPorMes).map(([mes, valores]) => ({
    mes,
    previsto: valores.previsto,
    realizado: valores.realizado,
  }));

  // 3. Casas com problemas/gargalos (Glosadas ou Aguardando)
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

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl font-sans">Dashboard Executivo</h1>
          <p className="text-sm text-slate-400 mt-1">
            Visão financeira e física unificada das medições da Caixa Econômica.
          </p>
        </div>
        <div className="text-xs text-slate-500 font-medium bg-[#151b2c] border border-[#1e293b] px-3.5 py-1.5 rounded-full self-start md:self-auto">
          Dados atualizados em tempo real
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
                className="text-xs font-semibold bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg transition-all"
              >
                Ver Gargalos
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Empreendimentos */}
        <div className="glassmorphism p-5 rounded-2xl space-y-4">
          <div className="flex justify-between items-start">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Projetos Ativos</span>
            <span className="p-2 bg-blue-500/10 text-blue-400 rounded-lg"><Building2 size={18} /></span>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white">{totalEmpreendimentos}</h3>
            <p className="text-xs text-slate-500 mt-1">Registrados na base de dados</p>
          </div>
        </div>

        {/* Casas em Obra */}
        <div className="glassmorphism p-5 rounded-2xl space-y-4">
          <div className="flex justify-between items-start">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Casas em Obra</span>
            <span className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg"><Home size={18} /></span>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white">{casasEmObra} <span className="text-xs text-slate-500 font-normal">/ {totalCasas}</span></h3>
            <p className="text-xs text-slate-500 mt-1">Com execução física ativa</p>
          </div>
        </div>

        {/* Medições Pendentes */}
        <div className="glassmorphism p-5 rounded-2xl space-y-4">
          <div className="flex justify-between items-start">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Aguardando Caixa</span>
            <span className="p-2 bg-amber-500/10 text-amber-400 rounded-lg"><Clock size={18} /></span>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-amber-400">{formatCurrency(valorPendente)}</h3>
            <p className="text-xs text-slate-500 mt-1">Valor enviado em medição</p>
          </div>
        </div>

        {/* Total Glosado */}
        <div className={`glassmorphism p-5 rounded-2xl space-y-4 border ${hasGlosaAtiva ? 'border-red-500/30' : ''}`}>
          <div className="flex justify-between items-start">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Valor Glosado</span>
            <span className={`p-2 rounded-lg ${hasGlosaAtiva ? 'bg-red-500/20 text-red-500' : 'bg-slate-500/10 text-slate-400'}`}><XCircle size={18} /></span>
          </div>
          <div>
            <h3 className={`text-2xl font-bold ${hasGlosaAtiva ? 'text-red-500' : 'text-slate-300'}`}>{formatCurrency(valorGlosado)}</h3>
            <p className="text-xs text-slate-500 mt-1">Retido/Reprovado pela CEF</p>
          </div>
        </div>
      </div>

      {/* Gráfico de Fluxo de Caixa */}
      <div className="glassmorphism p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-white">Fluxo de Caixa CEF</h3>
            <p className="text-xs text-slate-400">Comparativo histórico entre medições enviadas (Previsto) e pagas (Realizado)</p>
          </div>
          <div className="flex items-center gap-1 text-xs text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md">
            <TrendingUp size={14} /> Total Pago: {formatCurrency(valorPago)}
          </div>
        </div>
        <CashFlowChart data={chartData} />
      </div>

      {/* Lista de Gargalos Físicos / Financeiros */}
      <div id="gargalos" className="glassmorphism rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-[#1e293b]">
          <h3 className="text-lg font-bold text-white">Pontos de Atenção & Gargalos</h3>
          <p className="text-xs text-slate-400">Casas com pendências ou glosas ativas que impactam o fluxo de caixa imediato</p>
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
                      className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition border border-slate-700/50"
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
