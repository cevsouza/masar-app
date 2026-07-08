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
  AlertTriangle
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
  socioNome: string;
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
            <h3 className="text-base font-bold text-white">Curva J - Fluxo de Caixa Consolidado (Incorporação)</h3>
            <p className="text-xs text-slate-400 mt-1">Evolução do Saldo de Caixa Acumulado: Desembolso inicial do Terreno/Projetos seguido pelo Breakeven e Lucro.</p>
          </div>

          <div className="h-64 w-full mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart 
                data={(() => {
                  // O caixa acumulado inicia negativo simulando o desembolso do Terreno + Projetos Globais do Empreendimento
                  let cumSaldo = - (custoAIncorrer * 0.3 + 180000); 
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
                <ReferenceLine y={0} stroke="#475569" strokeDasharray="4 4" label={{ value: 'Breakeven', fill: '#94a3b8', fontSize: 9, position: 'top' }} />
                <Line type="monotone" dataKey="Saldo de Caixa" stroke="#6366f1" activeDot={{ r: 8 }} strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quadro Societário (Sócios Cotistas) */}
        <div className="lg:col-span-4 glassmorphism p-5 rounded-2xl border border-slate-800/80">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Users size={16} className="text-blue-400" /> Quadro de Cotistas
          </h3>

          <div className="divide-y divide-slate-800/60 text-xs">
            {socios.map(socio => (
              <div key={socio.id} className="py-3 flex justify-between items-center">
                <span className="font-semibold text-slate-200">{socio.nome}</span>
                <div className="text-right">
                  <p className="font-mono font-bold text-white">{socio.percentualCotas}%</p>
                  <p className="text-[9px] text-slate-500 uppercase">das cotas sociais</p>
                </div>
              </div>
            ))}
            {socios.length === 0 && (
              <p className="text-xs text-slate-500 text-center py-6">Nenhum sócio cadastrado.</p>
            )}
          </div>
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
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <History size={16} className="text-slate-400" /> Histórico de Transações de Sócios
          </h3>

          <div className="overflow-x-auto border border-slate-800/80 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900/30 border-b border-slate-800 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-2.5 px-3">Data</th>
                  <th className="py-2.5 px-3">Sócio</th>
                  <th className="py-2.5 px-3">Tipo</th>
                  <th className="py-2.5 px-3 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-slate-300">
                {initialMovimentacoes.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-500">Nenhuma transação efetuada.</td>
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
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
