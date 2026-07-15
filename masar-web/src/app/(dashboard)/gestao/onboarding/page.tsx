'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Rocket, Loader2, CheckCircle2, Circle, ArrowRight, ExternalLink,
  RefreshCw, PartyPopper, Building2, Boxes, ChevronRight,
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

// Rótulo amigável do "porquê" de cada passo, para o tom de tutorial guiado.
const PORQUE: Record<string, string> = {
  identificacao: 'Identifica o projeto e o terreno — base de todos os relatórios e do RET.',
  'prazo-empreendimento': 'Define a janela do projeto, usada nas projeções e no cronograma.',
  casas: 'Sem unidades cadastradas, nenhum indicador de obra funciona. É o primeiro passo real.',
  'prazos-casas': 'O prazo físico de cada casa é o que o EVM usa para calcular o avanço planejado (SPI).',
  'orcamento-casas': 'O orçamento de insumos alimenta custo, EVM (CPI/EAC) e a necessidade de materiais.',
  'linha-base': 'Congelar o plano permite medir depois o quanto o orçamento/prazo desviaram.',
  projetos: 'Projetos no cofre evitam embargo e mantêm a documentação da obra em ordem.',
  'marcos-financeiro': 'Marcos (alvará, projeto Caixa) e lançamentos iniciais dão rastreabilidade desde a largada.',
};

export default function OnboardingPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [revalidando, setRevalidando] = useState(false);
  const [empId, setEmpId] = useState<string>('');
  // Passo que o usuário escolheu olhar (null = segue o próximo pendente automático).
  const [focusChave, setFocusChave] = useState<string | null>(null);

  const carregar = useCallback(async (revalidacao = false) => {
    if (revalidacao) setRevalidando(true);
    try {
      const r = await fetch('/api/gestao/completude');
      const d = r.ok ? await r.json() : null;
      setData(d);
      // Na 1ª carga, seleciona o empreendimento que mais precisa de ajuda.
      if (d?.empreendimentos?.length && !revalidacao) {
        const ordenado = [...d.empreendimentos].sort((a, b) => a.scorePct - b.scorePct);
        setEmpId((cur) => cur || ordenado[0].id);
      }
    } finally {
      setLoading(false);
      setRevalidando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);
  // Ao trocar de empreendimento, volta o foco para o próximo pendente automático.
  useEffect(() => { setFocusChave(null); }, [empId]);

  const emp = useMemo(
    () => data?.empreendimentos?.find((e: any) => e.id === empId) ?? null,
    [data, empId],
  );

  const itens: Item[] = emp?.itens ?? [];
  const total = itens.length;
  const completos = itens.filter((i) => i.status === 'COMPLETO').length;
  const pct = emp?.scorePct ?? 0;
  // Próximo passo pendente na ordem lógica do motor (sugestão automática).
  const autoIdx = itens.findIndex((i) => i.status !== 'COMPLETO');
  const tudoPronto = autoIdx === -1 && total > 0;
  // Passo em foco = o que o usuário escolheu ver; por padrão, o próximo pendente.
  // Assim dá para PULAR uma etapa (ex.: recomendada) sem ficar travado nela.
  const focoManual = focusChave ? itens.findIndex((i) => i.chave === focusChave) : -1;
  const focusIdx = focoManual >= 0 ? focoManual : autoIdx;
  const essenciaisFaltando = emp?.faltamObrigatorios ?? 0;

  return (
    <div className="space-y-6 p-6 min-h-screen bg-[#060814] text-slate-100">
      <div className="border-b border-slate-900 pb-5">
        <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block">Gestão · Onboarding</span>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2 mt-0.5">
          <Rocket className="text-indigo-400" size={24} /> Assistente de Novo Projeto
        </h1>
        <p className="text-xs text-slate-400 mt-1">Um guia passo a passo, na ordem certa, para cadastrar tudo o que a gestão precisa. Cada passo abre a tela onde você preenche; volte aqui e clique em <strong className="text-slate-300">Já preenchi</strong> para atualizar. Você pode <strong className="text-slate-300">clicar em qualquer passo</strong> para ir até ele, ou <strong className="text-slate-300">pular</strong> os recomendados e voltar depois.</p>
      </div>

      {loading ? (
        <div className="py-20 text-center"><Loader2 className="animate-spin text-indigo-500 mx-auto" size={26} /></div>
      ) : !data?.empreendimentos?.length ? (
        // Nenhum empreendimento: o passo zero é criar um.
        <div className="glassmorphism p-10 rounded-2xl border border-slate-800/80 text-center">
          <Building2 className="text-slate-500 mx-auto mb-3" size={30} />
          <p className="text-sm text-slate-300 mb-1 font-semibold">Comece criando o empreendimento</p>
          <p className="text-xs text-slate-500 mb-4 max-w-md mx-auto">Todo o resto (casas, orçamento, equipe, documentos) pendura nele. Depois de criar, volte aqui que eu te guio no restante.</p>
          <Link href="/empreendimentos" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 text-xs font-bold uppercase tracking-wider hover:bg-indigo-600/25 transition">
            Criar empreendimento <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <>
          {/* Seletor de empreendimento + progresso + revalidar */}
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-800/80 bg-slate-950/20 px-5 py-4">
            <Building2 size={18} className="text-slate-400 shrink-0" />
            <select
              value={empId}
              onChange={(e) => setEmpId(e.target.value)}
              className="bg-[#0b0f19] border border-slate-800 text-sm text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500/50 cursor-pointer max-w-[280px]"
            >
              {data.empreendimentos.map((e: any) => (
                <option key={e.id} value={e.id}>{e.nome} — {e.scorePct}%</option>
              ))}
            </select>
            <div className="flex items-center gap-2 flex-1 min-w-[160px]">
              <div className="h-2 flex-1 rounded-full bg-slate-800 overflow-hidden">
                <div className={`h-full transition-all ${pct >= 85 ? 'bg-emerald-500' : pct >= 55 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs font-mono font-bold text-slate-300">{completos}/{total}</span>
            </div>
            <button
              onClick={() => carregar(true)}
              disabled={revalidando}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/60 text-slate-200 border border-slate-700 text-[11px] font-bold uppercase tracking-wider hover:bg-slate-700/60 transition disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw size={13} className={revalidando ? 'animate-spin' : ''} /> Revalidar
            </button>
            <Link href="/empreendimentos" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600/10 text-indigo-300 border border-indigo-500/25 text-[11px] font-bold uppercase tracking-wider hover:bg-indigo-600/20 transition">
              Novo <ArrowRight size={13} />
            </Link>
          </div>

          {tudoPronto && (
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-4">
              <PartyPopper className="text-emerald-400 shrink-0" size={24} />
              <div>
                <p className="text-sm font-bold text-emerald-400">Cadastro completo!</p>
                <p className="text-xs text-slate-300/70">Todos os passos deste empreendimento estão preenchidos. Os indicadores e o Consultor de Eficiência já trabalham com dados completos.</p>
              </div>
            </div>
          )}

          {!tudoPronto && essenciaisFaltando === 0 && (
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 px-5 py-3">
              <CheckCircle2 className="text-emerald-400 shrink-0" size={20} />
              <p className="text-xs text-slate-300">O essencial já está pronto — os indicadores funcionam. Os passos abaixo que restam são <strong className="text-slate-200">recomendados</strong> (boa prática/compliance).</p>
            </div>
          )}

          {/* Stepper vertical em ordem lógica */}
          <div className="space-y-2.5">
            {itens.map((item, idx) => {
              const done = item.status === 'COMPLETO';
              const current = idx === focusIdx;
              const proximoPendente = idx === autoIdx;
              return (
                <div
                  key={item.chave}
                  onClick={() => setFocusChave(item.chave)}
                  className={`rounded-2xl border overflow-hidden transition cursor-pointer ${
                    current
                      ? 'border-indigo-500/50 bg-indigo-500/5'
                      : done
                        ? 'border-slate-800/60 bg-slate-950/10 hover:border-slate-700'
                        : 'border-slate-800/60 bg-slate-950/10 opacity-70 hover:opacity-100 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-3.5 px-5 py-4">
                    <div className="flex flex-col items-center shrink-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        done ? 'bg-emerald-500/15 text-emerald-400' : current ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-800 text-slate-500'
                      }`}>
                        {done ? <CheckCircle2 size={16} /> : idx + 1}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{item.grupo}</span>
                        {item.obrigatorio ? (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/25">Essencial</span>
                        ) : (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-700/40 text-slate-400 border border-slate-700">Recomendado</span>
                        )}
                        {current && !done && <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/25 animate-pulse">Você está aqui</span>}
                        {proximoPendente && !current && <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-700/40 text-slate-400 border border-slate-700">Próximo pendente</span>}
                      </div>
                      <h3 className={`text-sm font-bold mt-1 ${done ? 'text-slate-400' : current ? 'text-white' : 'text-slate-300'}`}>{item.label}</h3>

                      {/* Detalhe sempre; porquê + ação só no passo atual (foco do tutorial) */}
                      <p className={`text-[11px] mt-0.5 ${done ? 'text-slate-500' : 'text-slate-400'}`}>{item.detalhe}</p>

                      {current && !done && (
                        <div className="mt-2.5 space-y-2">
                          {PORQUE[item.chave] && (
                            <p className="text-[11px] text-slate-400 leading-relaxed"><span className="text-slate-500 font-semibold">Por quê: </span>{PORQUE[item.chave]}</p>
                          )}
                          {item.acao && (
                            <p className="text-[11px] text-slate-400 leading-relaxed"><span className="text-slate-500 font-semibold">O que fazer: </span>{item.acao}</p>
                          )}
                          <div className="flex items-center gap-2 pt-1 flex-wrap">
                            <Link
                              href={item.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 text-white text-[11px] font-bold uppercase tracking-wider hover:bg-indigo-500 transition"
                            >
                              Abrir {item.telaLabel} <ExternalLink size={13} />
                            </Link>
                            <button
                              onClick={(e) => { e.stopPropagation(); setFocusChave(null); carregar(true); }}
                              disabled={revalidando}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/60 text-slate-200 border border-slate-700 text-[11px] font-bold uppercase tracking-wider hover:bg-slate-700/60 transition disabled:opacity-50 cursor-pointer"
                            >
                              <RefreshCw size={12} className={revalidando ? 'animate-spin' : ''} /> Já preenchi
                            </button>
                            {idx < total - 1 && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setFocusChave(itens[idx + 1].chave); }}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-slate-400 border border-slate-800 text-[11px] font-bold uppercase tracking-wider hover:text-slate-200 hover:border-slate-700 transition cursor-pointer"
                              >
                                Pular etapa <ChevronRight size={13} />
                              </button>
                            )}
                            {idx > 0 && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setFocusChave(itens[idx - 1].chave); }}
                                className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl text-slate-500 text-[11px] font-bold uppercase tracking-wider hover:text-slate-300 transition cursor-pointer"
                              >
                                Voltar
                              </button>
                            )}
                          </div>
                          {!item.obrigatorio && (
                            <p className="text-[10px] text-slate-500 leading-relaxed">Passo <strong className="text-slate-400">recomendado</strong> (opcional). Você pode pular agora e voltar depois — o essencial não fica travado por causa dele.</p>
                          )}
                        </div>
                      )}

                      {/* Passos futuros pendentes ganham um atalho discreto */}
                      {!done && !current && (
                        <Link href={item.href} target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-indigo-300 transition">
                          {item.telaLabel} <ExternalLink size={11} />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Cadastros base compartilhados (valem para todos os projetos) */}
          {data.compartilhados?.itens?.length > 0 && (
            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/20 overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-900">
                <Boxes size={16} className="text-slate-400 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-bold text-white">Cadastros base (uma vez só, valem para todos os projetos)</p>
                </div>
                <span className="text-xs font-mono font-bold text-slate-400">{data.compartilhados.scorePct}%</span>
              </div>
              <div className="p-4 space-y-1.5">
                {data.compartilhados.itens.map((i: Item) => {
                  const done = i.status === 'COMPLETO';
                  return (
                    <div key={i.chave} className="flex items-center gap-3 rounded-xl border border-slate-800/60 px-3.5 py-2">
                      {done ? <CheckCircle2 size={15} className="text-emerald-400 shrink-0" /> : <Circle size={15} className="text-slate-600 shrink-0" />}
                      <span className={`text-xs flex-1 ${done ? 'text-slate-400' : 'text-slate-200'}`}>{i.label}</span>
                      <span className="text-[10px] text-slate-500">{i.detalhe}</span>
                      {!done && (
                        <Link href={i.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-indigo-300 hover:text-indigo-200 transition">
                          {i.telaLabel} <ExternalLink size={10} />
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <p className="text-[11px] text-slate-600 text-center pt-2">
            Precisa da visão consolidada de tudo o que falta? Veja a <Link href="/gestao/completude" className="text-indigo-400 hover:underline">Completude do Cadastro</Link>.
          </p>
        </>
      )}
    </div>
  );
}
