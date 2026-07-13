'use client';

import { useState, useEffect } from 'react';
import { CalendarClock, Loader2, TriangleAlert, ArrowDownRight, ArrowUpRight } from 'lucide-react';

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmtK = (v: number) => {
  const a = Math.abs(v);
  if (a >= 1000) return `${v < 0 ? '-' : ''}R$ ${(a / 1000).toFixed(a >= 10000 ? 0 : 1)}k`;
  return fmt(v);
};

export default function FluxoProjetadoPage() {
  const [empreendimentos, setEmpreendimentos] = useState<any[]>([]);
  const [empId, setEmpId] = useState('ALL');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const emps = await fetch('/api/empreendimentos').then((r) => r.json());
      setEmpreendimentos(emps || []);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const q = empId && empId !== 'ALL' ? `?empreendimentoId=${empId}` : '';
        const res = await fetch(`/api/gestao/fluxo-projetado${q}`).then((r) => r.json());
        setData(res);
      } finally {
        setLoading(false);
      }
    })();
  }, [empId]);

  const r = data?.resumo;
  const semanas = data?.semanas || [];
  const maxFluxo = Math.max(1, ...semanas.map((s: any) => Math.max(s.entradas, s.saidas)));

  return (
    <div className="space-y-6 p-6 min-h-screen bg-[#060814] text-slate-100">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-900 pb-5">
        <div>
          <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block">Gestão · Tesouraria</span>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2 mt-0.5">
            <CalendarClock className="text-indigo-400" size={24} /> Fluxo de Caixa Projetado
          </h1>
          <p className="text-xs text-slate-400 mt-1">Calendário semanal das contas a pagar e a receber já datadas. Mostra quando o caixa aperta antes de apertar.</p>
        </div>
        <select value={empId} onChange={(e) => setEmpId(e.target.value)} className="bg-[#0b0f19] border border-slate-800 text-xs text-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500/50">
          <option value="ALL">Todos os empreendimentos</option>
          {empreendimentos.map((e) => (<option key={e.id} value={e.id}>{e.nome}</option>))}
        </select>
      </div>

      {loading ? (
        <div className="py-20 text-center"><Loader2 className="animate-spin text-indigo-500 mx-auto" size={26} /></div>
      ) : !data || !r ? (
        <div className="glassmorphism p-8 rounded-2xl text-center text-sm text-slate-500">Sem dados.</div>
      ) : (
        <>
          {/* Alerta de ruptura */}
          {r.semanaRuptura ? (
            <div className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4">
              <TriangleAlert className="text-red-400 shrink-0 mt-0.5" size={20} />
              <div>
                <p className="text-sm font-bold text-red-300">Risco de ruptura de caixa na semana de {r.semanaRuptura}</p>
                <p className="text-xs text-red-200/70 mt-0.5">O saldo projetado fica negativo (menor saldo: {fmt(r.menorSaldo)}). Antecipe recebíveis ou renegocie pagamentos antes dessa data.</p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/5 px-5 py-4">
              <div>
                <p className="text-sm font-bold text-emerald-300">Sem ruptura projetada no horizonte</p>
                <p className="text-xs text-emerald-200/60 mt-0.5">Menor saldo projetado: {fmt(r.menorSaldo)}.</p>
              </div>
            </div>
          )}

          {/* Resumo */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glassmorphism p-4 rounded-2xl border border-slate-850">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Saldo em conta hoje</span>
              <p className="text-lg font-bold font-mono mt-1.5 text-white">{fmt(data.saldoInicial)}</p>
            </div>
            <div className="glassmorphism p-4 rounded-2xl border border-emerald-500/20">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">A receber (horizonte)</span>
              <p className="text-lg font-bold font-mono mt-1.5 text-emerald-400">{fmt(r.totalEntradas)}</p>
            </div>
            <div className="glassmorphism p-4 rounded-2xl border border-red-500/20">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">A pagar (horizonte)</span>
              <p className="text-lg font-bold font-mono mt-1.5 text-red-400">{fmt(r.totalSaidas)}</p>
              {r.vencidoPagar > 0 && <p className="text-[10px] text-red-300/70 mt-0.5">inclui {fmt(r.vencidoPagar)} já vencido</p>}
            </div>
            <div className={`glassmorphism p-4 rounded-2xl border ${r.compromissoOrcadoNaoIncorrido > 0 ? 'border-amber-500/20' : 'border-slate-850'}`}>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Orçado ainda não gasto</span>
              <p className={`text-lg font-bold font-mono mt-1.5 ${r.compromissoOrcadoNaoIncorrido > 0 ? 'text-amber-400' : 'text-slate-300'}`}>{fmt(r.compromissoOrcadoNaoIncorrido)}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">compromisso fora do calendário</p>
            </div>
          </div>

          {/* Calendário semanal */}
          <div className="bg-slate-950/20 border border-slate-900 rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-slate-900">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Próximas {semanas.length} semanas</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-900 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Semana de</th>
                    <th className="py-3 px-4 text-right">Entradas</th>
                    <th className="py-3 px-4 text-right">Saídas</th>
                    <th className="py-3 px-4">Fluxo</th>
                    <th className="py-3 px-4 text-right">Saldo acumulado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/60 text-slate-300 font-mono">
                  {semanas.map((s: any) => (
                    <tr key={s.indice} className="hover:bg-slate-900/20">
                      <td className="py-3 px-4 font-sans">
                        <span className="font-semibold text-slate-200">{s.label}</span>
                        {s.indice === 0 && <span className="ml-1.5 text-[9px] text-slate-500 uppercase">(atual + vencidos)</span>}
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-400">{s.entradas > 0 ? fmt(s.entradas) : <span className="text-slate-600">—</span>}</td>
                      <td className="py-3 px-4 text-right text-red-400">{s.saidas > 0 ? fmt(s.saidas) : <span className="text-slate-600">—</span>}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 w-40">
                          <div className="flex-1 flex justify-end">
                            {s.entradas > 0 && <div className="h-2 rounded-l bg-emerald-500/60" style={{ width: `${(s.entradas / maxFluxo) * 100}%` }} />}
                          </div>
                          <div className="w-px h-3 bg-slate-700" />
                          <div className="flex-1">
                            {s.saidas > 0 && <div className="h-2 rounded-r bg-red-500/60" style={{ width: `${(s.saidas / maxFluxo) * 100}%` }} />}
                          </div>
                        </div>
                      </td>
                      <td className={`py-3 px-4 text-right font-bold ${s.saldoAcumulado < 0 ? 'text-red-400' : 'text-slate-200'}`}>
                        {s.saldoAcumulado < 0 && <TriangleAlert size={11} className="inline mr-1 -mt-0.5" />}{fmt(s.saldoAcumulado)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Fora do horizonte */}
          {(r.pagarAlemHorizonte > 0 || r.receberAlemHorizonte > 0) && (
            <div className="flex flex-wrap gap-4 text-xs text-slate-400">
              {r.receberAlemHorizonte > 0 && (
                <span className="inline-flex items-center gap-1"><ArrowUpRight size={13} className="text-emerald-400" /> A receber além do horizonte: <span className="font-mono text-slate-200">{fmtK(r.receberAlemHorizonte)}</span></span>
              )}
              {r.pagarAlemHorizonte > 0 && (
                <span className="inline-flex items-center gap-1"><ArrowDownRight size={13} className="text-red-400" /> A pagar além do horizonte: <span className="font-mono text-slate-200">{fmtK(r.pagarAlemHorizonte)}</span></span>
              )}
            </div>
          )}
          <p className="text-[11px] text-slate-500 px-1">
            Baseado em contas a pagar/receber já lançadas (PENDENTE/ATRASADO) por data de vencimento. Contas vencidas entram na semana atual. "Orçado ainda não gasto" é o compromisso do plano das obras ativas que ainda não virou conta a pagar — vai pesar no caixa além do que aparece no calendário.
          </p>
        </>
      )}
    </div>
  );
}
