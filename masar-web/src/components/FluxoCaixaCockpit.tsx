'use client';

import { useState, useEffect } from 'react';
import { 
  DollarSign, 
  ShieldAlert, 
  ShieldCheck, 
  Calendar, 
  Hammer, 
  TrendingUp, 
  TrendingDown, 
  Filter, 
  RefreshCw,
  Wallet,
  AlertOctagon
} from 'lucide-react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import { CashFlowResult, CashFlowMonth } from '@/lib/cashFlowService';

interface FluxoCaixaCockpitProps {
  empreendimentos: { id: string; nome: string }[];
  initialData: CashFlowResult;
  defaultProjectId?: string;
}

export default function FluxoCaixaCockpit({ empreendimentos, initialData, defaultProjectId }: FluxoCaixaCockpitProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(defaultProjectId || 'all');
  const [data, setData] = useState<CashFlowResult>(initialData);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleFetchData = async (projectId: string) => {
    setIsLoading(true);
    try {
      const url = projectId === 'all' 
        ? '/api/financeiro/fluxo-de-caixa' 
        : `/api/financeiro/fluxo-de-caixa?empreendimentoId=${projectId}`;
      
      const res = await fetch(url);
      if (res.ok) {
        const result = await res.json();
        setData(result);
      } else {
        console.error('Erro ao buscar dados do fluxo de caixa');
      }
    } catch (err) {
      console.error('Erro de conexão com a API de fluxo de caixa:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProjectId !== 'all' || data !== initialData) {
      handleFetchData(selectedProjectId);
    }
  }, [selectedProjectId]);

  // Formatar dados para o gráfico do Recharts
  const chartData = data.timeline.map((m: CashFlowMonth) => {
    const totalReceitas = m.isFuture ? m.receitasProjetadas : (m.receitasRealizadas + m.receitasProjetadas);
    const totalSaidas = m.isFuture ? m.saidasProjetadas : (m.saidasRealizadas + m.saidasProjetadas);
    
    return {
      mes: m.mes,
      receitasRealizadas: m.isFuture ? 0 : m.receitasRealizadas,
      receitasProjetadas: m.receitasProjetadas,
      saidas: totalSaidas,
      saldoAcumulado: m.saldoAcumulado
    };
  });

  return (
    <div className="space-y-6">
      {/* Barra de Filtros */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0f1422]/60 border border-slate-800/80 p-4 rounded-2xl glassmorphism">
        <div className="flex items-center gap-2 text-slate-350 text-xs font-semibold">
          <Filter size={16} className="text-indigo-400" />
          <span>Filtrar Visão:</span>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50 cursor-pointer min-w-[200px]"
          >
            <option value="all">Todos os Empreendimentos (Consolidado)</option>
            {empreendimentos.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.nome}</option>
            ))}
          </select>
        </div>

        <button 
          onClick={() => handleFetchData(selectedProjectId)}
          disabled={isLoading}
          className="flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-750 disabled:bg-slate-900 border border-slate-700/50 rounded-xl text-xs font-bold text-white transition cursor-pointer"
        >
          <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
          {isLoading ? 'Atualizando...' : 'Sincronizar Dados'}
        </button>
      </div>

      {/* Alerta de Runway */}
      {data.runwayAlert && (
        <div className="p-4 bg-red-950/20 border border-red-500/30 rounded-2xl flex items-start gap-3 shadow-lg shadow-red-950/10 animate-pulse">
          <div className="p-2 bg-red-500/10 text-red-400 rounded-lg">
            <AlertOctagon size={20} />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-white uppercase tracking-wider">
              ⚠️ ALERTA CRÍTICO: Risco de Ruptura de Caixa Futura
            </h4>
            <p className="text-xs text-red-300 mt-1">
              {data.runwayAlert}
            </p>
            <p className="text-[10px] text-slate-400 mt-1.5 uppercase font-semibold">
              Recomendação: Os sócios devem realizar aportes de capital ou acelerar as medições físicas das casas para antecipar os repasses da CEF.
            </p>
          </div>
        </div>
      )}

      {/* Grid de KPIs Financeiros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Saldo Bancário */}
        <div className="glassmorphism p-5 rounded-2xl border border-slate-800/80 bg-[#0f1422]/20 flex items-start justify-between">
          <div>
            <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold block">Saldo Bancário Atual</span>
            <h3 className="text-xl font-bold font-mono text-white mt-1.5">
              {formatCurrency(data.currentBalance)}
            </h3>
            <span className="text-[9px] text-slate-500 mt-1 block">Soma de todas as contas</span>
          </div>
          <div className="p-2.5 bg-blue-600/10 text-blue-400 rounded-xl border border-blue-500/10">
            <Wallet size={18} />
          </div>
        </div>

        {/* Recebíveis Curto Prazo */}
        <div className="glassmorphism p-5 rounded-2xl border border-slate-800/80 bg-[#0f1422]/20 flex items-start justify-between">
          <div>
            <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold block">Recebíveis (30 Dias)</span>
            <h3 className="text-xl font-bold font-mono text-indigo-400 mt-1.5">
              {formatCurrency(data.recebiveisCurtoPrazo)}
            </h3>
            <span className="text-[9px] text-slate-500 mt-1 block">Boletos e parcelas a vencer</span>
          </div>
          <div className="p-2.5 bg-indigo-600/10 text-indigo-400 rounded-xl border border-indigo-500/10">
            <Calendar size={18} />
          </div>
        </div>

        {/* Custo a Incorrer */}
        <div className="glassmorphism p-5 rounded-2xl border border-slate-800/80 bg-[#0f1422]/20 flex items-start justify-between">
          <div>
            <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold block">Custo a Incorrer (Obra)</span>
            <h3 className="text-xl font-bold font-mono text-red-400 mt-1.5">
              {formatCurrency(data.custoAIncorrerTotal)}
            </h3>
            <span className="text-[9px] text-slate-500 mt-1 block">Saldo para finalização de obras</span>
          </div>
          <div className="p-2.5 bg-red-600/10 text-red-400 rounded-xl border border-red-500/10">
            <Hammer size={18} />
          </div>
        </div>

        {/* Caixa Livre Real */}
        <div className="glassmorphism p-5 rounded-2xl border border-slate-800/80 bg-[#0f1422]/20 flex items-start justify-between">
          <div>
            <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold block">Caixa Livre Real</span>
            <h3 className={`text-xl font-bold font-mono mt-1.5 ${data.caixaLivreReal > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatCurrency(data.caixaLivreReal)}
            </h3>
            <span className="text-[9px] text-slate-500 mt-1 block">
              {data.caixaLivreReal > 0 ? 'Liquidez operacional segura' : 'Déficit operacional ativo'}
            </span>
          </div>
          <div className={`p-2.5 rounded-xl border ${data.caixaLivreReal > 0 ? 'bg-emerald-600/10 text-emerald-400 border-emerald-500/10' : 'bg-red-600/10 text-red-400 border-red-500/10'}`}>
            {data.caixaLivreReal > 0 ? <ShieldCheck size={18} /> : <ShieldAlert size={18} />}
          </div>
        </div>
      </div>

      {/* Gráfico de Projeções de Caixa */}
      <div className="glassmorphism p-5 rounded-2xl border border-slate-800/80 bg-[#0f1422]/10 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5 font-sans">
            <TrendingUp size={16} className="text-indigo-400" /> Fluxo de Caixa Acumulado e Mensal (Projeções vs Realizado)
          </h3>
          <p className="text-[10px] text-slate-450 mt-0.5">
            Barras Verdes Sólidas: Receitas pagas | Barras Verdes Tracejadas: Projeções do Ciclo Caixa CEF | Barras Vermelhas: Saídas reais/projetadas | Linha Azul: Saldo de Caixa Acumulado
          </p>
        </div>

        <div className="h-[360px] w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid stroke="#1e293b/30" strokeDasharray="3 3" />
              <XAxis dataKey="mes" stroke="#94a3b8" fontSize={10} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f1422', borderColor: '#1e293b', borderRadius: '12px' }} 
                itemStyle={{ fontSize: '11px', color: '#fff' }} 
                labelStyle={{ fontSize: '11px', fontWeight: 'bold', color: '#818cf8' }} 
                formatter={(val) => [formatCurrency(val as number), '']} 
              />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '10px' }} />
              
              {/* Entradas Realizadas */}
              <Bar dataKey="receitasRealizadas" name="Receita Realizada" fill="#10b981" stackId="entradas" radius={[4, 4, 0, 0]} />
              
              {/* Entradas Projetadas (Ciclo Caixa CEF + Recebíveis) */}
              <Bar dataKey="receitasProjetadas" name="Receita Projetada (CEF / Clientes)" fill="#047857" fillOpacity={0.4} stroke="#10b981" strokeDasharray="4 4" stackId="entradas" radius={[4, 4, 0, 0]} />
              
              {/* Saídas */}
              <Bar dataKey="saidas" name="Despesas / Saídas" fill="#f87171" radius={[4, 4, 0, 0]} />
              
              {/* Saldo Acumulado */}
              <Line type="monotone" dataKey="saldoAcumulado" name="Saldo Acumulado" stroke="#3b82f6" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 6 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabela Detalhada Mês a Mês */}
      <div className="glassmorphism p-5 rounded-2xl border border-slate-800/80">
        <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-1.5 font-sans">
          Detalhamento Cronológico das Projeções
        </h3>

        <div className="overflow-x-auto border border-slate-850 rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900/40 border-b border-slate-850 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Mês/Período</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Rec. Realizada</th>
                <th className="py-3 px-4 text-right">Rec. Projetada (CEF/Cli)</th>
                <th className="py-3 px-4 text-right">Saídas Realizadas</th>
                <th className="py-3 px-4 text-right">Saídas Projetadas (Obra)</th>
                <th className="py-3 px-4 text-right">Saldo Período</th>
                <th className="py-3 px-4 text-right">Saldo Acumulado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850/50 text-slate-350">
              {data.timeline.map((m: CashFlowMonth, index: number) => {
                const totalEntradas = m.isFuture ? m.receitasProjetadas : (m.receitasRealizadas + m.receitasProjetadas);
                const totalSaidas = m.isFuture ? m.saidasProjetadas : (m.saidasRealizadas + m.saidasProjetadas);
                const isCurrentMonth = m.mesNum === new Date().getMonth() && m.ano === new Date().getFullYear();

                return (
                  <tr key={index} className={`hover:bg-slate-800/5 ${isCurrentMonth ? 'bg-indigo-950/10 font-bold border-y border-indigo-900/20' : ''}`}>
                    <td className="py-3 px-4 font-semibold text-slate-200">
                      {m.mes} {isCurrentMonth && <span className="text-[8px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded ml-1 uppercase">Atual</span>}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${m.isFuture ? 'bg-amber-950/20 text-amber-400 border border-amber-900/20' : 'bg-emerald-950/20 text-emerald-400 border border-emerald-900/20'}`}>
                        {m.isFuture ? 'Projetado' : 'Fechado'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-500">
                      {m.receitasRealizadas > 0 ? formatCurrency(m.receitasRealizadas) : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-400/80">
                      {m.receitasProjetadas > 0 ? formatCurrency(m.receitasProjetadas) : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-red-500">
                      {m.saidasRealizadas > 0 ? formatCurrency(m.saidasRealizadas) : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-red-400/80">
                      {m.saidasProjetadas > 0 ? formatCurrency(m.saidasProjetadas) : '—'}
                    </td>
                    <td className={`py-3 px-4 text-right font-mono font-bold ${m.saldoPeriodo >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {m.saldoPeriodo > 0 ? '+' : ''}{formatCurrency(m.saldoPeriodo)}
                    </td>
                    <td className={`py-3 px-4 text-right font-mono font-extrabold ${m.saldoAcumulado >= 0 ? 'text-blue-400' : 'text-red-500'}`}>
                      {formatCurrency(m.saldoAcumulado)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
