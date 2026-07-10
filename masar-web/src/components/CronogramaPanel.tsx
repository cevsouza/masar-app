'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  X,
  Loader2,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Calendar,
  AlertTriangle,
  LayoutGrid,
  GanttChartSquare
} from 'lucide-react';

interface Atividade {
  id: string;
  titulo: string;
  descricao: string | null;
  status: string;
  ordem: number;
  dataInicioPrevista: string;
  dataFimPrevista: string;
  dataInicioReal: string | null;
  dataFimReal: string | null;
  percentualConcluido: number;
}

interface CronogramaPanelProps {
  escopo: 'GERAL' | 'LOTE';
  empreendimentoId: string;
  casaId?: string;
  initialAtividades: Atividade[];
}

const STAGES = [
  'BACKLOG', 'APROVACOES', 'INFRAESTRUTURA', 'SUPRAESTRUTURA',
  'INSTALACOES', 'ACABAMENTO', 'VISTORIA_CAIXA', 'CARTORIO', 'VISITAS', 'CONCLUIDA'
];

const COLUMNS = [
  { id: 'PLAN', label: 'Planejamento & Burocracia', stages: ['BACKLOG', 'APROVACOES'], color: 'border-t-amber-500 bg-amber-500/5 text-amber-400' },
  { id: 'ESTRUTURA', label: 'Fundação & Estrutura', stages: ['INFRAESTRUTURA', 'SUPRAESTRUTURA'], color: 'border-t-blue-500 bg-blue-500/5 text-blue-400' },
  { id: 'ACABAMENTO', label: 'Instalações & Acabamento', stages: ['INSTALACOES', 'ACABAMENTO'], color: 'border-t-pink-500 bg-pink-500/5 text-pink-400' },
  { id: 'REPASSE', label: 'Vistoria & Repasse Caixa', stages: ['VISTORIA_CAIXA', 'CARTORIO'], color: 'border-t-indigo-500 bg-indigo-500/5 text-indigo-400' },
  { id: 'PRONTAS', label: 'Prontas & Entregues', stages: ['VISITAS', 'CONCLUIDA'], color: 'border-t-emerald-500 bg-emerald-500/5 text-emerald-400' }
];

function barColor(atividade: Atividade, isOverdue: boolean) {
  if (atividade.status === 'CONCLUIDA') return 'bg-emerald-500';
  if (isOverdue) return 'bg-red-500';
  if (atividade.status === 'BACKLOG') return 'bg-slate-600';
  return 'bg-blue-500';
}

export default function CronogramaPanel({ escopo, empreendimentoId, casaId, initialAtividades }: CronogramaPanelProps) {
  const router = useRouter();
  const [atividades, setAtividades] = useState<Atividade[]>(initialAtividades);
  const [view, setView] = useState<'kanban' | 'waterfall'>('kanban');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [dataInicioPrevista, setDataInicioPrevista] = useState('');
  const [dataFimPrevista, setDataFimPrevista] = useState('');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isOverdue = (a: Atividade) => {
    if (a.status === 'CONCLUIDA') return false;
    const fim = new Date(a.dataFimPrevista);
    fim.setHours(23, 59, 59, 999);
    return fim < today;
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('pt-BR');

  const handleMove = async (id: string, currentStatus: string, direction: 'left' | 'right') => {
    const idx = STAGES.indexOf(currentStatus);
    const nextIdx = direction === 'right' ? idx + 1 : idx - 1;
    if (nextIdx < 0 || nextIdx >= STAGES.length) return;

    const nextStatus = STAGES[nextIdx];
    setLoadingId(id);
    try {
      const res = await fetch(`/api/cronograma/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      if (!res.ok) throw new Error('Falha ao mover atividade.');
      const updated = await res.json();
      setAtividades(prev => prev.map(a => a.id === id ? { ...a, ...updated } : a));
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta atividade do cronograma?')) return;
    setLoadingId(id);
    try {
      const res = await fetch(`/api/cronograma/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Falha ao excluir atividade.');
      setAtividades(prev => prev.filter(a => a.id !== id));
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoadingId(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo || !dataInicioPrevista || !dataFimPrevista) {
      alert('Título e datas previstas são obrigatórios.');
      return;
    }
    if (new Date(dataFimPrevista) < new Date(dataInicioPrevista)) {
      alert('A data final não pode ser anterior à data inicial.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/cronograma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo,
          descricao,
          escopo,
          empreendimentoId,
          casaId: escopo === 'LOTE' ? casaId : null,
          dataInicioPrevista,
          dataFimPrevista,
          ordem: atividades.length
        })
      });
      if (!res.ok) throw new Error('Erro ao criar atividade.');
      const created = await res.json();
      setAtividades(prev => [...prev, created]);

      setTitulo('');
      setDescricao('');
      setDataInicioPrevista('');
      setDataFimPrevista('');
      setIsModalOpen(false);
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const timelineRange = useMemo(() => {
    if (atividades.length === 0) {
      const start = new Date(today);
      const end = new Date(today);
      end.setMonth(end.getMonth() + 3);
      return { start, end };
    }
    const starts = atividades.map(a => new Date(a.dataInicioPrevista).getTime());
    const ends = atividades.map(a => new Date(a.dataFimPrevista).getTime());
    const start = new Date(Math.min(...starts));
    const end = new Date(Math.max(...ends, today.getTime()));
    start.setDate(1);
    end.setDate(end.getDate() + 7);
    return { start, end };
  }, [atividades]);

  const totalDays = Math.max(1, (timelineRange.end.getTime() - timelineRange.start.getTime()) / 86400000);
  const todayOffsetPct = Math.min(100, Math.max(0,
    ((today.getTime() - timelineRange.start.getTime()) / 86400000 / totalDays) * 100
  ));

  const sortedForWaterfall = [...atividades].sort((a, b) => {
    if (a.ordem !== b.ordem) return a.ordem - b.ordem;
    return new Date(a.dataInicioPrevista).getTime() - new Date(b.dataInicioPrevista).getTime();
  });

  const monthMarkers = useMemo(() => {
    const markers: { label: string; offsetPct: number }[] = [];
    const cursor = new Date(timelineRange.start);
    cursor.setDate(1);
    while (cursor <= timelineRange.end) {
      const offsetPct = ((cursor.getTime() - timelineRange.start.getTime()) / 86400000 / totalDays) * 100;
      markers.push({
        label: cursor.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        offsetPct
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return markers;
  }, [timelineRange, totalDays]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-[#151b2c] p-4 rounded-xl border border-slate-800/80">
        <div>
          <h3 className="text-sm font-bold text-white">
            Cronograma {escopo === 'GERAL' ? 'Geral do Empreendimento' : 'do Lote'}
          </h3>
          <p className="text-xs text-slate-400 font-sans">
            {escopo === 'GERAL'
              ? 'Atividades macro do empreendimento, sincronizadas com o kanban de obra'
              : 'Atividades físicas da unidade, sincronizadas com o kanban do lote'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1">
            <button
              onClick={() => setView('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                view === 'kanban' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid size={13} /> Kanban
            </button>
            <button
              onClick={() => setView('waterfall')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                view === 'waterfall' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <GanttChartSquare size={13} /> Waterfall
            </button>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-indigo-600/10 cursor-pointer"
          >
            <Plus size={14} /> Nova Atividade
          </button>
        </div>
      </div>

      {view === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-start">
          {COLUMNS.map(column => {
            const columnAtividades = atividades.filter(a => column.stages.includes(a.status));
            return (
              <div key={column.id} className="kanban-column rounded-2xl border border-slate-800/60 p-3 flex flex-col min-h-[320px]">
                <div className={`border-t-2 ${column.color} pt-2.5 pb-3 mb-3 flex items-center justify-between`}>
                  <h4 className="font-bold text-[11px] tracking-wide uppercase">{column.label}</h4>
                  <span className="text-[10px] bg-slate-800/80 px-2 py-0.5 rounded-full text-slate-400 font-semibold">
                    {columnAtividades.length}
                  </span>
                </div>

                <div className="space-y-3 flex-1">
                  {columnAtividades.length === 0 ? (
                    <div className="border border-dashed border-slate-800/40 rounded-xl p-4 text-center text-slate-600 text-[10px]">
                      Sem atividades
                    </div>
                  ) : (
                    columnAtividades.map(a => {
                      const overdue = isOverdue(a);
                      const idx = STAGES.indexOf(a.status);
                      const isFirst = idx === 0;
                      const isLast = idx === STAGES.length - 1;
                      const isLoading = loadingId === a.id;

                      return (
                        <div
                          key={a.id}
                          className={`glassmorphism p-3 rounded-xl border relative ${
                            overdue ? 'border-red-500/30 bg-red-950/5' : 'border-slate-800/80'
                          }`}
                        >
                          {overdue && (
                            <span className="absolute -top-2 -right-2 bg-red-600 text-white font-extrabold text-[8px] uppercase px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                              <AlertTriangle size={8} /> Atrasado
                            </span>
                          )}
                          <h5 className="font-bold text-xs text-white leading-snug mb-1.5">{a.titulo}</h5>
                          <div className="flex items-center gap-1 text-[10px] text-slate-500 mb-2">
                            <Calendar size={10} />
                            <span className="font-mono">{formatDate(a.dataInicioPrevista)} — {formatDate(a.dataFimPrevista)}</span>
                          </div>
                          <div className="w-full bg-slate-900 rounded-full h-1.5 mb-2.5">
                            <div
                              className="bg-indigo-500 h-1.5 rounded-full"
                              style={{ width: `${Math.min(100, Math.max(0, a.percentualConcluido))}%` }}
                            />
                          </div>
                          <div className="flex justify-between items-center">
                            <button
                              onClick={() => handleMove(a.id, a.status, 'left')}
                              disabled={isFirst || isLoading}
                              className="p-1 rounded-lg border border-slate-700/50 hover:bg-slate-800/80 text-slate-400 disabled:opacity-20 transition"
                            >
                              <ArrowLeft size={12} />
                            </button>
                            {isLoading ? (
                              <Loader2 size={12} className="animate-spin text-slate-500" />
                            ) : (
                              <button
                                onClick={() => handleDelete(a.id)}
                                className="p-1 rounded-lg text-slate-600 hover:text-red-400 transition"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                            <button
                              onClick={() => handleMove(a.id, a.status, 'right')}
                              disabled={isLast || isLoading}
                              className="p-1 rounded-lg border border-slate-700/50 hover:bg-slate-800/80 text-slate-400 disabled:opacity-20 transition"
                            >
                              <ArrowRight size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="glassmorphism rounded-2xl border border-slate-800/80 p-4 overflow-x-auto">
          {atividades.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs italic">
              Nenhuma atividade cadastrada. Use o botão acima para montar o cronograma.
            </div>
          ) : (
            <div className="min-w-[760px]">
              {/* Month header */}
              <div className="relative h-6 mb-2 border-b border-slate-800">
                {monthMarkers.map((m, i) => (
                  <div
                    key={i}
                    className="absolute top-0 text-[9px] text-slate-500 font-bold uppercase border-l border-slate-800/60 pl-1.5"
                    style={{ left: `${m.offsetPct}%` }}
                  >
                    {m.label}
                  </div>
                ))}
              </div>

              <div className="relative space-y-2">
                {/* Today marker */}
                <div
                  className="absolute top-0 bottom-0 w-px bg-amber-500/70 z-10"
                  style={{ left: `${todayOffsetPct}%` }}
                  title="Hoje"
                />

                {sortedForWaterfall.map(a => {
                  const overdue = isOverdue(a);
                  const start = new Date(a.dataInicioPrevista);
                  const end = new Date(a.dataFimPrevista);
                  const offsetPct = ((start.getTime() - timelineRange.start.getTime()) / 86400000 / totalDays) * 100;
                  const widthPct = Math.max(0.6, ((end.getTime() - start.getTime()) / 86400000 / totalDays) * 100);

                  return (
                    <div key={a.id} className="flex items-center gap-3">
                      <div className="w-40 shrink-0 text-[11px] text-slate-300 truncate font-medium" title={a.titulo}>
                        {a.titulo}
                      </div>
                      <div className="relative flex-1 h-6 bg-slate-900/40 rounded-md">
                        <div
                          className={`absolute top-0.5 bottom-0.5 rounded-md ${barColor(a, overdue)} opacity-90 flex items-center px-1.5 overflow-hidden`}
                          style={{ left: `${offsetPct}%`, width: `${widthPct}%` }}
                          title={`${formatDate(a.dataInicioPrevista)} — ${formatDate(a.dataFimPrevista)} (${a.percentualConcluido}%)`}
                        >
                          <span className="text-[9px] font-bold text-white whitespace-nowrap">
                            {a.percentualConcluido}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

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
              <Calendar size={16} className="text-indigo-400" /> Nova Atividade de Cronograma
            </h4>

            <form onSubmit={handleCreate} className="space-y-4 text-xs text-slate-300">
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1 font-semibold">Título *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Fundação e baldrame, Alvará de habite-se..."
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500/50"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1 font-semibold">Descrição (Opcional)</label>
                <textarea
                  rows={2}
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1 font-semibold">Início Previsto *</label>
                  <input
                    type="date"
                    required
                    value={dataInicioPrevista}
                    onChange={(e) => setDataInicioPrevista(e.target.value)}
                    className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1 font-semibold">Fim Previsto *</label>
                  <input
                    type="date"
                    required
                    value={dataFimPrevista}
                    onChange={(e) => setDataFimPrevista(e.target.value)}
                    className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

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
                  Salvar Atividade
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
