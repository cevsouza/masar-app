'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Mail, Lock, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function LoginPlataformaForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErro('Preencha todos os campos.');
      return;
    }
    setCarregando(true);
    setErro(null);
    try {
      const r = await fetch('/api/auth/plataforma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setErro(d.error || 'Não foi possível entrar.');
        return;
      }
      router.push('/plataforma');
      router.refresh();
    } catch {
      setErro('Falha de rede. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0c0a09] px-4 py-12">
      <div className="w-full max-w-md space-y-7">
        {/* Identidade DELIBERADAMENTE diferente do app do cliente: âmbar, cadeado
            e o aviso. Confundir em qual dos dois se está é como se mexe no dado
            errado. */}
        <div className="flex flex-col items-center">
          <div className="p-3.5 bg-amber-500 rounded-2xl text-stone-950 shadow-lg shadow-amber-500/20 mb-4">
            <ShieldAlert size={36} />
          </div>
          <h1 className="text-center text-2xl font-extrabold text-white tracking-tight">
            Console da Plataforma
          </h1>
          <p className="text-[11px] uppercase font-bold text-amber-500/80 tracking-[0.2em] mt-2">
            Acesso restrito · não é o sistema do cliente
          </p>
        </div>

        <div className="bg-stone-900/80 p-8 rounded-2xl border border-amber-900/40 shadow-2xl">
          <form onSubmit={enviar} className="space-y-6">
            {erro && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3.5 rounded-xl text-xs flex items-start gap-2.5">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{erro}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs text-stone-400 font-semibold uppercase tracking-wider block">
                E-mail
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl py-2.5 pl-9 pr-3 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/60"
                  placeholder="voce@dominio.com.br"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-stone-400 font-semibold uppercase tracking-wider block">
                Senha
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl py-2.5 pl-9 pr-10 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/60"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300"
                  aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {mostrarSenha ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={carregando}
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-bold text-sm py-2.5 rounded-xl transition flex items-center justify-center gap-2"
            >
              {carregando ? <Loader2 size={16} className="animate-spin" /> : null}
              Entrar no console
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-stone-600 leading-relaxed">
          Esta conta enxerga <strong className="text-stone-500">contagens e saúde</strong> de todas as
          instâncias.<br />
          Conteúdo de cliente exige acesso assistido, com motivo e prazo, registrado no log dele.
        </p>
      </div>
    </div>
  );
}
