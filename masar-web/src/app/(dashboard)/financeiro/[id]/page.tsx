'use client';

import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Building2, 
  Calculator, 
  TrendingUp, 
  Loader2, 
  ArrowUpRight, 
  ArrowDownRight, 
  DollarSign,
  AlertTriangle,
  FileSpreadsheet,
  Layers,
  Clock
} from 'lucide-react';
import Link from 'next/link';
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

export default function FinanceiroDrePage({ params }: { params: any }) {
  const resolvedParams = React.use(params) as { id: string };
  const empreendimentoId = resolvedParams.id;

  const [activeTab, setActiveTab] = useState<'dre' | 'dfc'>('dre');
  
  // DRE state
  const [dreData, setDreData] = useState<any>(null);
  const [loadingDre, setLoadingDre] = useState(true);

  // DFC state
  const [dfcData, setDfcData] = useState<any[]>([]);
  const [loadingDfc, setLoadingDfc] = useState(true);

  const fetchDre = async () => {
    try {
      setLoadingDre(true);
      const res = await fetch(`/api/financeiro/dre?empreendimentoId=${empreendimentoId}`);
      if (res.ok) {
        const data = await res.json();
        setDreData(data);
      }
    } catch (err) {
      console.error('Erro ao buscar DRE:', err);
    } finally {
      setLoadingDre(false);
    }
  };

  const fetchDfc = async () => {
    try {
      setLoadingDfc(true);
      const res = await fetch(`/api/financeiro/dfc?empreendimentoId=${empreendimentoId}`);
      if (res.ok) {
        const data = await res.json();
        setDfcData(data);
      }
    } catch (err) {
      console.error('Erro ao buscar DFC:', err);
    } finally {
      setLoadingDfc(false);
    }
  };

  useEffect(() => {
    fetchDre();
    fetchDfc();
  }, [empreendimentoId]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(val);
  };

  if (loadingDre || loadingDfc) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
        <p className="text-xs text-slate-500 font-mono">Processando balanço financeiro em tempo real...</p>
      </div>
    );
  }

  // Prepara o Waterfall Chart para a DRE
  const chartDataWaterfall: { name: string; valor: [number, number]; display: number; color: string; }[] = dreData ? [
    { name: 'VGV Vendido', valor: [0, Number(dreData.totalVGVRealizado)], display: Number(dreData.totalVGVRealizado), color: '#6366f1' },
    { name: 'Corretagem', valor: [Math.max(0, Number(dreData.totalVGVRealizado) - Number(dreData.totalComissaoRealizada)), Number(dreData.totalVGVRealizado)], display: Number(dreData.totalComissaoRealizada), color: '#f59e0b' },
    { name: 'Rateios/Terreno', valor: [Math.max(0, Number(dreData.totalVGVRealizado) - Number(dreData.totalComissaoRealizada) - Number(dreData.totalRateio)), Math.max(0, Number(dreData.totalVGVRealizado) - Number(dreData.totalComissaoRealizada))], display: Number(dreData.totalRateio), color: '#3b82f6' },
    { name: 'Tributação RET', valor: [Math.max(0, Number(dreData.totalVGVRealizado) - Number(dreData.totalComissaoRealizada) - Number(dreData.totalRateio) - Number(dreData.totalImpostoRealizado)), Math.max(0, Number(dreData.totalVGVRealizado) - Number(dreData.totalComissaoRealizada) - Number(dreData.totalRateio))], display: Number(dreData.totalImpostoRealizado), color: '#ef4444' },
    { name: 'Custos Obra', valor: [Math.max(0, Number(dreData.lucroLiquidoRealizado)), Math.max(0, Number(dreData.totalVGVRealizado) - Number(dreData.totalComissaoRealizada) - Number(dreData.totalRateio) - Number(dreData.totalImpostoRealizado))], display: Number(dreData.totalDiretoRealizado), color: '#ec4899' },
    { name: 'Lucro Líquido', valor: [0, Math.max(0, Number(dreData.lucroLiquidoRealizado))], display: Number(dreData.lucroLiquidoRealizado), color: '#10b981' }
  ] : [];

  // Dados compostos para o DFC Chart
  const chartDataDfc = dfcData.map(item => ({
    mes: item.mes,
    'Entradas Totais': item.entradasMedicoesReal + item.entradasClientesReal + item.entradasAportesReal,
    'Saídas Totais': item.saidasObraReal + item.saidasRateiosReal + item.saidasRetiradasReal,
    'Saldo Acumulado': item.saldoAcumulado
  }));

  // Estatísticas DFC
  const totalEntradasReal = dfcData.reduce((acc, item) => acc + item.entradasMedicoesReal + item.entradasClientesReal + item.entradasAportesReal, 0);
  const totalSaidasReal = dfcData.reduce((acc, item) => acc + item.saidasObraReal + item.saidasRateiosReal + item.saidasRetiradasReal, 0);
  const caixaFinal = dfcData.length > 0 ? dfcData[dfcData.length - 1].saldoAcumulado : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-900 pb-5">
        <div className="flex items-center gap-4">
          <Link href="/empreendimentos" className="p-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition cursor-pointer">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-1.5 text-xs text-indigo-400 font-semibold uppercase tracking-wider">
              <Building2 size={12} /> Controladoria Contábil & Financeira
            </div>
            <h1 className="text-xl font-bold text-white mt-1">
              Painel Financeiro: {dreData?.empreendimentoNome || 'Empreendimento'}
            </h1>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-[#0b0f19] border border-slate-900 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('dre')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${activeTab === 'dre' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            DRE (Competência)
          </button>
          <button
            onClick={() => setActiveTab('dfc')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${activeTab === 'dfc' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            DFC (Fluxo de Caixa)
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB: DRE (REGIME DE COMPETÊNCIA) */}
      {/* ======================================================== */}
      {activeTab === 'dre' && dreData && (
        <div className="space-y-6">
          {/* KPIs DRE */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div className="glassmorphism p-5 rounded-2xl border border-slate-850">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">VGV Vendido Realizado</span>
              <h3 className="text-xl font-bold text-white font-mono mt-1.5">{formatCurrency(dreData.totalVGVRealizado)}</h3>
              <p className="text-[10px] text-slate-500 mt-1">Soma das vendas fechadas</p>
            </div>

            <div className="glassmorphism p-5 rounded-2xl border border-slate-850">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Custos Totais Apropriados</span>
              <h3 className="text-xl font-bold text-red-400 font-mono mt-1.5">{formatCurrency(dreData.totalDiretoRealizado + dreData.totalRateio)}</h3>
              <p className="text-[10px] text-slate-500 mt-1">Gastos diretos e indiretos de competência</p>
            </div>

            <div className="glassmorphism p-5 rounded-2xl border border-slate-850">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Impostos RET & Corretagem</span>
              <h3 className="text-xl font-bold text-amber-500 font-mono mt-1.5">{formatCurrency(dreData.totalImpostoRealizado + dreData.totalComissaoRealizada)}</h3>
              <p className="text-[10px] text-slate-500 mt-1">Tributação unificada e intermediação</p>
            </div>

            <div className="glassmorphism p-5 rounded-2xl border border-emerald-500/20">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Lucro Líquido Econômico</span>
              <h3 className="text-xl font-bold text-emerald-400 font-mono mt-1.5">{formatCurrency(dreData.lucroLiquidoRealizado)}</h3>
              <p className="text-[10px] text-slate-500 mt-1">Margem: <span className="font-bold text-emerald-400">{(dreData.totalVGVRealizado > 0 ? (dreData.lucroLiquidoRealizado / dreData.totalVGVRealizado) * 100 : 0).toFixed(1)}%</span></p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Waterfall Recharts Graph */}
            <div className="lg:col-span-8 glassmorphism p-6 rounded-2xl border border-slate-850 flex flex-col justify-between min-h-[360px]">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Calculator size={16} className="text-indigo-400" /> Gráfico de Cascata DRE (Competência)
                </h3>
              </div>
              
              <div className="h-72 w-full mt-4">
                <DreWaterfallChart data={chartDataWaterfall} />
              </div>
            </div>

            {/* Detalhamento DRE Card */}
            <div className="lg:col-span-4 glassmorphism p-5 rounded-2xl border border-slate-850">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-1.5">
                <FileSpreadsheet size={16} className="text-indigo-400" /> Relatório DRE Consolidado
              </h3>
              
              <div className="space-y-3.5 text-xs text-slate-200">
                <div className="flex justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-slate-400 font-semibold">VGV Comercializado:</span>
                  <span className="font-mono font-bold text-slate-100">{formatCurrency(dreData.totalVGVRealizado)}</span>
                </div>
                
                <div className="flex justify-between border-b border-slate-800/80 pb-2 text-rose-400">
                  <span className="text-slate-400">(-) Comissão Corretagem:</span>
                  <span className="font-mono font-bold">({formatCurrency(dreData.totalComissaoRealizada)})</span>
                </div>

                <div className="flex justify-between border-b border-slate-800/80 pb-2 text-rose-400">
                  <span className="text-slate-400">(-) Tributos RET:</span>
                  <span className="font-mono font-bold">({formatCurrency(dreData.totalImpostoRealizado)})</span>
                </div>

                <div className="flex justify-between border-b border-slate-800/80 pb-2 text-rose-400">
                  <span className="text-slate-400">(-) Rateio Terreno/Lote:</span>
                  <span className="font-mono font-bold">({formatCurrency(dreData.rateioTerreno)})</span>
                </div>

                <div className="flex justify-between border-b border-slate-800/80 pb-2 text-rose-400">
                  <span className="text-slate-400">(-) Outros Rateios (Mkt/Projetos):</span>
                  <span className="font-mono font-bold">({formatCurrency(dreData.rateioProjetos + dreData.rateioMarketing + dreData.rateioOutros)})</span>
                </div>

                <div className="flex justify-between border-b border-slate-800/80 pb-2 text-rose-400">
                  <span className="text-slate-400">(-) Custos Fixos Canteiro:</span>
                  <span className="font-mono font-bold">({formatCurrency(dreData.totalFixoRealizado)})</span>
                </div>

                <div className="flex justify-between border-b border-slate-800/80 pb-2 text-rose-400">
                  <span className="text-slate-400">(-) Custos Variáveis Obra:</span>
                  <span className="font-mono font-bold">({formatCurrency(dreData.totalVariavelRealizado)})</span>
                </div>

                <div className="flex justify-between pt-1 text-emerald-400">
                  <span className="text-slate-400 font-extrabold flex items-center gap-1">
                    <TrendingUp size={14} className="text-emerald-400" /> Lucro Líquido Final:
                  </span>
                  <span className="font-mono font-extrabold text-base">{formatCurrency(dreData.lucroLiquidoRealizado)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB: DFC (REGIME DE CAIXA) */}
      {/* ======================================================== */}
      {activeTab === 'dfc' && (
        <div className="space-y-6">
          {/* KPIs DFC */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div className="glassmorphism p-5 rounded-2xl border border-slate-850">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Entradas Acumuladas</span>
              <h3 className="text-xl font-bold text-emerald-400 font-mono mt-1.5">{formatCurrency(totalEntradasReal)}</h3>
              <p className="text-[10px] text-slate-500 mt-1">CEF, Clientes e Aportes</p>
            </div>

            <div className="glassmorphism p-5 rounded-2xl border border-slate-850">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Saídas Acumuladas</span>
              <h3 className="text-xl font-bold text-rose-400 font-mono mt-1.5">{formatCurrency(totalSaidasReal)}</h3>
              <p className="text-[10px] text-slate-500 mt-1">Obra, Rateios e Sócios</p>
            </div>

            <div className="glassmorphism p-5 rounded-2xl border border-slate-850">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Saldo Líquido Período</span>
              <h3 className={`text-xl font-bold font-mono mt-1.5 ${totalEntradasReal - totalSaidasReal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatCurrency(totalEntradasReal - totalSaidasReal)}
              </h3>
              <p className="text-[10px] text-slate-500 mt-1">Caixa operacional gerado</p>
            </div>

            <div className="glassmorphism p-5 rounded-2xl border border-indigo-500/20">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Saldo de Caixa Atual</span>
              <h3 className="text-xl font-bold text-indigo-400 font-mono mt-1.5">{formatCurrency(caixaFinal)}</h3>
              <p className="text-[10px] text-slate-500 mt-1">Reservas de caixa acumuladas</p>
            </div>
          </div>

          {/* Gráfico Composto DFC */}
          <div className="glassmorphism p-6 rounded-2xl border border-slate-850">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-2">
              <TrendingUp size={16} className="text-indigo-400" /> Fluxo de Caixa Mensal (Entradas, Saídas e Saldo Acumulado)
            </h3>
            <p className="text-xs text-slate-400 mb-6">Demonstração visual do caixa de produção: barras para entradas/saídas e linha para saldo acumulado</p>
            
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartDataDfc} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                  <XAxis dataKey="mes" stroke="#94a3b8" fontSize={9} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f1422', borderColor: '#1e293b' }} 
                    itemStyle={{ fontSize: '11px', color: '#fff' }} 
                    labelStyle={{ fontSize: '11px', fontWeight: 'bold' }} 
                    formatter={(val) => [formatCurrency(val as number), '']}
                  />
                  <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                  <Bar dataKey="Entradas Totais" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Saídas Totais" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="Saldo Acumulado" stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tabela Planilha DFC */}
          <div className="glassmorphism p-6 rounded-2xl border border-slate-850">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-1.5">
              <FileSpreadsheet size={16} className="text-indigo-400" /> Planilha de Fluxo de Caixa Mensal (Regime de Caixa)
            </h3>
            
            <div className="overflow-x-auto border border-slate-900 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-900 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Mês / Ano</th>
                    <th className="py-3 px-4 text-right text-emerald-400">Receitas CEF (Real)</th>
                    <th className="py-3 px-4 text-right text-emerald-400">Receitas Clientes</th>
                    <th className="py-3 px-4 text-right text-emerald-400">Aportes Sócios</th>
                    <th className="py-3 px-4 text-right text-rose-400">Saídas Obra (Real)</th>
                    <th className="py-3 px-4 text-right text-rose-400">Saídas Rateios</th>
                    <th className="py-3 px-4 text-right text-rose-400">Retiradas Sócios</th>
                    <th className="py-3 px-4 text-right text-white">Saldo Líquido</th>
                    <th className="py-3 px-4 text-right text-indigo-400">Saldo Acumulado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/60 text-slate-350 font-mono">
                  {dfcData.map((item, index) => {
                    const totalEntradaMes = item.entradasMedicoesReal + item.entradasClientesReal + item.entradasAportesReal;
                    const totalSaidaMes = item.saidasObraReal + item.saidasRateiosReal + item.saidasRetiradasReal;
                    return (
                      <tr key={index} className="hover:bg-slate-900/20 transition-all">
                        <td className="py-3 px-4 font-bold text-slate-200 font-sans">{item.mes}</td>
                        <td className="py-3 px-4 text-right text-emerald-500/80">{formatCurrency(item.entradasMedicoesReal)}</td>
                        <td className="py-3 px-4 text-right text-emerald-500/80">{formatCurrency(item.entradasClientesReal)}</td>
                        <td className="py-3 px-4 text-right text-emerald-500/80">{formatCurrency(item.entradasAportesReal)}</td>
                        <td className="py-3 px-4 text-right text-rose-500/80">{formatCurrency(item.saidasObraReal)}</td>
                        <td className="py-3 px-4 text-right text-rose-500/80">{formatCurrency(item.saidasRateiosReal)}</td>
                        <td className="py-3 px-4 text-right text-rose-500/80">{formatCurrency(item.saidasRetiradasReal)}</td>
                        <td className={`py-3 px-4 text-right font-bold ${item.saldoLiquido >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {item.saldoLiquido >= 0 ? '+' : ''}{formatCurrency(item.saldoLiquido)}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-indigo-400">{formatCurrency(item.saldoAcumulado)}</td>
                      </tr>
                    );
                  })}
                  {dfcData.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-6 text-center text-slate-500 italic font-sans">
                        Nenhuma movimentação financeira consolidada para este empreendimento.
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
