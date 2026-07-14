'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles, Loader2, CheckCircle2, ArrowRight,
  ShieldAlert, Banknote, TrendingDown, Clock, Package, FileWarning,
} from 'lucide-react';

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v || 0);

const CAT: Record<string, { label: string; Icon: any }> = {
  SEGURANCA: { label: 'Segurança', Icon: ShieldAlert },
  CAIXA: { label: 'Caixa', Icon: Banknote },
  CUSTO: { label: 'Custo', Icon: TrendingDown },
  PRAZO: { label: 'Prazo', Icon: Clock },
  ESTOQUE: { label: 'Estoque', Icon: Package },
  COMPLIANCE: { label: 'Compliance', Icon: FileWarning },
};

const SEV: Record<string, { label: string; text: string; bar: string; chip: string }> = {
  CRITICO: { label: 'Urgente', text: 'text-red-400', bar: 'bg-red-500', chip: 'bg-red-500/10 text-red-300 border-red-500/30' },
  ATENCAO: { label: 'Atenção', text: 'text-amber-400', bar: 'bg-amber-500', chip: 'bg-amber-500/10 text-amber-300 border-amber-500/30' },
  INFO: { label: 'Prevenção', text: 'text-sky-400', bar: 'bg-sky-500', chip: 'bg-sky-500/10 text-sky-300 border-sky-500/30' },
};

const STATUS: Record<string, { label: string; cls: string; ring: string }> = {
  CRITICO: { label: 'Ação urgente necessária', cls: 'text-red-400', ring: 'border-red-500/40 bg-red-500/10' },
  ATENCAO: { label: 'Pontos de atenção', cls: 'text-amber-400', ring: 'border-amber-500/40 bg-amber-500/10' },
  OK: { label: 'Tudo sob controle', cls: 'text-emerald-400', ring: 'border-emerald-500/40 bg-emerald-500/10' },
};

export default function RecomendacoesPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/gestao/recomendacoes')
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const st = data ? STATUS[data.resumo.status] : null;

  return (
    <div className="space-y-6 p-6 min-h-screen bg-[#060814] text-slate-100">
      <div className="border-b border-slate-900 pb-5">
        <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block">Gestão · Consultor</span>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2 mt-0.5">
          <Sparkles className="text-indigo-400" size={24} /> Consultor de Eficiência
        </h1>
        <p className="text-xs text-slate-400 mt-1">Lê os dados reais do sistema e sugere, em ordem de prioridade, o que fazer para resolver problemas e ganhar eficiência. Atualiza sozinho a cada visita.</p>
      </div>

      {loading || !data || !st ? (
        <div className="py-20 text-center"><Loader2 className="animate-spin text-indigo-500 mx-auto" size={26} /></div>
      ) : (
        <>
          {/* Farol + resumo */}
          <div className={`flex flex-wrap items-center gap-4 rounded-2xl border px-5 py-4 ${st.ring}`}>
            {data.resumo.status === 'OK' ? <CheckCircle2 className={st.cls} size={28} /> : <Sparkles className={st.cls} size={28} />}
            <div className="flex-1 min-w-[180px]">
              <p className={`text-lg font-bold ${st.cls}`}>{st.label}</p>
              <p className="text-xs text-slate-300/70">
                {data.resumo.total === 0 ? 'Nenhuma recomendação — os indicadores estão dentro do esperado.' : `${data.resumo.criticos} urgente(s) · ${data.resumo.atencao} atenção · ${data.resumo.info} prevenção`}
              </p>
            </div>
            {data.resumo.valorEmJogo > 0 && (
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">Valor em jogo</span>
                <span className="text-xl font-bold font-mono text-white">{fmt(data.resumo.valorEmJogo)}</span>
              </div>
            )}
          </div>

          {/* Lista de recomendações */}
          {data.recomendacoes.length === 0 ? (
            <div className="glassmorphism p-10 rounded-2xl border border-slate-800/80 text-center">
              <CheckCircle2 className="text-emerald-400 mx-auto mb-3" size={32} />
              <p className="text-sm text-slate-300">Sem pendências no momento. Continue acompanhando o Painel de Eficiência no dia a dia.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.recomendacoes.map((r: any, i: number) => {
                const sev = SEV[r.severidade];
                const cat = CAT[r.categoria] ?? { label: r.categoria, Icon: Sparkles };
                const Icon = cat.Icon;
                return (
                  <div key={r.id} className="relative flex gap-0 rounded-2xl border border-slate-800/80 bg-slate-950/20 overflow-hidden">
                    <div className={`w-1.5 shrink-0 ${sev.bar}`} />
                    <div className="flex-1 p-5">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-[11px] font-bold text-slate-500 font-mono">#{i + 1}</span>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${sev.chip}`}>{sev.label}</span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          <Icon size={12} /> {cat.label}
                        </span>
                        {r.impacto && <span className="ml-auto text-xs font-mono font-bold text-white">{r.impacto}</span>}
                      </div>
                      <h3 className={`text-sm font-bold ${sev.text} mb-1.5`}>{r.titulo}</h3>
                      <p className="text-xs text-slate-300/90 leading-relaxed"><span className="text-slate-500 font-semibold">Por quê: </span>{r.porque}</p>
                      <p className="text-xs text-slate-300/90 leading-relaxed mt-1"><span className="text-slate-500 font-semibold">O que fazer: </span>{r.acao}</p>
                      <Link href={r.href} className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold uppercase tracking-wider hover:bg-indigo-600/25 transition">
                        Ir para {r.telaLabel} <ArrowRight size={13} />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-[11px] text-slate-600 text-center pt-2">
            Sugestões geradas a partir dos indicadores cadastrados (custo, prazo, estoque, caixa e segurança). Determinístico e explicável — cada card mostra a evidência que o motivou.
          </p>
        </>
      )}
    </div>
  );
}
