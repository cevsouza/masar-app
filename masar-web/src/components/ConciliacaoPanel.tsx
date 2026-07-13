'use client';

import { useState, useEffect } from 'react';
import {
  Loader2,
  UploadCloud,
  Zap,
  Link2,
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

interface Sugestao {
  id: string;
  descricao: string;
  valor: number;
  dataVencimento: string;
}
interface LinhaPendente {
  id: string;
  data: string;
  descricao: string;
  valor: number;
  tipo: string;
  origem: string | null;
  naturezaEsperada: string;
  sugestao: Sugestao | null;
}

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

// Converte "1.500,00" / "1500.50" / "1500" em número.
function parseValor(raw: string): number {
  let s = raw.trim().replace(/\s/g, '');
  if (s.includes('.') && s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (s.includes(',')) s = s.replace(',', '.');
  return parseFloat(s);
}

export default function ConciliacaoPanel() {
  const [pendentes, setPendentes] = useState<LinhaPendente[]>([]);
  const [comSugestao, setComSugestao] = useState(0);
  const [loading, setLoading] = useState(true);
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);
  const [running, setRunning] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  const fetchPendentes = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/financeiro/conciliacao').then((r) => r.json());
      setPendentes(res.pendentes || []);
      setComSugestao(res.comSugestao || 0);
    } catch {
      setMsg({ tipo: 'erro', texto: 'Erro ao carregar pendências.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendentes();
  }, []);

  const handleImport = async () => {
    // Cada linha: data;descricao;valor;tipo  (separador ; , ou tab)
    const linhas = importText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const p = l.split(/[;\t]|,(?=\s*[-\d])/).map((x) => x.trim());
        return { data: p[0], descricao: p[1], valor: parseValor(p[2] || ''), tipo: (p[3] || '').toUpperCase() };
      });

    if (linhas.length === 0) {
      setMsg({ tipo: 'erro', texto: 'Cole ao menos uma linha do extrato.' });
      return;
    }

    setImporting(true);
    setMsg(null);
    try {
      const res = await fetch('/api/financeiro/conciliacao/importar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linhas }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao importar.');
      setImportText('');
      setMsg({
        tipo: 'ok',
        texto: `Importadas ${data.criadas} linha(s)${data.ignoradas ? `, ${data.ignoradas} ignorada(s)` : ''}${data.erros?.length ? `. ${data.erros.length} com erro.` : '.'}`,
      });
      await fetchPendentes();
    } catch (e: any) {
      setMsg({ tipo: 'erro', texto: e.message });
    } finally {
      setImporting(false);
    }
  };

  const handleAuto = async () => {
    setRunning(true);
    setMsg(null);
    try {
      const res = await fetch('/api/financeiro/conciliacao', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro no motor.');
      setMsg({ tipo: 'ok', texto: `Motor automático: ${data.conciliacoesEfetuadas} de ${data.transacoesProcessadas} conciliada(s).` });
      await fetchPendentes();
    } catch (e: any) {
      setMsg({ tipo: 'erro', texto: e.message });
    } finally {
      setRunning(false);
    }
  };

  const handleConciliar = async (bancariaId: string, tituloId: string) => {
    setBusyId(bancariaId);
    setMsg(null);
    try {
      const res = await fetch('/api/financeiro/conciliacao/conciliar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bancariaId, tituloId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao conciliar.');
      await fetchPendentes();
    } catch (e: any) {
      setMsg({ tipo: 'erro', texto: e.message });
    } finally {
      setBusyId(null);
    }
  };

  const inputCls = 'w-full bg-[#0b0f19] border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50';

  return (
    <div className="space-y-5 animate-fadeIn">
      {msg && (
        <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
          msg.tipo === 'ok'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          {msg.tipo === 'ok' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
          {msg.texto}
        </div>
      )}

      {/* Import de extrato */}
      <div className="glassmorphism p-5 rounded-2xl border border-slate-850">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-1">
          <UploadCloud size={14} className="text-indigo-400" /> Importar extrato bancário
        </h3>
        <p className="text-[11px] text-slate-400 mb-3">
          Cole as linhas do extrato, uma por linha, no formato{' '}
          <code className="text-indigo-300">data;descrição;valor;tipo</code>{' '}
          (tipo = CREDITO ou DEBITO). Ex: <code className="text-slate-300">2026-07-10;PIX Cliente João;1500,00;CREDITO</code>
        </p>
        <textarea
          rows={4}
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder={'2026-07-10;PIX recebido Cliente João;1500,00;CREDITO\n2026-07-11;Pagto fornecedor Depósito Silva;2500,00;DEBITO'}
          className={`${inputCls} font-mono resize-y`}
        />
        <div className="flex justify-end mt-3">
          <button
            onClick={handleImport}
            disabled={importing}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
          >
            {importing ? <Loader2 size={12} className="animate-spin" /> : <UploadCloud size={13} />}
            Importar linhas
          </button>
        </div>
      </div>

      {/* Barra de ações */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-[#0f1422]/60 p-4 border border-slate-850 rounded-2xl">
        <div className="text-xs text-slate-300">
          <span className="font-bold text-white">{pendentes.length}</span> linha(s) não conciliada(s)
          {pendentes.length > 0 && <span className="text-slate-500"> · {comSugestao} com sugestão automática</span>}
        </div>
        <button
          onClick={handleAuto}
          disabled={running || pendentes.length === 0}
          className="px-4 py-2 bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-200 font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
        >
          {running ? <Loader2 size={12} className="animate-spin" /> : <Zap size={13} />}
          Rodar conciliação automática
        </button>
      </div>

      {/* Lista de pendências */}
      <div className="glassmorphism rounded-2xl border border-slate-850 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-900">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Link2 size={14} className="text-indigo-400" /> Extrato a conciliar
          </h3>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-500 text-xs italic">Carregando extrato...</div>
        ) : pendentes.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs italic">
            Nenhuma linha pendente. Importe um extrato para começar a conciliar.
          </div>
        ) : (
          <div className="divide-y divide-slate-900/60">
            {pendentes.map((l) => {
              const isCredito = l.tipo === 'CREDITO';
              return (
                <div key={l.id} className="flex flex-col md:flex-row md:items-center gap-3 px-5 py-3.5 hover:bg-slate-900/20 transition">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${isCredito ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                    {isCredito ? <ArrowDownCircle size={16} /> : <ArrowUpCircle size={16} />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold text-slate-100 truncate block">{l.descricao}</span>
                    <p className="text-[10px] text-slate-500">
                      {new Date(l.data).toLocaleDateString('pt-BR')} · {isCredito ? 'Crédito' : 'Débito'} · casa com {l.naturezaEsperada === 'RECEITA' ? 'recebível' : 'conta a pagar'}
                    </p>
                  </div>

                  <span className={`text-xs font-bold font-mono shrink-0 ${isCredito ? 'text-emerald-400' : 'text-red-400'}`}>
                    {isCredito ? '+' : '-'}{fmt(l.valor)}
                  </span>

                  <div className="shrink-0 md:w-[300px]">
                    {l.sugestao ? (
                      <div className="flex items-center gap-2 justify-end">
                        <div className="text-right min-w-0">
                          <span className="text-[10px] text-slate-300 truncate block max-w-[190px]">{l.sugestao.descricao}</span>
                          <span className="text-[9px] text-slate-500 font-mono">{fmt(l.sugestao.valor)}</span>
                        </div>
                        <button
                          onClick={() => handleConciliar(l.id, l.sugestao!.id)}
                          disabled={busyId === l.id}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50 shrink-0"
                          title="Conciliar com o título sugerido"
                        >
                          {busyId === l.id ? <Loader2 size={11} className="animate-spin" /> : <Link2 size={12} />}
                          Conciliar
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-500 italic block text-right">Sem título correspondente em aberto</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p className="text-[11px] text-slate-500 px-1">
        Conciliar marca o título como pago/recebido e credita/debita o saldo do caixa pela própria linha do extrato — sem duplicar lançamento. O motor automático casa por valor idêntico e vencimento próximo (±7 dias).
      </p>
    </div>
  );
}
