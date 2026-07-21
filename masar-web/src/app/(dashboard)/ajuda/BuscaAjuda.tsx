'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, ArrowRight, BookOpen } from 'lucide-react';

interface ArtigoLeve {
  slug: string;
  titulo: string;
  resumo: string;
  termos: string[];
  categoriaLabel: string;
}

/** Mesma simplificação do servidor: acento e caixa não podem atrapalhar a busca. */
function simplificar(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

export default function BuscaAjuda({ artigos }: { artigos: ArtigoLeve[] }) {
  const [q, setQ] = useState('');

  const achados = useMemo(() => {
    const termo = simplificar(q).trim();
    if (!termo) return null;
    const palavras = termo.split(/\s+/).filter(Boolean);
    return artigos
      .map((a) => {
        const titulo = simplificar(a.titulo + ' ' + a.termos.join(' '));
        const tudo = simplificar(a.titulo + ' ' + a.resumo + ' ' + a.termos.join(' '));
        let peso = 0;
        for (const p of palavras) {
          if (titulo.includes(p)) peso += 3;
          else if (tudo.includes(p)) peso += 1;
        }
        return { a, peso };
      })
      .filter((x) => x.peso > 0)
      .sort((x, y) => y.peso - x.peso)
      .map((x) => x.a);
  }, [q, artigos]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="O que você precisa resolver? Ex.: medição travou, importar planilha, alvará"
          className="w-full rounded-xl border border-slate-800 bg-[#0b0f19] py-3 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-600 focus:border-indigo-500/50 focus:outline-none"
        />
      </div>

      {achados && (
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-wider text-slate-500">
            {achados.length === 0
              ? 'Nada encontrado — tente outra palavra, como "medição" ou "planilha".'
              : `${achados.length} ${achados.length === 1 ? 'resultado' : 'resultados'}`}
          </p>
          {achados.map((a) => (
            <Link
              key={a.slug}
              href={`/ajuda/${a.slug}`}
              className="flex items-start gap-3 rounded-2xl border border-slate-800/80 bg-slate-950/20 p-4 transition hover:border-indigo-500/40"
            >
              <BookOpen size={15} className="mt-0.5 shrink-0 text-indigo-400" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-100">{a.titulo}</p>
                <p className="mt-0.5 text-[11px] text-slate-500">{a.resumo}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wider text-slate-600">{a.categoriaLabel}</p>
              </div>
              <ArrowRight size={14} className="mt-1 shrink-0 text-slate-600" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
