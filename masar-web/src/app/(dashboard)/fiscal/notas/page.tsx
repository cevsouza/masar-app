'use client';

import { useState, useEffect } from 'react';
import {
  FileText,
  Loader2,
  UploadCloud,
  CheckCircle,
  AlertCircle,
  Link2,
  PackageCheck,
} from 'lucide-react';

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmtData = (d: string | null) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—');

export default function NotasFiscaisPage() {
  const [empreendimentos, setEmpreendimentos] = useState<any[]>([]);
  const [notas, setNotas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [empreendimentoId, setEmpreendimentoId] = useState('');
  const [xml, setXml] = useState('');
  const [gerarEstoque, setGerarEstoque] = useState(true);
  const [importing, setImporting] = useState(false);
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  const carregar = async () => {
    setLoading(true);
    try {
      const [emps, ns] = await Promise.all([
        fetch('/api/empreendimentos').then((r) => r.json()),
        fetch('/api/fiscal/nfe').then((r) => r.json()),
      ]);
      setEmpreendimentos(emps || []);
      if (emps?.length && !empreendimentoId) setEmpreendimentoId(emps[0].id);
      setNotas(Array.isArray(ns) ? ns : []);
    } catch {
      setMsg({ tipo: 'erro', texto: 'Erro ao carregar dados.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onFile = async (file: File | null) => {
    if (!file) return;
    const texto = await file.text();
    setXml(texto);
  };

  const importar = async () => {
    if (!xml.trim()) { setMsg({ tipo: 'erro', texto: 'Cole ou selecione o XML da NF-e.' }); return; }
    if (!empreendimentoId) { setMsg({ tipo: 'erro', texto: 'Selecione o empreendimento.' }); return; }
    setImporting(true);
    setMsg(null);
    try {
      const res = await fetch('/api/fiscal/nfe/importar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xml, empreendimentoId, gerarEstoque }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao importar NF-e.');
      setXml('');
      setMsg({
        tipo: 'ok',
        texto: `NF-e importada: conta a pagar de ${fmt(data.valorTotal)} gerada${data.fornecedorVinculado ? ', fornecedor vinculado' : ' (fornecedor não cadastrado)'}. ${data.itensGeraramEstoque}/${data.itens} itens deram entrada no estoque.`,
      });
      await carregar();
    } catch (e: any) {
      setMsg({ tipo: 'erro', texto: e.message });
    } finally {
      setImporting(false);
    }
  };

  const inputCls = 'w-full bg-[#0a0d18] border border-slate-900 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500/70';

  return (
    <div className="space-y-6 p-6 min-h-screen bg-[#060814] text-slate-100">
      <div className="border-b border-slate-900 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <FileText className="text-blue-400" size={24} /> Notas Fiscais de Entrada
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Importe o XML da NF-e de compra: o sistema gera a conta a pagar, vincula o fornecedor pelo CNPJ e dá entrada no estoque dos itens que casam com o catálogo.
        </p>
      </div>

      {msg && (
        <div className={`p-3 rounded-xl text-xs font-semibold flex items-start gap-2 border ${
          msg.tipo === 'ok' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          {msg.tipo === 'ok' ? <CheckCircle size={14} className="mt-0.5 shrink-0" /> : <AlertCircle size={14} className="mt-0.5 shrink-0" />}
          {msg.texto}
        </div>
      )}

      {/* Import */}
      <div className="bg-slate-950/40 border border-slate-900 rounded-2xl p-5 space-y-4">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <UploadCloud size={14} className="text-blue-400" /> Importar NF-e (XML)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1 font-semibold">Empreendimento (p/ conta a pagar) *</label>
            <select value={empreendimentoId} onChange={(e) => setEmpreendimentoId(e.target.value)} className={inputCls}>
              {empreendimentos.map((e) => (
                <option key={e.id} value={e.id}>{e.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1 font-semibold">Arquivo XML</label>
            <input type="file" accept=".xml,text/xml,application/xml" onChange={(e) => onFile(e.target.files?.[0] || null)}
              className="w-full text-[11px] text-slate-400 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-slate-800 file:text-slate-200 file:text-[11px] file:cursor-pointer" />
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none mt-5">
            <input type="checkbox" checked={gerarEstoque} onChange={(e) => setGerarEstoque(e.target.checked)} className="accent-blue-500" />
            Dar entrada no estoque
          </label>
        </div>

        <textarea
          rows={5}
          value={xml}
          onChange={(e) => setXml(e.target.value)}
          placeholder="…ou cole aqui o conteúdo do XML da NF-e"
          className={`${inputCls} font-mono resize-y`}
        />

        <div className="flex justify-end">
          <button onClick={importar} disabled={importing}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50">
            {importing ? <Loader2 size={12} className="animate-spin" /> : <UploadCloud size={13} />}
            Importar NF-e
          </button>
        </div>
      </div>

      {/* Lista */}
      <div className="bg-slate-950/20 border border-slate-900 rounded-2xl overflow-hidden shadow-2xl">
        <div className="px-5 py-4 border-b border-slate-900 flex justify-between items-center">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">NF-e importadas</h3>
          <span className="text-[10px] text-slate-500 font-mono">{notas.length}</span>
        </div>
        {loading ? (
          <div className="py-16 text-center"><Loader2 className="animate-spin text-blue-500 mx-auto" size={24} /></div>
        ) : notas.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs italic">Nenhuma NF-e importada ainda.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-900 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Nº / Série</th>
                  <th className="py-3 px-4">Emitente</th>
                  <th className="py-3 px-4">Fornecedor</th>
                  <th className="py-3 px-4">Empreendimento</th>
                  <th className="py-3 px-4">Emissão</th>
                  <th className="py-3 px-4 text-right">Valor</th>
                  <th className="py-3 px-4 text-center">Estoque</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/60 text-slate-300">
                {notas.map((n) => (
                  <tr key={n.id} className="hover:bg-slate-900/20 transition-all">
                    <td className="py-3.5 px-4 font-mono">{n.numero || '—'}{n.serie ? `/${n.serie}` : ''}</td>
                    <td className="py-3.5 px-4">
                      <span className="text-slate-200">{n.emitenteNome || '—'}</span>
                      <span className="block text-[10px] text-slate-500 font-mono">{n.emitenteCnpj || ''}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      {n.fornecedor?.nome ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400"><Link2 size={11} /> {n.fornecedor.nome}</span>
                      ) : (
                        <span className="text-slate-500 italic">não cadastrado</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">{n.empreendimento?.nome || '—'}</td>
                    <td className="py-3.5 px-4 font-mono">{fmtData(n.dataEmissao)}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-red-400">{fmt(n.valorTotal)}</td>
                    <td className="py-3.5 px-4 text-center">
                      {n.itensGeraramEstoque > 0 ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-bold"><PackageCheck size={12} /> {n.itensGeraramEstoque}</span>
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
    </div>
  );
}
