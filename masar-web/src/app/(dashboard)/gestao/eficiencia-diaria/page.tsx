'use client';

import { useState, useEffect } from 'react';
import { Target, Loader2, TriangleAlert, CheckCircle2, Save } from 'lucide-react';

const idx = (v: number | null) => (v == null ? '—' : v.toFixed(2));
const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const STATUS_META: Record<string, { label: string; cls: string; ring: string }> = {
  CRITICO: { label: 'Crítico', cls: 'text-red-400', ring: 'border-red-500/40 bg-red-500/10' },
  ATENCAO: { label: 'Atenção', cls: 'text-amber-400', ring: 'border-amber-500/40 bg-amber-500/10' },
  OK: { label: 'Dentro das metas', cls: 'text-emerald-400', ring: 'border-emerald-500/40 bg-emerald-500/10' },
};

export default function EficienciaDiariaPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const carregar = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/gestao/meta-eficiencia').then((r) => r.json());
      setData(res);
      if (res?.meta) setForm({ ...res.meta });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
    fetch('/api/auth/me').then((r) => (r.ok ? r.json() : null)).then((u) => setIsAdmin(u?.role === 'ADMIN')).catch(() => {});
  }, []);

  const salvar = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const res = await fetch('/api/gestao/meta-eficiencia', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cpiMinimo: Number(form.cpiMinimo),
          spiMinimo: Number(form.spiMinimo),
          maxInsumosEstouro: parseInt(form.maxInsumosEstouro, 10),
          alertarRuptura: !!form.alertarRuptura,
        }),
      });
      if (res.ok) await carregar();
      else alert('Não foi possível salvar as metas.');
    } finally {
      setSaving(false);
    }
  };

  const st = data ? STATUS_META[data.status] : null;
  const ind = data?.indicadores;

  return (
    <div className="space-y-6 p-6 min-h-screen bg-[#060814] text-slate-100">
      <div className="border-b border-slate-900 pb-5">
        <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block">Gestão · Eficiência</span>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2 mt-0.5">
          <Target className="text-indigo-400" size={24} /> Painel de Eficiência Diária
        </h1>
        <p className="text-xs text-slate-400 mt-1">Compara o desempenho consolidado (custo, prazo, estoque, caixa) com as metas. Os desvios viram alerta no resumo diário.</p>
      </div>

      {loading || !data || !st ? (
        <div className="py-20 text-center"><Loader2 className="animate-spin text-indigo-500 mx-auto" size={26} /></div>
      ) : (
        <>
          {/* Farol */}
          <div className={`flex items-center gap-4 rounded-2xl border px-5 py-4 ${st.ring}`}>
            {data.status === 'OK' ? <CheckCircle2 className={st.cls} size={28} /> : <TriangleAlert className={st.cls} size={28} />}
            <div>
              <p className={`text-lg font-bold ${st.cls}`}>{st.label}</p>
              <p className="text-xs text-slate-300/70">{data.violacoes.length === 0 ? 'Todos os indicadores dentro das metas configuradas.' : `${data.violacoes.length} meta(s) fora do alvo.`}</p>
            </div>
          </div>

          {/* Indicadores atuais */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glassmorphism p-4 rounded-2xl border border-slate-850">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Eficiência de custo</span>
              <p className={`text-xl font-bold font-mono mt-1.5 ${ind.cpiGeral == null ? 'text-slate-400' : ind.cpiGeral >= data.meta.cpiMinimo ? 'text-emerald-400' : 'text-red-400'}`}>{idx(ind.cpiGeral)}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">meta ≥ {data.meta.cpiMinimo.toFixed(2)}</p>
            </div>
            <div className="glassmorphism p-4 rounded-2xl border border-slate-850">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Eficiência de prazo</span>
              <p className={`text-xl font-bold font-mono mt-1.5 ${ind.spiGeral == null ? 'text-slate-400' : ind.spiGeral >= data.meta.spiMinimo ? 'text-emerald-400' : 'text-red-400'}`}>{idx(ind.spiGeral)}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">meta ≥ {data.meta.spiMinimo.toFixed(2)}</p>
            </div>
            <div className="glassmorphism p-4 rounded-2xl border border-slate-850">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Insumos em estouro</span>
              <p className={`text-xl font-bold font-mono mt-1.5 ${ind.insumosEstouro > data.meta.maxInsumosEstouro ? 'text-red-400' : 'text-emerald-400'}`}>{ind.insumosEstouro}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">meta ≤ {data.meta.maxInsumosEstouro}</p>
            </div>
            <div className="glassmorphism p-4 rounded-2xl border border-slate-850">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Caixa</span>
              <p className={`text-xl font-bold font-mono mt-1.5 ${ind.semanaRuptura ? 'text-red-400' : 'text-emerald-400'}`}>{ind.semanaRuptura ? 'Ruptura' : 'OK'}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{ind.semanaRuptura ? `semana ${ind.semanaRuptura}` : `menor saldo ${fmt(ind.menorSaldo)}`}</p>
            </div>
          </div>

          {/* Violações */}
          {data.violacoes.length > 0 && (
            <div className="bg-slate-950/20 border border-slate-900 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-900"><h3 className="text-xs font-bold text-white uppercase tracking-wider">Metas fora do alvo</h3></div>
              <div className="divide-y divide-slate-900/60">
                {data.violacoes.map((v: any) => (
                  <div key={v.chave} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className={`w-2 h-2 rounded-full ${v.severidade === 'CRITICO' ? 'bg-red-500' : 'bg-amber-500'}`} />
                      <span className="text-sm text-slate-200">{v.label}</span>
                    </div>
                    <span className="text-xs font-mono text-slate-400 shrink-0">atual <span className={v.severidade === 'CRITICO' ? 'text-red-400 font-bold' : 'text-amber-400 font-bold'}>{v.atual}</span> · meta {v.meta}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Configuração de metas */}
          <div className="glassmorphism p-5 rounded-2xl border border-slate-800/80">
            <h3 className="text-sm font-bold text-white mb-1 uppercase tracking-wider">Metas de eficiência</h3>
            <p className="text-[11px] text-slate-500 mb-4">{isAdmin ? 'Ajuste os limites; os desvios geram alerta no resumo diário.' : 'Somente administradores podem alterar as metas.'}</p>
            {form && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <label className="block">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Eficiência de custo mínima</span>
                  <input type="number" step="0.05" disabled={!isAdmin} value={form.cpiMinimo} onChange={(e) => setForm({ ...form, cpiMinimo: e.target.value })} className="mt-1 w-full bg-[#0b0f19] border border-slate-800 text-sm text-slate-200 rounded-xl px-3 py-2 font-mono focus:outline-none focus:border-indigo-500/50 disabled:opacity-50" />
                </label>
                <label className="block">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Eficiência de prazo mínima</span>
                  <input type="number" step="0.05" disabled={!isAdmin} value={form.spiMinimo} onChange={(e) => setForm({ ...form, spiMinimo: e.target.value })} className="mt-1 w-full bg-[#0b0f19] border border-slate-800 text-sm text-slate-200 rounded-xl px-3 py-2 font-mono focus:outline-none focus:border-indigo-500/50 disabled:opacity-50" />
                </label>
                <label className="block">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Máx. insumos em estouro</span>
                  <input type="number" step="1" min="0" disabled={!isAdmin} value={form.maxInsumosEstouro} onChange={(e) => setForm({ ...form, maxInsumosEstouro: e.target.value })} className="mt-1 w-full bg-[#0b0f19] border border-slate-800 text-sm text-slate-200 rounded-xl px-3 py-2 font-mono focus:outline-none focus:border-indigo-500/50 disabled:opacity-50" />
                </label>
                <label className="flex items-center gap-2 mt-6">
                  <input type="checkbox" disabled={!isAdmin} checked={!!form.alertarRuptura} onChange={(e) => setForm({ ...form, alertarRuptura: e.target.checked })} className="accent-indigo-500 disabled:opacity-50" />
                  <span className="text-xs text-slate-300">Alertar ruptura de caixa</span>
                </label>
              </div>
            )}
            {isAdmin && (
              <button onClick={salvar} disabled={saving} className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 text-xs font-bold uppercase tracking-wider hover:bg-indigo-600/25 transition disabled:opacity-50 cursor-pointer">
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Salvar metas
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
