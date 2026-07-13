'use client';

import { useState, useEffect } from 'react';
import { FolderLock, Loader2, AlertTriangle, Download, Search, FileText } from 'lucide-react';

const fmtData = (d: string | null) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—');

const TIPO_LABEL: Record<string, string> = {
  PROJETO_ARQUITETONICO: 'Projeto Arquitetônico',
  PROJETO_ESTRUTURAL: 'Projeto Estrutural',
  PROJETO_HIDRAULICO: 'Projeto Hidráulico',
  PROJETO_ELETRICO: 'Projeto Elétrico',
  MATRICULA_TERRENO: 'Matrícula do Terreno',
  ALVARA_LOTEAMENTO: 'Alvará de Loteamento',
  OUTRO: 'Outro',
};

const STATUS_META: Record<string, { label: string; cls: string }> = {
  VENCIDO: { label: 'Vencido', cls: 'bg-red-500/10 text-red-400 border-red-500/25' },
  A_VENCER: { label: 'A vencer', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/25' },
  OK: { label: 'Em dia', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' },
  SEM_VALIDADE: { label: 'Sem validade', cls: 'bg-slate-700/40 text-slate-400 border-slate-700/40' },
};

export default function CofreDocumentosPage() {
  const [itens, setItens] = useState<any[]>([]);
  const [resumo, setResumo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('TODOS');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/ged/vencimentos').then((r) => r.json());
        setItens(res.itens || []);
        setResumo(res.resumo || null);
      } catch {
        // silencioso
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtrados = itens.filter((d) => {
    if (filtroStatus !== 'TODOS' && d.status !== filtroStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      const local = d.casa ? `qd ${d.casa.quadra} casa ${d.casa.numero}` : d.empreendimento?.nome || d.cliente?.nome || '';
      return d.nome.toLowerCase().includes(q) || local.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6 p-6 min-h-screen bg-[#060814] text-slate-100">
      <div className="border-b border-slate-900 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <FolderLock className="text-blue-400" size={24} /> Cofre de Documentos
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Todos os documentos (GED) num só lugar, com status de validade. Alvarás, matrículas, projetos e licenças a vencer aparecem em destaque e alertam no relatório diário.
        </p>
      </div>

      {/* Banner de vencimentos */}
      {resumo && (resumo.vencidos + resumo.aVencer > 0) && (
        <div className="p-3 bg-red-950/40 border border-red-500/30 text-red-300 rounded-xl text-xs flex items-start gap-2.5">
          <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-red-400">Documentos a regularizar</span>
            <p className="text-[11px] text-red-300/80 mt-0.5">
              {resumo.vencidos} vencido(s) e {resumo.aVencer} a vencer (30 dias). Renove antes de perder prazo.
            </p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-950/40 p-4 border border-slate-900 rounded-2xl">
        <div className="md:col-span-8 relative">
          <Search className="absolute left-3.5 top-3 text-slate-500" size={16} />
          <input
            type="text"
            placeholder="Buscar por nome do documento ou local..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#0a0d18] border border-slate-900 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500/80 transition"
          />
        </div>
        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          className="md:col-span-4 w-full bg-[#0a0d18] border border-slate-900 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none"
        >
          <option value="TODOS">Todos os status{resumo ? ` (${resumo.total})` : ''}</option>
          <option value="VENCIDO">Vencidos{resumo ? ` (${resumo.vencidos})` : ''}</option>
          <option value="A_VENCER">A vencer{resumo ? ` (${resumo.aVencer})` : ''}</option>
          <option value="OK">Em dia{resumo ? ` (${resumo.emDia})` : ''}</option>
          <option value="SEM_VALIDADE">Sem validade{resumo ? ` (${resumo.semValidade})` : ''}</option>
        </select>
      </div>

      {/* Lista */}
      <div className="bg-slate-950/20 border border-slate-900 rounded-2xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="py-16 text-center"><Loader2 className="animate-spin text-blue-500 mx-auto" size={24} /></div>
        ) : filtrados.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs italic">Nenhum documento encontrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-900 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Documento</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Local</th>
                  <th className="py-3 px-4">Vencimento</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Arquivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/60 text-slate-300">
                {filtrados.map((d) => {
                  const st = STATUS_META[d.status] || STATUS_META.SEM_VALIDADE;
                  const local = d.casa
                    ? `Qd ${d.casa.quadra}, Casa ${d.casa.numero}`
                    : d.empreendimento?.nome || d.cliente?.nome || 'Geral';
                  return (
                    <tr key={d.id} className="hover:bg-slate-900/20 transition-all">
                      <td className="py-3.5 px-4 font-semibold text-slate-200 flex items-center gap-2">
                        <FileText size={13} className="text-slate-500 shrink-0" /> {d.nome}
                      </td>
                      <td className="py-3.5 px-4">{d.tipo ? TIPO_LABEL[d.tipo] || d.tipo : '—'}</td>
                      <td className="py-3.5 px-4">{local}</td>
                      <td className="py-3.5 px-4 font-mono">{fmtData(d.dataVencimento)}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded font-bold text-[9px] uppercase border ${st.cls}`}>{st.label}</span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <a
                          href={`/api/ged/documentos/${d.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 hover:bg-slate-900 text-blue-400 hover:text-blue-300 rounded-lg transition inline-block"
                          title="Abrir/baixar arquivo"
                        >
                          <Download size={13} />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
