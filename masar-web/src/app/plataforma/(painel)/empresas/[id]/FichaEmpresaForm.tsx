'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle, CheckCircle2, ArrowLeft, Building2, Globe, Trash2 } from 'lucide-react';
import { normalizarSubdominio, validarSubdominio } from '@/lib/dominioPlataforma';

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
  empreendimentos: number;
  casas: number;
  transacoes: number;
  /** Positivo = venceu há N dias. Negativo = vigente. Null = sem data. */
  diasVencido: number | null;
}

const DIAS_QUARENTENA = 90;

const campo =
  'w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2.5 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/60';
const rotulo = 'text-xs text-stone-400 font-semibold block mb-1.5';
const dica = 'text-[11px] text-stone-600 mt-1 leading-relaxed';

export default function FichaEmpresaForm({
  inicial,
  dominioBase,
}: {
  inicial: Ficha;
  dominioBase: string;
}) {
  const router = useRouter();
  const [f, setF] = useState<Ficha>(inicial);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [nomeDigitado, setNomeDigitado] = useState('');
  const [apagando, setApagando] = useState(false);

  // O banco guarda UM endereço por cliente. Os dois campos da tela são duas
  // leituras do mesmo valor: se o host termina na base da plataforma, é
  // subdomínio; senão, é domínio próprio. Derivar (em vez de manter estado
  // paralelo) evita os dois divergirem e gravarem o que a tela não mostra.
  const sufixo = `.${dominioBase}`;
  const host = (f.dominio ?? '').trim().toLowerCase();
  const ehSubdominio = host.endsWith(sufixo) && !host.slice(0, -sufixo.length).includes('.');
  const sub = ehSubdominio ? host.slice(0, -sufixo.length) : '';
  const dominioProprio = host && !ehSubdominio ? f.dominio ?? '' : '';
  const problemaSub = sub ? validarSubdominio(sub) : null;

  const vazia = inicial.empreendimentos === 0;
  const pendencias: string[] = [];
  if (!vazia) {
    const d = inicial.diasVencido;
    if (d === null) pendencias.push('O contrato não tem data de vencimento definida.');
    else if (d < 0) pendencias.push(`O contrato está vigente — vence em ${-d} dias.`);
    else if (d < DIAS_QUARENTENA)
      pendencias.push(
        `Quarentena em curso: venceu há ${d} dias, faltam ${DIAS_QUARENTENA - d} para liberar.`
      );
    if (inicial.ativa) pendencias.push('A instância ainda está ativa — desative e salve primeiro.');
  }

  const apagar = async () => {
    setApagando(true);
    setErro(null);
    try {
      const r = await fetch(`/api/plataforma/empresas/${f.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmacaoNome: nomeDigitado }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Falha ao apagar.');
      router.push('/plataforma');
    } catch (e: any) {
      setErro(e.message);
      setApagando(false);
    }
  };

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
          slug: f.slug,
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
          <label className={rotulo}>Identificador interno</label>
          <input
            className={campo + ' font-mono'}
            value={f.slug}
            onChange={(e) => set('slug', normalizarSubdominio(e.target.value))}
            required
          />
          <p className={dica}>
            Não aparece para o cliente.{' '}
            {f.slug === 'masar' && (
              <strong className="text-amber-400">
                Com o identificador <code>masar</code>, o selo árabe مسار aparece na tela de entrada,
                no menu e nos relatórios. Numa instância que não é da Masar, troque.
              </strong>
            )}
          </p>
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

        <p className="text-[11px] text-stone-500 leading-relaxed">
          O endereço resolve a marca <strong>antes</strong> do login — sem ele, quem abre a tela de
          entrada vê a marca da empresa raiz.
        </p>

        <div>
          <label className={rotulo}>Subdomínio na plataforma</label>
          <div className="flex items-stretch">
            <input
              className={campo + ' rounded-r-none border-r-0'}
              value={sub}
              onChange={(e) => {
                const s = normalizarSubdominio(e.target.value);
                set('dominio', s ? `${s}.${dominioBase}` : '');
              }}
              placeholder="construtorafulano"
            />
            <span className="flex items-center px-3 rounded-r-xl border border-stone-800 bg-stone-900 text-xs text-stone-500 font-mono whitespace-nowrap">
              .{dominioBase}
            </span>
          </div>
          {problemaSub ? (
            <p className="text-[11px] text-red-400 mt-1">{problemaSub}</p>
          ) : (
            <p className={dica}>
              Funciona de imediato — o curinga <code className="text-stone-500">*.{dominioBase}</code>{' '}
              já está apontado. Nada a configurar por cliente.
            </p>
          )}
        </div>

        <div>
          <label className={rotulo}>
            Domínio próprio do cliente <span className="text-stone-600 font-normal">(opcional)</span>
          </label>
          <input
            className={campo}
            value={dominioProprio}
            onChange={(e) => set('dominio', e.target.value)}
            placeholder="erp.construtorafulano.com.br"
          />
          <p className={dica}>
            Preenchido, <strong>substitui</strong> o subdomínio acima — o app guarda um endereço por
            cliente. Exige que o TI do cliente crie o CNAME e que o domínio seja cadastrado no
            Railway (cada um ocupa um slot; o curinga ocupa apenas um para todos).
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

      {/* ---------------- apagar ---------------- */}
      {!f.ehRaiz && (
        <div className="rounded-xl border border-red-950/70 bg-red-950/10 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Trash2 size={15} className="text-red-500" />
            <p className="text-xs font-bold text-red-400 uppercase tracking-wider">Apagar instância</p>
          </div>
          {/* A elegibilidade olha o que está GRAVADO (inicial), não o que está
              digitado no formulário — marcar a caixa "inativa" sem salvar não
              pode fazer o botão de apagar parecer liberado. */}
          {vazia ? (
            <p className="text-[11px] text-stone-500 leading-relaxed">
              Instância <strong className="text-stone-400">vazia</strong> — nenhum empreendimento
              cadastrado. Pode ser apagada sem cerimônia: não há o que perder.
            </p>
          ) : (
            <>
              <p className="text-[11px] text-stone-500 leading-relaxed">
                Instância com operação dentro: {inicial.empreendimentos} empreendimento(s),{' '}
                {inicial.casas} casa(s), {inicial.transacoes} lançamento(s) financeiro(s) — mais
                documentos do cofre e o log de auditoria. Apagar leva tudo junto, de uma vez, sem
                volta.
              </p>
              <p className="text-[11px] text-stone-500 leading-relaxed">
                Por isso só depois do <strong className="text-stone-400">encerramento consumado</strong>:
                contrato vencido, instância desativada e {DIAS_QUARENTENA} dias de quarentena.
                Vencimento sozinho não basta — quase sempre é atraso de pagamento, não fim de
                contrato.
              </p>
              {pendencias.length > 0 && (
                <ul className="text-[11px] text-amber-500/80 space-y-1 pl-4 list-disc">
                  {pendencias.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              )}
            </>
          )}

          {pendencias.length > 0 ? null : !confirmandoExclusao ? (
            <button
              type="button"
              onClick={() => setConfirmandoExclusao(true)}
              className="text-xs font-bold text-red-400 hover:text-red-300"
            >
              Quero apagar esta instância
            </button>
          ) : (
            <div className="space-y-3 pt-1">
              <div>
                <label className={rotulo}>
                  Digite <span className="text-red-400">{f.nome}</span> para confirmar
                </label>
                <input
                  className={campo}
                  value={nomeDigitado}
                  onChange={(e) => setNomeDigitado(e.target.value)}
                  placeholder={f.nome}
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={apagar}
                  disabled={apagando || nomeDigitado.trim() !== f.nome}
                  className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-30 text-white font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-2"
                >
                  {apagando && <Loader2 size={14} className="animate-spin" />}
                  Apagar definitivamente
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmandoExclusao(false);
                    setNomeDigitado('');
                  }}
                  className="px-5 rounded-xl border border-stone-800 text-stone-400 hover:text-white text-xs font-semibold"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </form>
  );
}
