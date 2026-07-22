'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, FileSpreadsheet, AlertTriangle } from 'lucide-react';
import AvisoTravaMedicao, { type PendenciaTravaUI } from '@/components/AvisoTravaMedicao';

interface Medicao {
  id: string;
  referencia: string | null;
  percentualMedido: number;
  valorLiberado: number;
  status: 'AGUARDANDO' | 'PAGA' | 'GLOSADA_REPROVADA';
  dataMedicao: string;
}

const brl = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const ROTULO_STATUS: Record<Medicao['status'], { texto: string; cls: string }> = {
  AGUARDANDO: { texto: 'Aguardando', cls: 'text-amber-400' },
  PAGA: { texto: 'Paga', cls: 'text-emerald-400' },
  GLOSADA_REPROVADA: { texto: 'Glosada', cls: 'text-red-400' },
};

/**
 * Medições de um empreendimento VERTICAL.
 *
 * Em prédio não existe "medição do apartamento 101": fundação, estrutura e
 * lajes servem todas as unidades ao mesmo tempo, e o que o engenheiro
 * credenciado mede é o avanço da torre. Por isso a medição mora aqui, na ficha
 * do empreendimento, e não na unidade — no horizontal continua na casa, que é
 * onde a vistoria acontece.
 *
 * As travas são as mesmas dos dois lados: segurança do trabalho e conformidade
 * MCMV. O aviso que aparece ao ser bloqueado é literalmente o mesmo componente.
 */
export default function MedicoesTorre({
  empreendimentoId,
  userRole,
}: {
  empreendimentoId: string;
  userRole: string;
}) {
  const router = useRouter();
  const [medicoes, setMedicoes] = useState<Medicao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [referencia, setReferencia] = useState('');
  const [percentual, setPercentual] = useState('');
  const [valor, setValor] = useState('');
  const [status, setStatus] = useState<Medicao['status']>('AGUARDANDO');

  const [trava, setTrava] = useState<{
    titulo: string;
    resumo: string;
    pendencias: PendenciaTravaUI[];
    retomar: () => Promise<void>;
  } | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const r = await fetch(`/api/empreendimentos/${empreendimentoId}/medicoes`);
      setMedicoes(r.ok ? await r.json() : []);
    } finally {
      setCarregando(false);
    }
  }, [empreendimentoId]);

  useEffect(() => { carregar(); }, [carregar]);

  const dadosDaTrava = (d: any) => {
    const pendencias: PendenciaTravaUI[] = d.pendencias ?? [];
    const n = pendencias.length;
    const vencidas = pendencias.filter((p) => p.prazo?.startsWith('venceu')).length;
    const base = n === 1 ? 'Falta 1 item' : `Faltam ${n} itens`;
    return {
      titulo:
        d.error === 'BLOQUEIO_SEGURANCA'
          ? 'Segurança do trabalho impede a liberação'
          : 'Conformidade MCMV/Caixa impede a liberação',
      resumo: n
        ? vencidas
          ? `${base} para liberar esta medição — ${vencidas} já ${vencidas === 1 ? 'vencido' : 'vencidos'}.`
          : `${base} para liberar esta medição.`
        : d.message,
      pendencias,
    };
  };

  const registrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    try {
      const enviar = (forcar: boolean) =>
        fetch(`/api/empreendimentos/${empreendimentoId}/medicoes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            referencia,
            percentualMedido: parseFloat(percentual.replace(',', '.')),
            valorLiberado: parseFloat(valor.replace(/\./g, '').replace(',', '.')),
            status,
            forcarLiberacao: forcar,
          }),
        });

      const r = await enviar(false);
      if (r.status === 409) {
        const d = await r.json();
        setTrava({
          ...dadosDaTrava(d),
          retomar: async () => {
            const r2 = await enviar(true);
            if (!r2.ok) {
              const d2 = await r2.json().catch(() => null);
              throw new Error(d2?.message || 'Liberação excepcional negada (requer ADMIN).');
            }
            setReferencia(''); setPercentual(''); setValor('');
            await carregar();
            router.refresh();
          },
        });
        return;
      }
      if (!r.ok) {
        const d = await r.json().catch(() => null);
        throw new Error(d?.message || d?.error || 'Não foi possível registrar a medição.');
      }
      setReferencia(''); setPercentual(''); setValor('');
      await carregar();
      router.refresh();
    } catch (e: any) {
      setErro(e.message);
    } finally {
      setSalvando(false);
    }
  };

  const total = medicoes.filter((m) => m.status === 'PAGA').reduce((s, m) => s + m.valorLiberado, 0);
  const aguardando = medicoes.filter((m) => m.status === 'AGUARDANDO').reduce((s, m) => s + m.valorLiberado, 0);

  return (
    <div className="space-y-5">
      {trava && (
        <AvisoTravaMedicao
          titulo={trava.titulo}
          resumo={trava.resumo}
          pendencias={trava.pendencias}
          podeForcar={userRole === 'ADMIN'}
          onFechar={() => setTrava(null)}
          onForcar={async () => {
            const acao = trava.retomar;
            setTrava(null);
            try { await acao(); } catch (e: any) { setErro(e?.message || 'Não foi possível liberar.'); }
          }}
        />
      )}

      <div className="flex items-start gap-3 rounded-2xl border border-slate-800/80 bg-slate-950/20 px-4 py-3">
        <FileSpreadsheet size={16} className="mt-0.5 shrink-0 text-indigo-400" />
        <p className="text-[11px] leading-relaxed text-slate-400">
          Neste empreendimento a medição é <strong className="text-slate-300">da torre</strong>, não
          de cada apartamento — é assim que o engenheiro credenciado mede um prédio: fundação,
          estrutura e lajes servem todas as unidades ao mesmo tempo. As travas de segurança do
          trabalho e de conformidade MCMV valem igual.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/20 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Liberado (pago)</p>
          <p className="mt-1 text-xl font-bold text-emerald-400">{brl(total)}</p>
        </div>
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/20 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Aguardando a Caixa</p>
          <p className="mt-1 text-xl font-bold text-amber-400">{brl(aguardando)}</p>
        </div>
      </div>

      <form onSubmit={registrar} className="rounded-2xl border border-slate-800/80 bg-slate-950/20 p-5">
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Registrar medição</p>
        <div className="grid gap-3 sm:grid-cols-4">
          <div>
            <label className="mb-1 block text-[10px] font-medium text-slate-400">Torre / bloco</label>
            <input
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              placeholder="Torre A"
              className="w-full rounded-xl border border-slate-800 bg-[#0f1422] px-3 py-2 text-sm text-slate-200 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-medium text-slate-400">Avanço medido (%)</label>
            <input
              required
              value={percentual}
              onChange={(e) => setPercentual(e.target.value)}
              placeholder="35"
              className="w-full rounded-xl border border-slate-800 bg-[#0f1422] px-3 py-2 text-sm text-slate-200 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-medium text-slate-400">Valor liberado (R$)</label>
            <input
              required
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="900.000,00"
              className="w-full rounded-xl border border-slate-800 bg-[#0f1422] px-3 py-2 text-sm text-slate-200 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-medium text-slate-400">Situação</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Medicao['status'])}
              className="w-full rounded-xl border border-slate-800 bg-[#0f1422] px-3 py-2 text-sm text-slate-200 focus:outline-none"
            >
              <option value="AGUARDANDO">Aguardando</option>
              <option value="PAGA">Paga</option>
              <option value="GLOSADA_REPROVADA">Glosada</option>
            </select>
          </div>
        </div>

        {erro && (
          <p className="mt-3 flex items-start gap-2 text-[11px] text-red-400">
            <AlertTriangle size={13} className="mt-px shrink-0" /> {erro}
          </p>
        )}

        <button
          type="submit"
          disabled={salvando}
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-indigo-500 disabled:opacity-50"
        >
          {salvando ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />}
          Registrar medição
        </button>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-slate-800/80">
        {carregando ? (
          <div className="py-12 text-center"><Loader2 className="mx-auto animate-spin text-indigo-500" size={22} /></div>
        ) : medicoes.length === 0 ? (
          <p className="py-12 text-center text-xs text-slate-500">
            Nenhuma medição registrada ainda.
          </p>
        ) : (
          <table className="w-full text-xs">
            <thead className="text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-2.5 text-left font-bold">Data</th>
                <th className="px-4 py-2.5 text-left font-bold">Torre / bloco</th>
                <th className="px-4 py-2.5 text-right font-bold">Avanço</th>
                <th className="px-4 py-2.5 text-right font-bold">Valor</th>
                <th className="px-4 py-2.5 text-left font-bold">Situação</th>
              </tr>
            </thead>
            <tbody>
              {medicoes.map((m) => (
                <tr key={m.id} className="border-t border-slate-800/70">
                  <td className="px-4 py-2.5 text-slate-400">
                    {new Date(m.dataMedicao).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-2.5 text-slate-200">{m.referencia || '—'}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-300">{m.percentualMedido}%</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-100">{brl(m.valorLiberado)}</td>
                  <td className={`px-4 py-2.5 font-bold ${ROTULO_STATUS[m.status].cls}`}>
                    {ROTULO_STATUS[m.status].texto}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
