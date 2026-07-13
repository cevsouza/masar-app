'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard, Loader2, TrendingUp, Wallet, Banknote, ShieldCheck, FolderLock,
  Package, Percent, Building2, AlertTriangle, ArrowRight, ShieldAlert,
} from 'lucide-react';

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

function Card({ href, icon: Icon, titulo, children, alerta }: any) {
  const inner = (
    <div className={`glassmorphism p-5 rounded-2xl border h-full transition ${alerta ? 'border-red-500/30 bg-red-950/5' : 'border-slate-850 hover:border-slate-700'}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
          <Icon size={13} className={alerta ? 'text-red-400' : 'text-indigo-400'} /> {titulo}
        </span>
        {href && <ArrowRight size={13} className="text-slate-600" />}
      </div>
      {children}
    </div>
  );
  return href ? <Link href={href} className="block">{inner}</Link> : inner;
}

export default function PainelExecutivoPage() {
  const [d, setD] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/dashboard/executivo').then((r) => r.json());
        setD(res);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <div className="py-24 text-center"><Loader2 className="animate-spin text-indigo-500 mx-auto" size={28} /><p className="text-xs text-slate-500 font-mono mt-3">Consolidando o ERP...</p></div>;
  }
  if (!d || d.error) {
    return <div className="p-6 text-sm text-slate-400">Não foi possível carregar o painel.</div>;
  }

  const f = d.financeiro, c = d.contas, s = d.sst, g = d.ged, e = d.estoque, fi = d.fiscal, op = d.operacional;
  const sstPend = s.asosVencidos + s.episVencidos;
  const margem = f.vgvRealizado > 0 ? (f.lucroRealizado / f.vgvRealizado) * 100 : 0;

  return (
    <div className="space-y-6 p-6 min-h-screen bg-[#060814] text-slate-100">
      <div className="border-b border-slate-900 pb-5">
        <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block">Portal Único · Gestão</span>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2 mt-0.5">
          <LayoutDashboard className="text-indigo-400" size={24} /> Painel Executivo
        </h1>
        <p className="text-xs text-slate-400 mt-1">Visão consolidada de todos os empreendimentos: financeiro, contas, fiscal, segurança, estoque e obras.</p>
      </div>

      {/* Alerta de ruptura de caixa */}
      {f.runwayAlert && (
        <div className="p-3 bg-red-950/40 border border-red-500/30 text-red-300 rounded-xl text-xs flex items-start gap-2.5">
          <ShieldAlert size={16} className="text-red-400 shrink-0 mt-0.5" />
          <span>{f.runwayAlert}</span>
        </div>
      )}

      {/* Linha 1 — Financeiro consolidado */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card icon={TrendingUp} titulo="VGV Realizado">
          <p className="text-xl font-bold text-white font-mono">{fmt(f.vgvRealizado)}</p>
          <p className="text-[10px] text-slate-500 mt-1">Vendas consolidadas</p>
        </Card>
        <Card icon={Banknote} titulo="Lucro Líquido">
          <p className={`text-xl font-bold font-mono ${f.lucroRealizado >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmt(f.lucroRealizado)}</p>
          <p className="text-[10px] text-slate-500 mt-1">Margem {margem.toFixed(1)}% · projetado {fmt(f.lucroProjetado)}</p>
        </Card>
        <Card icon={Wallet} titulo="Caixa Livre" alerta={f.caixaLivre < 0}>
          <p className={`text-xl font-bold font-mono ${f.caixaLivre >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmt(f.caixaLivre)}</p>
          <p className="text-[10px] text-slate-500 mt-1">Saldo em conta {fmt(f.saldoBancario)}</p>
        </Card>
        <Card icon={Building2} titulo="Operação">
          <p className="text-xl font-bold text-white font-mono">{op.casasEmObra}<span className="text-sm text-slate-500"> obras</span></p>
          <p className="text-[10px] text-slate-500 mt-1">{op.totalEmpreendimentos} empreendimentos{op.medicoesGlosadas > 0 ? ` · ${op.medicoesGlosadas} glosa(s)` : ''}</p>
        </Card>
      </div>

      {/* Linha 2 — Contas, Fiscal */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card href="/financeiro?tab=contas" icon={Banknote} titulo="Contas a Pagar" alerta={c.aPagarVencido > 0}>
          <p className="text-xl font-bold text-red-400 font-mono">{fmt(c.aPagar)}</p>
          <p className="text-[10px] text-slate-500 mt-1">{c.aPagarVencido > 0 ? <span className="text-red-400 font-bold">{fmt(c.aPagarVencido)} vencido</span> : 'nada vencido'}</p>
        </Card>
        <Card href="/financeiro?tab=contas" icon={Banknote} titulo="Contas a Receber" alerta={c.aReceberVencido > 0}>
          <p className="text-xl font-bold text-emerald-400 font-mono">{fmt(c.aReceber)}</p>
          <p className="text-[10px] text-slate-500 mt-1">{c.aReceberVencido > 0 ? <span className="text-amber-400 font-bold">{fmt(c.aReceberVencido)} vencido</span> : 'nada vencido'}</p>
        </Card>
        <Card href="/fiscal/impostos" icon={Percent} titulo="RET Pendente" alerta={fi.retPendente > 0}>
          <p className={`text-xl font-bold font-mono ${fi.retPendente > 0 ? 'text-amber-400' : 'text-slate-300'}`}>{fmt(fi.retPendente)}</p>
          <p className="text-[10px] text-slate-500 mt-1">Impostos a gerar guia</p>
        </Card>
      </div>

      {/* Linha 3 — Riscos operacionais (SST, GED, Estoque) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card href="/trabalhadores" icon={ShieldCheck} titulo="Segurança (SST)" alerta={sstPend > 0}>
          <p className={`text-xl font-bold font-mono ${sstPend > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            {sstPend > 0 ? `${sstPend} vencido(s)` : 'Em dia'}
          </p>
          <p className="text-[10px] text-slate-500 mt-1">
            ASO: {s.asosVencidos} venc. / {s.asosAVencer} a vencer · EPI: {s.episVencidos} venc. / {s.episAVencer} a vencer
          </p>
        </Card>
        <Card href="/fiscal/documentos" icon={FolderLock} titulo="Documentos (GED)" alerta={g.vencidos > 0}>
          <p className={`text-xl font-bold font-mono ${g.vencidos > 0 ? 'text-red-400' : g.aVencer > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {g.vencidos > 0 ? `${g.vencidos} vencido(s)` : g.aVencer > 0 ? `${g.aVencer} a vencer` : 'Em dia'}
          </p>
          <p className="text-[10px] text-slate-500 mt-1">{g.vencidos} vencido(s) · {g.aVencer} a vencer (30d)</p>
        </Card>
        <Card href="/insumos" icon={Package} titulo="Estoque" alerta={e.abaixoMinimo > 0}>
          <p className={`text-xl font-bold font-mono ${e.abaixoMinimo > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            {e.abaixoMinimo > 0 ? `${e.abaixoMinimo} abaixo` : 'Em dia'}
          </p>
          <p className="text-[10px] text-slate-500 mt-1">Insumos abaixo do nível mínimo</p>
        </Card>
      </div>

      <p className="text-[11px] text-slate-500 px-1 flex items-center gap-1.5">
        <AlertTriangle size={12} className="text-slate-600" /> Clique num cartão para ir direto ao módulo. Os mesmos alertas chegam no relatório diário por e-mail.
      </p>
    </div>
  );
}
