'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle, CheckCircle2, ArrowLeft, Building2, Globe } from 'lucide-react';

export interface Ficha {
  id: string;
  nome: string;
  slug: string;
  cnpj: string | null;
  ativa: boolean;
  dominio: string | null;
  logoUrl: string | null;
  corPrimaria: string;
  corSecundaria: string;
  emailRemetente: string | null;
  plano: string;
  limiteObras: number | null;
  dataExpiracao: string | null;
  ehRaiz: boolean;
}

const campo =
  'w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2.5 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/60';
const rotulo = 'text-xs text-stone-400 font-semibold block mb-1.5';
const dica = 'text-[11px] text-stone-600 mt-1 leading-relaxed';

export default function FichaEmpresaForm({ inicial }: { inicial: Ficha }) {
  const router = useRouter();
  const [f, setF] = useState<Ficha>(inicial);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const set = <K extends keyof Ficha>(k: K, v: Ficha[K]) => {
    setF((p) => ({ ...p, [k]: v }));
    setOk(false);
  };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    try {
      const r = await fetch(`/api/plataforma/empresas/${f.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: f.nome,
          cnpj: f.cnpj,
          dominio: f.dominio,
          logoUrl: f.logoUrl,
          corPrimaria: f.corPrimaria,
          corSecundaria: f.corSecundaria,
          emailRemetente: f.emailRemetente,
          plano: f.plano,
          limiteObras: f.limiteObras,
          dataExpiracao: f.dataExpiracao,
          ativa: f.ativa,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Falha ao salvar.');
      setOk(true);
      router.refresh();
    } catch (e: any) {
      setErro(e.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <form onSubmit={salvar} className="max-w-2xl space-y-5">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/plataforma"
          className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-300"
        >
          <ArrowLeft size={13} /> Painel
        </Link>
        <span className="text-[11px] font-mono text-stone-600">{f.slug}</span>
      </div>

      {erro && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3.5 rounded-xl text-xs flex items-start gap-2.5">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{erro}</span>
        </div>
      )}
      {ok && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3.5 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 size={15} /> Alterações salvas. O cliente já vê a marca nova.
        </div>
      )}

      {/* ---------------- identidade visual ---------------- */}
      <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Building2 size={15} className="text-amber-500" />
          <p className="text-xs font-bold text-stone-300 uppercase tracking-wider">
            Identidade visual
          </p>
        </div>
        <p className="text-[11px] text-stone-500 leading-relaxed">
          É o que o cliente e os clientes DELE veem: tela de entrada, cabeçalho, relatórios
          impressos, portal do comprador e a página pública de cotação que o fornecedor abre.
        </p>

        <div>
          <label className={rotulo}>Nome exibido</label>
          <input className={campo} value={f.nome} onChange={(e) => set('nome', e.target.value)} required />
        </div>

        <div>
          <label className={rotulo}>Endereço do logotipo</label>
          <input
            className={campo}
            value={f.logoUrl ?? ''}
            onChange={(e) => set('logoUrl', e.target.value)}
            placeholder="https://..."
          />
          <p className={dica}>
            Endereço de uma imagem já hospedada. Vazio, o sistema usa a inicial do nome sobre a cor
            primária.
          </p>
          {f.logoUrl ? (
            <div className="mt-2 p-3 bg-stone-950 border border-stone-800 rounded-lg flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.logoUrl} alt="Prévia" className="h-9 w-auto max-w-[150px] object-contain" />
              <span className="text-[11px] text-stone-600">prévia</span>
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {(['corPrimaria', 'corSecundaria'] as const).map((k) => (
            <div key={k}>
              <label className={rotulo}>{k === 'corPrimaria' ? 'Cor primária' : 'Cor secundária'}</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={f[k]}
                  onChange={(e) => set(k, e.target.value)}
                  className="h-10 w-12 bg-stone-950 border border-stone-800 rounded-lg cursor-pointer"
                />
                <input
                  className={campo + ' font-mono'}
                  value={f[k]}
                  onChange={(e) => set(k, e.target.value)}
                  placeholder="#2563eb"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ---------------- domínio ---------------- */}
      <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Globe size={15} className="text-amber-500" />
          <p className="text-xs font-bold text-stone-300 uppercase tracking-wider">Domínio próprio</p>
        </div>

        <div>
          <label className={rotulo}>Endereço de acesso do cliente</label>
          <input
            className={campo}
            value={f.dominio ?? ''}
            onChange={(e) => set('dominio', e.target.value)}
            placeholder="erp.construtorafulano.com.br"
          />
          <p className={dica}>
            É o que resolve a marca <strong>antes</strong> do login — sem ele, quem abre a tela de
            entrada vê a marca da empresa raiz. Precisa também ser apontado no DNS e cadastrado como
            domínio do serviço no Railway.
          </p>
        </div>

        <div>
          <label className={rotulo}>Remetente dos e-mails</label>
          <input
            className={campo}
            value={f.emailRemetente ?? ''}
            onChange={(e) => set('emailRemetente', e.target.value)}
            placeholder="Construtora Fulano <nao-responda@construtorafulano.com.br>"
          />
          <p className={dica}>
            Exige domínio verificado no provedor de e-mail. Vazio, usa o remetente padrão da
            instância.
          </p>
        </div>
      </div>

      {/* ---------------- contrato ---------------- */}
      <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-5 space-y-4">
        <p className="text-xs font-bold text-stone-300 uppercase tracking-wider">Contrato</p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={rotulo}>Plano</label>
            <select
              className={campo}
              value={f.plano}
              onChange={(e) => set('plano', e.target.value)}
            >
              <option value="ESSENCIAL">Essencial (até 25 unidades)</option>
              <option value="CRESCIMENTO">Crescimento (até 100)</option>
              <option value="ESCALA">Escala (até 300)</option>
              <option value="PADRAO">Padrão / a definir</option>
            </select>
          </div>
          <div>
            <label className={rotulo}>Vence em</label>
            <input
              type="date"
              className={campo}
              value={f.dataExpiracao ? f.dataExpiracao.slice(0, 10) : ''}
              onChange={(e) => set('dataExpiracao', e.target.value || null)}
            />
            <p className={dica}>Vencido, o login é recusado.</p>
          </div>
        </div>

        <div>
          <label className={rotulo}>CNPJ</label>
          <input
            className={campo}
            value={f.cnpj ?? ''}
            onChange={(e) => set('cnpj', e.target.value)}
            placeholder="00.000.000/0000-00"
          />
        </div>

        <label className="flex items-start gap-2.5 cursor-pointer pt-1">
          <input
            type="checkbox"
            checked={f.ativa}
            disabled={f.ehRaiz}
            onChange={(e) => set('ativa', e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-amber-500 disabled:opacity-40"
          />
          <span className="text-xs text-stone-300">
            Instância ativa
            <span className="block text-[11px] text-stone-600 mt-0.5">
              {f.ehRaiz
                ? 'A empresa raiz não pode ser desativada por aqui — é a sua própria operação.'
                : 'Desmarcado, ninguém desta construtora consegue entrar. Os dados permanecem.'}
            </span>
          </span>
        </label>
      </div>

      <button
        type="submit"
        disabled={salvando}
        className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-stone-950 font-bold text-sm py-2.5 rounded-xl flex items-center justify-center gap-2"
      >
        {salvando && <Loader2 size={15} className="animate-spin" />}
        Salvar
      </button>
    </form>
  );
}
