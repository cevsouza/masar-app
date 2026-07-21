import Link from 'next/link';
import { LifeBuoy, ArrowRight } from 'lucide-react';
import { ARTIGOS, porCategoria, LABEL_CATEGORIA_ARTIGO } from '@/lib/conhecimento/artigos';
import BuscaAjuda from './BuscaAjuda';

export const metadata = { title: 'Central de Ajuda' };

export default function AjudaPage() {
  const grupos = porCategoria();
  const leves = ARTIGOS.map((a) => ({
    slug: a.slug,
    titulo: a.titulo,
    resumo: a.resumo,
    termos: a.termos,
    categoriaLabel: LABEL_CATEGORIA_ARTIGO[a.categoria],
  }));

  return (
    <div className="space-y-7">
      <div className="border-b border-slate-900 pb-5">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-indigo-400">Ajuda</span>
        <h1 className="mt-0.5 flex items-center gap-2 text-2xl font-bold tracking-tight text-white">
          <LifeBuoy className="text-indigo-400" size={24} /> Central de Ajuda
        </h1>
        <p className="mt-1 max-w-2xl text-xs text-slate-400">
          O que o sistema exige, por que exige e como resolver. Procure pelo problema como você o
          descreveria — &ldquo;a medição travou&rdquo; funciona tão bem quanto o nome técnico.
        </p>
      </div>

      <BuscaAjuda artigos={leves} />

      <div className="space-y-7">
        {grupos.map((g) => (
          <div key={g.categoria}>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
              {g.label}
              <span className="ml-2 font-normal text-slate-600">{g.artigos.length}</span>
            </h2>
            <div className="grid gap-2 md:grid-cols-2">
              {g.artigos.map((a) => (
                <Link
                  key={a.slug}
                  href={`/ajuda/${a.slug}`}
                  className="group flex items-start gap-3 rounded-2xl border border-slate-800/80 bg-slate-950/20 p-4 transition hover:border-indigo-500/40"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-100">{a.titulo}</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">{a.resumo}</p>
                  </div>
                  <ArrowRight
                    size={14}
                    className="mt-1 shrink-0 text-slate-700 transition group-hover:text-indigo-400"
                  />
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
