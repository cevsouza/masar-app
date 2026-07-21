'use client';

import Link from 'next/link';
import { AlertTriangle, ArrowRight, Clock, ShieldAlert, X, HelpCircle } from 'lucide-react';

export interface PendenciaTravaUI {
  chave: string;
  titulo: string;
  prazo?: string;
  porque: string;
  comoResolver: string;
  quantoTempo: string;
  href: string;
  ondeLabel: string;
}

/**
 * O que o usuário vê quando a medição não libera.
 *
 * Substitui um `confirm()` com marcadores. A troca não é estética: um confirm
 * do navegador só oferece duas saídas — cancelar ou forçar —, e nenhuma delas é
 * "resolver". Ele empurra para o override justamente quem não deveria usá-lo,
 * porque forçar é o único botão que faz alguma coisa acontecer.
 *
 * Aqui a saída principal é o link que leva ao lugar de resolver. Forçar
 * continua existindo, para ADMIN, mas em segundo plano e dizendo em voz alta o
 * que custa.
 */
export default function AvisoTravaMedicao({
  titulo,
  resumo,
  pendencias,
  podeForcar,
  onForcar,
  onFechar,
}: {
  titulo: string;
  resumo: string;
  pendencias: PendenciaTravaUI[];
  podeForcar: boolean;
  onForcar: () => void;
  onFechar: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 py-10">
      <div className="w-full max-w-2xl rounded-2xl border border-amber-500/30 bg-[#0b0f19] shadow-2xl">

        <div className="flex items-start gap-3 border-b border-slate-800 p-5">
          <ShieldAlert className="mt-0.5 shrink-0 text-amber-400" size={20} />
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-white">{titulo}</h3>
            <p className="mt-0.5 text-xs text-slate-400">{resumo}</p>
          </div>
          <button
            onClick={onFechar}
            aria-label="Fechar"
            className="shrink-0 text-slate-500 transition hover:text-slate-300"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[55vh] space-y-3 overflow-y-auto p-5">
          {pendencias.map((p, i) => (
            <div key={`${p.chave}-${i}`} className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-slate-100">{p.titulo}</p>
                {p.prazo && (
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      p.prazo.startsWith('venceu')
                        ? 'bg-red-500/10 text-red-400'
                        : 'bg-amber-500/10 text-amber-400'
                    }`}
                  >
                    {p.prazo}
                  </span>
                )}
              </div>

              <div className="mt-3 space-y-2 text-[11px] leading-relaxed">
                <p className="flex gap-2 text-slate-400">
                  <HelpCircle size={13} className="mt-px shrink-0 text-slate-600" />
                  <span><strong className="text-slate-300">Por que trava:</strong> {p.porque}</span>
                </p>
                <p className="flex gap-2 text-slate-400">
                  <ArrowRight size={13} className="mt-px shrink-0 text-slate-600" />
                  <span><strong className="text-slate-300">Como resolver:</strong> {p.comoResolver}</span>
                </p>
                <p className="flex gap-2 text-slate-500">
                  <Clock size={13} className="mt-px shrink-0 text-slate-600" />
                  <span>{p.quantoTempo}</span>
                </p>
              </div>

              <Link
                href={p.href}
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-600/15 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-indigo-300 transition hover:bg-indigo-600/25"
              >
                Ir para {p.ondeLabel} <ArrowRight size={12} />
              </Link>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 p-5">
          <div className="flex items-center gap-3">
            <button
              onClick={onFechar}
              className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-200 transition hover:bg-slate-700"
            >
              Entendi, vou resolver
            </button>
            {/* A dúvida nasce aqui; o texto longo mora na ajuda. */}
            <Link
              href="/ajuda/medicao-travada"
              className="text-[11px] text-slate-500 underline underline-offset-4 transition hover:text-slate-300"
            >
              Por que a medição trava?
            </Link>
          </div>

          {podeForcar && (
            <button
              onClick={onForcar}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-500/80 underline underline-offset-4 transition hover:text-amber-400"
            >
              <AlertTriangle size={12} />
              Liberar mesmo assim (fica registrado no seu nome)
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
