'use client';

import React, { useState, useEffect } from 'react';
import {
  Building2,
  Calculator,
  TrendingUp,
  Loader2,
  FileSpreadsheet,
  Search,
  Trash2,
  SlidersHorizontal,
  ChevronDown,
  Landmark,
  Package,
  HardHat,
  Percent,
  Banknote,
  Wallet,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import DreWaterfallChart from '@/components/DreWaterfallChart';
import FluxoCaixaCockpit from '@/components/FluxoCaixaCockpit';

const CATEGORY_META: Record<string, { icon: any; label: string; color: string }> = {
  TERRENO: { icon: Landmark, label: 'Aquisição Terreno', color: 'text-blue-400 bg-blue-500/10' },
  PROJETOS: { icon: FileSpreadsheet, label: 'Projetos/Licença', color: 'text-purple-400 bg-purple-500/10' },
  MATERIAL: { icon: Package, label: 'Materiais', color: 'text-amber-400 bg-amber-500/10' },
  MAO_DE_OBRA: { icon: HardHat, label: 'Mão de Obra', color: 'text-orange-400 bg-orange-500/10' },
  IMPOSTOS: { icon: Percent, label: 'Impostos RET', color: 'text-red-400 bg-red-500/10' },
  MEDICAO_CAIXA: { icon: Banknote, label: 'Medição CEF', color: 'text-emerald-400 bg-emerald-500/10' },
  ENTRADA_CLIENTE: { icon: Wallet, label: 'Entrada Cliente', color: 'text-emerald-400 bg-emerald-500/10' }
};

function formatDayLabel(dateStr: string) {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';
  if (diffDays === -1) return 'Amanhã';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', weekday: 'short' });
}

function getUrlParam(name: string): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get(name);
}

export default function CentralFinanceiraPage() {
  const [empreendimentos, setEmpreendimentos] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [loadingProjects, setLoadingProjects] = useState(true);

  // Active view tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'livro_caixa' | 'projecao' | 'custos_casa'>(() => {
    const tabParam = getUrlParam('tab');
    if (tabParam === 'livro_caixa' || tabParam === 'projecao' || tabParam === 'dashboard' || tabParam === 'custos_casa') return tabParam;
    return 'dashboard';
  });

  // DRE & DFC data
  const [dreData, setDreData] = useState<any>(null);
  const [dfcData, setDfcData] = useState<any[]>([]);
  const [fluxoCaixaData, setFluxoCaixaData] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(false);

  // Transactions (Livro-Caixa)
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  // Portfólio de custo por casa
  const [custosCasa, setCustosCasa] = useState<any>(null);
  const [loadingCustosCasa, setLoadingCustosCasa] = useState(false);

  // Livro-Caixa Filters
  const [houses, setHouses] = useState<any[]>([]);
  const [filterCasaId, setFilterCasaId] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterCategoria, setFilterCategoria] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Fetch initial project list
  useEffect(() => {
    const loadProjects = async () => {
      try {
        setLoadingProjects(true);
        const res = await fetch('/api/empreendimentos').then(r => r.json());
        setEmpreendimentos(res || []);
        if (res && res.length > 0) {
          const empIdParam = getUrlParam('empreendimentoId');
          const matched = empIdParam && res.find((e: any) => e.id === empIdParam);
          setSelectedProjectId(matched ? matched.id : res[0].id);
        }
      } catch (err) {
        console.error('Erro ao buscar projetos:', err);
      } finally {
        setLoadingProjects(false);
      }
    };
    loadProjects();
  }, []);

  // Fetch houses when selected project changes
  useEffect(() => {
    if (!selectedProjectId) return;
    const loadHouses = async () => {
      try {
        const res = await fetch(`/api/empreendimentos/${selectedProjectId}`).then(r => r.json());
        setHouses(res.casas || []);
        setFilterCasaId('ALL'); // Reset house filter
      } catch (err) {
        console.error('Erro ao buscar lotes:', err);
      }
    };
    loadHouses();
  }, [selectedProjectId]);

  // Fetch financial data (DRE, DFC, Transactions) when project or tab changes
  useEffect(() => {
    if (!selectedProjectId) return;

    const fetchFinancialData = async () => {
      setLoadingData(true);
      try {
        const [resDre, resDfc, resFluxo] = await Promise.all([
          fetch(`/api/financeiro/dre?empreendimentoId=${selectedProjectId}`).then(r => r.json()),
          fetch(`/api/financeiro/dfc?empreendimentoId=${selectedProjectId}`).then(r => r.json()),
          fetch(`/api/financeiro/fluxo-de-caixa?empreendimentoId=${selectedProjectId}`).then(r => r.json())
        ]);
        setDreData(resDre);
        setDfcData(resDfc || []);
        setFluxoCaixaData(resFluxo);
      } catch (err) {
        console.error('Erro ao carregar gráficos:', err);
      } finally {
        setLoadingData(false);
      }
    };

    const fetchTransactions = async () => {
      setLoadingTransactions(true);
      try {
        const res = await fetch(`/api/financeiro/transacoes?empreendimentoId=${selectedProjectId}`).then(r => r.json());
        setTransactions(res || []);
      } catch (err) {
        console.error('Erro ao buscar livro-caixa:', err);
      } finally {
        setLoadingTransactions(false);
      }
    };

    const fetchCustosCasa = async () => {
      setLoadingCustosCasa(true);
      try {
        const res = await fetch(`/api/financeiro/custos-por-casa?empreendimentoId=${selectedProjectId}`).then(r => r.json());
        setCustosCasa(res);
      } catch (err) {
        console.error('Erro ao buscar custos por casa:', err);
      } finally {
        setLoadingCustosCasa(false);
      }
    };

    fetchFinancialData();
    fetchTransactions();
    fetchCustosCasa();
  }, [selectedProjectId]);

  const handleDeleteTransaction = async (id: string, isGlobal: boolean) => {
    if (!confirm('Deseja realmente excluir esta transação do Livro-Caixa? O saldo bancário correspondente será estornado.')) return;
    
    try {
      const url = isGlobal 
        ? `/api/financeiro/custos-globais/${id}`
        : `/api/casas/dummy/apropriacoes?apropriacaoId=${id}`;
        
      const res = await fetch(url, { method: 'DELETE' });
      if (res.ok) {
        // Reload list
        const updated = await fetch(`/api/financeiro/transacoes?empreendimentoId=${selectedProjectId}`).then(r => r.json());
        setTransactions(updated || []);
        
        // Reload graphics
        const [resDre, resDfc] = await Promise.all([
          fetch(`/api/financeiro/dre?empreendimentoId=${selectedProjectId}`).then(r => r.json()),
          fetch(`/api/financeiro/dfc?empreendimentoId=${selectedProjectId}`).then(r => r.json())
        ]);
        setDreData(resDre);
        setDfcData(resDfc || []);
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao excluir.');
      }
    } catch (e) {
      console.error(e);
      alert('Erro de rede.');
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(val || 0);
  };

  // Filtered transactions list
  const filteredTransactions = transactions.filter(t => {
    // Casa filter
    if (filterCasaId !== 'ALL') {
      if (filterCasaId === 'GLOBAL' && t.casaId !== null) return false;
      if (filterCasaId !== 'GLOBAL' && t.casaId !== filterCasaId) return false;
    }
    // Status filter
    if (filterStatus !== 'ALL' && t.status !== filterStatus) return false;
    // Categoria filter
    if (filterCategoria !== 'ALL' && t.categoria !== filterCategoria) return false;
    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchDesc = t.descricao.toLowerCase().includes(term);
      const matchVal = t.valor.toString().includes(term);
      return matchDesc || matchVal;
    }
    return true;
  });

  const activeFilterCount = [filterCasaId !== 'ALL', filterStatus !== 'ALL', filterCategoria !== 'ALL'].filter(Boolean).length;

  // Agrupamento do extrato por dia (feed estilo extrato bancário)
  const getDisplayDate = (t: any) => (t.status === 'PAGO' && t.dataPagamento ? t.dataPagamento : t.dataVencimento);
  const sortedForFeed = [...filteredTransactions].sort(
    (a, b) => new Date(getDisplayDate(b)).getTime() - new Date(getDisplayDate(a)).getTime()
  );
  const feedGroups: { key: string; label: string; net: number; items: any[] }[] = [];
  sortedForFeed.forEach(t => {
    const displayDate = getDisplayDate(t);
    const dayKey = new Date(displayDate).toISOString().split('T')[0];
    let group = feedGroups.find(g => g.key === dayKey);
    if (!group) {
      group = { key: dayKey, label: formatDayLabel(displayDate), net: 0, items: [] };
      feedGroups.push(group);
    }
    group.items.push(t);
    group.net += t.natureza === 'RECEITA' ? t.valor : -t.valor;
  });

  if (loadingProjects) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
        <p className="text-xs text-slate-500 font-mono">Carregando painel de controladoria unificada...</p>
      </div>
    );
  }

  // Prepara DFC Chart data
  const chartDataDfc = dfcData.map(item => ({
    mes: item.mes,
    'Entradas Totais': item.entradasMedicoesReal + item.entradasClientesReal + item.entradasAportesReal,
    'Saídas Totais': item.saidasObraReal + item.saidasRateiosReal + item.saidasRetiradasReal,
    'Saldo Acumulado': item.saldoAcumulado
  }));

  // Estatísticas DFC
  const totalEntradasReal = dfcData.reduce((acc, item) => acc + item.entradasMedicoesReal + item.entradasClientesReal + item.entradasAportesReal, 0);
  const totalSaidasReal = dfcData.reduce((acc, item) => acc + item.saidasObraReal + item.saidasRateiosReal + item.saidasRetiradasReal, 0);

  // Waterfall
  const chartDataWaterfall = dreData ? [
    { name: 'Vendas (VGV)', valor: [0, Number(dreData.totalVGVRealizado)] as [number, number], display: Number(dreData.totalVGVRealizado), color: '#6366f1' },
    { name: 'Comissões', valor: [Math.max(0, Number(dreData.totalVGVRealizado) - Number(dreData.totalComissaoRealizada)), Number(dreData.totalVGVRealizado)] as [number, number], display: Number(dreData.totalComissaoRealizada), color: '#f59e0b' },
    { name: 'Terreno / Lote', valor: [Math.max(0, Number(dreData.totalVGVRealizado) - Number(dreData.totalComissaoRealizada) - Number(dreData.totalRateioReal)), Math.max(0, Number(dreData.totalVGVRealizado) - Number(dreData.totalComissaoRealizada))] as [number, number], display: Number(dreData.totalRateioReal), color: '#3b82f6' },
    { name: 'Impostos (RET)', valor: [Math.max(0, Number(dreData.totalVGVRealizado) - Number(dreData.totalComissaoRealizada) - Number(dreData.totalRateioReal) - Number(dreData.totalImpostoRealizado)), Math.max(0, Number(dreData.totalVGVRealizado) - Number(dreData.totalComissaoRealizada) - Number(dreData.totalRateioReal))] as [number, number], display: Number(dreData.totalImpostoRealizado), color: '#ef4444' },
    { name: 'Custos de obra', valor: [Math.max(0, Number(dreData.lucroLiquidoRealizado)), Math.max(0, Number(dreData.totalVGVRealizado) - Number(dreData.totalComissaoRealizada) - Number(dreData.totalRateioReal) - Number(dreData.totalImpostoRealizado))] as [number, number], display: Number(dreData.totalDiretoRealizado), color: '#ec4899' },
    { name: 'Lucro Líquido', valor: [0, Math.max(0, Number(dreData.lucroLiquidoRealizado))] as [number, number], display: Number(dreData.lucroLiquidoRealizado), color: '#10b981' }
  ] : [];

  return (
    <div className="space-y-6">
      
      {/* Selector and Main Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-900 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-[#111827] border border-slate-800 rounded-2xl text-indigo-400">
            <Building2 size={24} />
          </div>
          <div>
            <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block">Controladoria Central</span>
            <h1 className="text-xl font-bold text-white mt-0.5">Central Financeira</h1>
          </div>
        </div>

        {/* Project Selector dropdown */}
        <div className="flex items-center gap-3">
          <label className="text-xs text-slate-400 font-medium hidden md:inline">Projeto Ativo:</label>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="bg-[#0b0f19] border border-slate-800 text-xs text-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500/50"
          >
            {empreendimentos.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.nome}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs Menu and Quick Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#0f1422]/60 p-2 border border-slate-850 rounded-2xl">
        <div className="flex gap-1.5 w-full md:w-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex-1 md:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
            }`}
          >
            <TrendingUp size={14} />
            Visão Geral
          </button>
          <button
            onClick={() => setActiveTab('livro_caixa')}
            className={`flex-1 md:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'livro_caixa'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
            }`}
          >
            <FileSpreadsheet size={14} />
            Extrato
          </button>
          <button
            onClick={() => setActiveTab('projecao')}
            className={`flex-1 md:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'projecao'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
            }`}
          >
            <Wallet size={14} />
            Projeção de Caixa
          </button>
          <button
            onClick={() => setActiveTab('custos_casa')}
            className={`flex-1 md:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'custos_casa'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
            }`}
          >
            <HardHat size={14} />
            Custos por Casa
          </button>
        </div>

        {/* Mini Balance summary */}
        {dreData && (
          <div className="text-right px-3 py-1 bg-slate-950/40 border border-slate-850 rounded-xl hidden md:block">
            <span className="text-[9px] text-slate-500 block uppercase font-bold tracking-wider">Margem Líquida</span>
            <span className="font-mono text-xs font-bold text-emerald-400">
              {formatCurrency(dreData.lucroLiquidoRealizado)} 
              <span className="text-[10px] text-slate-400 ml-1.5">
                ({(dreData.totalVGVRealizado > 0 ? (dreData.lucroLiquidoRealizado / dreData.totalVGVRealizado) * 100 : 0).toFixed(1)}%)
              </span>
            </span>
          </div>
        )}
      </div>

      {loadingData && (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
          <Loader2 className="animate-spin text-indigo-500" size={24} />
          <p className="text-xs text-slate-500 font-mono">Processando transações do Livro-Caixa...</p>
        </div>
      )}

      {/* ========================================== */}
      {/* VIEW TAB: VISÃO GERAL */}
      {/* ========================================== */}
      {!loadingData && activeTab === 'dashboard' && dreData && (
        <div className="space-y-6 animate-fadeIn">

          {/* Saldo em destaque */}
          {fluxoCaixaData && (
            <div className={`glassmorphism p-6 rounded-2xl border flex items-center justify-between gap-4 ${
              fluxoCaixaData.caixaLivreReal >= 0 ? 'border-emerald-500/25 bg-emerald-950/5' : 'border-red-500/25 bg-red-950/5'
            }`}>
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Saldo Disponível Hoje</span>
                <h2 className={`text-3xl font-extrabold font-mono mt-1 ${fluxoCaixaData.caixaLivreReal >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatCurrency(fluxoCaixaData.caixaLivreReal)}
                </h2>
                <p className="text-xs text-slate-400 mt-1.5 max-w-md">
                  O que sobra do caixa somando o que já está no banco e o que deve entrar em 30 dias, depois de reservar o que ainda falta pagar nas obras em andamento.
                </p>
              </div>
              <div className={`p-3.5 rounded-2xl border shrink-0 ${
                fluxoCaixaData.caixaLivreReal >= 0
                  ? 'bg-emerald-600/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-red-600/10 text-red-400 border-red-500/20'
              }`}>
                {fluxoCaixaData.caixaLivreReal >= 0 ? <ShieldCheck size={28} /> : <ShieldAlert size={28} />}
              </div>
            </div>
          )}

          {/* Dashboard KPIs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div className="glassmorphism p-5 rounded-2xl border border-slate-850">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">VGV Acumulado (Vendido)</span>
              <h3 className="text-xl font-bold text-white font-mono mt-1.5">{formatCurrency(dreData.totalVGVRealizado)}</h3>
              <p className="text-[10px] text-slate-500 mt-1">VGV projetado: {formatCurrency(dreData.totalVGVProjetado)}</p>
            </div>

            <div className="glassmorphism p-5 rounded-2xl border border-slate-850">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Custos Totais Realizados</span>
              <h3 className="text-xl font-bold text-red-400 font-mono mt-1.5">{formatCurrency(dreData.totalDiretoRealizado + dreData.totalRateioReal)}</h3>
              <p className="text-[10px] text-slate-500 mt-1">Obra + custos do empreendimento</p>
            </div>

            <div className="glassmorphism p-5 rounded-2xl border border-slate-850">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Impostos RET & Comissões</span>
              <h3 className="text-xl font-bold text-amber-500 font-mono mt-1.5">{formatCurrency(dreData.totalImpostoRealizado + dreData.totalComissaoRealizada)}</h3>
              <p className="text-[10px] text-slate-500 mt-1">Impostos (RET) e comissões de venda</p>
            </div>

            <div className="glassmorphism p-5 rounded-2xl border border-emerald-500/20 bg-emerald-950/5">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Lucro Líquido Realizado</span>
              <h3 className="text-xl font-bold text-emerald-400 font-mono mt-1.5">{formatCurrency(dreData.lucroLiquidoRealizado)}</h3>
              <p className="text-[10px] text-slate-500 mt-1">Retorno projetado: {formatCurrency(dreData.lucroLiquidoProjetado)}</p>
            </div>
          </div>

          {/* DRE & DFC Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Waterfall DRE */}
            <div className="lg:col-span-7 glassmorphism p-6 rounded-2xl border border-slate-850 flex flex-col justify-between min-h-[360px]">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Calculator size={14} className="text-indigo-400" /> Do que foi vendido ao lucro (DRE)
                </h3>
                <p className="text-[10px] text-slate-400 mt-1">De cada venda, o que sobra depois de comissões, impostos e custos.</p>
              </div>
              
              <div className="h-72 w-full mt-4">
                <DreWaterfallChart data={chartDataWaterfall} />
              </div>
            </div>

            {/* DFC Line Chart */}
            <div className="lg:col-span-5 glassmorphism p-6 rounded-2xl border border-slate-850 flex flex-col justify-between min-h-[360px]">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp size={14} className="text-indigo-400" /> Curva do Caixa (Entradas vs Saídas)
                </h3>
                <p className="text-[10px] text-slate-400 mt-1">Evolução do saldo de caixa acumulado ao longo dos meses</p>
              </div>

              <div className="h-72 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartDataDfc} margin={{ top: 10, right: 0, left: -20, bottom: 5 }}>
                    <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                    <XAxis dataKey="mes" stroke="#94a3b8" fontSize={8} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={8} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f1422', borderColor: '#1e293b' }} 
                      itemStyle={{ fontSize: '10px', color: '#fff' }} 
                      formatter={(val) => [formatCurrency(val as number), '']}
                    />
                    <Legend wrapperStyle={{ fontSize: '9px', paddingTop: '5px' }} />
                    <Bar dataKey="Entradas Totais" fill="#10b981" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="Saídas Totais" fill="#f43f5e" radius={[2, 2, 0, 0]} />
                    <Line type="monotone" dataKey="Saldo Acumulado" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* DRE tabular breakdown */}
          <div className="glassmorphism p-6 rounded-2xl border border-slate-850">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <FileSpreadsheet size={14} className="text-indigo-400" /> Resultado detalhado — Projetado vs Realizado
            </h3>
            
            <div className="overflow-x-auto border border-slate-900 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-900 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Item</th>
                    <th className="py-3 px-4 text-right">Previsto / Orçado</th>
                    <th className="py-3 px-4 text-right">Realizado / Pago</th>
                    <th className="py-3 px-4 text-right">Diferença</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/60 text-slate-300 font-mono">
                  {/* Receitas */}
                  <tr className="hover:bg-slate-900/10 font-sans">
                    <td className="py-2.5 px-4 font-semibold text-slate-200">Receita de vendas (VGV)</td>
                    <td className="py-2.5 px-4 text-right">{formatCurrency(dreData.totalVGVProjetado)}</td>
                    <td className="py-2.5 px-4 text-right text-emerald-400">{formatCurrency(dreData.totalVGVRealizado)}</td>
                    <td className={`py-2.5 px-4 text-right font-bold ${(dreData.totalVGVRealizado - dreData.totalVGVProjetado) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {formatCurrency(dreData.totalVGVRealizado - dreData.totalVGVProjetado)}
                    </td>
                  </tr>
                  {/* Comissoes */}
                  <tr className="hover:bg-slate-900/10 text-slate-400">
                    <td className="py-2 px-4 pl-6">(-) Comissões de venda</td>
                    <td className="py-2 px-4 text-right">-{formatCurrency(dreData.totalComissaoProjetada)}</td>
                    <td className="py-2 px-4 text-right">-{formatCurrency(dreData.totalComissaoRealizada)}</td>
                    <td className={`py-2 px-4 text-right ${dreData.totalComissaoRealizada > dreData.totalComissaoProjetada ? 'text-red-400' : 'text-emerald-400'}`}>
                      {formatCurrency(dreData.totalComissaoProjetada - dreData.totalComissaoRealizada)}
                    </td>
                  </tr>
                  {/* Impostos */}
                  <tr className="hover:bg-slate-900/10 text-slate-400">
                    <td className="py-2 px-4 pl-6">(-) Impostos sobre vendas (RET)</td>
                    <td className="py-2 px-4 text-right">-{formatCurrency(dreData.totalImpostoProjetado)}</td>
                    <td className="py-2 px-4 text-right">-{formatCurrency(dreData.totalImpostoRealizado)}</td>
                    <td className={`py-2 px-4 text-right ${dreData.totalImpostoRealizado > dreData.totalImpostoProjetado ? 'text-red-400' : 'text-emerald-400'}`}>
                      {formatCurrency(dreData.totalImpostoProjetado - dreData.totalImpostoRealizado)}
                    </td>
                  </tr>
                  {/* Custos Globais */}
                  <tr className="hover:bg-slate-900/10 font-semibold text-slate-200">
                    <td className="py-2.5 px-4">(-) Custos do empreendimento (terreno, projetos, marketing)</td>
                    <td className="py-2.5 px-4 text-right">-{formatCurrency(dreData.totalRateioProj)}</td>
                    <td className="py-2.5 px-4 text-right">-{formatCurrency(dreData.totalRateioReal)}</td>
                    <td className={`py-2.5 px-4 text-right ${dreData.totalRateioReal > dreData.totalRateioProj ? 'text-red-400' : 'text-emerald-400'}`}>
                      {formatCurrency(dreData.totalRateioProj - dreData.totalRateioReal)}
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-900/10 text-xs text-slate-500">
                    <td className="py-1 px-4 pl-8">Aquisição de Terreno Proporcional</td>
                    <td className="py-1 px-4 text-right">-{formatCurrency(dreData.rateioTerrenoProj)}</td>
                    <td className="py-1 px-4 text-right">-{formatCurrency(dreData.rateioTerrenoReal)}</td>
                    <td className="py-1 px-4 text-right">-{formatCurrency(dreData.rateioTerrenoProj - dreData.rateioTerrenoReal)}</td>
                  </tr>
                  <tr className="hover:bg-slate-900/10 text-xs text-slate-500">
                    <td className="py-1 px-4 pl-8">Projetos & Licenciamentos</td>
                    <td className="py-1 px-4 text-right">-{formatCurrency(dreData.rateioProjetosProj)}</td>
                    <td className="py-1 px-4 text-right">-{formatCurrency(dreData.rateioProjetosReal)}</td>
                    <td className="py-1 px-4 text-right">-{formatCurrency(dreData.rateioProjetosProj - dreData.rateioProjetosReal)}</td>
                  </tr>
                  <tr className="hover:bg-slate-900/10 text-xs text-slate-500">
                    <td className="py-1 px-4 pl-8">Marketing & Banners</td>
                    <td className="py-1 px-4 text-right">-{formatCurrency(dreData.rateioMarketingProj)}</td>
                    <td className="py-1 px-4 text-right">-{formatCurrency(dreData.rateioMarketingReal)}</td>
                    <td className="py-1 px-4 text-right">-{formatCurrency(dreData.rateioMarketingProj - dreData.rateioMarketingReal)}</td>
                  </tr>
                  {/* Custos Obras */}
                  <tr className="hover:bg-slate-900/10 font-semibold text-slate-200">
                    <td className="py-2.5 px-4">(-) Custos de obra das casas</td>
                    <td className="py-2.5 px-4 text-right">-{formatCurrency(dreData.totalDiretoProjetado)}</td>
                    <td className="py-2.5 px-4 text-right">-{formatCurrency(dreData.totalDiretoRealizado)}</td>
                    <td className={`py-2.5 px-4 text-right ${dreData.totalDiretoRealizado > dreData.totalDiretoProjetado ? 'text-red-400' : 'text-emerald-400'}`}>
                      {formatCurrency(dreData.totalDiretoProjetado - dreData.totalDiretoRealizado)}
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-900/10 text-xs text-slate-500">
                    <td className="py-1.5 px-4 pl-8">Custos Fixos Obra (Equipe/Canteiro/Locações)</td>
                    <td className="py-1.5 px-4 text-right">-{formatCurrency(dreData.totalFixoProjetado)}</td>
                    <td className="py-1.5 px-4 text-right">-{formatCurrency(dreData.totalFixoRealizado)}</td>
                    <td className="py-1.5 px-4 text-right">-{formatCurrency(dreData.totalFixoProjetado - dreData.totalFixoRealizado)}</td>
                  </tr>
                  <tr className="hover:bg-slate-900/10 text-xs text-slate-500">
                    <td className="py-1.5 px-4 pl-8">Custos Variáveis Obra (Materiais/Mão de Obra)</td>
                    <td className="py-1.5 px-4 text-right">-{formatCurrency(dreData.totalVariavelProjetado - dreData.totalImpostoProjetado)}</td>
                    <td className="py-1.5 px-4 text-right">-{formatCurrency(dreData.totalVariavelRealizado - dreData.totalImpostoRealizado)}</td>
                    <td className="py-1.5 px-4 text-right">-{formatCurrency((dreData.totalVariavelProjetado - dreData.totalImpostoProjetado) - (dreData.totalVariavelRealizado - dreData.totalImpostoRealizado))}</td>
                  </tr>
                  {/* Resultado */}
                  <tr className="bg-slate-950/40 text-emerald-400 font-sans font-bold border-t border-slate-800">
                    <td className="py-3 px-4 text-sm font-extrabold">Lucro Líquido</td>
                    <td className="py-3 px-4 text-right text-sm">{formatCurrency(dreData.lucroLiquidoProjetado)}</td>
                    <td className="py-3 px-4 text-right text-sm">{formatCurrency(dreData.lucroLiquidoRealizado)}</td>
                    <td className={`py-3 px-4 text-right text-sm font-extrabold ${(dreData.lucroLiquidoRealizado - dreData.lucroLiquidoProjetado) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {formatCurrency(dreData.lucroLiquidoRealizado - dreData.lucroLiquidoProjetado)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* VIEW TAB: EXTRATO LIVRO-CAIXA (FEED) */}
      {/* ========================================== */}
      {!loadingData && activeTab === 'livro_caixa' && (
        <div className="space-y-4 animate-fadeIn">

          {/* Busca + botão de filtros discreto */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar no extrato..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#0f1422] border border-slate-800 rounded-xl pl-8 pr-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50"
              />
            </div>
            <button
              onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 border ${
                showFilters || activeFilterCount > 0
                  ? 'bg-indigo-600/10 border-indigo-500/40 text-indigo-400'
                  : 'bg-[#0f1422] border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <SlidersHorizontal size={13} />
              Filtros
              {activeFilterCount > 0 && (
                <span className="bg-indigo-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-bold">
                  {activeFilterCount}
                </span>
              )}
              <ChevronDown size={12} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {showFilters && (
            <div className="p-4 bg-[#0f1422] border border-slate-800/80 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-3 animate-fadeIn">
              <select
                value={filterCasaId}
                onChange={(e) => setFilterCasaId(e.target.value)}
                className="w-full bg-[#070a13] border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-350 focus:outline-none"
              >
                <option value="ALL">Todos os Lotes</option>
                <option value="GLOBAL">Apenas Global (Projetos/Terreno)</option>
                {houses.map(c => (
                  <option key={c.id} value={c.id}>Qd {c.quadra}, Casa {c.numero}</option>
                ))}
              </select>

              <select
                value={filterCategoria}
                onChange={(e) => setFilterCategoria(e.target.value)}
                className="w-full bg-[#070a13] border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-350 focus:outline-none"
              >
                <option value="ALL">Todas Categorias</option>
                <option value="TERRENO">Terreno</option>
                <option value="PROJETOS">Projetos</option>
                <option value="MATERIAL">Materiais</option>
                <option value="MAO_DE_OBRA">Mão de Obra</option>
                <option value="IMPOSTOS">Tributos RET</option>
                <option value="MEDICAO_CAIXA">Medições CEF</option>
                <option value="ENTRADA_CLIENTE">Entradas Cliente</option>
              </select>

              <div className="flex gap-2">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full bg-[#070a13] border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-350 focus:outline-none"
                >
                  <option value="ALL">Todos os Status</option>
                  <option value="PAGO">Pago / Liquidado</option>
                  <option value="PENDENTE">Pendente / Aberto</option>
                </select>
                {activeFilterCount > 0 && (
                  <button
                    onClick={() => {
                      setFilterCasaId('ALL');
                      setFilterStatus('ALL');
                      setFilterCategoria('ALL');
                    }}
                    className="text-[10px] text-indigo-400 hover:text-indigo-350 transition cursor-pointer font-semibold shrink-0 px-2"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Feed cronológico */}
          <div className="glassmorphism rounded-2xl border border-slate-850 overflow-hidden">
            <div className="flex justify-between items-center px-5 py-4 border-b border-slate-900">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <FileSpreadsheet size={14} className="text-indigo-400" /> Extrato
              </h3>
              <span className="text-[10px] text-slate-500 font-mono">{filteredTransactions.length} lançamentos</span>
            </div>

            {loadingTransactions ? (
              <div className="py-16 text-center text-slate-500 text-xs italic">Carregando extrato...</div>
            ) : feedGroups.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs italic">Nenhuma transação encontrada para os filtros selecionados.</div>
            ) : (
              <div className="divide-y divide-slate-900/60">
                {feedGroups.map(group => (
                  <div key={group.key}>
                    <div className="flex justify-between items-center px-5 py-2 bg-slate-950/50">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">{group.label}</span>
                      <span className={`text-[10px] font-mono font-bold ${group.net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {group.net >= 0 ? '+' : ''}{formatCurrency(group.net)}
                      </span>
                    </div>

                    {group.items.map(t => {
                      const meta = CATEGORY_META[t.categoria] || { icon: FileSpreadsheet, label: t.categoria, color: 'text-slate-400 bg-slate-500/10' };
                      const Icon = meta.icon;
                      const isIncome = t.natureza === 'RECEITA';
                      const isPaid = t.status === 'PAGO';

                      return (
                        <div key={t.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-900/20 transition group">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${meta.color}`}>
                            <Icon size={16} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-slate-100 truncate">{t.descricao}</span>
                              {!isPaid && (
                                <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 shrink-0">
                                  Pendente
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-500 truncate">
                              {meta.label}
                              {t.casaId ? ` · Qd ${t.casa.quadra}, Casa ${t.casa.numero}` : ' · Custo Global'}
                              {t.cliente?.nome ? ` · ${t.cliente.nome}` : ''}
                            </p>
                          </div>

                          <span className={`text-xs font-bold font-mono shrink-0 ${isIncome ? 'text-emerald-400' : 'text-red-400'}`}>
                            {isIncome ? '+' : '-'}{formatCurrency(t.valor)}
                          </span>

                          <button
                            onClick={() => handleDeleteTransaction(t.id, t.casaId === null)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-red-400 transition cursor-pointer shrink-0"
                            title="Excluir Lançamento"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* VIEW TAB: PROJEÇÃO DE CAIXA */}
      {/* ========================================== */}
      {!loadingData && activeTab === 'projecao' && fluxoCaixaData && (
        <div className="animate-fadeIn">
          <FluxoCaixaCockpit
            key={selectedProjectId}
            empreendimentos={empreendimentos}
            initialData={fluxoCaixaData}
            defaultProjectId={selectedProjectId}
          />
        </div>
      )}

      {/* ========================================== */}
      {/* VIEW TAB: CUSTOS POR CASA (portfólio) */}
      {/* ========================================== */}
      {activeTab === 'custos_casa' && (
        <div className="animate-fadeIn space-y-5">
          {loadingCustosCasa && (
            <div className="flex flex-col items-center justify-center min-h-[30vh] gap-3">
              <Loader2 className="animate-spin text-indigo-500" size={24} />
              <p className="text-xs text-slate-500 font-mono">Carregando custos por casa...</p>
            </div>
          )}

          {!loadingCustosCasa && custosCasa?.resumo && custosCasa.linhas.length === 0 && (
            <div className="glassmorphism p-8 rounded-2xl text-center text-sm text-slate-500">
              Nenhuma casa cadastrada neste empreendimento.
            </div>
          )}

          {!loadingCustosCasa && custosCasa?.resumo && custosCasa.linhas.length > 0 && (() => {
            const r = custosCasa.resumo;
            return (
              <>
                {/* Resumo do portfólio */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="glassmorphism p-4 rounded-2xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">No orçamento</span>
                    <p className="text-2xl font-bold text-emerald-400 mt-1">
                      {r.casasDentro}<span className="text-sm text-slate-500 font-normal"> / {r.casasComOrcamento}</span>
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">casas com orçamento definido</p>
                  </div>
                  <div className={`glassmorphism p-4 rounded-2xl border ${r.casasEstouradas > 0 ? 'border-red-500/25' : 'border-slate-800'}`}>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Estourando</span>
                    <p className={`text-2xl font-bold mt-1 ${r.casasEstouradas > 0 ? 'text-red-500' : 'text-slate-300'}`}>{r.casasEstouradas}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">gasto acima do orçado</p>
                  </div>
                  <div className="glassmorphism p-4 rounded-2xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Gasto / Orçado</span>
                    <p className="text-base font-bold text-white mt-1.5 leading-tight">
                      {formatCurrency(r.totalGasto)}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">de {formatCurrency(r.totalOrcado)} · {r.percentConsumidoGeral.toFixed(0)}%</p>
                  </div>
                  <div className="glassmorphism p-4 rounded-2xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Margem projetada</span>
                    <p className={`text-base font-bold mt-1.5 leading-tight ${r.totalMargem >= 0 ? 'text-emerald-400' : 'text-red-500'}`}>
                      {formatCurrency(r.totalMargem)}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {r.margemPercentGeral != null ? `${r.margemPercentGeral.toFixed(1)}% do VGV vendido` : 'sem vendas ainda'}
                    </p>
                  </div>
                </div>

                {/* Tabela por casa */}
                <div className="glassmorphism rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400">
                          <th className="text-left font-semibold px-4 py-3">Casa</th>
                          <th className="text-left font-semibold px-4 py-3 hidden md:table-cell">Obra</th>
                          <th className="text-right font-semibold px-4 py-3">Orçado</th>
                          <th className="text-right font-semibold px-4 py-3">Gasto</th>
                          <th className="text-left font-semibold px-4 py-3">Consumido</th>
                          <th className="text-right font-semibold px-4 py-3">Falta / Excedente</th>
                          <th className="text-right font-semibold px-4 py-3">Margem</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850">
                        {custosCasa.linhas.map((l: any) => {
                          const pct = Math.min(100, l.percentConsumido);
                          return (
                            <tr key={l.id} className="hover:bg-slate-800/20 transition">
                              <td className="px-4 py-3">
                                <a href={`/casas/${l.id}`} className="font-bold text-white hover:text-indigo-400 transition">
                                  Qd {l.quadra} · Casa {l.numero}
                                </a>
                                <span className={`ml-2 text-[9px] px-1.5 py-0.5 rounded-full font-bold ${l.vendida ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-700/40 text-slate-400'}`}>
                                  {l.vendida ? 'Vendida' : 'Estoque'}
                                </span>
                              </td>
                              <td className="px-4 py-3 hidden md:table-cell text-slate-400">
                                {l.statusObra.replace(/_/g, ' ')} · {l.percentualObra}%
                              </td>
                              <td className="px-4 py-3 text-right text-slate-300">{l.orcado > 0 ? formatCurrency(l.orcado) : <span className="text-slate-600">—</span>}</td>
                              <td className="px-4 py-3 text-right text-white font-semibold">{formatCurrency(l.gasto)}</td>
                              <td className="px-4 py-3">
                                {l.orcado > 0 ? (
                                  <div className="flex items-center gap-2 min-w-[90px]">
                                    <div className="h-1.5 flex-1 bg-slate-800 rounded-full overflow-hidden">
                                      <div className={`h-full rounded-full ${l.estourou ? 'bg-red-500' : pct > 85 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
                                    </div>
                                    <span className={`text-[10px] font-bold ${l.estourou ? 'text-red-400' : 'text-slate-400'}`}>{l.percentConsumido.toFixed(0)}%</span>
                                  </div>
                                ) : <span className="text-slate-600">—</span>}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {l.orcado > 0 ? (
                                  l.falta >= 0
                                    ? <span className="text-emerald-400">{formatCurrency(l.falta)}</span>
                                    : <span className="text-red-400 font-semibold">−{formatCurrency(Math.abs(l.falta))}</span>
                                ) : <span className="text-slate-600">—</span>}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {l.margem != null ? (
                                  <span className={l.margem >= 0 ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>
                                    {formatCurrency(l.margem)}
                                    {l.margemPercent != null && <span className="text-[10px] text-slate-500 ml-1">({l.margemPercent.toFixed(0)}%)</span>}
                                  </span>
                                ) : <span className="text-slate-600">—</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 px-1">
                  Gasto em regime de competência (inclui despesas pendentes). Margem projetada = valor de venda − custo total esperado (o maior entre orçado e já gasto).
                </p>
              </>
            );
          })()}
        </div>
      )}

    </div>
  );
}
