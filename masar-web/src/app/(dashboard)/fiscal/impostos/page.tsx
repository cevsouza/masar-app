'use client';

import { useState, useEffect } from 'react';
import { Percent, Loader2, CheckCircle, AlertCircle, FileCheck2, Landmark } from 'lucide-react';

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

export default function ImpostosRETPage() {
  const [empreendimentos, setEmpreendimentos] = useState<any[]>([]);
  const [empId, setEmpId] = useState('');
  const [apuracao, setApuracao] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [aliquotaInput, setAliquotaInput] = useState('');
  const [savingAliq, setSavingAliq] = useState(false);
  const [gerandoId, setGerandoId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  useEffect(() => {
    (async () => {
      const emps = await fetch('/api/empreendimentos').then((r) => r.json());
      setEmpreendimentos(emps || []);
      if (emps?.length) setEmpId(emps[0].id);
      else setLoading(false);
    })();
  }, []);

  const carregar = async (id: string) => {
    setLoading(true);
    try {
      const a = await fetch(`/api/fiscal/ret?empreendimentoId=${id}`).then((r) => r.json());
      setApuracao(a);
      setAliquotaInput(a.aliquota != null ? String(a.aliquota) : '4');
    } catch {
      setMsg({ tipo: 'erro', texto: 'Erro ao apurar RET.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (empId) carregar(empId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empId]);

  const salvarAliquota = async () => {
    if (!apuracao || aliquotaInput === String(apuracao.aliquota)) return;
    setSavingAliq(true);
    setMsg(null);
    try {
      const res = await fetch('/api/fiscal/ret', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empreendimentoId: empId, aliquotaRET: aliquotaInput }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Erro ao salvar alíquota');
      await carregar(empId);
    } catch (e: any) {
      setMsg({ tipo: 'erro', texto: e.message });
    } finally {
      setSavingAliq(false);
    }
  };

  const gerarGuia = async (competencia: string) => {
    setGerandoId(competencia);
    setMsg(null);
    try {
      const res = await fetch('/api/fiscal/ret/gerar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empreendimentoId: empId, competencia }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao gerar guia');
      setMsg({ tipo: 'ok', texto: `Guia de RET gerada: conta a pagar de ${fmt(data.valor)} lançada.` });
      await carregar(empId);
    } catch (e: any) {
      setMsg({ tipo: 'erro', texto: e.message });
    } finally {
      setGerandoId(null);
    }
  };

  const t = apuracao?.totais;

  return (
    <div className="space-y-6 p-6 min-h-screen bg-[#060814] text-slate-100">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-900 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Percent className="text-blue-400" size={24} /> Impostos — RET
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Apuração do Regime Especial de Tributação sobre a receita recebida (regime de caixa). Gere a guia do mês como conta a pagar.
          </p>
        </div>
        <select value={empId} onChange={(e) => setEmpId(e.target.value)} className="bg-[#0b0f19] border border-slate-800 text-xs text-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-blue-500/50">
          {empreendimentos.map((e) => (<option key={e.id} value={e.id}>{e.nome}</option>))}
        </select>
      </div>

      {msg && (
        <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 border ${msg.tipo === 'ok' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
          {msg.tipo === 'ok' ? <CheckCircle size={14} /> : <AlertCircle size={14} />} {msg.texto}
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center"><Loader2 className="animate-spin text-blue-500 mx-auto" size={26} /></div>
      ) : !apuracao ? (
        <div className="glassmorphism p-8 rounded-2xl text-center text-sm text-slate-500">Selecione um empreendimento.</div>
      ) : (
        <>
          {/* Alíquota + totais */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-slate-950/40 border border-slate-900 rounded-2xl p-4">
              <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1 font-semibold">Alíquota RET (%)</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number" min="0" max="100" step="0.1"
                  value={aliquotaInput}
                  onChange={(e) => setAliquotaInput(e.target.value)}
                  onBlur={salvarAliquota}
                  onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                  className="w-20 bg-[#0a0d18] border border-slate-900 rounded-lg px-2.5 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-blue-500/70"
                />
                {savingAliq && <Loader2 size={12} className="animate-spin text-blue-400" />}
              </div>
              <p className="text-[9px] text-slate-500 mt-1">4% padrão · 1% MCMV social</p>
            </div>
            <div className="glassmorphism p-4 rounded-2xl border border-slate-850">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Receita recebida</span>
              <p className="text-lg font-bold text-white font-mono mt-1.5">{fmt(t.receita)}</p>
            </div>
            <div className="glassmorphism p-4 rounded-2xl border border-slate-850">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">RET devido</span>
              <p className="text-lg font-bold text-amber-400 font-mono mt-1.5">{fmt(t.retDevido)}</p>
            </div>
            <div className="glassmorphism p-4 rounded-2xl border border-slate-850">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">RET gerado</span>
              <p className="text-lg font-bold text-emerald-400 font-mono mt-1.5">{fmt(t.retGerado)}</p>
            </div>
            <div className={`glassmorphism p-4 rounded-2xl border ${t.pendente > 0 ? 'border-red-500/25 bg-red-950/5' : 'border-slate-850'}`}>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">RET pendente</span>
              <p className={`text-lg font-bold font-mono mt-1.5 ${t.pendente > 0 ? 'text-red-400' : 'text-slate-300'}`}>{fmt(t.pendente)}</p>
            </div>
          </div>

          {/* Apuração mensal */}
          <div className="bg-slate-950/20 border border-slate-900 rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-slate-900">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Landmark size={14} className="text-blue-400" /> Apuração mensal
              </h3>
            </div>
            {apuracao.meses.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs italic">Nenhuma receita recebida ainda neste empreendimento.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-950/80 border-b border-slate-900 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Competência</th>
                      <th className="py-3 px-4 text-right">Receita recebida</th>
                      <th className="py-3 px-4 text-right">RET devido</th>
                      <th className="py-3 px-4 text-right">RET gerado</th>
                      <th className="py-3 px-4 text-right">Pendente</th>
                      <th className="py-3 px-4 text-center">Guia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/60 text-slate-300 font-mono">
                    {apuracao.meses.map((m: any) => (
                      <tr key={m.competencia} className="hover:bg-slate-900/20">
                        <td className="py-3 px-4 font-sans font-semibold text-slate-200">{m.label}</td>
                        <td className="py-3 px-4 text-right">{fmt(m.receitaRecebida)}</td>
                        <td className="py-3 px-4 text-right text-amber-400">{fmt(m.retDevido)}</td>
                        <td className="py-3 px-4 text-right text-emerald-400">{fmt(m.retGerado)}</td>
                        <td className={`py-3 px-4 text-right font-bold ${m.pendente > 0 ? 'text-red-400' : 'text-slate-500'}`}>{fmt(m.pendente)}</td>
                        <td className="py-3 px-4 text-center">
                          {m.pendente > 0 ? (
                            <button
                              onClick={() => gerarGuia(m.competencia)}
                              disabled={gerandoId === m.competencia}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-bold transition cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
                              title="Gerar guia (conta a pagar)"
                            >
                              {gerandoId === m.competencia ? <Loader2 size={11} className="animate-spin" /> : <FileCheck2 size={12} />}
                              Gerar guia
                            </button>
                          ) : m.jaGerado ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 text-[10px] font-bold"><CheckCircle size={12} /> Gerada</span>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <p className="text-[11px] text-slate-500 px-1">
            RET devido = receita recebida no mês × alíquota. A guia gerada vira uma conta a pagar (categoria Impostos) com vencimento no dia 20 do mês seguinte — aparece em Contas a Pagar e no DRE.
          </p>
        </>
      )}
    </div>
  );
}
