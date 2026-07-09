'use client';

import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Calculator, 
  TrendingUp, 
  Loader2, 
  DollarSign,
  FileSpreadsheet,
  Layers,
  Filter,
  CheckCircle,
  Clock,
  Search,
  RefreshCw,
  Trash2,
  AlertOctagon
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

export default function CentralFinanceiraPage() {
  const [empreendimentos, setEmpreendimentos] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [loadingProjects, setLoadingProjects] = useState(true);

  // Active view tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'livro_caixa'>('dashboard');

  // DRE & DFC data
  const [dreData, setDreData] = useState<any>(null);
  const [dfcData, setDfcData] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Transactions (Livro-Caixa)
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  // Livro-Caixa Filters
  const [houses, setHouses] = useState<any[]>([]);
  const [filterCasaId, setFilterCasaId] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterCategoria, setFilterCategoria] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch initial project list
  useEffect(() => {
    const loadProjects = async () => {
      try {
        setLoadingProjects(true);
        const res = await fetch('/api/empreendimentos').then(r => r.json());
        setEmpreendimentos(res || []);
        if (res && res.length > 0) {
          setSelectedProjectId(res[0].id);
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
        const [resDre, resDfc] = await Promise.all([
          fetch(`/api/financeiro/dre?empreendimentoId=${selectedProjectId}`).then(r => r.json()),
          fetch(`/api/financeiro/dfc?empreendimentoId=${selectedProjectId}`).then(r => r.json())
        ]);
        setDreData(resDre);
        setDfcData(resDfc || []);
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

    fetchFinancialData();
    fetchTransactions();
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
    { name: 'VGV Comercial', valor: [0, Number(dreData.totalVGVRealizado)] as [number, number], display: Number(dreData.totalVGVRealizado), color: '#6366f1' },
    { name: 'Corretagem', valor: [Math.max(0, Number(dreData.totalVGVRealizado) - Number(dreData.totalComissaoRealizada)), Number(dreData.totalVGVRealizado)] as [number, number], display: Number(dreData.totalComissaoRealizada), color: '#f59e0b' },
    { name: 'Terreno / Lote', valor: [Math.max(0, Number(dreData.totalVGVRealizado) - Number(dreData.totalComissaoRealizada) - Number(dreData.totalRateioReal)), Math.max(0, Number(dreData.totalVGVRealizado) - Number(dreData.totalComissaoRealizada))] as [number, number], display: Number(dreData.totalRateioReal), color: '#3b82f6' },
    { name: 'Tributação RET', valor: [Math.max(0, Number(dreData.totalVGVRealizado) - Number(dreData.totalComissaoRealizada) - Number(dreData.totalRateioReal) - Number(dreData.totalImpostoRealizado)), Math.max(0, Number(dreData.totalVGVRealizado) - Number(dreData.totalComissaoRealizada) - Number(dreData.totalRateioReal))] as [number, number], display: Number(dreData.totalImpostoRealizado), color: '#ef4444' },
    { name: 'Custos Diretos', valor: [Math.max(0, Number(dreData.lucroLiquidoRealizado)), Math.max(0, Number(dreData.totalVGVRealizado) - Number(dreData.totalComissaoRealizada) - Number(dreData.totalRateioReal) - Number(dreData.totalImpostoRealizado))] as [number, number], display: Number(dreData.totalDiretoRealizado), color: '#ec4899' },
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
            <h1 className="text-xl font-bold text-white mt-0.5">Livro-Caixa & DRE Universal</h1>
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
            Dashboard Consolidado
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
            Extrato Livro-Caixa
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
      {/* VIEW TAB: DASHBOARD CONSOLIDADO */}
      {/* ========================================== */}
      {!loadingData && activeTab === 'dashboard' && dreData && (
        <div className="space-y-6 animate-fadeIn">
          
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
              <p className="text-[10px] text-slate-500 mt-1">Diretos obra + macro rateios</p>
            </div>

            <div className="glassmorphism p-5 rounded-2xl border border-slate-850">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Impostos RET & Comissões</span>
              <h3 className="text-xl font-bold text-amber-500 font-mono mt-1.5">{formatCurrency(dreData.totalImpostoRealizado + dreData.totalComissaoRealizada)}</h3>
              <p className="text-[10px] text-slate-500 mt-1">Tributação RET e intermediários</p>
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
                  <Calculator size={14} className="text-indigo-400" /> Demonstração do Resultado (DRE Cascata)
                </h3>
                <p className="text-[10px] text-slate-400 mt-1">Quebra analítica de receitas, deduções e despesas por competência real</p>
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
              <FileSpreadsheet size={14} className="text-indigo-400" /> Balancete Consolidado Comparativo (Projetado vs Realizado)
            </h3>
            
            <div className="overflow-x-auto border border-slate-900 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-900 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Rubrica Financeira</th>
                    <th className="py-3 px-4 text-right">Previsto / Orçado</th>
                    <th className="py-3 px-4 text-right">Realizado / Pago</th>
                    <th className="py-3 px-4 text-right">Desvio Econômico</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/60 text-slate-300 font-mono">
                  {/* Receitas */}
                  <tr className="hover:bg-slate-900/10 font-sans">
                    <td className="py-2.5 px-4 font-semibold text-slate-200">Receita Operacional Bruta (VGV)</td>
                    <td className="py-2.5 px-4 text-right">{formatCurrency(dreData.totalVGVProjetado)}</td>
                    <td className="py-2.5 px-4 text-right text-emerald-400">{formatCurrency(dreData.totalVGVRealizado)}</td>
                    <td className={`py-2.5 px-4 text-right font-bold ${(dreData.totalVGVRealizado - dreData.totalVGVProjetado) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {formatCurrency(dreData.totalVGVRealizado - dreData.totalVGVProjetado)}
                    </td>
                  </tr>
                  {/* Comissoes */}
                  <tr className="hover:bg-slate-900/10 text-slate-400">
                    <td className="py-2 px-4 pl-6">(-) Intermediação Corretagem</td>
                    <td className="py-2 px-4 text-right">-{formatCurrency(dreData.totalComissaoProjetada)}</td>
                    <td className="py-2 px-4 text-right">-{formatCurrency(dreData.totalComissaoRealizada)}</td>
                    <td className={`py-2 px-4 text-right ${dreData.totalComissaoRealizada > dreData.totalComissaoProjetada ? 'text-red-400' : 'text-emerald-400'}`}>
                      {formatCurrency(dreData.totalComissaoProjetada - dreData.totalComissaoRealizada)}
                    </td>
                  </tr>
                  {/* Impostos */}
                  <tr className="hover:bg-slate-900/10 text-slate-400">
                    <td className="py-2 px-4 pl-6">(-) Tributação Faturamento (RET)</td>
                    <td className="py-2 px-4 text-right">-{formatCurrency(dreData.totalImpostoProjetado)}</td>
                    <td className="py-2 px-4 text-right">-{formatCurrency(dreData.totalImpostoRealizado)}</td>
                    <td className={`py-2 px-4 text-right ${dreData.totalImpostoRealizado > dreData.totalImpostoProjetado ? 'text-red-400' : 'text-emerald-400'}`}>
                      {formatCurrency(dreData.totalImpostoProjetado - dreData.totalImpostoRealizado)}
                    </td>
                  </tr>
                  {/* Custos Globais */}
                  <tr className="hover:bg-slate-900/10 font-semibold text-slate-200">
                    <td className="py-2.5 px-4">(-) Custos Globais Rateados (Terreno/Projetos/Mkt)</td>
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
                    <td className="py-2.5 px-4">(-) Custos Diretos de Obras das Casas</td>
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
                    <td className="py-3 px-4 text-sm font-extrabold">Lucro Líquido Operacional</td>
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
      {/* VIEW TAB: EXTRATO LIVRO-CAIXA */}
      {/* ========================================== */}
      {!loadingData && activeTab === 'livro_caixa' && (
        <div className="space-y-4 animate-fadeIn">
          
          {/* Filters Bar */}
          <div className="p-4 bg-[#0f1422] border border-slate-800/80 rounded-2xl grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar descrição ou valor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#070a13] border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50"
              />
            </div>

            {/* Casa filter */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 font-bold uppercase shrink-0">Lote:</span>
              <select
                value={filterCasaId}
                onChange={(e) => setFilterCasaId(e.target.value)}
                className="w-full bg-[#070a13] border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-350 focus:outline-none"
              >
                <option value="ALL">Todos os Lotes</option>
                <option value="GLOBAL">Apenas Global (Projetos/Terreno)</option>
                {houses.map(c => (
                  <option key={c.id} value={c.id}>Qd {c.quadra}, Casa {c.numero}</option>
                ))}
              </select>
            </div>

            {/* Categoria filter */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 font-bold uppercase shrink-0">Cat:</span>
              <select
                value={filterCategoria}
                onChange={(e) => setFilterCategoria(e.target.value)}
                className="w-full bg-[#070a13] border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-350 focus:outline-none"
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
            </div>

            {/* Status filter */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 font-bold uppercase shrink-0">Status:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full bg-[#070a13] border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-350 focus:outline-none"
              >
                <option value="ALL">Todos</option>
                <option value="PAGO">Pago / Liquidado</option>
                <option value="PENDENTE">Pendente / Aberto</option>
              </select>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="glassmorphism p-5 rounded-2xl border border-slate-850">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <FileSpreadsheet size={14} className="text-indigo-400" /> Livro-Caixa Consolidado ({filteredTransactions.length} registros)
              </h3>
              {searchTerm || filterCasaId !== 'ALL' || filterStatus !== 'ALL' || filterCategoria !== 'ALL' ? (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterCasaId('ALL');
                    setFilterStatus('ALL');
                    setFilterCategoria('ALL');
                  }}
                  className="text-[10px] text-indigo-400 hover:text-indigo-350 transition flex items-center gap-1 cursor-pointer font-semibold"
                >
                  Limpar Filtros
                </button>
              ) : null}
            </div>

            <div className="overflow-x-auto border border-slate-900 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-900 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Data Venc.</th>
                    <th className="py-3 px-4">Descrição</th>
                    <th className="py-3 px-4">Lote / Vínculo</th>
                    <th className="py-3 px-4">Categoria</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Fluxo / Valor</th>
                    <th className="py-3 px-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/60 text-slate-300 font-mono">
                  {loadingTransactions ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500 italic font-sans">
                        Carregando livro-caixa universal...
                      </td>
                    </tr>
                  ) : filteredTransactions.map((t) => {
                    const isIncome = t.natureza === 'RECEITA';
                    const isPaid = t.status === 'PAGO';
                    const displayDate = isPaid && t.dataPagamento ? t.dataPagamento : t.dataVencimento;

                    return (
                      <tr key={t.id} className="hover:bg-slate-900/20 transition-all">
                        <td className="py-3 px-4 text-slate-400 font-sans">
                          {new Date(displayDate).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-3 px-4 font-sans font-medium text-slate-200">
                          {t.descricao}
                          {t.cliente?.nome && (
                            <span className="text-[9px] text-indigo-400 bg-indigo-950/40 border border-indigo-900/40 rounded-md px-1.5 py-0.5 ml-2 font-sans font-normal">
                              Padrão: {t.cliente.nome}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-sans">
                          {t.casaId ? (
                            <span className="text-slate-300 font-semibold">Lote Qd {t.casa.quadra}, Casa {t.casa.numero}</span>
                          ) : (
                            <span className="text-slate-500 italic">Custo Global Empr.</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-sans text-xs text-slate-400">
                          {t.categoria === 'MEDICAO_CAIXA' && 'Medição CEF'}
                          {t.categoria === 'ENTRADA_CLIENTE' && 'Entrada Cliente'}
                          {t.categoria === 'MATERIAL' && 'Materiais'}
                          {t.categoria === 'MAO_DE_OBRA' && 'Mão de Obra'}
                          {t.categoria === 'TERRENO' && 'Aquisição Terreno'}
                          {t.categoria === 'PROJETOS' && 'Projetos/Licença'}
                          {t.categoria === 'IMPOSTOS' && 'Impostos RET'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-sans font-bold leading-normal ${
                            isPaid
                              ? 'bg-emerald-950/40 border border-emerald-800/40 text-emerald-400'
                              : 'bg-amber-950/40 border border-amber-800/40 text-amber-400'
                          }`}>
                            {isPaid ? <CheckCircle size={10} /> : <Clock size={10} />}
                            {isPaid ? 'Liquidado' : 'Pendente'}
                          </span>
                        </td>
                        <td className={`py-3 px-4 text-right font-bold ${isIncome ? 'text-emerald-400' : 'text-red-400'}`}>
                          {isIncome ? '+' : '-'}{formatCurrency(t.valor)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleDeleteTransaction(t.id, t.casaId === null)}
                            className="p-1 hover:bg-slate-800 rounded text-slate-500 hover:text-red-400 transition cursor-pointer"
                            title="Excluir Lançamento"
                          >
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {!loadingTransactions && filteredTransactions.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500 italic font-sans">
                        Nenhuma transação encontrada para os filtros selecionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
