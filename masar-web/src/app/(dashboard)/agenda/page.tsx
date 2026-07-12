'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CalendarClock,
  AlertTriangle,
  Clock,
  CalendarDays,
  CheckCircle2,
  Loader2,
  Landmark,
  HardHat,
  Flag,
  ChevronRight
} from 'lucide-react';

const ORIGEM_META: Record<string, { label: string; icon: any; color: string }> = {
  MILESTONE: { label: 'Marco Crítico', icon: Flag, color: 'text-indigo-400 bg-indigo-500/10' },
  MARCO: { label: 'Burocracia', icon: Landmark, color: 'text-purple-400 bg-purple-500/10' },
  CRONOGRAMA: { label: 'Obra', icon: HardHat, color: 'text-amber-400 bg-amber-500/10' }
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR');
}

function prazoLabel(dias: number) {
  if (dias < -1) return `${Math.abs(dias)} dias de atraso`;
  if (dias === -1) return '1 dia de atraso';
  if (dias === 0) return 'vence hoje';
  if (dias === 1) return 'vence amanhã';
  return `vence em ${dias} dias`;
}

export default function AgendaPage() {
  const [itens, setItens] = useState<any[]>([]);
  const [resumo, setResumo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filtroOrigem, setFiltroOrigem] = useState<'TODOS' | 'MILESTONE' | 'MARCO' | 'CRONOGRAMA'>('TODOS');
  const [concluindoId, setConcluindoId] = useState<string | null>(null);

  const carregar = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/agenda').then(r => r.json());
      setItens(res.itens || []);
      setResumo(res.resumo || null);
    } catch (err) {
      console.error('Erro ao carregar agenda:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const concluir = async (item: any) => {
    if (!confirm(`Marcar "${item.titulo}" como concluído?`)) return;
    setConcluindoId(item.id);
    try {
      let url = '';
      let body: any = {};
      if (item.origem === 'MILESTONE') {
        url = `/api/milestones/${item.id}`;
        body = { concluido: true };
      } else if (item.origem === 'CRONOGRAMA') {
        url = `/api/cronograma/${item.id}`;
        body = { status: 'CONCLUIDA' };
      } else {
        url = `/api/marcos/${item.id}`;
        body = { aprovado: true };
      }
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        setItens(prev => prev.filter(i => !(i.id === item.id && i.origem === item.origem)));
        setResumo((prev: any) => prev ? {
          ...prev,
          total: prev.total - 1,
          atrasados: item.situacao === 'ATRASADO' ? prev.atrasados - 1 : prev.atrasados,
          proximos: item.situacao === 'PROXIMO' ? prev.proximos - 1 : prev.proximos,
          futuros: item.situacao === 'FUTURO' ? prev.futuros - 1 : prev.futuros
        } : prev);
      } else {
        const err = await res.json();
        alert(err.error || 'Não foi possível concluir este item.');
      }
    } catch (e) {
      console.error(e);
      alert('Erro de rede ao concluir.');
    } finally {
      setConcluindoId(null);
    }
  };

  const filtrados = filtroOrigem === 'TODOS' ? itens : itens.filter(i => i.origem === filtroOrigem);
  const atrasados = filtrados.filter(i => i.situacao === 'ATRASADO');
  const proximos = filtrados.filter(i => i.situacao === 'PROXIMO');
  const futuros = filtrados.filter(i => i.situacao === 'FUTURO');

  const renderItem = (item: any) => {
    const meta = ORIGEM_META[item.origem];
    const Icon = meta.icon;
    const atrasado = item.situacao === 'ATRASADO';
    return (
      <div
        key={`${item.origem}-${item.id}`}
        className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-800/10 transition"
      >
        <div className="flex items-start gap-3 min-w-0">
          <span className={`p-2 rounded-xl shrink-0 ${meta.color}`}>
            <Icon size={16} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-white truncate">{item.titulo}</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-slate-800/80 text-slate-400 uppercase tracking-wider">
                {meta.label}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 truncate">{item.local}</p>
          </div>
        </div>

        <div className="flex items-center justify-between md:justify-end gap-4 shrink-0">
          <div className="text-left md:text-right">
            <span className={`text-xs font-bold block ${atrasado ? 'text-red-400' : item.diasRestantes <= 7 ? 'text-amber-400' : 'text-slate-300'}`}>
              {prazoLabel(item.diasRestantes)}
            </span>
            <span className="text-[10px] text-slate-500">{formatDate(item.dataLimite)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => concluir(item)}
              disabled={concluindoId === item.id}
              className="px-3 py-1.5 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/25 text-emerald-400 rounded-xl text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Marcar como concluído"
            >
              {concluindoId === item.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
              Concluir
            </button>
            <Link
              href={item.link}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition border border-slate-700/50 cursor-pointer"
              title="Abrir detalhes"
            >
              <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    );
  };

  const renderSecao = (titulo: string, icone: any, cor: string, lista: any[]) => {
    const IconeSecao = icone;
    if (lista.length === 0) return null;
    return (
      <div className="glassmorphism rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#1e293b] flex items-center gap-2.5">
          <span className={`p-1.5 rounded-lg ${cor}`}>
            <IconeSecao size={15} />
          </span>
          <h3 className="text-sm font-bold text-white">{titulo}</h3>
          <span className="text-[10px] font-bold text-slate-500 bg-slate-800/60 px-2 py-0.5 rounded-full">{lista.length}</span>
        </div>
        <div className="divide-y divide-[#1e293b]">{lista.map(renderItem)}</div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-[#111827] border border-slate-800 rounded-2xl text-indigo-400">
            <CalendarClock size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white font-sans">Agenda de Prazos</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Tudo o que vence — obra, burocracia e marcos críticos — num lugar só.
            </p>
          </div>
        </div>

        {/* Filtro por origem */}
        <div className="flex gap-1.5 flex-wrap">
          {(['TODOS', 'CRONOGRAMA', 'MARCO', 'MILESTONE'] as const).map(o => (
            <button
              key={o}
              onClick={() => setFiltroOrigem(o)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                filtroOrigem === o
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/20'
                  : 'bg-slate-800/40 text-slate-400 hover:text-slate-200'
              }`}
            >
              {o === 'TODOS' ? 'Tudo' : ORIGEM_META[o].label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
          <Loader2 className="animate-spin text-indigo-500" size={28} />
          <p className="text-xs text-slate-500 font-mono">Carregando prazos...</p>
        </div>
      )}

      {!loading && resumo && (
        <>
          {/* Resumo */}
          <div className="grid grid-cols-3 gap-4">
            <div className={`glassmorphism p-4 rounded-2xl border ${resumo.atrasados > 0 ? 'border-red-500/25' : 'border-slate-800'}`}>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Atrasados</span>
              <p className={`text-2xl font-bold mt-1 ${resumo.atrasados > 0 ? 'text-red-500' : 'text-slate-300'}`}>{resumo.atrasados}</p>
            </div>
            <div className="glassmorphism p-4 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Próximos 30 dias</span>
              <p className="text-2xl font-bold text-amber-400 mt-1">{resumo.proximos}</p>
            </div>
            <div className="glassmorphism p-4 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Mais adiante</span>
              <p className="text-2xl font-bold text-slate-300 mt-1">{resumo.futuros}</p>
            </div>
          </div>

          {filtrados.length === 0 ? (
            <div className="glassmorphism p-10 rounded-2xl text-center">
              <CheckCircle2 className="mx-auto text-emerald-400 mb-3" size={32} />
              <p className="text-sm font-bold text-white">Tudo em dia</p>
              <p className="text-xs text-slate-400 mt-1">Nenhum prazo pendente {filtroOrigem !== 'TODOS' ? 'nesta categoria' : ''}.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {renderSecao('Atrasados', AlertTriangle, 'bg-red-500/10 text-red-400', atrasados)}
              {renderSecao('Próximos 30 dias', Clock, 'bg-amber-500/10 text-amber-400', proximos)}
              {renderSecao('Mais adiante', CalendarDays, 'bg-slate-500/10 text-slate-400', futuros)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
