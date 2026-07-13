'use client';

import { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, Loader2, Plus, Trash2, MessageSquare, Bandage, ListChecks } from 'lucide-react';

const dt = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });

const TIPO_ACIDENTE: Record<string, string> = { TIPICO: 'Típico', TRAJETO: 'Trajeto', DOENCA_OCUPACIONAL: 'Doença ocupacional' };
const GRAVIDADE: Record<string, { label: string; cls: string }> = {
  LEVE: { label: 'Leve', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' },
  MODERADO: { label: 'Moderado', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/25' },
  GRAVE: { label: 'Grave', cls: 'bg-orange-500/10 text-orange-400 border-orange-500/25' },
  FATAL: { label: 'Fatal', cls: 'bg-red-500/10 text-red-400 border-red-500/25' },
};

const inputCls = 'w-full bg-[#0b0f19] border border-slate-800 text-sm text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500/50';
const labelCls = 'text-[10px] text-slate-400 uppercase tracking-wider font-bold';

export default function RegistrosSstPage() {
  const [tab, setTab] = useState<'dds' | 'acidentes' | 'checklists'>('dds');
  const [empreendimentos, setEmpreendimentos] = useState<any[]>([]);
  const [trabalhadores, setTrabalhadores] = useState<any[]>([]);
  const [empId, setEmpId] = useState('ALL');
  const [dds, setDds] = useState<any[]>([]);
  const [acidentes, setAcidentes] = useState<any[]>([]);
  const [checklists, setChecklists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<any>({});
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    fetch('/api/empreendimentos').then((r) => r.json()).then((e) => setEmpreendimentos(e || []));
    fetch('/api/trabalhadores').then((r) => r.json()).then((t) => setTrabalhadores(Array.isArray(t) ? t : []));
  }, []);

  const carregar = useCallback(async () => {
    setLoading(true);
    const q = empId && empId !== 'ALL' ? `?empreendimentoId=${empId}` : '';
    try {
      const [a, b, c] = await Promise.all([
        fetch(`/api/sst/dds${q}`).then((r) => r.json()),
        fetch(`/api/sst/acidentes${q}`).then((r) => r.json()),
        fetch(`/api/sst/checklists${q}`).then((r) => r.json()),
      ]);
      setDds(Array.isArray(a) ? a : []);
      setAcidentes(Array.isArray(b) ? b : []);
      setChecklists(Array.isArray(c) ? c : []);
    } finally {
      setLoading(false);
    }
  }, [empId]);

  useEffect(() => { carregar(); }, [carregar]);
  useEffect(() => { setForm({}); }, [tab]);

  const salvar = async () => {
    setSalvando(true);
    try {
      let url = '', body: any = {};
      const empBase = empId !== 'ALL' ? empId : (form.empreendimentoId || null);
      if (tab === 'dds') {
        url = '/api/sst/dds';
        body = { tema: form.tema, responsavel: form.responsavel, observacoes: form.observacoes, participantes: form.participantes ? String(form.participantes).split(',').map((n: string) => ({ nome: n.trim() })).filter((p: any) => p.nome) : undefined, empreendimentoId: empBase };
      } else if (tab === 'acidentes') {
        url = '/api/sst/acidentes';
        body = { trabalhadorId: form.trabalhadorId, descricao: form.descricao, tipo: form.tipo || 'TIPICO', gravidade: form.gravidade || 'LEVE', parteCorpo: form.parteCorpo, diasAfastamento: form.diasAfastamento ? parseInt(form.diasAfastamento, 10) : 0, catEmitida: !!form.catEmitida, numeroCat: form.numeroCat, empreendimentoId: empBase };
      } else {
        url = '/api/sst/checklists';
        body = { norma: form.norma, responsavel: form.responsavel, observacoes: form.observacoes, itens: form.itens ? String(form.itens).split('\n').map((l: string) => l.trim()).filter(Boolean).map((item: string) => ({ item, conforme: false })) : undefined, empreendimentoId: empBase };
      }
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.ok) { setForm({}); await carregar(); }
      else { const e = await res.json().catch(() => ({})); alert(e.error || 'Erro ao salvar.'); }
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async (tipo: string, id: string) => {
    if (!confirm('Excluir este registro?')) return;
    const url = tipo === 'dds' ? '/api/sst/dds' : tipo === 'acidentes' ? '/api/sst/acidentes' : '/api/sst/checklists';
    await fetch(`${url}?id=${id}`, { method: 'DELETE' });
    await carregar();
  };

  const TABS = [
    { id: 'dds' as const, label: 'DDS', icon: MessageSquare, count: dds.length },
    { id: 'acidentes' as const, label: 'Acidentes / CAT', icon: Bandage, count: acidentes.length },
    { id: 'checklists' as const, label: 'Checklists NR', icon: ListChecks, count: checklists.length },
  ];

  const local = (r: any) => r.casa ? `Qd ${r.casa.quadra} · Casa ${r.casa.numero}` : r.empreendimento?.nome || 'Geral';

  return (
    <div className="space-y-6 p-6 min-h-screen bg-[#060814] text-slate-100">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-900 pb-5">
        <div>
          <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block">Segurança do Trabalho</span>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2 mt-0.5">
            <ShieldAlert className="text-indigo-400" size={24} /> Registros de SST
          </h1>
          <p className="text-xs text-slate-400 mt-1">Diálogos diários de segurança, acidentes/CAT e checklists de normas regulamentadoras.</p>
        </div>
        <select value={empId} onChange={(e) => setEmpId(e.target.value)} className="bg-[#0b0f19] border border-slate-800 text-xs text-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500/50">
          <option value="ALL">Todos os empreendimentos</option>
          {empreendimentos.map((e) => (<option key={e.id} value={e.id}>{e.nome}</option>))}
        </select>
      </div>

      <div className="flex gap-2 flex-wrap">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer border ${tab === t.id ? 'bg-indigo-600/15 text-indigo-300 border-indigo-500/30' : 'text-slate-400 border-slate-800 hover:text-slate-200'}`}>
            <t.icon size={14} /> {t.label} <span className="text-slate-500">({t.count})</span>
          </button>
        ))}
      </div>

      {/* Formulário de novo registro */}
      <div className="glassmorphism p-5 rounded-2xl border border-slate-800/80">
        <h3 className="text-xs font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-1.5"><Plus size={14} className="text-indigo-400" /> Novo registro</h3>
        {tab === 'dds' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="block"><span className={labelCls}>Tema *</span><input className={`${inputCls} mt-1`} value={form.tema || ''} onChange={(e) => setForm({ ...form, tema: e.target.value })} placeholder="Ex.: Uso de EPI em altura" /></label>
            <label className="block"><span className={labelCls}>Responsável *</span><input className={`${inputCls} mt-1`} value={form.responsavel || ''} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} /></label>
            <label className="block md:col-span-2"><span className={labelCls}>Participantes (separados por vírgula)</span><input className={`${inputCls} mt-1`} value={form.participantes || ''} onChange={(e) => setForm({ ...form, participantes: e.target.value })} placeholder="João, Maria, Pedro" /></label>
            <label className="block md:col-span-2"><span className={labelCls}>Observações</span><textarea className={`${inputCls} mt-1`} rows={2} value={form.observacoes || ''} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></label>
          </div>
        )}
        {tab === 'acidentes' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="block"><span className={labelCls}>Trabalhador *</span>
              <select className={`${inputCls} mt-1`} value={form.trabalhadorId || ''} onChange={(e) => setForm({ ...form, trabalhadorId: e.target.value })}>
                <option value="">Selecione...</option>
                {trabalhadores.map((t) => (<option key={t.id} value={t.id}>{t.nome}{t.funcao ? ` — ${t.funcao}` : ''}</option>))}
              </select>
            </label>
            <label className="block"><span className={labelCls}>Tipo</span>
              <select className={`${inputCls} mt-1`} value={form.tipo || 'TIPICO'} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                {Object.entries(TIPO_ACIDENTE).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
              </select>
            </label>
            <label className="block"><span className={labelCls}>Gravidade</span>
              <select className={`${inputCls} mt-1`} value={form.gravidade || 'LEVE'} onChange={(e) => setForm({ ...form, gravidade: e.target.value })}>
                {Object.entries(GRAVIDADE).map(([k, v]) => (<option key={k} value={k}>{v.label}</option>))}
              </select>
            </label>
            <label className="block"><span className={labelCls}>Parte do corpo</span><input className={`${inputCls} mt-1`} value={form.parteCorpo || ''} onChange={(e) => setForm({ ...form, parteCorpo: e.target.value })} /></label>
            <label className="block"><span className={labelCls}>Dias de afastamento</span><input type="number" min="0" className={`${inputCls} mt-1`} value={form.diasAfastamento || ''} onChange={(e) => setForm({ ...form, diasAfastamento: e.target.value })} /></label>
            <label className="block"><span className={labelCls}>Nº da CAT</span><input className={`${inputCls} mt-1`} value={form.numeroCat || ''} onChange={(e) => setForm({ ...form, numeroCat: e.target.value, catEmitida: e.target.value ? true : form.catEmitida })} /></label>
            <label className="block md:col-span-2"><span className={labelCls}>Descrição *</span><textarea className={`${inputCls} mt-1`} rows={2} value={form.descricao || ''} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></label>
            <label className="flex items-center gap-2"><input type="checkbox" className="accent-indigo-500" checked={!!form.catEmitida} onChange={(e) => setForm({ ...form, catEmitida: e.target.checked })} /><span className="text-xs text-slate-300">CAT emitida</span></label>
          </div>
        )}
        {tab === 'checklists' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="block"><span className={labelCls}>Norma *</span><input className={`${inputCls} mt-1`} value={form.norma || ''} onChange={(e) => setForm({ ...form, norma: e.target.value })} placeholder="NR-18, NR-35, NR-06..." /></label>
            <label className="block"><span className={labelCls}>Responsável *</span><input className={`${inputCls} mt-1`} value={form.responsavel || ''} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} /></label>
            <label className="block md:col-span-2"><span className={labelCls}>Itens verificados (um por linha)</span><textarea className={`${inputCls} mt-1`} rows={4} value={form.itens || ''} onChange={(e) => setForm({ ...form, itens: e.target.value })} placeholder={'Guarda-corpo instalado\nCinto de segurança em uso\nAndaime com travamento'} /></label>
            <label className="block md:col-span-2"><span className={labelCls}>Observações</span><textarea className={`${inputCls} mt-1`} rows={2} value={form.observacoes || ''} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></label>
          </div>
        )}
        <button onClick={salvar} disabled={salvando} className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 text-xs font-bold uppercase tracking-wider hover:bg-indigo-600/25 transition disabled:opacity-50 cursor-pointer">
          {salvando ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Registrar
        </button>
      </div>

      {/* Listas */}
      {loading ? (
        <div className="py-16 text-center"><Loader2 className="animate-spin text-indigo-500 mx-auto" size={24} /></div>
      ) : (
        <div className="bg-slate-950/20 border border-slate-900 rounded-2xl overflow-hidden">
          {tab === 'dds' && (
            dds.length === 0 ? <Vazio /> : (
              <ul className="divide-y divide-slate-900/60">
                {dds.map((r) => (
                  <li key={r.id} className="px-5 py-3.5 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-200">{r.tema}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{dt(r.data)} · {r.responsavel} · {local(r)}{Array.isArray(r.participantes) && r.participantes.length ? ` · ${r.participantes.length} participante(s)` : ''}</p>
                      {r.observacoes && <p className="text-xs text-slate-400 mt-1">{r.observacoes}</p>}
                    </div>
                    <BtnExcluir onClick={() => excluir('dds', r.id)} />
                  </li>
                ))}
              </ul>
            )
          )}
          {tab === 'acidentes' && (
            acidentes.length === 0 ? <Vazio /> : (
              <ul className="divide-y divide-slate-900/60">
                {acidentes.map((r) => {
                  const g = GRAVIDADE[r.gravidade] || GRAVIDADE.LEVE;
                  return (
                    <li key={r.id} className="px-5 py-3.5 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                          {r.trabalhador?.nome || '—'}
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${g.cls}`}>{g.label}</span>
                          {r.catEmitida && <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase border bg-indigo-500/10 text-indigo-300 border-indigo-500/25">CAT{r.numeroCat ? ` ${r.numeroCat}` : ''}</span>}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{dt(r.data)} · {TIPO_ACIDENTE[r.tipo]} · {local(r)}{r.parteCorpo ? ` · ${r.parteCorpo}` : ''}{r.diasAfastamento > 0 ? ` · ${r.diasAfastamento}d afastamento` : ''}</p>
                        <p className="text-xs text-slate-400 mt-1">{r.descricao}</p>
                      </div>
                      <BtnExcluir onClick={() => excluir('acidentes', r.id)} />
                    </li>
                  );
                })}
              </ul>
            )
          )}
          {tab === 'checklists' && (
            checklists.length === 0 ? <Vazio /> : (
              <ul className="divide-y divide-slate-900/60">
                {checklists.map((r) => {
                  const itens = Array.isArray(r.itens) ? r.itens : [];
                  const conformes = itens.filter((i: any) => i.conforme).length;
                  return (
                    <li key={r.id} className="px-5 py-3.5 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-200">{r.norma} <span className="text-[11px] text-slate-500 font-normal">· {itens.length} itens{itens.length ? ` (${conformes} conformes)` : ''}</span></p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{dt(r.data)} · {r.responsavel} · {local(r)}</p>
                        {itens.length > 0 && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{itens.map((i: any) => i.item).join(' · ')}</p>}
                        {r.observacoes && <p className="text-xs text-slate-400 mt-1">{r.observacoes}</p>}
                      </div>
                      <BtnExcluir onClick={() => excluir('checklists', r.id)} />
                    </li>
                  );
                })}
              </ul>
            )
          )}
        </div>
      )}
    </div>
  );
}

function Vazio() {
  return <div className="py-14 text-center text-slate-500 text-xs italic">Nenhum registro ainda.</div>;
}
function BtnExcluir({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800/60 transition cursor-pointer shrink-0" title="Excluir">
      <Trash2 size={14} />
    </button>
  );
}
