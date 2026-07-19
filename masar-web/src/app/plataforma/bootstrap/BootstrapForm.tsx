'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function BootstrapForm() {
  const router = useRouter();
  const [segredo, setSegredo] = useState('');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [senha2, setSenha2] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [pronto, setPronto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (senha !== senha2) {
      setErro('As duas senhas não são iguais.');
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      const r = await fetch('/api/plataforma/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segredo, nome, email, senha }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Falha ao criar a conta.');
      setPronto(true);
    } catch (e: any) {
      setErro(e.message);
    } finally {
      setSalvando(false);
    }
  };

  const campo =
    'w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2.5 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/60';
  const rotulo = 'text-xs text-stone-400 font-semibold block mb-1.5';

  if (pronto) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0c0a09] px-4">
        <div className="max-w-md w-full space-y-5 text-center">
          <CheckCircle2 size={44} className="text-emerald-400 mx-auto" />
          <h1 className="text-2xl font-extrabold text-white">Conta criada</h1>
          <p className="text-sm text-stone-400">
            Já pode entrar no console com <strong className="text-stone-200">{email}</strong>.
          </p>
          <div className="rounded-xl border border-amber-900/50 bg-amber-950/20 p-4 text-left">
            <p className="text-xs text-amber-300 font-bold mb-1">Feche a porta agora</p>
            <p className="text-[11px] text-amber-200/70 leading-relaxed">
              Volte ao Railway e <strong>remova a variável PLATAFORMA_BOOTSTRAP_SECRET</strong>. Esta
              página já se recusa a rodar de novo (existe administrador), mas sem a variável ela
              deixa de existir por completo.
            </p>
          </div>
          <button
            onClick={() => router.push('/plataforma/login')}
            className="w-full bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm py-2.5 rounded-xl"
          >
            Ir para o console
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0c0a09] px-4 py-12">
      <form onSubmit={enviar} className="w-full max-w-md space-y-5">
        <div className="text-center">
          <div className="inline-flex p-3 bg-amber-500 rounded-2xl text-stone-950 mb-3">
            <ShieldAlert size={30} />
          </div>
          <h1 className="text-xl font-extrabold text-white">Primeiro acesso do console</h1>
          <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">
            Esta página cria a conta de administrador da plataforma e só funciona
            <strong className="text-stone-400"> enquanto não existir nenhuma</strong>.
          </p>
        </div>

        {erro && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3.5 rounded-xl text-xs flex items-start gap-2.5">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{erro}</span>
          </div>
        )}

        <div className="bg-stone-900/80 p-5 rounded-2xl border border-amber-900/40 space-y-4">
          <div>
            <label className={rotulo}>Chave de liberação</label>
            <input
              className={campo + ' font-mono'}
              value={segredo}
              onChange={(e) => setSegredo(e.target.value)}
              placeholder="valor de PLATAFORMA_BOOTSTRAP_SECRET"
              required
            />
            <p className="text-[11px] text-stone-600 mt-1">
              O mesmo valor que você criou na variável do Railway.
            </p>
          </div>

          <div>
            <label className={rotulo}>Seu nome</label>
            <input className={campo} value={nome} onChange={(e) => setNome(e.target.value)} required />
          </div>

          <div>
            <label className={rotulo}>Seu e-mail</label>
            <input
              type="email"
              className={campo}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={rotulo}>Senha</label>
              <input
                type="password"
                className={campo}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
              />
            </div>
            <div>
              <label className={rotulo}>Repita a senha</label>
              <input
                type="password"
                className={campo}
                value={senha2}
                onChange={(e) => setSenha2(e.target.value)}
                required
              />
            </div>
          </div>
          <p className="text-[11px] text-stone-600 leading-relaxed">
            Mínimo de 14 caracteres — esta conta enxerga todas as instâncias.
          </p>
        </div>

        <button
          type="submit"
          disabled={salvando}
          className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-stone-950 font-bold text-sm py-2.5 rounded-xl flex items-center justify-center gap-2"
        >
          {salvando && <Loader2 size={15} className="animate-spin" />}
          Criar minha conta
        </button>
      </form>
    </div>
  );
}
