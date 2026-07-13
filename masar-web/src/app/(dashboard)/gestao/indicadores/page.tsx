'use client';

import { useState, useEffect } from 'react';
import { Gauge, Loader2, TrendingUp, AlertTriangle } from 'lucide-react';

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const pct = (v: number) => `${(v || 0).toFixed(0)}%`;

const STATUS_META: Record<string, { label: string; cls: string }> = {
  ESTOURANDO: { label: 'Estourando', cls: 'bg-red-500/10 text-red-400 border-red-500/25' },
  CUSTO_ADIANTADO: { label: 'Custo à frente', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/25' },
  CRONOGRAMA_ATRASADO: { label: 'Cronograma atrasado', cls: 'bg-orange-500/10 text-orange-400 border-orange-500/25' },
  SAUDAVEL: { label: 'Saudável', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' },
};

export default function IndicadoresPage() {
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
        const res = await fetch(`/api/gestao/indicadores${q}`).then((r) => r.json());
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
          <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block">Gestão · BI</span>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2 mt-0.5">
            <Gauge className="text-indigo-400" size={24} /> Custo × Orçado × Cronograma
          </h1>
          <p className="text-xs text-slate-400 mt-1">Cruza o gasto de cada obra com o orçado e o avanço físico. Eficiência de custo abaixo de 1 = custo acima do que foi executado.</p>
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
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="glassmorphism p-4 rounded-2xl border border-slate-850">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Eficiência de custo</span>
              <p className={`text-xl font-bold font-mono mt-1.5 ${r.cpiGeral == null ? 'text-slate-400' : r.cpiGeral >= 1 ? 'text-emerald-400' : 'text-red-400'}`}>
                {r.cpiGeral == null ? '—' : r.cpiGeral.toFixed(2)}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">físico médio {pct(r.percentFisicoMedio)}</p>
            </div>
            <div className={`glassmorphism p-4 rounded-2xl border ${r.estourando > 0 ? 'border-red-500/25' : 'border-slate-850'}`}>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Estourando</span>
              <p className={`text-xl font-bold font-mono mt-1.5 ${r.estourando > 0 ? 'text-red-500' : 'text-slate-300'}`}>{r.estourando}</p>
            </div>
            <div className={`glassmorphism p-4 rounded-2xl border ${r.custoAdiantado > 0 ? 'border-amber-500/25' : 'border-slate-850'}`}>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Custo à frente</span>
              <p className={`text-xl font-bold font-mono mt-1.5 ${r.custoAdiantado > 0 ? 'text-amber-400' : 'text-slate-300'}`}>{r.custoAdiantado}</p>
            </div>
            <div className={`glassmorphism p-4 rounded-2xl border ${r.cronogramaAtrasado > 0 ? 'border-orange-500/25' : 'border-slate-850'}`}>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Cronograma atrás</span>
              <p className={`text-xl font-bold font-mono mt-1.5 ${r.cronogramaAtrasado > 0 ? 'text-orange-400' : 'text-slate-300'}`}>{r.cronogramaAtrasado}</p>
            </div>
            <div className="glassmorphism p-4 rounded-2xl border border-emerald-500/20">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Saudáveis</span>
              <p className="text-xl font-bold font-mono mt-1.5 text-emerald-400">{r.saudaveis}</p>
            </div>
          </div>

          {/* Tabela */}
          <div className="bg-slate-950/20 border border-slate-900 rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-slate-900 flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp size={14} className="text-indigo-400" /> Por obra
              </h3>
              <span className="text-[10px] text-slate-500 font-mono">Orçado {fmt(r.totalOrcado)} · Gasto {fmt(r.totalGasto)}</span>
            </div>
            {data.linhas.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs italic">Nenhuma casa cadastrada.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-950/80 border-b border-slate-900 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Obra</th>
                      <th className="py-3 px-4 text-right">Orçado</th>
                      <th className="py-3 px-4 text-right">Gasto</th>
                      <th className="py-3 px-4 text-center">Físico</th>
                      <th className="py-3 px-4 text-center">Consumido</th>
                      <th className="py-3 px-4 text-center">Desvio</th>
                      <th className="py-3 px-4 text-center">Efic. custo</th>
                      <th className="py-3 px-4 text-center">Atrasos</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/60 text-slate-300 font-mono">
                    {data.linhas.map((l: any) => {
                      const st = STATUS_META[l.status];
                      return (
                        <tr key={l.id} className="hover:bg-slate-900/20">
                          <td className="py-3 px-4 font-sans">
                            <a href={`/casas/${l.id}`} className="font-semibold text-slate-200 hover:text-indigo-400">Qd {l.quadra} · Casa {l.numero}</a>
                            <span className="block text-[10px] text-slate-500">{l.empreendimentoNome}</span>
                          </td>
                          <td className="py-3 px-4 text-right">{l.orcado > 0 ? fmt(l.orcado) : <span className="text-slate-600">—</span>}</td>
                          <td className="py-3 px-4 text-right text-white font-semibold">{fmt(l.gasto)}</td>
                          <td className="py-3 px-4 text-center">{pct(l.percentFisico)}</td>
                          <td className="py-3 px-4 text-center">{l.orcado > 0 ? pct(l.percentConsumido) : '—'}</td>
                          <td className={`py-3 px-4 text-center font-bold ${l.orcado > 0 ? (l.desvio > 10 ? 'text-red-400' : l.desvio < -10 ? 'text-emerald-400' : 'text-slate-400') : 'text-slate-600'}`}>
                            {l.orcado > 0 ? `${l.desvio > 0 ? '+' : ''}${l.desvio.toFixed(0)}pp` : '—'}
                          </td>
                          <td className={`py-3 px-4 text-center font-bold ${l.cpi == null ? 'text-slate-600' : l.cpi >= 1 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {l.cpi == null ? '—' : l.cpi.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {l.atividadesAtrasadas > 0 ? <span className="inline-flex items-center gap-1 text-orange-400 font-bold"><AlertTriangle size={11} /> {l.atividadesAtrasadas}</span> : <span className="text-slate-600">0</span>}
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
            )}
          </div>
          <p className="text-[11px] text-slate-500 px-1">
            Desvio = % consumido − % físico (positivo = gastando mais rápido do que avança). Eficiência de custo = valor entregue (orçado × % físico) ÷ gasto (abaixo de 1 = custo acima do executado).
          </p>
        </>
      )}
    </div>
  );
}
