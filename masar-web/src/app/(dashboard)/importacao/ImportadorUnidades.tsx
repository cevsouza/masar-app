'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import {
  Upload, Download, Loader2, AlertTriangle, CheckCircle2, Info,
  FileSpreadsheet, ArrowRight, X,
} from 'lucide-react';

interface Empreendimento { id: string; nome: string }

interface Dados {
  numero: string;
  quadra: string;
  areaConstruida: number | null;
  areaLote: number | null;
  quantidadeQuartos: number | null;
  quantidadeSuites: number | null;
  quantidadeBanheiros: number | null;
  vagasGaragem: number | null;
  valorVendaProjetado: number | null;
  unidadeAdaptavelMCMV: boolean;
  statusObra: string;
  percentualObra: number;
}

interface Linha {
  linhaNoArquivo: number;
  dados: Dados;
  erros: string[];
  avisos: string[];
}

interface Analise {
  empreendimento: string;
  separador: string;
  encodingLatino: boolean;
  linhas: Linha[];
  totalLinhas: number;
  prontas: number;
  comErro: number;
  comAviso: number;
  colunasIgnoradas: string[];
  colunasAusentes: string[];
  licenca: { bloqueado: boolean; mensagem?: string };
}

const num = (v: number | null) => (v == null ? '' : String(v).replace('.', ','));

/**
 * Importação de unidades a partir da planilha que a construtora já tem.
 *
 * A tela tem três estados e a ordem deles é o produto: escolher o arquivo,
 * CONFERIR o que vai entrar, e só então gravar. Importar direto obrigaria a
 * desfazer quando algo saísse errado — e desfazer 200 unidades é pior do que
 * não ter importado.
 *
 * A correção acontece aqui, na tabela, e não no arquivo. Mandar o cliente
 * "arrumar a planilha e subir de novo" a cada erro é o que transforma migração
 * em consultoria — e consultoria é exatamente o que este produto não vende.
 */
export default function ImportadorUnidades({ empreendimentos }: { empreendimentos: Empreendimento[] }) {
  const [empId, setEmpId] = useState(empreendimentos[0]?.id ?? '');
  const [analise, setAnalise] = useState<Analise | null>(null);
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [gravando, setGravando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pronto, setPronto] = useState<{ importadas: number; empreendimento: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const conferir = async (arquivo: File) => {
    setEnviando(true);
    setErro(null);
    setPronto(null);
    try {
      const fd = new FormData();
      fd.append('arquivo', arquivo);
      fd.append('empreendimentoId', empId);
      const r = await fetch('/api/importacao/casas', { method: 'POST', body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Não foi possível ler a planilha.');
      setAnalise(d);
      setLinhas(d.linhas);
    } catch (e: any) {
      setErro(e.message);
      setAnalise(null);
    } finally {
      setEnviando(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  /** Edita um campo de identificação direto na tabela e limpa o erro resolvido. */
  const editar = (i: number, campo: 'numero' | 'quadra', valor: string) => {
    setLinhas((prev) => {
      const novo = [...prev];
      const l = { ...novo[i], dados: { ...novo[i].dados, [campo]: valor } };
      // Recalcula localmente só o que dá para saber sem o servidor: a ausência.
      l.erros = l.erros.filter(
        (e) => !(campo === 'quadra' && e.includes('sem quadra')) &&
               !(campo === 'numero' && e.includes('não tem número')),
      );
      if (campo === 'quadra' && !valor.trim()) l.erros.push('Esta unidade está sem quadra.');
      if (campo === 'numero' && !valor.trim()) l.erros.push('Esta linha não tem número de unidade.');
      novo[i] = l;
      return novo;
    });
  };

  const removerLinha = (i: number) => setLinhas((prev) => prev.filter((_, k) => k !== i));

  const validas = linhas.filter((l) => l.erros.length === 0);

  const gravar = async () => {
    setGravando(true);
    setErro(null);
    try {
      const r = await fetch('/api/importacao/casas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empreendimentoId: empId, casas: validas.map((l) => l.dados) }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || d.error || 'Não foi possível importar.');
      setPronto(d);
      setAnalise(null);
      setLinhas([]);
    } catch (e: any) {
      setErro(e.message);
    } finally {
      setGravando(false);
    }
  };

  if (empreendimentos.length === 0) {
    return (
      <div className="glassmorphism rounded-2xl border border-slate-800/80 p-10 text-center">
        <FileSpreadsheet className="mx-auto mb-3 text-slate-500" size={28} />
        <p className="mb-1 text-sm font-semibold text-slate-300">Crie o empreendimento primeiro</p>
        <p className="mx-auto mb-4 max-w-md text-xs text-slate-500">
          As unidades penduram num empreendimento. Depois de criar, volte aqui e suba a planilha.
        </p>
        <Link
          href="/empreendimentos"
          className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-600/15 px-4 py-2 text-xs font-bold uppercase tracking-wider text-indigo-300 hover:bg-indigo-600/25"
        >
          Criar empreendimento <ArrowRight size={14} />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Passo 1 */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-950/20 p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[220px] flex-1">
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Importar para
            </label>
            <select
              value={empId}
              onChange={(e) => setEmpId(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-[#0b0f19] px-3 py-2.5 text-sm text-slate-200"
            >
              {empreendimentos.map((e) => (
                <option key={e.id} value={e.id}>{e.nome}</option>
              ))}
            </select>
          </div>

          <a
            href="/api/importacao/casas?modelo=1"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-300 transition hover:border-slate-700"
          >
            <Download size={14} /> Baixar modelo
          </a>

          <button
            onClick={() => inputRef.current?.click()}
            disabled={enviando}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-indigo-500 disabled:opacity-50"
          >
            {enviando ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />}
            Escolher planilha
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && conferir(e.target.files[0])}
          />
        </div>

        <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
          A planilha precisa estar em <strong className="text-slate-400">CSV</strong>: no Excel, use
          &ldquo;Salvar como&rdquo; e escolha <em>CSV (separado por vírgulas)</em>. Não precisa
          renomear coluna nenhuma — o sistema entende <em>unidade</em>, <em>casa</em> ou{' '}
          <em>lote</em> como número, <em>bloco</em> ou <em>qd</em> como quadra, e assim por diante.
          Só <strong className="text-slate-400">número e quadra</strong> são obrigatórios; o resto
          pode entrar agora e ser completado depois.
        </p>
      </div>

      {erro && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-500/25 bg-red-600/[0.06] px-4 py-3">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-400" />
          <p className="text-xs text-slate-300">{erro}</p>
        </div>
      )}

      {pronto && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-600/[0.06] px-4 py-3">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-400" />
          <p className="text-xs text-slate-300">
            <strong className="text-slate-100">{pronto.importadas} unidades importadas</strong> em{' '}
            {pronto.empreendimento}.{' '}
            <Link href="/casas" className="text-indigo-400 underline underline-offset-2">Ver as unidades</Link>
          </p>
        </div>
      )}

      {/* Passo 2 — conferência */}
      {analise && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { r: 'Linhas na planilha', v: analise.totalLinhas },
              { r: 'Prontas para importar', v: validas.length, bom: true },
              { r: 'Com problema', v: linhas.length - validas.length, alerta: linhas.length - validas.length > 0 },
              { r: 'Com observação', v: linhas.filter((l) => !l.erros.length && l.avisos.length).length },
            ].map((c) => (
              <div key={c.r} className="rounded-2xl border border-slate-800/80 bg-slate-950/20 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{c.r}</p>
                <p className={`mt-1 text-xl font-bold ${c.alerta ? 'text-red-400' : c.bom ? 'text-emerald-400' : 'text-slate-100'}`}>
                  {c.v}
                </p>
              </div>
            ))}
          </div>

          {analise.encodingLatino && (
            <div className="flex items-start gap-3 rounded-2xl border border-slate-800/80 bg-slate-950/20 px-4 py-3">
              <Info size={15} className="mt-0.5 shrink-0 text-slate-500" />
              <p className="text-[11px] text-slate-400">
                A planilha veio no formato antigo do Windows. Os acentos foram convertidos —
                confira se algum nome ficou estranho antes de importar.
              </p>
            </div>
          )}

          {analise.colunasIgnoradas.length > 0 && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] px-4 py-3">
              <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-400" />
              <p className="text-[11px] text-slate-300">
                Estas colunas não foram reconhecidas e serão ignoradas:{' '}
                <strong className="text-amber-300">{analise.colunasIgnoradas.join(', ')}</strong>.
                Quase sempre é nome escrito diferente — se alguma delas era importante, ajuste o
                título na planilha e suba de novo.
              </p>
            </div>
          )}

          {analise.licenca.bloqueado && (
            <div className="flex items-start gap-3 rounded-2xl border border-red-500/25 bg-red-600/[0.06] px-4 py-3">
              <AlertTriangle size={15} className="mt-0.5 shrink-0 text-red-400" />
              <p className="text-[11px] text-slate-300">{analise.licenca.mensagem}</p>
            </div>
          )}

          <div className="overflow-x-auto rounded-2xl border border-slate-800/80">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3 py-2.5 text-left font-bold">Linha</th>
                  <th className="px-3 py-2.5 text-left font-bold">Número</th>
                  <th className="px-3 py-2.5 text-left font-bold">Quadra</th>
                  <th className="px-3 py-2.5 text-right font-bold">Área</th>
                  <th className="px-3 py-2.5 text-right font-bold">Valor</th>
                  <th className="px-3 py-2.5 text-left font-bold">Situação</th>
                  <th className="px-3 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((l, i) => {
                  const temErro = l.erros.length > 0;
                  return (
                    <tr
                      key={i}
                      className={`border-t border-slate-800/70 ${temErro ? 'bg-red-950/10' : ''}`}
                    >
                      <td className="px-3 py-2.5 font-mono text-slate-500">{l.linhaNoArquivo}</td>
                      <td className="px-3 py-2.5">
                        <input
                          value={l.dados.numero}
                          onChange={(e) => editar(i, 'numero', e.target.value)}
                          className={`w-20 rounded-lg border bg-[#0b0f19] px-2 py-1 text-slate-100 ${
                            l.dados.numero ? 'border-slate-800' : 'border-red-500/50'
                          }`}
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <input
                          value={l.dados.quadra}
                          onChange={(e) => editar(i, 'quadra', e.target.value)}
                          className={`w-16 rounded-lg border bg-[#0b0f19] px-2 py-1 text-slate-100 ${
                            l.dados.quadra ? 'border-slate-800' : 'border-red-500/50'
                          }`}
                        />
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-slate-300">
                        {num(l.dados.areaConstruida) || <span className="text-slate-600">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-slate-300">
                        {num(l.dados.valorVendaProjetado) || <span className="text-slate-600">—</span>}
                      </td>
                      <td className="px-3 py-2.5">
                        {l.erros.map((e, k) => (
                          <p key={k} className="text-[11px] leading-relaxed text-red-400">{e}</p>
                        ))}
                        {l.avisos.map((a, k) => (
                          <p key={k} className="text-[11px] leading-relaxed text-amber-400/80">{a}</p>
                        ))}
                        {!temErro && l.avisos.length === 0 && (
                          <span className="text-[11px] text-emerald-400">pronta</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <button
                          onClick={() => removerLinha(i)}
                          title="Não importar esta linha"
                          className="text-slate-600 transition hover:text-slate-300"
                        >
                          <X size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] text-slate-500">
              Corrija número e quadra direto na tabela, ou tire a linha com o ×. Só entram as
              unidades sem problema.
            </p>
            <button
              onClick={gravar}
              disabled={gravando || validas.length === 0 || analise.licenca.bloqueado}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-emerald-500 disabled:opacity-40"
            >
              {gravando ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
              Importar {validas.length} {validas.length === 1 ? 'unidade' : 'unidades'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
