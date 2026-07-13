'use client';

import { useState, useEffect } from 'react';
import { Activity, Loader2, TrendingDown, CalendarX } from 'lucide-react';

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const pct = (v: number | null) => (v == null ? '—' : `${v.toFixed(0)}%`);
const idx = (v: number | null) => (v == null ? '—' : v.toFixed(2));
const dt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—');

const STATUS_META: Record<string, { label: string; cls: string }> = {
  CRITICO: { label: 'Crítico', cls: 'bg-red-500/10 text-red-400 border-red-500/25' },
  ATENCAO: { label: 'Atenção', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/25' },
  ADIANTADO: { label: 'Adiantado', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' },
  SAUDAVEL: { label: 'Saudável', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' },
  SEM_BASE: { label: 'Sem base', cls: 'bg-slate-500/10 text-slate-400 border-slate-500/25' },
};

const idxCls = (v: number | null) => (v == null ? 'text-slate-500' : v >= 1 ? 'text-emerald-400' : v < 0.9 ? 'text-red-400' : 'text-amber-400');

export default function EvmPage() {
  const [empreendimentos, setEmpreendimentos] = useState<any[]>([]);
  const [empId, setEmpId] = useState('ALL');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const emps = await fetch('/api/empreendimentos').then((r) => r.json());
      setEmpreendimentos(emps || []);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const q = empId && empId !== 'ALL' ? `?empreendimentoId=${empId}` : '';
        const res = await fetch(`/api/gestao/evm${q}`).then((r) => r.json());
        setData(res);
      } finally {
        setLoading(false);
      }
    })();
  }, [empId]);

  const r = data?.resumo;

  return (
    <div className="space-y-6 p-6 min-h-screen bg-[#060814] text-slate-100">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-900 pb-5">
        <div>
          <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block">Gestão · Desempenho</span>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2 mt-0.5">
            <Activity className="text-indigo-400" size={24} /> Desempenho de Obra (EVM)
          </h1>
          <p className="text-xs text-slate-400 mt-1">Valor agregado: cruza custo e prazo para projetar o custo e a data de conclusão. CPI/SPI &lt; 1 = pior que o plano.</p>
        </div>
        <select value={empId} onChange={(e) => setEmpId(e.target.value)} className="bg-[#0b0f19] border border-slate-800 text-xs text-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500/50">
          <option value="ALL">Todos os empreendimentos</option>
          {empreendimentos.map((e) => (<option key={e.id} value={e.id}>{e.nome}</option>))}
        </select>
      </div>

      {loading ? (
        <div className="py-20 text-center"><Loader2 className="animate-spin text-indigo-500 mx-auto" size={26} /></div>
      ) : !data || !r ? (
        <div className="glassmorphism p-8 rounded-2xl text-center text-sm text-slate-500">Sem dados.</div>
      ) : (
        <>
          {/* Resumo */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glassmorphism p-4 rounded-2xl border border-slate-850">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">CPI geral (custo)</span>
              <p className={`text-xl font-bold font-mono mt-1.5 ${idxCls(r.cpiGeral)}`}>{idx(r.cpiGeral)}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">EV {fmt(r.totalEV)} / AC {fmt(r.totalAC)}</p>
            </div>
            <div className="glassmorphism p-4 rounded-2xl border border-slate-850">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">SPI geral (prazo)</span>
              <p className={`text-xl font-bold font-mono mt-1.5 ${idxCls(r.spiGeral)}`}>{idx(r.spiGeral)}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">EV {fmt(r.totalEV)} / PV {fmt(r.totalPV)}</p>
            </div>
            <div className="glassmorphism p-4 rounded-2xl border border-slate-850">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Custo final projetado</span>
              <p className="text-lg font-bold font-mono mt-1.5 text-white">{fmt(r.eacGeral)}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">orçado {fmt(r.totalOrcado)}</p>
            </div>
            <div className={`glassmorphism p-4 rounded-2xl border ${r.vacGeral < 0 ? 'border-red-500/25' : 'border-emerald-500/20'}`}>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Variação na conclusão</span>
              <p className={`text-lg font-bold font-mono mt-1.5 ${r.vacGeral < 0 ? 'text-red-400' : 'text-emerald-400'}`}>{r.vacGeral > 0 ? '+' : ''}{fmt(r.vacGeral)}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{r.criticas} crítica(s) · {r.atrasadas} atrasada(s)</p>
            </div>
          </div>

          {/* Tabela por obra */}
          <div className="bg-slate-950/20 border border-slate-900 rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-slate-900 flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <TrendingDown size={14} className="text-indigo-400" /> Por obra
              </h3>
              <span className="text-[10px] text-slate-500 font-mono">{r.comBase} de {r.totalCasas} com base de cálculo</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-900 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Obra</th>
                    <th className="py-3 px-4 text-center">Físico / Plan.</th>
                    <th className="py-3 px-4 text-center">CPI</th>
                    <th className="py-3 px-4 text-center">SPI</th>
                    <th className="py-3 px-4 text-right">Custo projet. (EAC)</th>
                    <th className="py-3 px-4 text-right">Variação (VAC)</th>
                    <th className="py-3 px-4 text-center">Fim plan. → projet.</th>
                    <th className="py-3 px-4 text-center">Atraso</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/60 text-slate-300 font-mono">
                  {data.linhas.map((l: any) => {
                    const st = STATUS_META[l.status] || STATUS_META.SEM_BASE;
                    return (
                      <tr key={l.id} className="hover:bg-slate-900/20">
                        <td className="py-3 px-4 font-sans">
                          <a href={`/casas/${l.id}`} className="font-semibold text-slate-200 hover:text-indigo-400">Qd {l.quadra} · Casa {l.numero}</a>
                          <span className="block text-[10px] text-slate-500">{l.empreendimentoNome}</span>
                        </td>
                        <td className="py-3 px-4 text-center">{pct(l.evPercent)} <span className="text-slate-600">/</span> {pct(l.pvPercent)}</td>
                        <td className={`py-3 px-4 text-center font-bold ${idxCls(l.cpi)}`}>{idx(l.cpi)}</td>
                        <td className={`py-3 px-4 text-center font-bold ${idxCls(l.spi)}`}>{idx(l.spi)}</td>
                        <td className="py-3 px-4 text-right">{l.eac != null ? fmt(l.eac) : '—'}</td>
                        <td className={`py-3 px-4 text-right font-bold ${l.vac == null ? 'text-slate-500' : l.vac < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                          {l.vac == null ? '—' : `${l.vac > 0 ? '+' : ''}${fmt(l.vac)}`}
                        </td>
                        <td className="py-3 px-4 text-center text-slate-400">{dt(l.prazoFimPlanejado)} <span className="text-slate-600">→</span> <span className={l.atrasoDias && l.atrasoDias > 0 ? 'text-red-400' : 'text-slate-300'}>{dt(l.prazoFimProjetado)}</span></td>
                        <td className="py-3 px-4 text-center">
                          {l.atrasoDias == null ? <span className="text-slate-600">—</span> : l.atrasoDias > 0 ? <span className="inline-flex items-center gap-1 text-red-400 font-bold"><CalendarX size={11} /> {l.atrasoDias}d</span> : <span className="text-emerald-400">no prazo</span>}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded font-bold text-[9px] uppercase border ${st.cls}`}>{st.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 px-1">
            EV (valor agregado) = orçado × % físico. PV = orçado × % planejado até hoje (do cronograma). CPI = EV ÷ custo real; SPI = EV ÷ PV. EAC (custo final projetado) = orçado ÷ CPI; VAC = orçado − EAC (negativo = estouro projetado). Prazo projetado = duração planejada ÷ SPI. Obras sem orçamento ou sem cronograma aparecem como "sem base".
          </p>
        </>
      )}
    </div>
  );
}
