'use client';

import { useState, useEffect, useCallback } from 'react';
import { ShoppingCart, Loader2, PackageX, TriangleAlert, Check } from 'lucide-react';

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const num = (v: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(v || 0);

const STATUS_META: Record<string, { label: string; cls: string }> = {
  COMPRAR: { label: 'Comprar', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/25' },
  EXCESSO: { label: 'Excesso', cls: 'bg-red-500/10 text-red-400 border-red-500/25' },
  OK: { label: 'Suficiente', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' },
};

export default function NecessidadeMateriaisPage() {
  const [empreendimentos, setEmpreendimentos] = useState<any[]>([]);
  const [empId, setEmpId] = useState('ALL');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [solicitando, setSolicitando] = useState<string | null>(null);
  const [solicitados, setSolicitados] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      const emps = await fetch('/api/empreendimentos').then((r) => r.json());
      setEmpreendimentos(emps || []);
    })();
  }, []);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const q = empId && empId !== 'ALL' ? `?empreendimentoId=${empId}` : '';
      const res = await fetch(`/api/gestao/necessidade-materiais${q}`).then((r) => r.json());
      setData(res);
    } finally {
      setLoading(false);
    }
  }, [empId]);

  useEffect(() => { setSolicitados({}); carregar(); }, [carregar]);

  const gerarSolicitacao = async (l: any) => {
    setSolicitando(l.insumoId);
    try {
      const dataNecessidade = new Date(Date.now() + 14 * 86400000).toISOString();
      const body: any = { insumoId: l.insumoId, quantidadeSolicitada: Math.ceil(l.aComprar), dataNecessidade };
      if (empId && empId !== 'ALL') body.empreendimentoId = empId;
      const res = await fetch('/api/suprimentos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.ok) {
        setSolicitados((s) => ({ ...s, [l.insumoId]: true }));
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Não foi possível gerar a solicitação.');
      }
    } finally {
      setSolicitando(null);
    }
  };

  const r = data?.resumo;

  return (
    <div className="space-y-6 p-6 min-h-screen bg-[#060814] text-slate-100">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-900 pb-5">
        <div>
          <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block">Gestão · Suprimentos</span>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2 mt-0.5">
            <ShoppingCart className="text-indigo-400" size={24} /> Necessidade de Materiais
          </h1>
          <p className="text-xs text-slate-400 mt-1">Quanto comprar para não faltar e o que está sobrando: plano das obras não concluídas − consumido − estoque − em pedido.</p>
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
            <div className={`glassmorphism p-4 rounded-2xl border ${r.insumosAComprar > 0 ? 'border-amber-500/25' : 'border-slate-850'}`}>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Itens a comprar</span>
              <p className={`text-xl font-bold font-mono mt-1.5 ${r.insumosAComprar > 0 ? 'text-amber-400' : 'text-slate-300'}`}>{r.insumosAComprar}</p>
            </div>
            <div className="glassmorphism p-4 rounded-2xl border border-slate-850">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Custo estimado de compra</span>
              <p className="text-lg font-bold font-mono mt-1.5 text-white">{fmt(r.custoTotalCompra)}</p>
            </div>
            <div className={`glassmorphism p-4 rounded-2xl border ${r.insumosExcesso > 0 ? 'border-red-500/25' : 'border-slate-850'}`}>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Itens em excesso</span>
              <p className={`text-xl font-bold font-mono mt-1.5 ${r.insumosExcesso > 0 ? 'text-red-400' : 'text-slate-300'}`}>{r.insumosExcesso}</p>
            </div>
            <div className={`glassmorphism p-4 rounded-2xl border ${r.valorTotalSobra > 0 ? 'border-red-500/20' : 'border-slate-850'}`}>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Capital parado (sobra)</span>
              <p className={`text-lg font-bold font-mono mt-1.5 ${r.valorTotalSobra > 0 ? 'text-red-400' : 'text-slate-300'}`}>{fmt(r.valorTotalSobra)}</p>
            </div>
          </div>

          {/* Tabela */}
          <div className="bg-slate-950/20 border border-slate-900 rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-slate-900 flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <PackageX size={14} className="text-indigo-400" /> Por insumo
              </h3>
              <span className="text-[10px] text-slate-500 font-mono">{r.totalInsumos} insumos · {r.totalCasas} obra(s) ativa(s)</span>
            </div>
            {data.linhas.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs italic">Nenhum insumo planejado ou em estoque para o escopo.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-950/80 border-b border-slate-900 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Insumo</th>
                      <th className="py-3 px-4 text-right">Necess. restante</th>
                      <th className="py-3 px-4 text-right">Estoque</th>
                      <th className="py-3 px-4 text-right">Em pedido</th>
                      <th className="py-3 px-4 text-right">A comprar</th>
                      <th className="py-3 px-4 text-right">Sobra</th>
                      <th className="py-3 px-4 text-right">Custo compra</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/60 text-slate-300 font-mono">
                    {data.linhas.map((l: any) => {
                      const st = STATUS_META[l.status] || STATUS_META.OK;
                      return (
                        <tr key={l.insumoId} className="hover:bg-slate-900/20">
                          <td className="py-3 px-4 font-sans">
                            <span className="font-semibold text-slate-200">{l.insumoNome}</span>
                            <span className="block text-[10px] text-slate-500 uppercase">
                              {(l.categoria || '').replace(/_/g, ' ')}{l.unidadeMedida ? ` · ${l.unidadeMedida}` : ''}
                              {l.abaixoMinimo && <span className="text-red-400 font-bold"> · abaixo do mínimo</span>}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">{num(l.necessidadeRestante)}</td>
                          <td className={`py-3 px-4 text-right ${l.abaixoMinimo ? 'text-red-400 font-bold' : ''}`}>{num(l.saldoEstoque)}</td>
                          <td className="py-3 px-4 text-right">{l.emPedido > 0 ? num(l.emPedido) : <span className="text-slate-600">—</span>}</td>
                          <td className={`py-3 px-4 text-right font-bold ${l.aComprar > 0 ? 'text-amber-400' : 'text-slate-600'}`}>{l.aComprar > 0 ? num(l.aComprar) : '—'}</td>
                          <td className={`py-3 px-4 text-right font-bold ${l.sobra > 0 ? 'text-red-400' : 'text-slate-600'}`}>{l.sobra > 0 ? num(l.sobra) : '—'}</td>
                          <td className="py-3 px-4 text-right">{l.custoCompra > 0 ? fmt(l.custoCompra) : <span className="text-slate-600">—</span>}</td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2 py-0.5 rounded font-bold text-[9px] uppercase border ${st.cls} inline-flex items-center gap-1`}>
                              {l.status === 'EXCESSO' && <TriangleAlert size={10} />}{st.label}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {l.status === 'COMPRAR' ? (
                              solicitados[l.insumoId] ? (
                                <span className="inline-flex items-center gap-1 text-emerald-400 text-[10px] font-bold"><Check size={12} /> Solicitado</span>
                              ) : (
                                <button
                                  onClick={() => gerarSolicitacao(l)}
                                  disabled={solicitando === l.insumoId}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold uppercase tracking-wider hover:bg-indigo-600/25 transition disabled:opacity-50 cursor-pointer"
                                >
                                  {solicitando === l.insumoId ? <Loader2 size={11} className="animate-spin" /> : <ShoppingCart size={11} />} Solicitar
                                </button>
                              )
                            ) : (
                              <span className="text-slate-700">—</span>
                            )}
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
            Necessidade restante = planejado (obras não concluídas) − já consumido. A comprar = necessidade restante − estoque − em pedido. Sobra = estoque + em pedido acima da necessidade (capital parado / risco de perda). "Solicitar" abre uma solicitação de compra em Suprimentos com a quantidade sugerida.
          </p>
        </>
      )}
    </div>
  );
}
