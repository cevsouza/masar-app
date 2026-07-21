import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, BookOpen } from 'lucide-react';
import { porSlug, ARTIGOS, LABEL_CATEGORIA_ARTIGO } from '@/lib/conhecimento/artigos';

export function generateStaticParams() {
  return ARTIGOS.map((a) => ({ slug: a.slug }));
}

/** Negrito de `**texto**` sem trazer um interpretador de markdown para isto. */
function comNegrito(texto: string) {
  return texto.split(/(\*\*[^*]+\*\*)/g).map((parte, i) =>
    parte.startsWith('**') && parte.endsWith('**') ? (
      <strong key={i} className="text-slate-200">{parte.slice(2, -2)}</strong>
    ) : (
      <span key={i}>{parte}</span>
    ),
  );
}

export default async function ArtigoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const artigo = porSlug(slug);
  if (!artigo) notFound();

  const relacionados = ARTIGOS.filter(
    (a) => a.categoria === artigo.categoria && a.slug !== artigo.slug,
  ).slice(0, 4);

  return (
    <div className="max-w-3xl space-y-6">
      <Link
        href="/ajuda"
        className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-slate-300"
      >
        <ArrowLeft size={13} /> Central de Ajuda
      </Link>

      <div className="border-b border-slate-900 pb-5">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-indigo-400">
          {LABEL_CATEGORIA_ARTIGO[artigo.categoria]}
        </span>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">{artigo.titulo}</h1>
        <p className="mt-1 text-xs text-slate-400">{artigo.resumo}</p>
      </div>

      <div className="space-y-4">
        {artigo.corpo.map((p, i) => (
          <p key={i} className="text-sm leading-relaxed text-slate-400">{comNegrito(p)}</p>
        ))}
      </div>

      {artigo.href && (
        <Link
          href={artigo.href}
          className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-600/15 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-indigo-300 transition hover:bg-indigo-600/25"
        >
          Ir para {artigo.ondeLabel} <ArrowRight size={13} />
        </Link>
      )}

      {relacionados.length > 0 && (
        <div className="border-t border-slate-900 pt-5">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
            Relacionados
          </h2>
          <div className="space-y-2">
            {relacionados.map((a) => (
              <Link
                key={a.slug}
                href={`/ajuda/${a.slug}`}
                className="flex items-start gap-3 rounded-2xl border border-slate-800/80 bg-slate-950/20 p-3 transition hover:border-indigo-500/40"
              >
                <BookOpen size={14} className="mt-0.5 shrink-0 text-indigo-400" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-200">{a.titulo}</p>
                  <p className="text-[11px] text-slate-500">{a.resumo}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
