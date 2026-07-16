'use client';

import { useEffect, useState, useCallback } from 'react';
import { Loader2, Sparkles, Save, ExternalLink, AlertTriangle, CheckCircle2 } from 'lucide-react';

type FaixaChave = 'FAIXA_1' | 'FAIXA_2' | 'FAIXA_3' | 'FAIXA_4';
const FAIXAS: FaixaChave[] = ['FAIXA_1', 'FAIXA_2', 'FAIXA_3', 'FAIXA_4'];
const LABEL: Record<FaixaChave, string> = {
  FAIXA_1: 'Faixa 1',
  FAIXA_2: 'Faixa 2',
  FAIXA_3: 'Faixa 3',
  FAIXA_4: 'Faixa 4',
};

interface LinhaParam {
  faixa: FaixaChave;
  tetoValorImovel: string;
  areaUtilMinima: string;
  percentualUnidadesAcessiveis: string;
  portariaReferencia?: string | null;
  atualizadoPor?: string | null;
  atualizadoEm?: string | null;
}

interface Sugestao {
  configurado: boolean;
  erro?: boolean;
  mensagem?: string;
  faixas?: { faixa: FaixaChave; tetoValorImovel: number; areaUtilMinima: number; percentualUnidadesAcessiveis: number }[];
  portariaReferencia?: string;
  dataVigencia?: string;
  fonteUrl?: string;
  confianca?: string;
  fontes?: { titulo?: string; url: string }[];
}

// Valores de REFERÊNCIA (nacional, aproximados) usados como ponto de partida
// quando ainda não há parâmetro salvo. O ADMIN revisa e salva — ou usa a consulta
// por IA para ajustar conforme a portaria vigente e a região. Não são gravados
// automaticamente: só persistem quando o ADMIN clica em Salvar.
const DEFAULTS: Record<FaixaChave, { teto: number; area: number }> = {
  FAIXA_1: { teto: 200000, area: 36 },
  FAIXA_2: { teto: 264000, area: 38 },
  FAIXA_3: { teto: 350000, area: 40 },
  FAIXA_4: { teto: 600000, area: 40 },
};

function linhaVazia(faixa: FaixaChave): LinhaParam {
  return {
    faixa,
    tetoValorImovel: String(DEFAULTS[faixa].teto),
    areaUtilMinima: String(DEFAULTS[faixa].area),
    percentualUnidadesAcessiveis: '3',
  };
}

export default function ParametrosMCMVManager({ iaConfigurada }: { iaConfigurada: boolean }) {
  const [linhas, setLinhas] = useState<LinhaParam[]>(FAIXAS.map(linhaVazia));
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [consultando, setConsultando] = useState(false);
  const [sugestao, setSugestao] = useState<Sugestao | null>(null);
  const [msg, setMsg] = useState('');

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/mcmv/parametros', { cache: 'no-store' });
      const dados = res.ok ? await res.json() : [];
      const porFaixa = new Map<string, any>((dados as any[]).map((p) => [p.faixa, p]));
      setLinhas(
        FAIXAS.map((f) => {
          const p = porFaixa.get(f);
          return p
            ? {
                faixa: f,
                tetoValorImovel: String(p.tetoValorImovel ?? ''),
                areaUtilMinima: String(p.areaUtilMinima ?? ''),
                percentualUnidadesAcessiveis: String(p.percentualUnidadesAcessiveis ?? '3'),
                portariaReferencia: p.portariaReferencia,
                atualizadoPor: p.atualizadoPor,
                atualizadoEm: p.atualizadoEm,
              }
            : linhaVazia(f);
        }),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const setCampo = (faixa: FaixaChave, campo: keyof LinhaParam, valor: string) => {
    setLinhas((prev) => prev.map((l) => (l.faixa === faixa ? { ...l, [campo]: valor } : l)));
  };

  const salvar = async () => {
    setSalvando(true);
    setMsg('');
    try {
      const parametros = linhas
        .filter((l) => l.tetoValorImovel && l.areaUtilMinima)
        .map((l) => ({
          faixa: l.faixa,
          tetoValorImovel: Number(l.tetoValorImovel),
          areaUtilMinima: Number(l.areaUtilMinima),
          percentualUnidadesAcessiveis: Number(l.percentualUnidadesAcessiveis) || 3,
          portariaReferencia: l.portariaReferencia ?? null,
        }));
      const res = await fetch('/api/mcmv/parametros', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parametros }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setMsg(j?.error || 'Erro ao salvar.');
        return;
      }
      setMsg('Parâmetros salvos com sucesso.');
      await carregar();
    } finally {
      setSalvando(false);
    }
  };

  const consultarIA = async () => {
    setConsultando(true);
    setSugestao(null);
    setMsg('');
    try {
      const res = await fetch('/api/mcmv/parametros/consultar-ia', { method: 'POST' });
      const s: Sugestao = await res.json();
      setSugestao(s);
    } catch {
      setSugestao({ configurado: true, erro: true, mensagem: 'Falha ao consultar a IA.' });
    } finally {
      setConsultando(false);
    }
  };

  const aplicarSugestao = () => {
    if (!sugestao?.faixas) return;
    const porFaixa = new Map(sugestao.faixas.map((f) => [f.faixa, f]));
    setLinhas((prev) =>
      prev.map((l) => {
        const s = porFaixa.get(l.faixa);
        if (!s) return l;
        return {
          ...l,
          tetoValorImovel: s.tetoValorImovel ? String(s.tetoValorImovel) : l.tetoValorImovel,
          areaUtilMinima: s.areaUtilMinima ? String(s.areaUtilMinima) : l.areaUtilMinima,
          percentualUnidadesAcessiveis: s.percentualUnidadesAcessiveis
            ? String(s.percentualUnidadesAcessiveis)
            : l.percentualUnidadesAcessiveis,
          portariaReferencia: sugestao.portariaReferencia ?? l.portariaReferencia,
        };
      }),
    );
    setMsg('Sugestão preenchida nos campos. Revise e clique em Salvar para aplicar.');
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-400 text-sm py-10 justify-center">
        <Loader2 size={16} className="animate-spin" /> Carregando parâmetros…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Consulta IA */}
      <div className="rounded-xl border border-purple-500/20 bg-purple-500/[0.04] p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-sm font-bold text-purple-300 flex items-center gap-1.5">
              <Sparkles size={15} /> Consulta assistida por IA
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Busca a portaria vigente (Ministério das Cidades / Caixa) e sugere os valores. Você revisa a fonte e aplica.
            </p>
          </div>
          <button
            onClick={consultarIA}
            disabled={consultando || !iaConfigurada}
            title={iaConfigurada ? '' : 'Defina GEMINI_API_KEY no servidor para habilitar'}
            className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold rounded-xl text-xs transition"
          >
            {consultando ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {consultando ? 'Consultando…' : 'Consultar portaria vigente'}
          </button>
        </div>

        {!iaConfigurada && (
          <p className="text-[11px] text-amber-300/80 mt-2 flex items-center gap-1">
            <AlertTriangle size={11} /> IA não configurada (GEMINI_API_KEY ausente). Você ainda pode editar manualmente.
          </p>
        )}

        {sugestao && (
          <div className="mt-3 rounded-lg border border-slate-800 bg-[#0f1422]/70 p-3 text-xs">
            {sugestao.erro || !sugestao.faixas ? (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/[0.08] p-3.5">
                <p className="text-amber-200 flex items-start gap-1.5 font-semibold">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" /> A consulta por IA está indisponível agora.
                </p>
                <p className="text-[11px] text-amber-200/70 mt-1 pl-5">{sugestao.mensagem || 'A IA não retornou parâmetros.'}</p>
                <div className="mt-2.5 pl-5 text-slate-200 text-[13px] leading-relaxed">
                  💡 <strong>Sem problema:</strong> preencha os valores na tabela abaixo e clique em{' '}
                  <strong className="text-blue-300">Salvar</strong>. Os controles de conformidade funcionam do mesmo
                  jeito — a IA é só um atalho.
                  <br />
                  Confira os valores na fonte oficial:{' '}
                  <a
                    href="https://www.gov.br/cidades/pt-br/assuntos/habitacao/minha-casa-minha-vida"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-0.5"
                  >
                    Ministério das Cidades <ExternalLink size={10} />
                  </a>{' '}
                  ·{' '}
                  <a
                    href="https://www.caixa.gov.br/voce/habitacao/minha-casa-minha-vida/Paginas/default.aspx"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-0.5"
                  >
                    Caixa <ExternalLink size={10} />
                  </a>
                  .
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-slate-300 font-semibold">Sugestão da IA</span>
                  <button
                    onClick={aplicarSugestao}
                    className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold"
                  >
                    <CheckCircle2 size={12} /> Preencher campos
                  </button>
                </div>
                <table className="w-full mt-2 text-slate-300">
                  <thead className="text-slate-500">
                    <tr>
                      <th className="text-left font-medium">Faixa</th>
                      <th className="text-right font-medium">Teto (R$)</th>
                      <th className="text-right font-medium">Área mín. (m²)</th>
                      <th className="text-right font-medium">% acess.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sugestao.faixas.map((f) => (
                      <tr key={f.faixa}>
                        <td>{LABEL[f.faixa]}</td>
                        <td className="text-right font-mono">{f.tetoValorImovel.toLocaleString('pt-BR')}</td>
                        <td className="text-right font-mono">{f.areaUtilMinima}</td>
                        <td className="text-right font-mono">{f.percentualUnidadesAcessiveis}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-2 text-[11px] text-slate-400 space-y-0.5">
                  {sugestao.portariaReferencia && <p>Base: {sugestao.portariaReferencia}</p>}
                  {sugestao.dataVigencia && <p>Vigência: {sugestao.dataVigencia}</p>}
                  {sugestao.confianca && <p>Confiança: {sugestao.confianca}</p>}
                  {(sugestao.fontes && sugestao.fontes.length > 0) || sugestao.fonteUrl ? (
                    <div className="pt-1">
                      <span className="text-slate-500">Fontes: </span>
                      {sugestao.fonteUrl && (
                        <a href={sugestao.fonteUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-0.5 mr-2">
                          principal <ExternalLink size={9} />
                        </a>
                      )}
                      {sugestao.fontes?.map((s, i) => (
                        <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-0.5 mr-2">
                          {s.titulo ? s.titulo.slice(0, 30) : `fonte ${i + 1}`} <ExternalLink size={9} />
                        </a>
                      ))}
                    </div>
                  ) : null}
                  <p className="text-amber-300/70 pt-1 flex items-center gap-1">
                    <AlertTriangle size={10} /> Valores gerados por IA — confira na fonte oficial antes de aplicar.
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Tabela editável */}
      <div className="glassmorphism rounded-xl border border-slate-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/50 text-slate-400 text-xs">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Faixa</th>
              <th className="text-left px-4 py-3 font-semibold">Teto do imóvel (R$)</th>
              <th className="text-left px-4 py-3 font-semibold">Área útil mínima (m²)</th>
              <th className="text-left px-4 py-3 font-semibold">% unidades acessíveis</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {linhas.map((l) => (
              <tr key={l.faixa}>
                <td className="px-4 py-3 font-semibold text-slate-200">
                  {LABEL[l.faixa]}
                  {l.atualizadoPor && (
                    <span className="block text-[10px] text-slate-500 font-normal">
                      por {l.atualizadoPor}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2">
                  <input
                    type="number"
                    value={l.tetoValorImovel}
                    onChange={(e) => setCampo(l.faixa, 'tetoValorImovel', e.target.value)}
                    placeholder="0"
                    className="w-40 bg-[#0f1422] border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-200 font-mono focus:outline-none focus:border-blue-500/50"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="number"
                    value={l.areaUtilMinima}
                    onChange={(e) => setCampo(l.faixa, 'areaUtilMinima', e.target.value)}
                    placeholder="0"
                    className="w-28 bg-[#0f1422] border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-200 font-mono focus:outline-none focus:border-blue-500/50"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="number"
                    value={l.percentualUnidadesAcessiveis}
                    onChange={(e) => setCampo(l.faixa, 'percentualUnidadesAcessiveis', e.target.value)}
                    placeholder="3"
                    className="w-24 bg-[#0f1422] border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-200 font-mono focus:outline-none focus:border-blue-500/50"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={salvar}
          disabled={salvando}
          className="flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition"
        >
          {salvando ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          {salvando ? 'Salvando…' : 'Salvar parâmetros'}
        </button>
        {msg && <span className="text-xs text-slate-400">{msg}</span>}
      </div>
    </div>
  );
}
