'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ClipboardCheck, Loader2, CheckCircle2, CircleDashed, AlertCircle,
  ArrowRight, ChevronDown, Building2, Boxes,
} from 'lucide-react';

type StatusItem = 'COMPLETO' | 'PARCIAL' | 'PENDENTE';

interface Item {
  chave: string;
  grupo: string;
  label: string;
  status: StatusItem;
  obrigatorio: boolean;
  detalhe: string;
  acao?: string;
  href: string;
  telaLabel: string;
}

const ST: Record<StatusItem, { text: string; Icon: any; dot: string }> = {
  COMPLETO: { text: 'text-emerald-400', Icon: CheckCircle2, dot: 'bg-emerald-500' },
  PARCIAL: { text: 'text-amber-400', Icon: CircleDashed, dot: 'bg-amber-500' },
  PENDENTE: { text: 'text-slate-500', Icon: CircleDashed, dot: 'bg-slate-600' },
};

function corScore(pct: number) {
  if (pct >= 85) return { text: 'text-emerald-400', bar: 'bg-emerald-500', ring: 'border-emerald-500/40 bg-emerald-500/10' };
  if (pct >= 55) return { text: 'text-amber-400', bar: 'bg-amber-500', ring: 'border-amber-500/40 bg-amber-500/10' };
  return { text: 'text-red-400', bar: 'bg-red-500', ring: 'border-red-500/40 bg-red-500/10' };
}

function Barra({ pct }: { pct: number }) {
  const c = corScore(pct);
  return (
    <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
      <div className={`h-full ${c.bar} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// Lista de itens agrupada por "grupo", cada item com status e link para resolver.
function Checklist({ itens }: { itens: Item[] }) {
  const grupos = Array.from(new Set(itens.map((i) => i.grupo)));
  return (
    <div className="space-y-4">
      {grupos.map((g) => (
        <div key={g}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">{g}</p>
          <div className="space-y-1.5">
            {itens.filter((i) => i.grupo === g).map((i) => {
              const s = ST[i.status];
              const Icon = s.Icon;
              const pend = i.status !== 'COMPLETO';
              return (
                <div key={i.chave} className="flex items-start gap-3 rounded-xl border border-slate-800/70 bg-slate-950/20 px-3.5 py-2.5">
                  <Icon size={16} className={`${s.text} shrink-0 mt-0.5`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-slate-200">{i.label}</span>
                      {i.obrigatorio ? (
                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/25">Essencial</span>
                      ) : (
                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-700/40 text-slate-400 border border-slate-700">Recomendado</span>
                      )}
                    </div>
                    <p className={`text-[11px] mt-0.5 ${pend ? 'text-slate-400' : 'text-slate-500'}`}>{i.detalhe}</p>
                    {pend && i.acao && <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{i.acao}</p>}
                  </div>
                  {pend && (
                    <Link href={i.href} className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold uppercase tracking-wider hover:bg-indigo-600/25 transition">
                      {i.telaLabel} <ArrowRight size={11} />
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CompletudePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [abertos, setAbertos] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch('/api/gestao/completude')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setData(d);
        // Abre automaticamente os empreendimentos que ainda têm essenciais faltando.
        if (d?.empreendimentos) {
          const ini: Record<string, boolean> = {};
          d.empreendimentos.forEach((e: any) => { ini[e.id] = e.faltamObrigatorios > 0; });
          setAbertos(ini);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const score = data ? corScore(data.resumo.scoreMedioPct) : null;

  return (
    <div className="space-y-6 p-6 min-h-screen bg-[#060814] text-slate-100">
      <div className="border-b border-slate-900 pb-5">
        <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block">Gestão · Onboarding</span>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2 mt-0.5">
          <ClipboardCheck className="text-indigo-400" size={24} /> Completude do Cadastro
        </h1>
        <p className="text-xs text-slate-400 mt-1">Mostra, por empreendimento, o que já foi cadastrado e o que ainda falta para a gestão do todo funcionar. <strong className="text-slate-300">Essencial</strong> = dado que os indicadores (EVM, materiais, segurança) consomem; <strong className="text-slate-300">Recomendado</strong> = boa prática/compliance.</p>
      </div>

      {loading || !data || !score ? (
        <div className="py-20 text-center"><Loader2 className="animate-spin text-indigo-500 mx-auto" size={26} /></div>
      ) : (
        <>
          {/* Resumo geral */}
          <div className={`flex flex-wrap items-center gap-4 rounded-2xl border px-5 py-4 ${score.ring}`}>
            <div className={`text-3xl font-bold font-mono ${score.text}`}>{data.resumo.scoreMedioPct}%</div>
            <div className="flex-1 min-w-[200px]">
              <p className={`text-sm font-bold ${score.text}`}>Completude média do cadastro</p>
              <p className="text-xs text-slate-300/70">
                {data.resumo.empreendimentos} empreendimento(s)
                {data.resumo.faltamObrigatorios > 0
                  ? ` · ${data.resumo.faltamObrigatorios} item(ns) essencial(is) faltando`
                  : ' · todos os itens essenciais preenchidos'}
              </p>
            </div>
          </div>

          {/* Por empreendimento */}
          {data.empreendimentos.length === 0 ? (
            <div className="glassmorphism p-10 rounded-2xl border border-slate-800/80 text-center">
              <Building2 className="text-slate-500 mx-auto mb-3" size={30} />
              <p className="text-sm text-slate-300 mb-3">Nenhum empreendimento cadastrado ainda.</p>
              <Link href="/empreendimentos" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold uppercase tracking-wider hover:bg-indigo-600/25 transition">
                Criar empreendimento <ArrowRight size={13} />
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {data.empreendimentos.map((e: any) => {
                const c = corScore(e.scorePct);
                const aberto = !!abertos[e.id];
                return (
                  <div key={e.id} className="rounded-2xl border border-slate-800/80 bg-slate-950/20 overflow-hidden">
                    <button
                      onClick={() => setAbertos((p) => ({ ...p, [e.id]: !p[e.id] }))}
                      className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-900/30 transition cursor-pointer text-left"
                    >
                      <Building2 size={18} className="text-slate-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{e.nome}</p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <div className="flex-1 max-w-[240px]"><Barra pct={e.scorePct} /></div>
                          <span className={`text-xs font-mono font-bold ${c.text}`}>{e.scorePct}%</span>
                          {e.faltamObrigatorios > 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-300"><AlertCircle size={11} /> {e.faltamObrigatorios} essencial(is)</span>
                          )}
                        </div>
                      </div>
                      <ChevronDown size={16} className={`text-slate-500 shrink-0 transition-transform ${aberto ? 'rotate-180' : ''}`} />
                    </button>
                    {aberto && <div className="px-5 pb-5 pt-1 border-t border-slate-900"><Checklist itens={e.itens} /></div>}
                  </div>
                );
              })}
            </div>
          )}

          {/* Cadastros base compartilhados */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-950/20 overflow-hidden">
            <div className="flex items-center gap-4 px-5 py-4 border-b border-slate-900">
              <Boxes size={18} className="text-slate-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white">Cadastros base (compartilhados)</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <div className="flex-1 max-w-[240px]"><Barra pct={data.compartilhados.scorePct} /></div>
                  <span className={`text-xs font-mono font-bold ${corScore(data.compartilhados.scorePct).text}`}>{data.compartilhados.scorePct}%</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Insumos, fornecedores e equipe valem para todos os empreendimentos.</p>
              </div>
            </div>
            <div className="px-5 pb-5 pt-4"><Checklist itens={data.compartilhados.itens} /></div>
          </div>

          <p className="text-[11px] text-slate-600 text-center pt-2">
            Verificação determinística dos dados cadastrados. Atualiza sozinho a cada visita — à medida que você preenche, o percentual sobe.
          </p>
        </>
      )}
    </div>
  );
}
