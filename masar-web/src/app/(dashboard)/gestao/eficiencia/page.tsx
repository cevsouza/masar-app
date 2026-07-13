'use client';

import { useState, useEffect } from 'react';
import { PackageCheck, Loader2, AlertTriangle, TrendingUp } from 'lucide-react';

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const num = (v: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(v || 0);
const pct = (v: number) => `${(v || 0).toFixed(0)}%`;

const STATUS_META: Record<string, { label: string; cls: string }> = {
  ESTOURO: { label: 'Estouro físico', cls: 'bg-red-500/10 text-red-400 border-red-500/25' },
  NAO_ORCADO: { label: 'Fora do orçamento', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/25' },
  NAO_INICIADO: { label: 'Não iniciado', cls: 'bg-slate-500/10 text-slate-400 border-slate-500/25' },
  OK: { label: 'Dentro do plano', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' },
};

export default function EficienciaMaterialPage() {
  const [empreendimentos, setEmpreendimentos] = useState<any[]>([]);
  const [casas, setCasas] = useState<any[]>([]);
  const [empId, setEmpId] = useState('ALL');
  const [casaId, setCasaId] = useState('ALL');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const emps = await fetch('/api/empreendimentos').then((r) => r.json());
      setEmpreendimentos(emps || []);
    })();
  }, []);

  // Carrega casas do empreendimento escolhido (reseta a casa selecionada).
  useEffect(() => {
    setCasaId('ALL');
    (async () => {
      const q = empId && empId !== 'ALL' ? `?empreendimentoId=${empId}` : '';
      const cs = await fetch(`/api/casas${q}`).then((r) => r.json());
      setCasas(Array.isArray(cs) ? cs : []);
    })();
  }, [empId]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (empId && empId !== 'ALL') params.set('empreendimentoId', empId);
        if (casaId && casaId !== 'ALL') params.set('casaId', casaId);
        const qs = params.toString();
        const res = await fetch(`/api/gestao/eficiencia-material${qs ? `?${qs}` : ''}`).then((r) => r.json());
        setData(res);
      } finally {
        setLoading(false);
      }
    })();
  }, [empId, casaId]);

  const r = data?.resumo;

  return (
    <div className="space-y-6 p-6 min-h-screen bg-[#060814] text-slate-100">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-900 pb-5">
        <div>
          <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block">Gestão · Eficiência</span>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2 mt-0.5">
            <PackageCheck className="text-indigo-400" size={24} /> Material · Previsto × Realizado
          </h1>
          <p className="text-xs text-slate-400 mt-1">Por insumo: quanto foi planejado × consumido do estoque (evita sobra e escassez) e custo previsto × realizado.</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <select value={empId} onChange={(e) => setEmpId(e.target.value)} className="bg-[#0b0f19] border border-slate-800 text-xs text-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500/50">
            <option value="ALL">Todos os empreendimentos</option>
            {empreendimentos.map((e) => (<option key={e.id} value={e.id}>{e.nome}</option>))}
          </select>
          <select value={casaId} onChange={(e) => setCasaId(e.target.value)} className="bg-[#0b0f19] border border-slate-800 text-xs text-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500/50">
            <option value="ALL">Todas as casas</option>
            {casas.map((c) => (<option key={c.id} value={c.id}>Qd {c.quadra} · Casa {c.numero}</option>))}
          </select>
        </div>
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
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Custo previsto</span>
              <p className="text-lg font-bold font-mono mt-1.5 text-slate-200">{fmt(r.totalCustoPrevisto)}</p>
            </div>
            <div className="glassmorphism p-4 rounded-2xl border border-slate-850">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Custo realizado</span>
              <p className="text-lg font-bold font-mono mt-1.5 text-white">{fmt(r.totalCustoRealizado)}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{pct(r.percentConsumidoCusto)} do previsto</p>
            </div>
            <div className={`glassmorphism p-4 rounded-2xl border ${r.desvioCusto > 0 ? 'border-red-500/25' : 'border-emerald-500/20'}`}>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Desvio de custo</span>
              <p className={`text-lg font-bold font-mono mt-1.5 ${r.desvioCusto > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {r.desvioCusto > 0 ? '+' : ''}{fmt(r.desvioCusto)}
              </p>
            </div>
            <div className={`glassmorphism p-4 rounded-2xl border ${r.insumosEstouro > 0 ? 'border-red-500/25' : 'border-slate-850'}`}>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Em estouro</span>
              <p className={`text-xl font-bold font-mono mt-1.5 ${r.insumosEstouro > 0 ? 'text-red-500' : 'text-slate-300'}`}>{r.insumosEstouro}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">consumo &gt; planejado</p>
            </div>
            <div className={`glassmorphism p-4 rounded-2xl border ${r.insumosNaoOrcado > 0 ? 'border-amber-500/25' : 'border-slate-850'}`}>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Fora do orçamento</span>
              <p className={`text-xl font-bold font-mono mt-1.5 ${r.insumosNaoOrcado > 0 ? 'text-amber-400' : 'text-slate-300'}`}>{r.insumosNaoOrcado}</p>
            </div>
          </div>

          {/* Tabela por insumo */}
          <div className="bg-slate-950/20 border border-slate-900 rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-slate-900 flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp size={14} className="text-indigo-400" /> Por insumo
              </h3>
              <span className="text-[10px] text-slate-500 font-mono">{r.totalInsumos} insumos · {r.totalCasas} casa(s)</span>
            </div>
            {data.linhas.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs italic">Nenhum insumo orçado ou movimentado para o escopo selecionado.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-950/80 border-b border-slate-900 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Insumo</th>
                      <th className="py-3 px-4 text-right">Planejado</th>
                      <th className="py-3 px-4 text-right">Consumido</th>
                      <th className="py-3 px-4 text-right">Saldo</th>
                      <th className="py-3 px-4 text-center">% físico</th>
                      <th className="py-3 px-4 text-right">Custo prev.</th>
                      <th className="py-3 px-4 text-right">Custo real.</th>
                      <th className="py-3 px-4 text-right">Desvio</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/60 text-slate-300 font-mono">
                    {data.linhas.map((l: any) => {
                      const st = STATUS_META[l.status] || STATUS_META.OK;
                      return (
                        <tr key={l.insumoId} className="hover:bg-slate-900/20">
                          <td className="py-3 px-4 font-sans">
                            <span className="font-semibold text-slate-200">{l.insumoNome}</span>
                            <span className="block text-[10px] text-slate-500 uppercase">{(l.categoria || '').replace(/_/g, ' ')}{l.unidadeMedida ? ` · ${l.unidadeMedida}` : ''}</span>
                          </td>
                          <td className="py-3 px-4 text-right">{l.orcado ? num(l.qtdPlanejada) : <span className="text-slate-600">—</span>}</td>
                          <td className="py-3 px-4 text-right text-white font-semibold">
                            {num(l.qtdConsumida)}
                            {l.qtdPerda > 0 && <span className="block text-[9px] text-orange-400">perda {num(l.qtdPerda)}</span>}
                          </td>
                          <td className={`py-3 px-4 text-right font-bold ${!l.orcado ? 'text-slate-600' : l.qtdSaldoAConsumir < 0 ? 'text-red-400' : 'text-slate-300'}`}>
                            {l.orcado ? num(l.qtdSaldoAConsumir) : '—'}
                          </td>
                          <td className={`py-3 px-4 text-center ${l.percentConsumidoFisico > 105 ? 'text-red-400 font-bold' : 'text-slate-400'}`}>
                            {l.orcado ? pct(l.percentConsumidoFisico) : '—'}
                          </td>
                          <td className="py-3 px-4 text-right">{l.custoPrevisto > 0 ? fmt(l.custoPrevisto) : <span className="text-slate-600">—</span>}</td>
                          <td className="py-3 px-4 text-right text-white font-semibold">{fmt(l.custoRealizado)}</td>
                          <td className={`py-3 px-4 text-right font-bold ${l.desvioCusto > 0 ? 'text-red-400' : l.desvioCusto < 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                            {l.desvioCusto === 0 ? '—' : `${l.desvioCusto > 0 ? '+' : ''}${fmt(l.desvioCusto)}`}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2 py-0.5 rounded font-bold text-[9px] uppercase border ${st.cls} inline-flex items-center gap-1`}>
                              {l.status === 'ESTOURO' && <AlertTriangle size={10} />}{st.label}
                            </span>
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
            Consumido = saídas de estoque para a(s) casa(s). Saldo = planejado − consumido (negativo = consumo acima do previsto → risco de escassez/desperdício). Custo realizado = despesas do insumo lançadas na casa (regime de competência).
          </p>
        </>
      )}
    </div>
  );
}
