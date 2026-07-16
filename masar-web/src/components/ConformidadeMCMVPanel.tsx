'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ShieldCheck, AlertTriangle, Loader2, RefreshCw, FileWarning, Lock } from 'lucide-react';

type StatusConformidade = 'PENDENTE' | 'EM_ANDAMENTO' | 'CONFORME' | 'NAO_CONFORME' | 'NAO_APLICAVEL';

interface ItemAvaliado {
  chave: string;
  categoria: string;
  categoriaLabel: string;
  titulo: string;
  descricao: string;
  obrigatorio: boolean;
  tipoAvaliacao: 'AUTO' | 'DOC' | 'MANUAL';
  status: StatusConformidade;
  detalhe?: string;
  observacao?: string | null;
  bloqueiaMedicao: boolean;
  itemId?: string;
}

interface Resultado {
  regimeMCMV: boolean;
  faixaMCMV: string | null;
  itens: ItemAvaliado[];
  resumo: { totalObrigatorios: number; conformes: number; percentual: number; pendencias: number; naoConformes: number };
  bloqueadores: string[];
}

const STATUS_META: Record<StatusConformidade, { label: string; cls: string }> = {
  CONFORME: { label: 'Conforme', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  PENDENTE: { label: 'Pendente', cls: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
  EM_ANDAMENTO: { label: 'Em andamento', cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  NAO_CONFORME: { label: 'Não conforme', cls: 'bg-red-500/10 text-red-400 border-red-500/20' },
  NAO_APLICAVEL: { label: 'Não se aplica', cls: 'bg-slate-700/30 text-slate-500 border-slate-700/40' },
};

const TIPO_LABEL: Record<string, string> = { AUTO: 'Automático', DOC: 'Documento', MANUAL: 'Manual' };
const CATEGORIAS = ['A', 'B', 'C', 'D'];

export default function ConformidadeMCMVPanel({
  empreendimentoId,
  faixaMCMV,
  podeEditar,
}: {
  empreendimentoId: string;
  faixaMCMV?: string | null;
  podeEditar: boolean;
}) {
  const [data, setData] = useState<Resultado | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro('');
    try {
      const res = await fetch(`/api/mcmv/conformidade?empreendimentoId=${empreendimentoId}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Falha ao carregar conformidade');
      setData(await res.json());
    } catch (e: any) {
      setErro(e?.message || 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }, [empreendimentoId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const patchItem = async (itemId: string, payload: { status?: StatusConformidade; observacao?: string }) => {
    setSavingId(itemId);
    try {
      const res = await fetch(`/api/mcmv/conformidade/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j?.error || 'Não foi possível atualizar o item.');
        return;
      }
      await carregar();
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-400 text-sm py-10 justify-center">
        <Loader2 size={16} className="animate-spin" /> Carregando conformidade…
      </div>
    );
  }

  if (erro || !data) {
    return (
      <div className="text-sm text-red-400 py-10 text-center">
        {erro || 'Não foi possível carregar.'}{' '}
        <button onClick={carregar} className="underline">Tentar novamente</button>
      </div>
    );
  }

  const { resumo } = data;
  const anelCor =
    resumo.percentual >= 100 ? 'text-emerald-400' : resumo.percentual >= 60 ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="space-y-5">
      {/* Cabeçalho: % conforme + resumo */}
      <div className="glassmorphism rounded-xl border border-slate-800 p-5 flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-4">
          <div className={`text-4xl font-black ${anelCor}`}>{resumo.percentual}%</div>
          <div>
            <div className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
              <ShieldCheck size={15} className="text-amber-400" /> Conformidade MCMV / Caixa
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              {faixaMCMV ? faixaMCMV.replace('FAIXA_', 'Faixa ') : 'Faixa não definida'} ·{' '}
              {resumo.conformes}/{resumo.totalObrigatorios} itens obrigatórios conformes
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs ml-auto">
          <span className="text-emerald-400 font-semibold">{resumo.conformes} conformes</span>
          <span className="text-slate-400 font-semibold">{resumo.pendencias} pendências</span>
          <span className="text-red-400 font-semibold">{resumo.naoConformes} não conformes</span>
          <button
            onClick={carregar}
            className="p-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 rounded-lg transition"
            title="Reavaliar"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* Bloqueadores de medição */}
      {data.bloqueadores.length > 0 && (
        <div className="rounded-xl border border-red-500/25 bg-red-500/[0.06] p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-red-300">
            <Lock size={14} /> Itens que travarão a liberação de medição
          </div>
          <ul className="mt-2 space-y-1 text-xs text-red-200/90 list-disc pl-5">
            {data.bloqueadores.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Checklist por categoria */}
      {CATEGORIAS.map((cat) => {
        const itens = data.itens.filter((i) => i.categoria === cat);
        if (itens.length === 0) return null;
        return (
          <div key={cat} className="space-y-2">
            <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-400">
              {cat}. {itens[0].categoriaLabel}
            </h3>
            <div className="space-y-2">
              {itens.map((item) => (
                <ItemLinha
                  key={item.chave}
                  item={item}
                  empreendimentoId={empreendimentoId}
                  podeEditar={podeEditar}
                  saving={savingId === item.itemId}
                  onPatch={patchItem}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ItemLinha({
  item,
  empreendimentoId,
  podeEditar,
  saving,
  onPatch,
}: {
  item: ItemAvaliado;
  empreendimentoId: string;
  podeEditar: boolean;
  saving: boolean;
  onPatch: (itemId: string, payload: { status?: StatusConformidade; observacao?: string }) => void;
}) {
  const [obs, setObs] = useState(item.observacao || '');
  const meta = STATUS_META[item.status];
  const editavel = podeEditar && !!item.itemId;

  return (
    <div className="rounded-xl border border-slate-800 bg-[#0f1422]/60 p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${meta.cls}`}>{meta.label}</span>
            <span className="text-sm font-semibold text-slate-100">{item.titulo}</span>
            {item.bloqueiaMedicao && (
              <span className="text-[9px] font-bold text-amber-400/90 flex items-center gap-0.5" title="Trava a liberação de medição">
                <Lock size={9} /> trava medição
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">{item.descricao}</p>
          {item.detalhe && (
            <p className="text-xs text-amber-300/80 mt-1 flex items-center gap-1">
              <AlertTriangle size={11} className="shrink-0" /> {item.detalhe}
            </p>
          )}
          {item.tipoAvaliacao === 'DOC' && (item.status === 'PENDENTE' || item.status === 'NAO_CONFORME') && (
            <Link
              href={`/empreendimentos/${empreendimentoId}/ficha-tecnica?tab=cofre`}
              className="text-xs text-blue-400 hover:text-blue-300 inline-flex items-center gap-1 mt-1"
            >
              <FileWarning size={11} /> Anexar no Cofre de Documentos
            </Link>
          )}
        </div>
        <span className="text-[9px] uppercase font-bold text-slate-600 shrink-0">{TIPO_LABEL[item.tipoAvaliacao]}</span>
      </div>

      {editavel && (
        <div className="mt-3 pt-3 border-t border-slate-800/70 flex flex-wrap items-center gap-2">
          {item.tipoAvaliacao === 'MANUAL' ? (
            <select
              value={item.status}
              disabled={saving}
              onChange={(e) => onPatch(item.itemId!, { status: e.target.value as StatusConformidade })}
              className="bg-[#0f1422] border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-amber-500/50"
            >
              <option value="PENDENTE">Pendente</option>
              <option value="EM_ANDAMENTO">Em andamento</option>
              <option value="CONFORME">Conforme</option>
              <option value="NAO_CONFORME">Não conforme</option>
              <option value="NAO_APLICAVEL">Não se aplica</option>
            </select>
          ) : (
            <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={item.status === 'NAO_APLICAVEL'}
                disabled={saving}
                onChange={(e) =>
                  onPatch(item.itemId!, { status: e.target.checked ? 'NAO_APLICAVEL' : 'PENDENTE' })
                }
                className="h-3.5 w-3.5 accent-slate-500 cursor-pointer"
              />
              Não se aplica
            </label>
          )}

          <input
            type="text"
            value={obs}
            placeholder="Observação…"
            disabled={saving}
            onChange={(e) => setObs(e.target.value)}
            onBlur={() => {
              if ((item.observacao || '') !== obs) onPatch(item.itemId!, { observacao: obs });
            }}
            className="flex-1 min-w-[160px] bg-[#0f1422] border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-blue-500/50"
          />
          {saving && <Loader2 size={13} className="animate-spin text-slate-500" />}
        </div>
      )}

      {!editavel && item.observacao && (
        <p className="mt-2 text-xs text-slate-500 italic">Obs.: {item.observacao}</p>
      )}
    </div>
  );
}
