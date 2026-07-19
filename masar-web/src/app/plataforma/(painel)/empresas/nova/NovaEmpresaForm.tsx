'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle, CheckCircle2, Copy, ArrowLeft } from 'lucide-react';

function slugify(v: string) {
  return v
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

interface Resultado {
  empresa: { id: string; nome: string; slug: string };
  admin: { nome: string; email: string; senhaProvisoria: string };
}

export default function NovaEmpresaForm() {
  const router = useRouter();
  const [nome, setNome] = useState('');
  const [slugManual, setSlugManual] = useState('');
  const [adminNome, setAdminNome] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [copiado, setCopiado] = useState(false);

  const slug = slugManual || slugify(nome);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    try {
      const r = await fetch('/api/plataforma/empresas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, slug, adminNome, adminEmail }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Falha ao provisionar.');
      setResultado(d);
    } catch (e: any) {
      setErro(e.message);
    } finally {
      setSalvando(false);
    }
  };

  // Depois de criado, a tela vira entrega de credencial — e só.
  if (resultado) {
    const { empresa, admin } = resultado;
    return (
      <div className="max-w-xl space-y-6">
        <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/20 p-5">
          <div className="flex items-center gap-2 text-emerald-400 font-bold">
            <CheckCircle2 size={18} /> {empresa.nome} provisionada
          </div>
          <p className="text-xs text-stone-400 mt-1">
            Identificador <code className="text-stone-300">{empresa.slug}</code> · instância vazia,
            sem nenhum dado de demonstração.
          </p>
        </div>

        <div className="rounded-xl border border-amber-900/50 bg-amber-950/20 p-5 space-y-3">
          <p className="text-sm font-bold text-amber-300">
            Senha provisória — copie agora
          </p>
          <p className="text-xs text-amber-200/70 leading-relaxed">
            Ela <strong>não fica gravada</strong> e não será mostrada de novo. Entregue ao cliente
            por canal seguro e peça que troque no primeiro acesso.
          </p>

          <div className="bg-stone-950 border border-stone-800 rounded-lg p-3 space-y-1.5 font-mono text-sm">
            <div className="text-stone-500 text-[11px]">usuário</div>
            <div className="text-stone-200">{admin.email}</div>
            <div className="text-stone-500 text-[11px] pt-1">senha</div>
            <div className="text-amber-300 tracking-wide break-all">{admin.senhaProvisoria}</div>
          </div>

          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(
                `Usuário: ${admin.email}\nSenha: ${admin.senhaProvisoria}`
              );
              setCopiado(true);
              setTimeout(() => setCopiado(false), 2500);
            }}
            className="flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300"
          >
            <Copy size={13} /> {copiado ? 'Copiado' : 'Copiar usuário e senha'}
          </button>
        </div>

        <div className="flex gap-3">
          <Link
            href={`/plataforma/empresas/${empresa.id}`}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold"
          >
            Configurar identidade visual
          </Link>
          <button
            onClick={() => router.push('/plataforma')}
            className="px-4 py-2 rounded-xl border border-stone-800 text-stone-400 hover:text-white text-xs font-semibold"
          >
            Voltar ao painel
          </button>
        </div>
      </div>
    );
  }

  const campo =
    'w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2.5 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/60';
  const rotulo = 'text-xs text-stone-400 font-semibold block mb-1.5';

  return (
    <form onSubmit={enviar} className="max-w-xl space-y-5">
      <Link
        href="/plataforma"
        className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-300"
      >
        <ArrowLeft size={13} /> Painel
      </Link>

      {erro && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3.5 rounded-xl text-xs flex items-start gap-2.5">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{erro}</span>
        </div>
      )}

      <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-5 space-y-4">
        <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">A construtora</p>

        <div>
          <label className={rotulo}>Nome</label>
          <input
            className={campo}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Construtora Fulano Ltda"
            required
          />
        </div>

        <div>
          <label className={rotulo}>Identificador interno</label>
          <input
            className={campo}
            value={slug}
            onChange={(e) => setSlugManual(slugify(e.target.value))}
            placeholder="construtora-fulano"
          />
          <p className="text-[11px] text-stone-600 mt-1">
            Gerado do nome. Usado internamente e não aparece para o cliente.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-5 space-y-4">
        <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">
          Primeiro acesso do cliente
        </p>

        <div>
          <label className={rotulo}>Nome do responsável</label>
          <input
            className={campo}
            value={adminNome}
            onChange={(e) => setAdminNome(e.target.value)}
            placeholder="Fulano de Tal"
            required
          />
        </div>

        <div>
          <label className={rotulo}>E-mail</label>
          <input
            type="email"
            className={campo}
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
            placeholder="fulano@construtora.com.br"
            required
          />
        </div>

        <p className="text-[11px] text-stone-600 leading-relaxed">
          A senha é gerada pelo sistema e mostrada uma única vez na tela seguinte. A instância nasce
          vazia — sem nenhum dado de demonstração.
        </p>
      </div>

      <button
        type="submit"
        disabled={salvando || !nome || !adminNome || !adminEmail}
        className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-stone-950 font-bold text-sm py-2.5 rounded-xl flex items-center justify-center gap-2"
      >
        {salvando && <Loader2 size={15} className="animate-spin" />}
        Provisionar cliente
      </button>
    </form>
  );
}
