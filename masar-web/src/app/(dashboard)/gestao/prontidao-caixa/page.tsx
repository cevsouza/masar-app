import { db } from '@/lib/db';
import Link from 'next/link';
import { ShieldCheck, Lock, ArrowRight } from 'lucide-react';
import { avaliarConformidade } from '@/lib/mcmv/conformidade';

export const revalidate = 0;

const corPct = (p: number) => (p >= 100 ? 'text-emerald-400' : p >= 60 ? 'text-amber-400' : 'text-red-400');

export default async function ProntidaoCaixaPage() {
  const emps = await db.empreendimento.findMany({
    where: { regimeMCMV: true },
    select: { id: true, nome: true, faixaMCMV: true },
    orderBy: { nome: 'asc' },
  });

  const relatorio = await Promise.all(
    emps.map(async (e) => {
      const r = await avaliarConformidade(e.id);
      return { id: e.id, nome: e.nome, faixa: e.faixaMCMV, ...r.resumo, bloqueadores: r.bloqueadores };
    }),
  );

  const prontos = relatorio.filter((r) => r.percentual >= 100 && r.bloqueadores.length === 0).length;
  const travados = relatorio.filter((r) => r.bloqueadores.length > 0).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl font-sans flex items-center gap-2">
          <ShieldCheck className="text-amber-400" size={26} /> Prontidão Caixa (MCMV)
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Situação de conformidade dos empreendimentos no regime MCMV. Empreendimentos com bloqueadores travam a
          liberação de medição até a regularização.
        </p>
      </div>

      {emps.length === 0 ? (
        <div className="glassmorphism rounded-xl border border-slate-800 p-10 text-center text-slate-400 text-sm">
          Nenhum empreendimento no regime MCMV. Marque a opção Caixa/MCMV ao criar um empreendimento.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-4">
            <div className="glassmorphism rounded-xl border border-slate-800 px-5 py-3">
              <div className="text-2xl font-black text-slate-100">{relatorio.length}</div>
              <div className="text-xs text-slate-400">empreendimentos MCMV</div>
            </div>
            <div className="glassmorphism rounded-xl border border-emerald-500/20 px-5 py-3">
              <div className="text-2xl font-black text-emerald-400">{prontos}</div>
              <div className="text-xs text-slate-400">prontos (100%)</div>
            </div>
            <div className="glassmorphism rounded-xl border border-red-500/20 px-5 py-3">
              <div className="text-2xl font-black text-red-400">{travados}</div>
              <div className="text-xs text-slate-400">com trava de medição</div>
            </div>
          </div>

          <div className="space-y-3">
            {relatorio.map((r) => (
              <div key={r.id} className="glassmorphism rounded-xl border border-slate-800 p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <span className={`text-3xl font-black ${corPct(r.percentual)}`}>{r.percentual}%</span>
                    <div>
                      <div className="text-sm font-bold text-slate-100">{r.nome}</div>
                      <div className="text-xs text-slate-400">
                        {r.faixa ? r.faixa.replace('FAIXA_', 'Faixa ') : 'Faixa não definida'} · {r.conformes}/
                        {r.totalObrigatorios} conformes · {r.pendencias} pend. · {r.naoConformes} não conf.
                      </div>
                    </div>
                  </div>
                  <Link
                    href={`/empreendimentos/${r.id}/ficha-tecnica?tab=conformidade`}
                    className="text-xs text-blue-400 hover:text-blue-300 inline-flex items-center gap-1 font-semibold"
                  >
                    Abrir checklist <ArrowRight size={12} />
                  </Link>
                </div>

                {r.bloqueadores.length > 0 && (
                  <div className="mt-3 rounded-lg border border-red-500/25 bg-red-500/[0.06] p-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-red-300">
                      <Lock size={12} /> Trava a liberação de medição
                    </div>
                    <ul className="mt-1.5 space-y-0.5 text-xs text-red-200/90 list-disc pl-5">
                      {r.bloqueadores.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
