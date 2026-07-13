'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Plus, Trash2, HeartPulse, ShieldCheck, Undo2 } from 'lucide-react';

interface Props {
  trabalhadorId: string;
  trabalhadorNome: string;
  onClose: () => void;
  onChanged?: () => void;
}

interface ASO {
  id: string;
  tipo: string;
  dataRealizacao: string;
  dataValidade: string;
  resultado: string;
  medico: string | null;
}
interface EPI {
  id: string;
  equipamento: string;
  ca: string | null;
  quantidade: number;
  dataEntrega: string;
  dataValidade: string | null;
  devolvido: boolean;
}

// Espelha lib/sst.statusValidade (client-side).
function statusValidade(dataValidade: string | null): 'VENCIDO' | 'A_VENCER' | 'OK' {
  if (!dataValidade) return 'OK';
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const venc = new Date(dataValidade); venc.setHours(0, 0, 0, 0);
  const dias = Math.round((venc.getTime() - hoje.getTime()) / 86400000);
  if (dias < 0) return 'VENCIDO';
  if (dias <= 30) return 'A_VENCER';
  return 'OK';
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  VENCIDO: { label: 'Vencido', cls: 'bg-red-500/10 text-red-400 border-red-500/25' },
  A_VENCER: { label: 'A vencer', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/25' },
  OK: { label: 'Em dia', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' },
};

const inputCls = 'w-full bg-[#0a0d18] border border-slate-900 rounded-lg px-2.5 py-2 text-[11px] text-slate-200 focus:outline-none focus:border-blue-500/70';
const fmtData = (d: string | null) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—');

export default function TrabalhadorSstModal({ trabalhadorId, trabalhadorNome, onClose, onChanged }: Props) {
  const [asos, setAsos] = useState<ASO[]>([]);
  const [epis, setEpis] = useState<EPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingAso, setSavingAso] = useState(false);
  const [savingEpi, setSavingEpi] = useState(false);
  const [erro, setErro] = useState('');

  const [aso, setAso] = useState({ tipo: 'PERIODICO', dataRealizacao: '', dataValidade: '', resultado: 'APTO', medico: '' });
  const [epi, setEpi] = useState({ equipamento: '', ca: '', quantidade: '1', dataEntrega: '', dataValidade: '' });

  const carregar = async () => {
    setLoading(true);
    try {
      const t = await fetch(`/api/trabalhadores/${trabalhadorId}`).then((r) => r.json());
      setAsos(t.asos || []);
      setEpis(t.episEntregues || []);
    } catch {
      setErro('Erro ao carregar dados de SST.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trabalhadorId]);

  const addAso = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    if (!aso.dataRealizacao || !aso.dataValidade) { setErro('ASO: informe data de realização e validade.'); return; }
    setSavingAso(true);
    try {
      const res = await fetch('/api/sst/aso', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...aso, trabalhadorId }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Erro ao salvar ASO');
      setAso({ tipo: 'PERIODICO', dataRealizacao: '', dataValidade: '', resultado: 'APTO', medico: '' });
      await carregar(); onChanged?.();
    } catch (e: any) { setErro(e.message); } finally { setSavingAso(false); }
  };

  const delAso = async (id: string) => {
    if (!confirm('Excluir este ASO?')) return;
    await fetch(`/api/sst/aso/${id}`, { method: 'DELETE' });
    await carregar(); onChanged?.();
  };

  const addEpi = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    if (!epi.equipamento.trim() || !epi.dataEntrega) { setErro('EPI: informe equipamento e data de entrega.'); return; }
    setSavingEpi(true);
    try {
      const res = await fetch('/api/sst/epi', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...epi, trabalhadorId }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Erro ao salvar EPI');
      setEpi({ equipamento: '', ca: '', quantidade: '1', dataEntrega: '', dataValidade: '' });
      await carregar(); onChanged?.();
    } catch (e: any) { setErro(e.message); } finally { setSavingEpi(false); }
  };

  const toggleDevolvido = async (id: string, devolvido: boolean) => {
    await fetch(`/api/sst/epi/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ devolvido }) });
    await carregar(); onChanged?.();
  };

  const delEpi = async (id: string) => {
    if (!confirm('Excluir este registro de EPI?')) return;
    await fetch(`/api/sst/epi/${id}`, { method: 'DELETE' });
    await carregar(); onChanged?.();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glassmorphism w-full max-w-3xl rounded-2xl border border-slate-900 shadow-2xl p-6 relative max-h-[92vh] overflow-y-auto">
        <button onClick={onClose} className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition">
          <X size={16} />
        </button>

        <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-1 flex items-center gap-2">
          <ShieldCheck size={16} className="text-emerald-400" /> Saúde &amp; EPIs
        </h4>
        <p className="text-xs text-slate-400 mb-4">{trabalhadorNome}</p>

        {erro && <div className="p-2.5 mb-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-[11px] font-semibold">{erro}</div>}

        {loading ? (
          <div className="py-12 text-center"><Loader2 className="animate-spin text-blue-500 mx-auto" size={24} /></div>
        ) : (
          <div className="space-y-6">
            {/* ASO */}
            <section>
              <h5 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <HeartPulse size={13} className="text-rose-400" /> ASO — Atestados de Saúde Ocupacional
              </h5>
              <div className="border border-slate-900 rounded-xl overflow-hidden mb-3">
                <table className="w-full text-[11px] text-left">
                  <thead className="bg-slate-950/80 text-[9px] text-slate-400 uppercase font-bold">
                    <tr><th className="py-2 px-3">Tipo</th><th className="py-2 px-3">Realização</th><th className="py-2 px-3">Validade</th><th className="py-2 px-3">Resultado</th><th className="py-2 px-3 text-center">Ação</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/60 text-slate-300">
                    {asos.length === 0 ? (
                      <tr><td colSpan={5} className="py-4 px-3 text-center text-slate-500 italic">Nenhum ASO registrado.</td></tr>
                    ) : asos.map((a) => {
                      const st = STATUS_META[statusValidade(a.dataValidade)];
                      return (
                        <tr key={a.id} className="hover:bg-slate-900/20">
                          <td className="py-2 px-3">{a.tipo.replace(/_/g, ' ')}</td>
                          <td className="py-2 px-3 font-mono">{fmtData(a.dataRealizacao)}</td>
                          <td className="py-2 px-3 font-mono">
                            {fmtData(a.dataValidade)}
                            <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase border ${st.cls}`}>{st.label}</span>
                          </td>
                          <td className="py-2 px-3">{a.resultado.replace(/_/g, ' ')}</td>
                          <td className="py-2 px-3 text-center">
                            <button onClick={() => delAso(a.id)} className="p-1 text-rose-400 hover:bg-slate-900 rounded" title="Excluir"><Trash2 size={12} /></button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <form onSubmit={addAso} className="grid grid-cols-2 md:grid-cols-6 gap-2 items-end">
                <select value={aso.tipo} onChange={(e) => setAso({ ...aso, tipo: e.target.value })} className={inputCls}>
                  <option value="ADMISSIONAL">Admissional</option>
                  <option value="PERIODICO">Periódico</option>
                  <option value="RETORNO_AO_TRABALHO">Retorno</option>
                  <option value="MUDANCA_DE_FUNCAO">Mudança função</option>
                  <option value="DEMISSIONAL">Demissional</option>
                </select>
                <input type="date" value={aso.dataRealizacao} onChange={(e) => setAso({ ...aso, dataRealizacao: e.target.value })} className={inputCls} title="Realização" />
                <input type="date" value={aso.dataValidade} onChange={(e) => setAso({ ...aso, dataValidade: e.target.value })} className={inputCls} title="Validade" />
                <select value={aso.resultado} onChange={(e) => setAso({ ...aso, resultado: e.target.value })} className={inputCls}>
                  <option value="APTO">Apto</option>
                  <option value="APTO_COM_RESTRICAO">Apto c/ restrição</option>
                  <option value="INAPTO">Inapto</option>
                </select>
                <input type="text" value={aso.medico} onChange={(e) => setAso({ ...aso, medico: e.target.value })} placeholder="Médico/clínica" className={inputCls} />
                <button type="submit" disabled={savingAso} className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 disabled:opacity-50">
                  {savingAso ? <Loader2 size={11} className="animate-spin" /> : <Plus size={12} />} ASO
                </button>
              </form>
            </section>

            {/* EPI */}
            <section>
              <h5 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-sky-400" /> EPIs entregues
              </h5>
              <div className="border border-slate-900 rounded-xl overflow-hidden mb-3">
                <table className="w-full text-[11px] text-left">
                  <thead className="bg-slate-950/80 text-[9px] text-slate-400 uppercase font-bold">
                    <tr><th className="py-2 px-3">Equipamento</th><th className="py-2 px-3">CA</th><th className="py-2 px-3">Qtd</th><th className="py-2 px-3">Entrega</th><th className="py-2 px-3">Validade</th><th className="py-2 px-3 text-center">Ações</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/60 text-slate-300">
                    {epis.length === 0 ? (
                      <tr><td colSpan={6} className="py-4 px-3 text-center text-slate-500 italic">Nenhum EPI registrado.</td></tr>
                    ) : epis.map((e) => {
                      const st = STATUS_META[statusValidade(e.dataValidade)];
                      return (
                        <tr key={e.id} className={`hover:bg-slate-900/20 ${e.devolvido ? 'opacity-50' : ''}`}>
                          <td className="py-2 px-3">
                            {e.equipamento}
                            {e.devolvido && <span className="ml-1.5 px-1 py-0.5 bg-slate-800 text-slate-400 rounded text-[8px] uppercase font-bold">Devolvido</span>}
                          </td>
                          <td className="py-2 px-3 font-mono">{e.ca || '—'}</td>
                          <td className="py-2 px-3 font-mono">{e.quantidade}</td>
                          <td className="py-2 px-3 font-mono">{fmtData(e.dataEntrega)}</td>
                          <td className="py-2 px-3 font-mono">
                            {fmtData(e.dataValidade)}
                            {e.dataValidade && !e.devolvido && <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase border ${st.cls}`}>{st.label}</span>}
                          </td>
                          <td className="py-2 px-3 text-center whitespace-nowrap">
                            <button onClick={() => toggleDevolvido(e.id, !e.devolvido)} className="p-1 text-slate-400 hover:text-white hover:bg-slate-900 rounded" title={e.devolvido ? 'Reverter devolução' : 'Marcar devolvido'}><Undo2 size={12} /></button>
                            <button onClick={() => delEpi(e.id)} className="p-1 text-rose-400 hover:bg-slate-900 rounded" title="Excluir"><Trash2 size={12} /></button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <form onSubmit={addEpi} className="grid grid-cols-2 md:grid-cols-6 gap-2 items-end">
                <input type="text" value={epi.equipamento} onChange={(e) => setEpi({ ...epi, equipamento: e.target.value })} placeholder="Capacete, botina..." className={inputCls} />
                <input type="text" value={epi.ca} onChange={(e) => setEpi({ ...epi, ca: e.target.value })} placeholder="CA" className={inputCls} />
                <input type="number" min="1" value={epi.quantidade} onChange={(e) => setEpi({ ...epi, quantidade: e.target.value })} placeholder="Qtd" className={inputCls} />
                <input type="date" value={epi.dataEntrega} onChange={(e) => setEpi({ ...epi, dataEntrega: e.target.value })} className={inputCls} title="Entrega" />
                <input type="date" value={epi.dataValidade} onChange={(e) => setEpi({ ...epi, dataValidade: e.target.value })} className={inputCls} title="Validade (opcional)" />
                <button type="submit" disabled={savingEpi} className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 disabled:opacity-50">
                  {savingEpi ? <Loader2 size={11} className="animate-spin" /> : <Plus size={12} />} EPI
                </button>
              </form>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
