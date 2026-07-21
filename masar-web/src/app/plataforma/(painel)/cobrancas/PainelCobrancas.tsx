'use client';

import { useState, useCallback, useEffect } from 'react';
import { Loader2, RefreshCw, Check, Ban, Undo2, AlertTriangle, Receipt } from 'lucide-react';

interface Linha {
  id: string;
  empresaNome: string;
  competencia: string;
  valor: number;
  dataVencimento: string;
  status: 'PENDENTE' | 'PAGA' | 'CANCELADA';
  dataPagamento: string | null;
  observacao: string | null;
  diasAtraso: number;
}

const brl = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const dt = (v: string | null) => (v ? new Date(v).toLocaleDateString('pt-BR') : '—');

/** Competência do mês corrente, no formato do <input type="month">. */
function mesAtual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function PainelCobrancas({ competenciaInicial }: { competenciaInicial: string }) {
  const [competencia, setCompetencia] = useState(competenciaInicial || mesAtual());
  const [modo, setModo] = useState<'mes' | 'aberto'>('mes');
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [gerando, setGerando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const qs = modo === 'aberto' ? 'pendentes=1' : `competencia=${competencia}`;
      const r = await fetch(`/api/plataforma/cobrancas?${qs}`);
      const d = await r.json();
      setLinhas(r.ok ? (d.linhas ?? []) : []);
      if (!r.ok) setAviso(d.error ?? 'Falha ao carregar.');
    } finally {
      setCarregando(false);
    }
  }, [competencia, modo]);

  useEffect(() => { carregar(); }, [carregar]);

  const gerar = async () => {
    setGerando(true);
    setAviso(null);
    try {
      const r = await fetch('/api/plataforma/cobrancas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competencia }),
      });
      const d = await r.json();
      if (!r.ok) {
        setAviso(d.error ?? 'Falha ao gerar.');
      } else {
        // O relato distingue o que foi criado do que já existia: rodar de novo
        // é seguro, e a tela precisa dizer isso em vez de parecer que falhou.
        const partes = [`${d.geradas} gerada(s)`];
        if (d.jaExistiam > 0) partes.push(`${d.jaExistiam} já existia(m)`);
        if (d.semContrato > 0) partes.push(`${d.semContrato} sem mensalidade cadastrada`);
        setAviso(partes.join(' · '));
        setModo('mes');
        await carregar();
      }
    } finally {
      setGerando(false);
    }
  };

  const mudarStatus = async (id: string, status: Linha['status']) => {
    const r = await fetch(`/api/plataforma/cobrancas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (r.ok) carregar();
    else setAviso('Não foi possível atualizar.');
  };

  const total = linhas.reduce((s, l) => s + l.valor, 0);
  const aReceber = linhas.filter((l) => l.status === 'PENDENTE').reduce((s, l) => s + l.valor, 0);
  const vencidas = linhas.filter((l) => l.diasAtraso > 0);

  return (
    <div className="space-y-6">
      {/* Controles */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-stone-800 bg-stone-900/60 p-5">
        <div>
          <label className="block text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1">
            Competência
          </label>
          <input
            type="month"
            value={competencia}
            onChange={(e) => { setCompetencia(e.target.value); setModo('mes'); }}
            className="bg-stone-950 border border-stone-800 text-sm text-stone-200 rounded-lg px-3 py-2"
          />
        </div>

        <button
          onClick={gerar}
          disabled={gerando}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600/15 text-amber-300 border border-amber-600/30 text-xs font-bold uppercase tracking-wider hover:bg-amber-600/25 transition disabled:opacity-50"
        >
          {gerando ? <Loader2 className="animate-spin" size={14} /> : <Receipt size={14} />}
          Gerar cobranças do mês
        </button>

        <button
          onClick={() => setModo(modo === 'aberto' ? 'mes' : 'aberto')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-xs font-bold uppercase tracking-wider transition ${
            modo === 'aberto'
              ? 'bg-stone-100 text-stone-900 border-stone-100'
              : 'bg-stone-950 text-stone-300 border-stone-800 hover:border-stone-700'
          }`}
        >
          Tudo em aberto
        </button>

        <button
          onClick={carregar}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-stone-950 text-stone-400 border border-stone-800 text-xs hover:text-stone-200 transition"
        >
          <RefreshCw size={13} /> Atualizar
        </button>
      </div>

      {aviso && (
        <div className="rounded-xl border border-stone-700 bg-stone-900/80 px-4 py-3 text-xs text-stone-300">
          {aviso}
        </div>
      )}

      {/* Resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { rot: modo === 'aberto' ? 'Em aberto (todas)' : 'Faturado no mês', val: brl(total) },
          { rot: 'A receber', val: brl(aReceber) },
          { rot: 'Vencidas', val: String(vencidas.length), alerta: vencidas.length > 0 },
        ].map((c) => (
          <div
            key={c.rot}
            className={`rounded-xl border p-4 ${
              c.alerta ? 'border-red-900/50 bg-red-950/20' : 'border-stone-800 bg-stone-900/60'
            }`}
          >
            <p className="text-[11px] text-stone-500 uppercase tracking-wider font-bold">{c.rot}</p>
            <p className={`text-xl font-bold mt-1 ${c.alerta ? 'text-red-400' : 'text-stone-100'}`}>
              {c.val}
            </p>
          </div>
        ))}
      </div>

      {/* Tabela */}
      <div className="rounded-xl border border-stone-800 bg-stone-900/60 overflow-x-auto">
        {carregando ? (
          <div className="py-16 text-center">
            <Loader2 className="animate-spin text-amber-500 mx-auto" size={24} />
          </div>
        ) : linhas.length === 0 ? (
          <div className="py-16 text-center px-6">
            <Receipt className="text-stone-700 mx-auto mb-3" size={26} />
            <p className="text-sm text-stone-400 font-semibold mb-1">
              {modo === 'aberto' ? 'Nada em aberto.' : 'Nenhuma cobrança nesta competência.'}
            </p>
            <p className="text-xs text-stone-600 max-w-md mx-auto">
              Cobranças nascem de <strong className="text-stone-400">Gerar cobranças do mês</strong>,
              e só para clientes com mensalidade preenchida na ficha. Cliente sem valor é
              cortesia ou piloto — a ausência é a forma de dizer &ldquo;este não se cobra&rdquo;.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-stone-500">
              <tr>
                <th className="text-left font-bold px-4 py-3">Cliente</th>
                <th className="text-left font-bold px-4 py-3">Competência</th>
                <th className="text-right font-bold px-4 py-3">Valor</th>
                <th className="text-left font-bold px-4 py-3">Vencimento</th>
                <th className="text-left font-bold px-4 py-3">Situação</th>
                <th className="text-right font-bold px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.id} className="border-t border-stone-800/70">
                  <td className="px-4 py-3 font-semibold text-stone-100">{l.empresaNome}</td>
                  <td className="px-4 py-3 text-stone-400 font-mono text-xs">{l.competencia}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-stone-100">{brl(l.valor)}</td>
                  <td className="px-4 py-3 text-stone-300">
                    {dt(l.dataVencimento)}
                    {l.diasAtraso > 0 && (
                      <span className="text-[11px] block text-red-400 flex items-center gap-1">
                        <AlertTriangle size={11} /> {l.diasAtraso} dia(s) de atraso
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {l.status === 'PAGA' ? (
                      <span className="text-emerald-400 text-xs font-bold">
                        paga em {dt(l.dataPagamento)}
                      </span>
                    ) : l.status === 'CANCELADA' ? (
                      <span className="text-stone-500 text-xs font-bold">cancelada</span>
                    ) : (
                      <span className={l.diasAtraso > 0 ? 'text-red-400 text-xs font-bold' : 'text-amber-400 text-xs font-bold'}>
                        pendente
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {l.status === 'PENDENTE' ? (
                      <>
                        <button
                          onClick={() => mudarStatus(l.id, 'PAGA')}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600/15 text-emerald-300 border border-emerald-600/30 text-[11px] font-bold uppercase hover:bg-emerald-600/25 transition mr-2"
                        >
                          <Check size={12} /> Paga
                        </button>
                        <button
                          onClick={() => mudarStatus(l.id, 'CANCELADA')}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-800 text-stone-400 border border-stone-700 text-[11px] font-bold uppercase hover:text-stone-200 transition"
                        >
                          <Ban size={12} /> Cancelar
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => mudarStatus(l.id, 'PENDENTE')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-800 text-stone-400 border border-stone-700 text-[11px] font-bold uppercase hover:text-stone-200 transition"
                      >
                        <Undo2 size={12} /> Reabrir
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
