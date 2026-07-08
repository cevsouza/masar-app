'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Home, 
  User, 
  DollarSign, 
  Percent, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Play,
  Hammer,
  ChevronRight,
  TrendingUp,
  FileSpreadsheet,
  Sun,
  CloudRain,
  Lightbulb,
  Droplet,
  Smartphone,
  ShieldCheck,
  Activity,
  FileText
} from 'lucide-react';
import GedManager from '@/components/GedManager';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

interface HouseDetailsProps {
  initialCasa: any;
  allInsumos?: any[];
}

const STAGES = [
  { id: 'SEM_INICIO', label: 'Sem Início' },
  { id: 'FUNDACAO', label: 'Fundação' },
  { id: 'ALVENARIA', label: 'Alvenaria' },
  { id: 'COBERTURA', label: 'Cobertura' },
  { id: 'ACABAMENTO', label: 'Acabamento' },
  { id: 'CONCLUIDA', label: 'Concluída' },
];

export default function HouseDetails({ initialCasa, allInsumos = [] }: HouseDetailsProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'geral' | 'financeiro' | 'infra' | 'ged'>('geral');
  const [isUpdatingApproval, setIsUpdatingApproval] = useState<string | null>(null);

  // Physical evolution state
  const [statusObra, setStatusObra] = useState(initialCasa.statusObra);
  const [percentualObra, setPercentualObra] = useState(initialCasa.percentualObra.toString());
  const [prazoFisicoInput, setPrazoFisicoInput] = useState(initialCasa.prazoFisico ? initialCasa.prazoFisico.split('T')[0] : '');
  const [prazoFinanceiroInput, setPrazoFinanceiroInput] = useState(initialCasa.prazoFinanceiro ? initialCasa.prazoFinanceiro.split('T')[0] : '');
  const [obstaculosInput, setObstaculosInput] = useState(initialCasa.obstaculos || '');
  const [isUpdatingObra, setIsUpdatingObra] = useState(false);

  // Financial form state
  const [percentualMedido, setPercentualMedido] = useState('');
  const [valorLiberado, setValorLiberado] = useState('');
  const [statusMedicao, setStatusMedicao] = useState('AGUARDANDO');
  const [checkSondagem, setCheckSondagem] = useState(false);
  const [checkEpis, setCheckEpis] = useState(false);
  const [checkMateriais, setCheckMateriais] = useState(false);
  const [isCreatingMedicao, setIsCreatingMedicao] = useState(false);

  // Status updating state
  const [updatingMedicaoId, setUpdatingMedicaoId] = useState<string | null>(null);

  // Budget stats
  const totalOrado = initialCasa.orcamento?.itens.reduce((acc: number, item: any) => acc + (item.quantidadePlanejada * item.custoUnitarioPrevisto), 0) || 0;
  const totalRealAprovado = initialCasa.apropriacoes?.filter((ap: any) => ap.aprovado).reduce((acc: number, ap: any) => acc + ap.custoTotal, 0) || 0;
  const totalRealPendente = initialCasa.apropriacoes?.filter((ap: any) => !ap.aprovado).reduce((acc: number, ap: any) => acc + ap.custoTotal, 0) || 0;

  // Chart data
  const chartData = [
    { name: 'Previsto Orçado', valor: totalOrado, color: '#6366f1' },
    { name: 'Real Aprovado', valor: totalRealAprovado, color: '#10b981' },
    { name: 'Excesso Pendente', valor: totalRealPendente, color: '#f59e0b' }
  ];

  // ABC calculation
  const itemsABC = initialCasa.orcamento?.itens.map((item: any) => {
    const realTotal = initialCasa.apropriacoes
      ?.filter((ap: any) => ap.insumoId === item.insumoId && ap.aprovado)
      .reduce((acc: number, ap: any) => acc + ap.custoTotal, 0) || 0;

    const previstoTotal = item.quantidadePlanejada * item.custoUnitarioPrevisto;
    const desvio = realTotal - previstoTotal;

    return {
      nome: item.insumo.nome,
      categoria: item.insumo.categoria,
      previsto: previstoTotal,
      realizado: realTotal,
      desvio
    };
  }) || [];

  const unbudgetedApropriacoes = initialCasa.apropriacoes
    ?.filter((ap: any) => ap.aprovado && !initialCasa.orcamento?.itens.some((item: any) => item.insumoId === ap.insumoId))
    .reduce((acc: any[], ap: any) => {
      const existing = acc.find(item => item.insumoId === ap.insumoId);
      if (existing) {
        existing.realizado += ap.custoTotal;
        existing.desvio += ap.custoTotal;
      } else {
        acc.push({
          nome: ap.insumo.nome,
          categoria: ap.insumo.categoria,
          previsto: 0,
          realizado: ap.custoTotal,
          desvio: ap.custoTotal
        });
      }
      return acc;
    }, []) || [];

  const totalABC = [...itemsABC, ...unbudgetedApropriacoes].sort((a, b) => b.realizado - a.realizado);

  const handleUpdatePhysical = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingObra(true);
    try {
      const response = await fetch(`/api/casas/${initialCasa.id}/evolucao`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statusObra, percentualObra: parseFloat(percentualObra), prazoFisico: prazoFisicoInput, prazoFinanceiro: prazoFinanceiroInput, obstaculos: obstaculosInput }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Falha ao atualizar');
      router.refresh();
      alert('Dados de obra atualizados!');
    } catch (err: any) { 
      alert(err.message || 'Erro ao atualizar obra.'); 
    } finally { 
      setIsUpdatingObra(false); 
    }
  };

  const handleCreateMedicao = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingMedicao(true);
    try {
      const response = await fetch(`/api/casas/${initialCasa.id}/medicoes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ percentualMedido, valorLiberado, status: statusMedicao }),
      });
      if (!response.ok) throw new Error('Falha');
      router.refresh();
    } catch (err) { alert('Erro.'); } finally { setIsCreatingMedicao(false); }
  };

  const handleUpdateMedicaoStatus = async (medicaoId: string, newStatus: string) => {
    setUpdatingMedicaoId(medicaoId);
    try {
      await fetch(`/api/medicoes/${medicaoId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      router.refresh();
    } catch (err) { alert('Erro'); } finally { setUpdatingMedicaoId(null); }
  };

  const handleApproveApropriacao = async (apropriacaoId: string, aprovado: boolean) => {
    setIsUpdatingApproval(apropriacaoId);
    try {
      await fetch(`/api/casas/${initialCasa.id}/apropriacoes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apropriacaoId, aprovado })
      });
      router.refresh();
    } catch (err) { alert('Erro'); } finally { setIsUpdatingApproval(null); }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('pt-BR');
  const getStatusBadge = (status: string) => {
    if (status === 'PAGA') return <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20">Paga</span>;
    if (status === 'AGUARDANDO') return <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full border border-amber-500/20">Aguardando</span>;
    return <span className="text-[10px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded-full border border-red-500/20">Glosada</span>;
  };

  return (
    <div className="space-y-6">
      {initialCasa.obstaculos && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-start gap-3 animate-pulse">
          <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={18} />
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider">Atenção: Impedimento / Gargalo (Pitfall) Detectado</h4>
            <p className="text-xs text-red-200/90 mt-1 leading-relaxed">{initialCasa.obstaculos}</p>
          </div>
        </div>
      )}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1e293b] pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-blue-400 font-semibold uppercase tracking-wider">
            <Home size={14} /> Unidade Habitacional
          </div>
          <h1 className="text-2xl font-bold text-white mt-1">
            Casa {initialCasa.numero} - Quadra {initialCasa.quadra}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Projeto: <strong>{initialCasa.empreendimento.nome}</strong>
          </p>
        </div>

        <div className="glassmorphism py-3 px-4.5 rounded-xl border border-slate-800/80 flex items-center gap-3 max-w-sm self-start md:self-auto">
          <div className="p-2 bg-slate-800 text-slate-400 rounded-lg shrink-0">
            <User size={18} />
          </div>
          <div className="overflow-hidden">
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Adquirente</p>
            <p className="text-xs font-bold text-white truncate">
              {initialCasa.cliente ? initialCasa.cliente.nome : 'Disponível em Estoque'}
            </p>
            {initialCasa.cliente && (
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/10 px-1.5 py-0.5 rounded mt-1 inline-block font-semibold">
                Crédito: {initialCasa.cliente.statusCredito.replace('_', ' ')}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex border-b border-slate-800/60 pb-px gap-1 bg-[#101625]/30 p-1.5 rounded-xl">
        <button onClick={() => setActiveTab('geral')} className={`flex items-center gap-1.5 px-4.5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer ${activeTab === 'geral' ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-slate-400 hover:text-slate-200'}`}>
          <Hammer size={14} /> Geral & Vistoria CEF
        </button>
        <button onClick={() => setActiveTab('financeiro')} className={`flex items-center gap-1.5 px-4.5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer ${activeTab === 'financeiro' ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-slate-400 hover:text-slate-200'}`}>
          <DollarSign size={14} /> Finanças & Custos
        </button>
        <button onClick={() => setActiveTab('infra')} className={`flex items-center gap-1.5 px-4.5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer ${activeTab === 'infra' ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-slate-400 hover:text-slate-200'}`}>
          <Lightbulb size={14} /> Diário & Utilidades
        </button>
        <button onClick={() => setActiveTab('ged')} className={`flex items-center gap-1.5 px-4.5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer ${activeTab === 'ged' ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-slate-400 hover:text-slate-200'}`}>
          <FileText size={14} /> Documentação (GED)
        </button>
      </div>

      {activeTab === 'geral' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-6">
            {/* Card Comercial / Ficha de Tipologia da Unidade */}
            <div className="glassmorphism p-5 rounded-2xl border border-slate-800/60 bg-[#0f1422]/20">
              <h2 className="text-base font-bold text-white mb-3.5 flex items-center gap-2">
                <Home size={18} className="text-blue-400" /> Ficha Técnica & Tipologia
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-[#0f1422]/60 rounded-xl border border-slate-850">
                    <span className="text-slate-500 block uppercase tracking-wider text-[9px] font-bold">Área Construída</span>
                    <span className="text-slate-200 font-bold font-mono text-sm mt-0.5 block">
                      {initialCasa.areaConstruida ? `${initialCasa.areaConstruida} m²` : '---'}
                    </span>
                  </div>
                  <div className="p-3 bg-[#0f1422]/60 rounded-xl border border-slate-850">
                    <span className="text-slate-500 block uppercase tracking-wider text-[9px] font-bold">Área do Lote</span>
                    <span className="text-slate-200 font-bold font-mono text-sm mt-0.5 block">
                      {initialCasa.areaLote ? `${initialCasa.areaLote} m²` : '---'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2.5 bg-[#0f1422]/40 rounded-lg border border-slate-850">
                    <span className="text-slate-500 block text-[9px] font-bold uppercase">Quartos</span>
                    <span className="text-white font-extrabold text-sm block mt-0.5">{initialCasa.quantidadeQuartos || 0}</span>
                  </div>
                  <div className="p-2.5 bg-[#0f1422]/40 rounded-lg border border-slate-850">
                    <span className="text-slate-500 block text-[9px] font-bold uppercase">Suítes</span>
                    <span className="text-white font-extrabold text-sm block mt-0.5">{initialCasa.quantidadeSuites || 0}</span>
                  </div>
                  <div className="p-2.5 bg-[#0f1422]/40 rounded-lg border border-slate-850">
                    <span className="text-slate-500 block text-[9px] font-bold uppercase">Banh.</span>
                    <span className="text-white font-extrabold text-sm block mt-0.5">{initialCasa.quantidadeBanheiros || 0}</span>
                  </div>
                  <div className="p-2.5 bg-[#0f1422]/40 rounded-lg border border-slate-850">
                    <span className="text-slate-500 block text-[9px] font-bold uppercase">Vagas</span>
                    <span className="text-white font-extrabold text-sm block mt-0.5">{initialCasa.vagasGaragem || 0}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-md border ${initialCasa.possuiQuintal ? 'bg-emerald-950/20 border-emerald-900/30 text-emerald-400' : 'bg-slate-900/40 border-slate-850 text-slate-500'}`}>
                    {initialCasa.possuiQuintal ? '✓ Possui Quintal' : '✗ Sem Quintal'}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-md border ${initialCasa.salaConjugada ? 'bg-blue-950/20 border-blue-900/30 text-blue-400' : 'bg-slate-900/40 border-slate-850 text-slate-500'}`}>
                    {initialCasa.salaConjugada ? '✓ Sala Conjugada' : '✗ Sala Separada'}
                  </span>
                </div>
              </div>
            </div>

            <div className="glassmorphism p-5 rounded-2xl border border-slate-800/60">
              <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <Hammer size={18} className="text-indigo-400" /> Evolução Física da Obra
              </h2>

              <div className="grid grid-cols-2 gap-4 bg-[#0f1422] p-3 rounded-xl border border-slate-800 mb-5 text-xs">
                <div>
                  <span className="text-slate-500 block uppercase tracking-wider text-[9px] font-bold">Prazo Físico Obra</span>
                  <span className="text-slate-200 font-semibold mt-1 block">
                    {initialCasa.prazoFisico ? formatDate(initialCasa.prazoFisico) : 'Não definido'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block uppercase tracking-wider text-[9px] font-bold">Prazo Liberação CEF</span>
                  <span className="text-slate-200 font-semibold mt-1 block">
                    {initialCasa.prazoFinanceiro ? formatDate(initialCasa.prazoFinanceiro) : 'Não definido'}
                  </span>
                </div>
              </div>

              <form onSubmit={handleUpdatePhysical} className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1.5 font-medium">Estágio Atual da Obra</label>
                  <select
                    value={statusObra}
                    onChange={(e) => setStatusObra(e.target.value)}
                    className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-indigo-500/50"
                  >
                    <option value="SEM_INICIO">Sem Início</option>
                    <option value="FUNDACAO">Fundação</option>
                    <option value="ALVENARIA">Alvenaria</option>
                    <option value="COBERTURA">Cobertura (Laje/Telhado)</option>
                    <option value="ACABAMENTO">Acabamento</option>
                    <option value="CONCLUIDA">Obra Concluída</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1.5 font-medium">Execução Física (%)</label>
                  <div className="relative">
                    <Percent size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      placeholder="Ex: 45.5"
                      value={percentualObra}
                      onChange={(e) => setPercentualObra(e.target.value)}
                      className="w-full bg-[#0f1422] border border-slate-800 rounded-xl pl-8 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1.5 font-medium">Editar Prazo de Conclusão Física</label>
                  <input
                    type="date"
                    value={prazoFisicoInput}
                    onChange={(e) => setPrazoFisicoInput(e.target.value)}
                    className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1.5 font-medium">Editar Prazo de Liberação CEF</label>
                  <input
                    type="date"
                    value={prazoFinanceiroInput}
                    onChange={(e) => setPrazoFinanceiroInput(e.target.value)}
                    className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1.5 font-medium">Obstáculos ou Gargalos (Pitfalls)</label>
                  <textarea
                    rows={2}
                    placeholder="Relate problemas, greves ou atrasos que travam a obra..."
                    value={obstaculosInput}
                    onChange={(e) => setObstaculosInput(e.target.value)}
                    className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isUpdatingObra}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs transition disabled:opacity-50"
                >
                  {isUpdatingObra ? 'Salvando...' : 'Salvar Evolução Física'}
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-6">
            <div className="glassmorphism p-5 rounded-2xl border border-slate-800/60">
              <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <FileSpreadsheet size={18} className="text-amber-400" /> Controle de Medição CEF
              </h2>

              <div className="grid grid-cols-2 gap-4 mb-5">
                <div className="p-3 bg-[#0f1422] rounded-xl border border-slate-800">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Total Pago pela Caixa</p>
                  <p className="text-base font-bold text-emerald-400 font-mono mt-1">
                    {formatCurrency(initialCasa.medicoes.filter((m: any) => m.status === 'PAGA').reduce((acc: number, curr: any) => acc + curr.valorLiberado, 0))}
                  </p>
                </div>
                <div className="p-3 bg-[#0f1422] rounded-xl border border-slate-800">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Total Pendente / Retido</p>
                  <p className="text-base font-bold text-amber-400 font-mono mt-1">
                    {formatCurrency(initialCasa.medicoes.filter((m: any) => m.status !== 'PAGA').reduce((acc: number, curr: any) => acc + curr.valorLiberado, 0))}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-800/80 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900/30 border-b border-slate-800 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Data</th>
                      <th className="py-3 px-4">Medido (%)</th>
                      <th className="py-3 px-4">Valor Liberado</th>
                      <th className="py-3 px-4">Status CEF</th>
                      <th className="py-3 px-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-xs text-slate-300">
                    {initialCasa.medicoes.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-500">
                          Nenhuma medição registrada para esta casa.
                        </td>
                      </tr>
                    ) : (
                      initialCasa.medicoes.map((med: any) => (
                        <tr key={med.id} className="hover:bg-slate-800/5 transition">
                          <td className="py-3.5 px-4 font-mono">{formatDate(med.dataMedicao)}</td>
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-200">{med.percentualMedido}%</td>
                          <td className="py-3.5 px-4 font-mono">{formatCurrency(med.valorLiberado)}</td>
                          <td className="py-3.5 px-4">{getStatusBadge(med.status)}</td>
                          <td className="py-3.5 px-4 text-right">
                            <select
                              value={med.status}
                              disabled={updatingMedicaoId === med.id}
                              onChange={(e) => handleUpdateMedicaoStatus(med.id, e.target.value)}
                              className="bg-[#0f1422] border border-slate-800 rounded-md px-1 py-1 text-[10px] text-slate-300 focus:outline-none"
                            >
                              <option value="AGUARDANDO">Aguardando</option>
                              <option value="PAGA">Paga</option>
                              <option value="GLOSADA_REPROVADA">Glosada</option>
                            </select>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="glassmorphism p-5 rounded-2xl border border-slate-800/60">
              <h3 className="text-sm font-bold text-white mb-4">Registrar Nova Medição (CEF)</h3>
              <form onSubmit={handleCreateMedicao} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1.5 font-medium">Percentual Medido (%)</label>
                  <div className="relative">
                    <Percent size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      placeholder="Ex: 15.0"
                      value={percentualMedido}
                      onChange={(e) => setPercentualMedido(e.target.value)}
                      className="w-full bg-[#0f1422] border border-slate-800 rounded-xl pl-8 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500/50 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1.5 font-medium">Valor Liberado (R$)</label>
                  <div className="relative">
                    <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Ex: 25000.00"
                      value={valorLiberado}
                      onChange={(e) => setValorLiberado(e.target.value)}
                      className="w-full bg-[#0f1422] border border-slate-800 rounded-xl pl-8 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500/50 font-mono"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs text-slate-400 block mb-1.5 font-medium">Status da Medição</label>
                  <select
                    value={statusMedicao}
                    onChange={(e) => setStatusMedicao(e.target.value)}
                    className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-amber-500/50"
                  >
                    <option value="AGUARDANDO">Aguardando Pagamento</option>
                    <option value="PAGA">Paga (Recurso Liberado)</option>
                    <option value="GLOSADA_REPROVADA">Glosada (Reprovada pela CEF)</option>
                  </select>
                </div>

                <div className="md:col-span-2 bg-[#0b0f19]/80 border border-slate-800 rounded-xl p-3.5 space-y-2 mt-2">
                  <p className="text-[10px] text-amber-500 uppercase tracking-wider font-bold mb-1 flex items-center gap-1.5">
                    <AlertTriangle size={12} /> Checklist Mandatório de Vistoria
                  </p>
                  <label className="flex items-start gap-2.5 text-xs text-slate-300 cursor-pointer">
                    <input type="checkbox" checked={checkSondagem} onChange={(e) => setCheckSondagem(e.target.checked)} className="mt-0.5" />
                    <span>A sondagem do solo deste lote foi validada e está em conformidade?</span>
                  </label>
                  <label className="flex items-start gap-2.5 text-xs text-slate-300 cursor-pointer">
                    <input type="checkbox" checked={checkEpis} onChange={(e) => setCheckEpis(e.target.checked)} className="mt-0.5" />
                    <span>Todos os operários em campo utilizam os EPIs regulamentares?</span>
                  </label>
                  <label className="flex items-start gap-2.5 text-xs text-slate-300 cursor-pointer">
                    <input type="checkbox" checked={checkMateriais} onChange={(e) => setCheckMateriais(e.target.checked)} className="mt-0.5" />
                    <span>Os materiais aplicados estão em perfeita conformidade com o memorial descritivo aprovado?</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isCreatingMedicao || !(checkSondagem && checkEpis && checkMateriais)}
                  className="md:col-span-2 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-30 disabled:hover:bg-amber-600 text-white font-semibold rounded-xl text-xs transition disabled:opacity-50 mt-2 cursor-pointer"
                >
                  {isCreatingMedicao ? 'Registrando...' : 'Registrar Medição da Caixa'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'financeiro' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="glassmorphism p-5 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Orçamento Previsto</span>
              <h3 className="text-xl font-bold text-indigo-400 font-mono mt-1.5">{formatCurrency(totalOrado)}</h3>
            </div>
            <div className="glassmorphism p-5 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Custo Efetivo Realizado</span>
              <h3 className="text-xl font-bold text-emerald-400 font-mono mt-1.5">{formatCurrency(totalRealAprovado)}</h3>
            </div>
            <div className="glassmorphism p-5 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Bloqueado em Análise</span>
              <h3 className="text-xl font-bold text-amber-500 font-mono mt-1.5">{formatCurrency(totalRealPendente)}</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 glassmorphism p-5 rounded-2xl border border-slate-800/80 flex flex-col justify-between min-h-[320px]">
              <div>
                <h3 className="text-sm font-bold text-white">Previsto vs Realizado</h3>
              </div>
              
              {totalOrado === 0 && totalRealAprovado === 0 ? (
                <p className="text-xs text-slate-500 text-center py-10">Orçamento não cadastrado.</p>
              ) : (
                <div className="h-52 w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f1422', borderColor: '#1e293b' }} itemStyle={{ fontSize: '11px', color: '#fff' }} labelStyle={{ fontSize: '11px', fontWeight: 'bold' }} formatter={(val) => [formatCurrency(val as number), 'Valor']} />
                      <Bar dataKey="valor" radius={[8, 8, 0, 0]}>
                        {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="lg:col-span-7 glassmorphism p-5 rounded-2xl border border-slate-800/80">
              <h3 className="text-sm font-bold text-white mb-4">Curva ABC de Custos</h3>
              <div className="overflow-x-auto border border-slate-800/80 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900/30 border-b border-slate-800 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                      <th className="py-2.5 px-3">Insumo</th>
                      <th className="py-2.5 px-3">Categoria</th>
                      <th className="py-2.5 px-3 text-right">Previsto</th>
                      <th className="py-2.5 px-3 text-right">Realizado</th>
                      <th className="py-2.5 px-3 text-right">Desvio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 text-slate-300">
                    {totalABC.map((abc, index) => {
                      const desvioPercent = abc.previsto > 0 ? (abc.desvio / abc.previsto) * 100 : 100;
                      const isOver = abc.desvio > 0;
                      return (
                        <tr key={index} className="hover:bg-slate-800/5">
                          <td className="py-2.5 px-3 font-semibold text-slate-200">{abc.nome}</td>
                          <td className="py-2.5 px-3 uppercase text-[9px] font-bold text-slate-400">{abc.categoria.replace('_', ' ')}</td>
                          <td className="py-2.5 px-3 text-right font-mono">{formatCurrency(abc.previsto)}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-200">{formatCurrency(abc.realizado)}</td>
                          <td className={`py-2.5 px-3 text-right font-mono font-bold ${isOver ? 'text-red-400' : 'text-emerald-400'}`}>
                            {abc.desvio === 0 ? '—' : `${isOver ? '+' : ''}${formatCurrency(abc.desvio)} (${desvioPercent.toFixed(0)}%)`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="glassmorphism p-5 rounded-2xl border border-slate-850">
            <h3 className="text-sm font-bold text-white mb-1.5 flex items-center gap-2">
              <ShieldCheck className="text-amber-500" size={18} /> Autorizações Pendentes
            </h3>
            <div className="overflow-x-auto border border-slate-800/80 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900/30 border-b border-slate-800 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Data</th>
                    <th className="py-3 px-4">Insumo</th>
                    <th className="py-3 px-4 text-right">Valor Total</th>
                    <th className="py-3 px-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {initialCasa.apropriacoes?.filter((ap: any) => !ap.aprovado).map((ap: any) => (
                    <tr key={ap.id}>
                      <td className="py-3.5 px-4">{formatDate(ap.dataAplicacao)}</td>
                      <td className="py-3.5 px-4 font-bold">{ap.insumo.nome}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-amber-500">{formatCurrency(ap.custoTotal)}</td>
                      <td className="py-3.5 px-4 text-center">
                        <button onClick={() => handleApproveApropriacao(ap.id, true)} disabled={isUpdatingApproval === ap.id} className="px-2.5 py-1 bg-emerald-600 rounded text-[10px] font-bold">Aprovar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'infra' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-6">
            <div className="glassmorphism p-5 rounded-2xl border border-slate-800/60">
              <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <Lightbulb size={18} className="text-yellow-400" /> Ligações de Concessionárias
              </h2>
              <div className="p-4 bg-[#0f1422] border border-slate-800 rounded-xl space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5"><Lightbulb size={14}/> Padrão Energia:</span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${initialCasa.infraestrutura?.padraoEnergiaInstalado ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-500/10 text-slate-400'}`}>{initialCasa.infraestrutura?.padraoEnergiaInstalado ? 'Instalado' : 'Pendente'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5"><Droplet size={14}/> Ligação Água:</span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${initialCasa.infraestrutura?.ligacaoAguaConcluida ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-500/10 text-slate-400'}`}>{initialCasa.infraestrutura?.ligacaoAguaConcluida ? 'Concluída' : 'Pendente'}</span>
                  </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 glassmorphism p-5 rounded-2xl border border-slate-800/60">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Activity size={18} className="text-amber-400" /> Histórico de Diários
            </h3>
            {initialCasa.diarios?.map((diario: any) => (
              <div key={diario.id} className="p-4 bg-[#0f1422]/60 border border-slate-800/80 rounded-xl mb-4 text-xs text-slate-200">
                <p><strong>Data:</strong> {formatDate(diario.data)} | <strong>Atividades:</strong> {diario.atividadesExecutadas}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {activeTab === 'ged' && (
        <div className="glassmorphism p-6 rounded-2xl border border-slate-800/60 max-w-4xl mx-auto">
          <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
            <FileText size={18} className="text-indigo-400" /> Gestão Eletrônica de Documentos (GED)
          </h2>
          <p className="text-xs text-slate-400 mb-6">Mapeamento de laudos, alvarás, relatórios de vistoria e documentações do adquirente.</p>
          <GedManager casaId={initialCasa.id} clienteId={initialCasa.clienteId} />
        </div>
      )}
    </div>
  );
}
