'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Calendar, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Building2, 
  Home, 
  DollarSign, 
  Tag, 
  X,
  Loader2
} from 'lucide-react';

interface Milestone {
  id: string;
  titulo: string;
  descricao: string | null;
  categoria: string;
  dataLimite: string;
  dataConclusao: string | null;
  concluido: boolean;
  empreendimentoId: string | null;
  empreendimento?: { nome: string } | null;
  casaId: string | null;
  casa?: { numero: string; quadra: string } | null;
}

interface DashboardMilestonesProps {
  initialMilestones: Milestone[];
  empreendimentos: { id: string; nome: string }[];
  casas: { id: string; numero: string; quadra: string; empreendimentoId: string }[];
}

export default function DashboardMilestones({ 
  initialMilestones, 
  empreendimentos, 
  casas 
}: DashboardMilestonesProps) {
  const router = useRouter();
  const [milestones, setMilestones] = useState<Milestone[]>(initialMilestones);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState('PROJETO');
  const [dataLimite, setDataLimite] = useState('');
  const [empId, setEmpId] = useState('');
  const [casaId, setCasaId] = useState('');

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'PROJETO': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'OBRA': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'COMERCIAL': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'FINANCEIRO': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'PROJETO': return <Building2 size={12} />;
      case 'OBRA': return <Home size={12} />;
      case 'COMERCIAL': return <Tag size={12} />;
      case 'FINANCEIRO': return <DollarSign size={12} />;
      default: return null;
    }
  };

  const handleToggleComplete = async (id: string, currentlyCompleted: boolean) => {
    setLoadingId(id);
    try {
      const res = await fetch(`/api/milestones/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concluido: !currentlyCompleted })
      });

      if (!res.ok) throw new Error('Falha ao atualizar status do marco.');
      
      const updated = await res.json();
      setMilestones(prev => prev.map(m => m.id === id ? { ...m, concluido: updated.concluido, dataConclusao: updated.dataConclusao } : m));
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este marco crítico?')) return;
    setLoadingId(id);
    try {
      const res = await fetch(`/api/milestones/${id}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('Falha ao excluir marco.');
      
      setMilestones(prev => prev.filter(m => m.id !== id));
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoadingId(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo || !dataLimite) {
      alert('Título e data limite são obrigatórios.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/milestones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo,
          descricao,
          categoria,
          dataLimite,
          empreendimentoId: empId || null,
          casaId: casaId || null
        })
      });

      if (!res.ok) throw new Error('Erro ao criar marco crítico.');

      const newMilestone = await res.json();
      setMilestones(prev => [newMilestone, ...prev].sort((a, b) => new Date(a.dataLimite).getTime() - new Date(b.dataLimite).getTime()));
      
      // Reset form
      setTitulo('');
      setDescricao('');
      setCategoria('PROJETO');
      setDataLimite('');
      setEmpId('');
      setCasaId('');
      setIsModalOpen(false);
      
      router.refresh();
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCasas = empId 
    ? casas.filter(c => c.empreendimentoId === empId)
    : casas;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="space-y-4">
      
      {/* Header com botão Add */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-white">Agenda de Compromissos & Marcos Críticos</h3>
          <p className="text-xs text-slate-400 font-sans">Momentos chave e deadlines dos projetos, obras ou comercial gerenciados por sócios</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="py-1.5 px-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shadow-lg shadow-indigo-600/10"
        >
          <Plus size={14} /> Adicionar Marco
        </button>
      </div>

      {/* Grid de Milestones */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {milestones.map(m => {
          const limitDate = new Date(m.dataLimite);
          limitDate.setHours(23, 59, 59, 999);
          const isOverdue = !m.concluido && limitDate < today;
          
          const warningLimit = new Date();
          warningLimit.setDate(today.getDate() + 7);
          const isUpcoming = !m.concluido && limitDate >= today && limitDate <= warningLimit;

          const associationText = m.casa 
            ? `Qd ${m.casa.quadra}, Casa ${m.casa.numero}`
            : m.empreendimento?.nome || null;

          return (
            <div 
              key={m.id}
              className={`glassmorphism p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between space-y-4 relative ${
                m.concluido 
                  ? 'border-slate-800 opacity-60' 
                  : isOverdue 
                    ? 'border-red-500/30 bg-red-950/5 shadow-lg shadow-red-500/5' 
                    : isUpcoming
                      ? 'border-amber-500/30 bg-amber-950/5 shadow-lg shadow-amber-500/5'
                      : 'border-slate-800'
              }`}
            >
              
              {/* Top Row: Category and Actions */}
              <div className="flex justify-between items-center">
                <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase flex items-center gap-1 ${getCategoryColor(m.categoria)}`}>
                  {getCategoryIcon(m.categoria)}
                  {m.categoria}
                </span>

                <div className="flex items-center gap-2">
                  {/* Completar */}
                  <button
                    disabled={loadingId === m.id}
                    onClick={() => handleToggleComplete(m.id, m.concluido)}
                    className={`p-1.5 rounded-lg border transition cursor-pointer ${
                      m.concluido 
                        ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' 
                        : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-white hover:border-slate-700'
                    }`}
                    title={m.concluido ? 'Marcar como Pendente' : 'Marcar como Concluído'}
                  >
                    <CheckCircle2 size={13} />
                  </button>
                  {/* Excluir */}
                  <button
                    disabled={loadingId === m.id}
                    onClick={() => handleDelete(m.id)}
                    className="p-1.5 bg-slate-900/60 border border-slate-800 text-slate-500 hover:text-red-400 hover:border-red-500/20 rounded-lg transition cursor-pointer"
                    title="Excluir Marco"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Middle Row: Content */}
              <div className="space-y-1">
                <h4 className={`font-bold text-sm leading-snug font-sans ${m.concluido ? 'line-through text-slate-500' : 'text-white'}`}>
                  {m.titulo}
                </h4>
                {m.descricao && (
                  <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-2">
                    {m.descricao}
                  </p>
                )}
              </div>

              {/* Bottom Row: Deadline and Association */}
              <div className="border-t border-slate-900/60 pt-3 flex justify-between items-center text-[10px]">
                <div className="flex items-center gap-1 text-slate-500">
                  <Calendar size={12} />
                  <span className={`font-mono font-bold ${
                    m.concluido 
                      ? 'text-slate-500' 
                      : isOverdue 
                        ? 'text-red-400' 
                        : isUpcoming 
                          ? 'text-amber-400' 
                          : 'text-slate-350'
                  }`}>
                    {formatDate(m.dataLimite)}
                  </span>
                </div>

                {associationText && (
                  <span className="text-[9px] text-slate-450 font-bold bg-slate-900 border border-slate-850 px-2 py-0.5 rounded-lg truncate max-w-[50%]">
                    {associationText}
                  </span>
                )}
              </div>

              {/* Absolute Warning Badges */}
              {!m.concluido && isOverdue && (
                <span className="absolute -top-2 -right-2 bg-red-600 text-white font-extrabold text-[8px] uppercase px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-md shadow-red-600/10">
                  <AlertTriangle size={8} /> ATRASADO
                </span>
              )}
              {!m.concluido && isUpcoming && (
                <span className="absolute -top-2 -right-2 bg-amber-500 text-slate-950 font-extrabold text-[8px] uppercase px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-md shadow-amber-500/10">
                  <Clock size={8} /> PRÓXIMO
                </span>
              )}
            </div>
          );
        })}

        {milestones.length === 0 && (
          <div className="col-span-3 bg-slate-950/20 border border-slate-900 p-12 rounded-2xl text-center text-slate-500 italic">
            Nenhum marco crítico ou pitfall cadastrado. Use o botão acima para programar momentos chave.
          </div>
        )}
      </div>

      {/* MODAL: ADICIONAR NOVO MARCO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glassmorphism w-full max-w-md rounded-2xl border border-slate-800 shadow-2xl p-6 relative">
            <button 
              onClick={() => setIsModalOpen(false)} 
              className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X size={16} />
            </button>
            
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-b border-slate-850 pb-2 flex items-center gap-2">
              <Calendar size={16} className="text-indigo-400" /> Adicionar Marco Crítico / Pitfall
            </h4>

            <form onSubmit={handleCreate} className="space-y-4 text-xs text-slate-300">
              
              {/* Título */}
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1 font-semibold">Título do Marco *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Assinatura Contrato CEF, Conclusão de Laje..."
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500/50"
                />
              </div>

              {/* Descrição */}
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1 font-semibold">Descrição / Detalhes (Opcional)</label>
                <textarea
                  rows={2}
                  placeholder="Instruções adicionais ou armadilhas a prevenir..."
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500/50"
                />
              </div>

              {/* Categoria & Data Limite */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1 font-semibold">Categoria</label>
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none"
                  >
                    <option value="PROJETO">Projeto / Legal</option>
                    <option value="OBRA">Obra / Engenharia</option>
                    <option value="COMERCIAL">Comercial / CRM</option>
                    <option value="FINANCEIRO">Financeiro / Caixa</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1 font-semibold">Prazo Final (Deadline) *</label>
                  <input
                    type="date"
                    required
                    value={dataLimite}
                    onChange={(e) => setDataLimite(e.target.value)}
                    className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              {/* Associação Empreendimento */}
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1 font-semibold">Associar a Empreendimento (Opcional)</label>
                <select
                  value={empId}
                  onChange={(e) => setEmpId(e.target.value)}
                  className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none"
                >
                  <option value="">-- Nenhum Empreendimento Específico --</option>
                  {empreendimentos.map(e => (
                    <option key={e.id} value={e.id}>{e.nome}</option>
                  ))}
                </select>
              </div>

              {/* Associação Casa */}
              {empId && (
                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1 font-semibold">Associar a Casa/Lote (Opcional)</label>
                  <select
                    value={casaId}
                    onChange={(e) => setCasaId(e.target.value)}
                    className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none"
                  >
                    <option value="">-- Nenhuma Casa Específica --</option>
                    {filteredCasas.map(c => (
                      <option key={c.id} value={c.id}>Casa {c.numero} - Quadra {c.quadra}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Rodapé Ações */}
              <div className="flex gap-3 justify-end pt-4 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-350 rounded-xl font-bold transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-indigo-650 hover:bg-indigo-600 text-white font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                >
                  {isSubmitting && <Loader2 size={12} className="animate-spin" />}
                  Salvar Marco
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
