'use client';

import { useState, useEffect, useCallback } from 'react';
import { Lock, Loader2, Snowflake, ArrowUpRight, CalendarClock } from 'lucide-react';

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const dt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—');

export default function LinhaBasePage() {
  const [empreendimentos, setEmpreendimentos] = useState<any[]>([]);
  const [empId, setEmpId] = useState('ALL');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [congelando, setCongelando] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetch('/api/empreendimentos').then((r) => r.json()).then((e) => setEmpreendimentos(e || []));
    fetch('/api/auth/me').then((r) => (r.ok ? r.json() : null)).then((u) => setIsAdmin(u?.role === 'ADMIN')).catch(() => {});
  }, []);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const q = empId && empId !== 'ALL' ? `?empreendimentoId=${empId}` : '';
      const res = await fetch(`/api/gestao/linha-base${q}`).then((r) => r.json());
      setData(res);
    } finally {
      setLoading(false);
    }
  }, [empId]);

  useEffect(() => { carregar(); }, [carregar]);

  const congelar = async (payload: any, key: string) => {
    setCongelando(key);
    try {
      const res = await fetch('/api/gestao/linha-base', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) await carregar();
      else { const e = await res.json().catch(() => ({})); alert(e.error || 'Não foi possível congelar.'); }
    } finally {
      setCongelando(null);
    }
  };

  const r = data?.resumo;

  return (
    <div className="space-y-6 p-6 min-h-screen bg-[#060814] text-slate-100">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-900 pb-5">
        <div>
          <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block">Gestão · Planejamento</span>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2 mt-0.5">
            <Lock className="text-indigo-400" size={24} /> Linha de Base do Plano
          </h1>
          <p className="text-xs text-slate-400 mt-1">Congele o plano (orçamento + prazo) para medir o quanto ele mudou depois. O desvio contra a base mostra o replanejamento acumulado.</p>
        </div>
        <div className="flex flex-wrap gap-2.5 items-center">
          <select value={empId} onChange={(e) => setEmpId(e.target.value)} className="bg-[#0b0f19] border border-slate-800 text-xs text-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500/50">
            <option value="ALL">Todos os empreendimentos</option>
            {empreendimentos.map((e) => (<option key={e.id} value={e.id}>{e.nome}</option>))}
          </select>
          {isAdmin && empId !== 'ALL' && (
            <button onClick={() => congelar({ empreendimentoId: empId }, 'emp')} disabled={congelando === 'emp'} className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 text-xs font-bold uppercase tracking-wider hover:bg-indigo-600/25 transition disabled:opacity-50 cursor-pointer">
              {congelando === 'emp' ? <Loader2 size={13} className="animate-spin" /> : <Snowflake size={13} />} Congelar empreendimento
            </button>
          )}
        </div>
      </div>

      {loading || !data || !r ? (
        <div className="py-20 text-center"><Loader2 className="animate-spin text-indigo-500 mx-auto" size={26} /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glassmorphism p-4 rounded-2xl border border-slate-850">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Obras com linha de base</span>
              <p className="text-xl font-bold font-mono mt-1.5 text-slate-200">{r.comBaseline}<span className="text-sm text-slate-500"> / {r.totalCasas}</span></p>
            </div>
            <div className={`glassmorphism p-4 rounded-2xl border ${r.driftOrcadoTotal > 0 ? 'border-red-500/25' : 'border-slate-850'}`}>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Replanejamento de custo</span>
              <p className={`text-lg font-bold font-mono mt-1.5 ${r.driftOrcadoTotal > 0 ? 'text-red-400' : r.driftOrcadoTotal < 0 ? 'text-emerald-400' : 'text-slate-300'}`}>{r.driftOrcadoTotal > 0 ? '+' : ''}{fmt(r.driftOrcadoTotal)}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">base {fmt(r.orcadoBaselineTotal)} → atual {fmt(r.orcadoAtualTotal)}</p>
            </div>
            <div className={`glassmorphism p-4 rounded-2xl border ${r.casasComOrcamentoCrescido > 0 ? 'border-amber-500/25' : 'border-slate-850'}`}>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Orçamento cresceu</span>
              <p className={`text-xl font-bold font-mono mt-1.5 ${r.casasComOrcamentoCrescido > 0 ? 'text-amber-400' : 'text-slate-300'}`}>{r.casasComOrcamentoCrescido}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">obra(s)</p>
            </div>
            <div className={`glassmorphism p-4 rounded-2xl border ${r.casasComPrazoEscorregado > 0 ? 'border-orange-500/25' : 'border-slate-850'}`}>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Prazo escorregou</span>
              <p className={`text-xl font-bold font-mono mt-1.5 ${r.casasComPrazoEscorregado > 0 ? 'text-orange-400' : 'text-slate-300'}`}>{r.casasComPrazoEscorregado}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">obra(s)</p>
            </div>
          </div>

          <div className="bg-slate-950/20 border border-slate-900 rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-slate-900"><h3 className="text-xs font-bold text-white uppercase tracking-wider">Por obra</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-900 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Obra</th>
                    <th className="py-3 px-4 text-center">Congelado em</th>
                    <th className="py-3 px-4 text-right">Orçado base</th>
                    <th className="py-3 px-4 text-right">Orçado atual</th>
                    <th className="py-3 px-4 text-right">Desvio de custo</th>
                    <th className="py-3 px-4 text-center">Prazo base → atual</th>
                    <th className="py-3 px-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/60 text-slate-300 font-mono">
                  {data.linhas.map((l: any) => (
                    <tr key={l.casaId} className="hover:bg-slate-900/20">
                      <td className="py-3 px-4 font-sans">
                        <a href={`/casas/${l.casaId}`} className="font-semibold text-slate-200 hover:text-indigo-400">Qd {l.quadra} · Casa {l.numero}</a>
                        <span className="block text-[10px] text-slate-500">{l.empreendimentoNome}</span>
                      </td>
                      <td className="py-3 px-4 text-center text-slate-400">{l.temBaseline ? dt(l.dataSnapshot) : <span className="text-slate-600">sem base</span>}</td>
                      <td className="py-3 px-4 text-right">{l.orcadoBaseline != null ? fmt(l.orcadoBaseline) : <span className="text-slate-600">—</span>}</td>
                      <td className="py-3 px-4 text-right text-white font-semibold">{fmt(l.orcadoAtual)}</td>
                      <td className={`py-3 px-4 text-right font-bold ${l.driftOrcado == null ? 'text-slate-600' : l.driftOrcado > 0 ? 'text-red-400' : l.driftOrcado < 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {l.driftOrcado == null ? '—' : l.driftOrcado === 0 ? '—' : (
                          <span className="inline-flex items-center gap-1">{l.driftOrcado > 0 && <ArrowUpRight size={11} />}{l.driftOrcado > 0 ? '+' : ''}{fmt(l.driftOrcado)}{l.driftOrcadoPercent != null ? ` (${l.driftOrcadoPercent > 0 ? '+' : ''}${l.driftOrcadoPercent.toFixed(0)}%)` : ''}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center text-slate-400">
                        {l.temBaseline ? (
                          <span>{dt(l.prazoFimBaseline)} <span className="text-slate-600">→</span> <span className={l.driftPrazoDias && l.driftPrazoDias > 0 ? 'text-orange-400 font-bold' : 'text-slate-300'}>{dt(l.prazoFimAtual)}</span>{l.driftPrazoDias != null && l.driftPrazoDias !== 0 ? <span className={`ml-1 ${l.driftPrazoDias > 0 ? 'text-orange-400' : 'text-emerald-400'}`}>({l.driftPrazoDias > 0 ? '+' : ''}{l.driftPrazoDias}d)</span> : null}</span>
                        ) : <span className="text-slate-600">—</span>}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isAdmin ? (
                          <button onClick={() => congelar({ casaId: l.casaId }, l.casaId)} disabled={congelando === l.casaId} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/60 text-slate-300 border border-slate-700 text-[10px] font-bold uppercase tracking-wider hover:bg-slate-700/60 transition disabled:opacity-50 cursor-pointer">
                            {congelando === l.casaId ? <Loader2 size={11} className="animate-spin" /> : <Snowflake size={11} />} {l.temBaseline ? 'Recongelar' : 'Congelar'}
                          </button>
                        ) : <span className="text-slate-700">—</span>}
                      </td>
                    </tr>
                  ))}
                  {data.linhas.length === 0 && (
                    <tr><td colSpan={7} className="py-16 text-center text-slate-500 text-xs italic">Nenhuma obra no escopo.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 px-1 flex items-center gap-1.5">
            <CalendarClock size={12} /> A linha de base guarda o orçamento e o prazo no momento em que você congela. Depois, "desvio de custo" e "prazo base → atual" mostram o replanejamento acumulado. Recongele quando aprovar um novo plano oficial.
          </p>
        </>
      )}
    </div>
  );
}
