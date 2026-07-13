'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DollarSign,
  TrendingUp,
  ArrowUpCircle,
  ArrowDownCircle,
  ShieldAlert,
  ShieldCheck,
  Users,
  PiggyBank,
  History,
  AlertTriangle,
  Plus,
  Pencil,
  X,
  ChevronDown,
  Split,
  Loader2,
  Trash2,
  RotateCcw
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  ReferenceLine
} from 'recharts';

interface Socio {
  id: string;
  nome: string;
  percentualCotas: number;
}

interface Conta {
  id: string;
  nome: string;
  saldoAtual: number;
}

interface Project {
  id: string;
  nome: string;
}

interface Movimentacao {
  id: string;
  socioId: string;
  socioNome: string;
  empreendimentoId: string | null;
  empNome: string;
  tipo: string;
  valor: number;
  data: string;
}

interface SocioCaixaFormProps {
  socios: Socio[];
  contas: Conta[];
  projects: Project[];
  initialMovimentacoes: Movimentacao[];
  saldoBancario: number;
  custoAIncorrer: number;
  recebiveisCurtoPrazo: number;
  caixaLivre: number;
  chartTimeline: { mes: string; receitas: number; despesas: number }[];
}

export default function SocioCaixaForm({
  socios,
  contas,
  projects,
  initialMovimentacoes,
  saldoBancario,
  custoAIncorrer,
  recebiveisCurtoPrazo,
  caixaLivre,
  chartTimeline
}: SocioCaixaFormProps) {
  const router = useRouter();

  // Transaction form states
  const [selectedSocioId, setSelectedSocioId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [tipoMov, setTipoMov] = useState<'APORTE' | 'RETIRADA_LUCRO' | 'PRO_LABORE'>('RETIRADA_LUCRO');
  const [valorMov, setValorMov] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Extrato individual por sócio (expandir linha)
  const [expandedSocioId, setExpandedSocioId] = useState<string | null>(null);

  // Modal de criar/editar sócio
  const [isSocioModalOpen, setIsSocioModalOpen] = useState(false);
  const [editingSocioId, setEditingSocioId] = useState<string | null>(null);
  const [socioNomeInput, setSocioNomeInput] = useState('');
  const [socioCotasInput, setSocioCotasInput] = useState('');
  const [isSavingSocio, setIsSavingSocio] = useState(false);
  const [socioFeedback, setSocioFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal de distribuição de lucro
  const [isDistribuirModalOpen, setIsDistribuirModalOpen] = useState(false);
  const [distribuirProjectId, setDistribuirProjectId] = useState('');
  const [distribuirValor, setDistribuirValor] = useState('');
  const [dreLucroApurado, setDreLucroApurado] = useState<number | null>(null);
  const [loadingDreDistribuicao, setLoadingDreDistribuicao] = useState(false);
  const [isSavingDistribuicao, setIsSavingDistribuicao] = useState(false);
  const [distribuicaoFeedback, setDistribuicaoFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Exclusão de movimentação e reset da tesouraria
  const [deletingMovId, setDeletingMovId] = useState<string | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetFeedback, setResetFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const totalCotasCadastradas = socios.reduce((sum, s) => sum + s.percentualCotas, 0);

  const extratoPorSocio = socios.map(s => {
    const movs = initialMovimentacoes.filter(m => m.socioId === s.id);
    const totalAportado = movs.filter(m => m.tipo === 'APORTE').reduce((sum, m) => sum + m.valor, 0);
    const totalRetiradaLucro = movs.filter(m => m.tipo === 'RETIRADA_LUCRO').reduce((sum, m) => sum + m.valor, 0);
    const totalProLabore = movs.filter(m => m.tipo === 'PRO_LABORE').reduce((sum, m) => sum + m.valor, 0);
    return {
      ...s,
      totalAportado,
      totalRetiradaLucro,
      totalProLabore,
      saldoCapitalInvestido: totalAportado - totalRetiradaLucro,
      movimentacoes: movs
    };
  });

  const jaDistribuidoNoProjeto = distribuirProjectId
    ? initialMovimentacoes
        .filter(m => m.tipo === 'RETIRADA_LUCRO' && m.empreendimentoId === distribuirProjectId)
        .reduce((sum, m) => sum + m.valor, 0)
    : 0;

  const disponivelParaDistribuir = dreLucroApurado !== null
    ? Math.max(0, dreLucroApurado - jaDistribuidoNoProjeto)
    : 0;

  const previewDistribuicao = socios
    .filter(s => s.percentualCotas > 0)
    .map(s => ({
      ...s,
      valor: totalCotasCadastradas > 0
        ? Math.round((parseFloat(distribuirValor || '0') * (s.percentualCotas / totalCotasCadastradas)) * 100) / 100
        : 0
    }));

  const openNewSocioModal = () => {
    setEditingSocioId(null);
    setSocioNomeInput('');
    setSocioCotasInput('');
    setSocioFeedback(null);
    setIsSocioModalOpen(true);
  };

  const openEditSocioModal = (socio: Socio) => {
    setEditingSocioId(socio.id);
    setSocioNomeInput(socio.nome);
    setSocioCotasInput(String(socio.percentualCotas));
    setSocioFeedback(null);
    setIsSocioModalOpen(true);
  };

  const handleSaveSocio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!socioNomeInput || !socioCotasInput) {
      setSocioFeedback({ type: 'error', message: 'Preencha o nome e o percentual de cotas.' });
      return;
    }

    setIsSavingSocio(true);
    setSocioFeedback(null);
    try {
      const url = editingSocioId ? `/api/socios/${editingSocioId}` : '/api/socios';
      const method = editingSocioId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: socioNomeInput, percentualCotas: parseFloat(socioCotasInput) })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar sócio.');

      setIsSocioModalOpen(false);
      router.refresh();
    } catch (err: any) {
      setSocioFeedback({ type: 'error', message: err.message });
    } finally {
      setIsSavingSocio(false);
    }
  };

  const openDistribuirModal = () => {
    setDistribuirProjectId('');
    setDistribuirValor('');
    setDreLucroApurado(null);
    setDistribuicaoFeedback(null);
    setIsDistribuirModalOpen(true);
  };

  const handleDistribuirProjectChange = async (projectId: string) => {
    setDistribuirProjectId(projectId);
    setDreLucroApurado(null);
    setDistribuirValor('');
    if (!projectId) return;

    setLoadingDreDistribuicao(true);
    try {
      const res = await fetch(`/api/financeiro/dre?empreendimentoId=${projectId}`);
      const data = await res.json();
      if (res.ok) {
        setDreLucroApurado(data.lucroLiquidoRealizado || 0);
        const jaDist = initialMovimentacoes
          .filter(m => m.tipo === 'RETIRADA_LUCRO' && m.empreendimentoId === projectId)
          .reduce((sum, m) => sum + m.valor, 0);
        setDistribuirValor(String(Math.max(0, (data.lucroLiquidoRealizado || 0) - jaDist)));
      }
    } catch (err) {
      console.error('Erro ao buscar DRE para distribuição:', err);
    } finally {
      setLoadingDreDistribuicao(false);
    }
  };

  const handleConfirmDistribuicao = async () => {
    if (!distribuirProjectId || !distribuirValor || parseFloat(distribuirValor) <= 0) {
      setDistribuicaoFeedback({ type: 'error', message: 'Selecione o empreendimento e informe um valor válido.' });
      return;
    }

    setIsSavingDistribuicao(true);
    setDistribuicaoFeedback(null);
    try {
      const res = await fetch('/api/socios/distribuir-lucro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empreendimentoId: distribuirProjectId, valorTotal: parseFloat(distribuirValor) })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao distribuir lucro.');

      setIsDistribuirModalOpen(false);
      router.refresh();
    } catch (err: any) {
      setDistribuicaoFeedback({ type: 'error', message: err.message });
    } finally {
      setIsSavingDistribuicao(false);
    }
  };

  const handleDeleteMovimentacao = async (mov: Movimentacao) => {
    const sinal = mov.tipo === 'APORTE' ? 'devolvido (debitado)' : 'estornado (creditado)';
    if (!window.confirm(
      `Excluir esta movimentação de ${mov.tipo.replace('_', ' ')} de ${formatCurrency(mov.valor)} (${mov.socioNome})?\n\n` +
      `O valor será ${sinal} no saldo em conta. Esta ação não pode ser desfeita.`
    )) return;

    setDeletingMovId(mov.id);
    try {
      const res = await fetch(`/api/socios/retiradas/${mov.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao excluir movimentação.');
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeletingMovId(null);
    }
  };

  const handleResetTesouraria = async () => {
    setIsResetting(true);
    setResetFeedback(null);
    try {
      const res = await fetch('/api/socios/reset-tesouraria', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao resetar tesouraria.');
      setIsResetModalOpen(false);
      router.refresh();
    } catch (err: any) {
      setResetFeedback({ type: 'error', message: err.message });
    } finally {
      setIsResetting(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(val);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  // Semáforo logic and colors
  let semaforoColor = 'bg-red-950/40 border-red-500/30 text-red-400';
  let semaforoTitle = '🔴 Perigo de Insolvência / Déficit Físico';
  let semaforoText = `O caixa livre está negativo (${formatCurrency(caixaLivre)}) e o saldo bancário está zerado ou negativo (${formatCurrency(saldoBancario)}). A construtora necessita de aportes imediatos de capital dos sócios para não paralisar as obras.`;

  if (caixaLivre > 0) {
    semaforoColor = 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400';
    semaforoTitle = '🟢 Distribuição de Lucros Liberada';
    semaforoText = `A saúde financeira da construtora está excelente. O saldo físico disponível e os recebíveis de curto prazo superam o Custo a Incorrer das obras ativas em ${formatCurrency(caixaLivre)}. Retiradas de lucros estão liberadas de forma segura.`;
  } else if (caixaLivre <= 0 && saldoBancario > 0) {
    semaforoColor = 'bg-amber-950/40 border-amber-500/30 text-amber-400';
    semaforoTitle = '🟡 Ilusão de Liquidez Detectada (Retiradas Bloqueadas)';
    semaforoText = `Cuidado! Embora exista saldo em conta (${formatCurrency(saldoBancario)}), esse dinheiro está comprometido para pagar o Custo a Incorrer de finalização das obras ativas (${formatCurrency(custoAIncorrer)}). O Caixa Livre está negativo. Novas retiradas de lucro estão bloqueadas pelo motor de tesouraria.`;
  }

  const handlePostMovimentacao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSocioId || !tipoMov || !valorMov) {
      alert('Preencha todos os campos da movimentação.');
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    try {
      const response = await fetch('/api/socios/retiradas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          socioId: selectedSocioId,
          tipo: tipoMov,
          valor: parseFloat(valorMov),
          empreendimentoId: selectedProjectId || null
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setFeedback({
          type: 'error',
          message: data.error || 'Erro ao processar movimentação societária.'
        });
        return;
      }

      setFeedback({
        type: 'success',
        message: `✓ Movimentação societária de ${tipoMov.replace('_', ' ')} registrada com sucesso!`
      });
      setValorMov('');
      setSelectedSocioId('');
      setSelectedProjectId('');
      router.refresh();
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', message: 'Erro ao se conectar com o servidor.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Semáforo Alert Banner */}
      <div className={`p-5 rounded-2xl border ${semaforoColor} leading-relaxed flex items-start gap-4`}>
        <div className="p-3 bg-slate-900/40 border border-current rounded-xl">
          {caixaLivre > 0 ? <ShieldCheck size={28} /> : <ShieldAlert size={28} />}
        </div>
        <div className="flex-1">
          <h3 className="text-base font-extrabold tracking-wide uppercase">{semaforoTitle}</h3>
          <p className="text-sm mt-1.5 text-slate-200/90 leading-relaxed">{semaforoText}</p>
        </div>
      </div>

      {/* 2. KPIs de Liquidez e Custo a Incorrer */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="glassmorphism p-5 rounded-2xl border border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Disponível em Conta</span>
          <h3 className="text-xl font-bold text-white font-mono mt-1.5">{formatCurrency(saldoBancario)}</h3>
          <p className="text-[10px] text-slate-500 mt-1">Saldo físico consolidado</p>
        </div>

        <div className="glassmorphism p-5 rounded-2xl border border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Recebíveis 30D</span>
          <h3 className="text-xl font-bold text-emerald-400 font-mono mt-1.5">{formatCurrency(recebiveisCurtoPrazo)}</h3>
          <p className="text-[10px] text-slate-500 mt-1">Entradas de clientes previstas</p>
        </div>

        <div className="glassmorphism p-5 rounded-2xl border border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Custo a Incorrer</span>
          <h3 className="text-xl font-bold text-red-400 font-mono mt-1.5">{formatCurrency(custoAIncorrer)}</h3>
          <p className="text-[10px] text-slate-500 mt-1">Orçado - Realizado de obras ativas</p>
        </div>

        <div className={`glassmorphism p-5 rounded-2xl border ${caixaLivre > 0 ? 'border-emerald-500/20' : 'border-red-500/20'}`}>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Caixa Livre Real</span>
          <h3 className={`text-xl font-bold font-mono mt-1.5 ${caixaLivre > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatCurrency(caixaLivre)}
          </h3>
          <p className="text-[10px] text-slate-500 mt-1">Saldo livre para distribuição</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Gráfico Recharts de Curva S Acumulada */}
        <div className="lg:col-span-8 glassmorphism p-6 rounded-2xl border border-slate-800/80 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white">Projeção de Saldo de Caixa — próximos 6 meses</h3>
            <p className="text-xs text-slate-400 mt-1">Parte do saldo atual em conta e projeta as entradas previstas (recebíveis + medições) menos o custo a incorrer distribuído no período.</p>
          </div>

          <div className="h-64 w-full mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={(() => {
                  // Ponto de partida REAL: o saldo bancário consolidado de hoje.
                  // A partir dele, acumula o líquido projetado de cada mês (receitas - despesas).
                  let cumSaldo = saldoBancario;
                  return chartTimeline.map(item => {
                    cumSaldo += (item.receitas - item.despesas);
                    return {
                      mes: item.mes,
                      "Saldo de Caixa": cumSaldo
                    };
                  });
                })()}
                margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
                <XAxis dataKey="mes" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f1422', borderColor: '#1e293b' }}
                  itemStyle={{ fontSize: '11px', color: '#fff' }}
                  labelStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                  formatter={(val) => [formatCurrency(val as number), '']}
                />
                <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                <ReferenceLine y={0} stroke="#475569" strokeDasharray="4 4" label={{ value: 'Saldo zero', fill: '#94a3b8', fontSize: 9, position: 'top' }} />
                <Line type="monotone" dataKey="Saldo de Caixa" stroke="#6366f1" activeDot={{ r: 8 }} strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quadro Societário (Sócios Cotistas) */}
        <div className="lg:col-span-4 glassmorphism p-5 rounded-2xl border border-slate-800/80">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Users size={16} className="text-blue-400" /> Quadro de Cotistas
            </h3>
            <button
              type="button"
              onClick={openNewSocioModal}
              className="p-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
              title="Adicionar Sócio"
            >
              <Plus size={13} />
            </button>
          </div>

          <div className="divide-y divide-slate-800/60 text-xs">
            {extratoPorSocio.map(socio => {
              const isExpanded = expandedSocioId === socio.id;
              return (
                <div key={socio.id} className="py-1">
                  <button
                    type="button"
                    onClick={() => setExpandedSocioId(isExpanded ? null : socio.id)}
                    className="w-full py-2 flex justify-between items-center cursor-pointer text-left"
                  >
                    <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <ChevronDown size={12} className={`text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      {socio.nome}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="font-mono font-bold text-white">{socio.percentualCotas}%</p>
                        <p className="text-[9px] text-slate-500 uppercase">das cotas</p>
                      </div>
                      <span
                        role="button"
                        onClick={(e) => { e.stopPropagation(); openEditSocioModal(socio); }}
                        className="p-1 hover:bg-slate-800 rounded text-slate-500 hover:text-white transition cursor-pointer"
                        title="Editar Sócio"
                      >
                        <Pencil size={11} />
                      </span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="pb-3 pl-4 pt-1 grid grid-cols-2 gap-2 text-[10px] animate-fadeIn">
                      <div className="bg-slate-900/40 rounded-lg p-2">
                        <span className="text-slate-500 block uppercase font-bold">Aportado</span>
                        <span className="font-mono font-bold text-emerald-400">{formatCurrency(socio.totalAportado)}</span>
                      </div>
                      <div className="bg-slate-900/40 rounded-lg p-2">
                        <span className="text-slate-500 block uppercase font-bold">Retirado (Lucro)</span>
                        <span className="font-mono font-bold text-slate-200">{formatCurrency(socio.totalRetiradaLucro)}</span>
                      </div>
                      <div className="bg-slate-900/40 rounded-lg p-2">
                        <span className="text-slate-500 block uppercase font-bold">Pró-labore Recebido</span>
                        <span className="font-mono font-bold text-slate-200">{formatCurrency(socio.totalProLabore)}</span>
                      </div>
                      <div className="bg-slate-900/40 rounded-lg p-2">
                        <span className="text-slate-500 block uppercase font-bold">Saldo de Capital</span>
                        <span className={`font-mono font-bold ${socio.saldoCapitalInvestido >= 0 ? 'text-indigo-400' : 'text-red-400'}`}>
                          {formatCurrency(socio.saldoCapitalInvestido)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {socios.length === 0 && (
              <p className="text-xs text-slate-500 text-center py-6">Nenhum sócio cadastrado.</p>
            )}
          </div>

          {totalCotasCadastradas !== 100 && socios.length > 0 && (
            <p className="text-[9px] text-amber-400 mt-3 flex items-start gap-1">
              <AlertTriangle size={10} className="shrink-0 mt-0.5" />
              Cotas somam {totalCotasCadastradas}%, não 100%. A distribuição de lucro é normalizada proporcionalmente.
            </p>
          )}

          <button
            type="button"
            onClick={openDistribuirModal}
            className="w-full mt-4 py-2.5 bg-purple-650 hover:bg-purple-600 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-purple-650/10"
          >
            <Split size={13} />
            Distribuir Lucro entre Sócios
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Formulário de Lançamento Financeiro Societário */}
        <div className="lg:col-span-5 glassmorphism p-5 rounded-2xl border border-slate-850">
          <h3 className="text-sm font-bold text-white mb-1.5 flex items-center gap-2">
            <PiggyBank className="text-indigo-400" size={18} /> Aporte ou Retirada de Capital
          </h3>
          <p className="text-xs text-slate-400 mb-4">Lançamento na tesouraria corporativa com controle algorítmico de liquidez real</p>

          {feedback && (
            <div className={`p-3.5 rounded-xl border text-xs leading-relaxed mb-4 ${
              feedback.type === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}>
              {feedback.message}
            </div>
          )}

          <form onSubmit={handlePostMovimentacao} className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1.5 font-semibold">Sócio Beneficiário</label>
              <select
                value={selectedSocioId}
                onChange={(e) => setSelectedSocioId(e.target.value)}
                required
                className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-indigo-500/50"
              >
                <option value="">-- Escolha o Sócio --</option>
                {socios.map(socio => (
                  <option key={socio.id} value={socio.id}>{socio.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1.5 font-semibold">Tipo da Movimentação</label>
              <select
                value={tipoMov}
                onChange={(e) => setTipoMov(e.target.value as any)}
                required
                className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-indigo-500/50"
              >
                <option value="RETIRADA_LUCRO">Retirada de Lucro (Exige Caixa Livre)</option>
                <option value="PRO_LABORE">Pró-labore Diretor</option>
                <option value="APORTE">Aporte de Capital (Injeção)</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1.5 font-semibold">Vincular a Empreendimento (Opcional)</label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-indigo-500/50"
              >
                <option value="">-- Rateio Geral (Sem Vínculo Específico) --</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1.5 font-semibold">Valor (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="Ex: 5000.00"
                value={valorMov}
                onChange={(e) => setValorMov(e.target.value)}
                className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition disabled:opacity-50 cursor-pointer shadow-lg shadow-indigo-600/10"
            >
              {isSubmitting ? 'Salvando...' : 'Registrar Lançamento'}
            </button>
          </form>
        </div>

        {/* Histórico das movimentações */}
        <div className="lg:col-span-7 glassmorphism p-5 rounded-2xl border border-slate-800/60">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <History size={16} className="text-slate-400" /> Histórico de Transações de Sócios
            </h3>
            <button
              type="button"
              onClick={() => { setResetFeedback(null); setIsResetModalOpen(true); }}
              className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-500/50 bg-red-500/5 hover:bg-red-500/10 px-2.5 py-1.5 rounded-lg transition cursor-pointer"
              title="Apaga todas as movimentações e zera o saldo das contas (mantém os sócios)"
            >
              <RotateCcw size={12} /> Zerar tesouraria
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-800/80 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900/30 border-b border-slate-800 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-2.5 px-3">Data</th>
                  <th className="py-2.5 px-3">Sócio</th>
                  <th className="py-2.5 px-3">Tipo</th>
                  <th className="py-2.5 px-3 text-right">Valor</th>
                  <th className="py-2.5 px-3 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-slate-300">
                {initialMovimentacoes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-500">Nenhuma transação efetuada.</td>
                  </tr>
                ) : (
                  initialMovimentacoes.map(mov => {
                    const isAdd = mov.tipo === 'APORTE';
                    return (
                      <tr key={mov.id} className="hover:bg-slate-800/5">
                        <td className="py-2.5 px-3 font-mono">{formatDate(mov.data)}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-200">
                          <div>
                            <p>{mov.socioNome}</p>
                            <span className="text-[9px] text-slate-500">{mov.empNome}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            isAdd 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}>
                            {isAdd ? <ArrowUpCircle size={10} /> : <ArrowDownCircle size={10} />}
                            {mov.tipo.replace('_', ' ')}
                          </span>
                        </td>
                        <td className={`py-2.5 px-3 text-right font-mono font-bold ${isAdd ? 'text-emerald-400' : 'text-slate-200'}`}>
                          {isAdd ? '+' : '-'}{formatCurrency(mov.valor)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteMovimentacao(mov)}
                            disabled={deletingMovId === mov.id}
                            className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition cursor-pointer disabled:opacity-40"
                            title="Excluir movimentação (estorna o saldo)"
                          >
                            {deletingMovId === mov.id
                              ? <Loader2 size={13} className="animate-spin" />
                              : <Trash2 size={13} />}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal: Novo/Editar Sócio */}
      {isSocioModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glassmorphism w-full max-w-sm rounded-2xl border border-slate-800 shadow-2xl p-6 relative">
            <button
              onClick={() => setIsSocioModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X size={16} />
            </button>

            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-b border-slate-850 pb-2 flex items-center gap-2">
              <Users size={16} className="text-blue-400" /> {editingSocioId ? 'Editar Sócio' : 'Novo Sócio'}
            </h4>

            {socioFeedback && (
              <div className={`p-3 rounded-xl border text-xs leading-relaxed mb-4 ${
                socioFeedback.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}>
                {socioFeedback.message}
              </div>
            )}

            <form onSubmit={handleSaveSocio} className="space-y-4 text-xs text-slate-300">
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1 font-semibold">Nome do Sócio *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Eduardo Souza"
                  value={socioNomeInput}
                  onChange={(e) => setSocioNomeInput(e.target.value)}
                  className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500/50"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1 font-semibold">Percentual de Cotas (%) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  required
                  placeholder="Ex: 50"
                  value={socioCotasInput}
                  onChange={(e) => setSocioCotasInput(e.target.value)}
                  className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500/50 font-mono"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setIsSocioModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-350 rounded-xl font-bold transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingSocio}
                  className="px-4 py-2 bg-indigo-650 hover:bg-indigo-600 text-white font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                >
                  {isSavingSocio && <Loader2 size={12} className="animate-spin" />}
                  {editingSocioId ? 'Salvar Alterações' : 'Cadastrar Sócio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Distribuir Lucro entre Sócios */}
      {isDistribuirModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glassmorphism w-full max-w-lg rounded-2xl border border-slate-800 shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsDistribuirModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X size={16} />
            </button>

            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-1 flex items-center gap-2">
              <Split size={16} className="text-purple-400" /> Distribuir Lucro entre Sócios
            </h4>
            <p className="text-[10px] text-slate-450 mb-4">
              Gera uma retirada de lucro para cada sócio, proporcional ao percentual de cotas, direto na tesouraria.
            </p>

            {distribuicaoFeedback && (
              <div className={`p-3 rounded-xl border text-xs leading-relaxed mb-4 ${
                distribuicaoFeedback.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}>
                {distribuicaoFeedback.message}
              </div>
            )}

            <div className="space-y-4 text-xs text-slate-300">
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1 font-semibold">Empreendimento *</label>
                <select
                  value={distribuirProjectId}
                  onChange={(e) => handleDistribuirProjectChange(e.target.value)}
                  className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:border-purple-500/50"
                >
                  <option value="">-- Selecione o Empreendimento --</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              </div>

              {loadingDreDistribuicao && (
                <div className="flex items-center gap-2 text-slate-400 py-2">
                  <Loader2 size={14} className="animate-spin" /> Calculando lucro apurado...
                </div>
              )}

              {!loadingDreDistribuicao && dreLucroApurado !== null && (
                <div className="grid grid-cols-3 gap-2 p-3 bg-slate-900/40 border border-slate-800 rounded-xl">
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase font-bold block">Lucro Apurado</span>
                    <span className="font-mono font-bold text-emerald-400">{formatCurrency(dreLucroApurado)}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase font-bold block">Já Distribuído</span>
                    <span className="font-mono font-bold text-slate-300">{formatCurrency(jaDistribuidoNoProjeto)}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase font-bold block">Disponível</span>
                    <span className="font-mono font-bold text-indigo-400">{formatCurrency(disponivelParaDistribuir)}</span>
                  </div>
                </div>
              )}

              {distribuirProjectId && (
                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1 font-semibold">Valor a Distribuir (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={distribuirValor}
                    onChange={(e) => setDistribuirValor(e.target.value)}
                    className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-purple-500/50 font-mono"
                  />
                </div>
              )}

              {distribuirProjectId && distribuirValor && parseFloat(distribuirValor) > 0 && (
                <div className="border-t border-slate-850 pt-3">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold block mb-2">Prévia por Sócio</span>
                  <div className="space-y-1.5">
                    {previewDistribuicao.map(s => (
                      <div key={s.id} className="flex justify-between items-center text-[11px] bg-slate-900/30 rounded-lg px-3 py-2">
                        <span className="text-slate-300 font-medium">{s.nome} <span className="text-slate-500">({s.percentualCotas}%)</span></span>
                        <span className="font-mono font-bold text-emerald-400">{formatCurrency(s.valor)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setIsDistribuirModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-350 rounded-xl font-bold transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isSavingDistribuicao || !distribuirProjectId || !distribuirValor}
                  onClick={handleConfirmDistribuicao}
                  className="px-4 py-2 bg-purple-650 hover:bg-purple-600 disabled:opacity-50 text-white font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                >
                  {isSavingDistribuicao && <Loader2 size={12} className="animate-spin" />}
                  Confirmar Distribuição
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Zerar Tesouraria (reset limpo) */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glassmorphism w-full max-w-md rounded-2xl border border-red-500/30 shadow-2xl p-6 relative">
            <button
              onClick={() => setIsResetModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X size={16} />
            </button>

            <h4 className="text-sm font-bold text-red-400 uppercase tracking-wider mb-1 flex items-center gap-2">
              <RotateCcw size={16} /> Zerar Tesouraria
            </h4>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Esta ação, de forma <strong className="text-slate-200">irreversível</strong>:
            </p>

            <ul className="text-xs text-slate-300 space-y-2 mb-4">
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">•</span>
                Apaga <strong>todas as {initialMovimentacoes.length} movimentações</strong> de sócios (aportes, retiradas e pró-labores).
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">•</span>
                Zera o <strong>saldo de todas as contas bancárias</strong> (hoje {formatCurrency(saldoBancario)}).
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">•</span>
                <span className="text-slate-400">Mantém os sócios e suas cotas cadastrados.</span>
              </li>
            </ul>

            {resetFeedback && (
              <div className="p-3 rounded-xl border text-xs leading-relaxed mb-4 bg-red-500/10 border-red-500/30 text-red-400">
                {resetFeedback.message}
              </div>
            )}

            <div className="flex gap-3 justify-end pt-4 border-t border-slate-850">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-350 rounded-xl font-bold transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isResetting}
                onClick={handleResetTesouraria}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer"
              >
                {isResetting && <Loader2 size={12} className="animate-spin" />}
                Zerar agora
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
