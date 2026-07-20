'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Mail, Lock, Loader2, AlertCircle, Eye, EyeOff, X, KeyRound } from 'lucide-react';

import type { IdentidadeVisual } from '@/lib/empresaVisual';

export default function LoginForm({ marca }: { marca: IdentidadeVisual }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Segunda etapa: o mesmo e-mail e a mesma senha existem em mais de uma
  // construtora. Só chega aqui quem já provou saber a senha — por isso é
  // seguro mostrar os nomes.
  const [empresas, setEmpresas] = useState<{ id: string; nome: string }[] | null>(null);

  const entrar = async (empresaId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, ...(empresaId ? { empresaId } : {}) }),
      });

      const data = await res.json();

      if (res.status === 409 && data.escolhaEmpresa) {
        setEmpresas(data.empresas);
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao realizar login');
      }

      router.push('/');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }
    await entrar();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b0f19] px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        {/* Marca do tenant — resolvida pelo Host, antes de haver sessão.
            O cliente não pode ver a marca de outra construtora aqui. */}
        <div className="flex flex-col items-center">
          {marca.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={marca.logoUrl}
              alt={marca.nome}
              className="h-16 w-auto max-w-[240px] object-contain mb-4"
            />
          ) : (
            <div
              className="p-3.5 rounded-2xl text-white shadow-lg mb-4"
              style={{ backgroundColor: marca.corPrimaria }}
            >
              <Building2 size={38} />
            </div>
          )}
          <h2 className="text-center text-3xl font-extrabold text-white tracking-tight font-sans">
            {marca.nome}
          </h2>
          {/* O selo árabe é a marca da Masar ("مسار" = trajetória), não do
              produto — só aparece na empresa raiz. */}
          {marca.exibeSeloMasar && (
            <div className="mt-3 flex flex-col items-center gap-1 select-none">
              <span
                className="text-3xl font-serif tracking-widest leading-none font-bold"
                style={{ color: marca.corPrimaria }}
                dir="rtl"
                lang="ar"
              >
                مسار
              </span>
              <span className="text-[9px] uppercase font-extrabold text-slate-500 tracking-[0.2em] leading-none">
                Trajetória
              </span>
            </div>
          )}
        </div>

        {/* Escolha de construtora: só aparece quando o e-mail + senha servem
            para mais de uma. Sem isso, o acesso da segunda ficava impossível. */}
        {empresas && (
          <div className="glassmorphism p-6 rounded-2xl border border-blue-800/50 shadow-2xl space-y-3">
            <div>
              <h3 className="text-sm font-bold text-white">Em qual construtora deseja entrar?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Este e-mail está cadastrado em mais de uma empresa.
              </p>
            </div>
            <div className="space-y-2">
              {empresas.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  disabled={loading}
                  onClick={() => entrar(e.id)}
                  className="w-full text-left px-4 py-3 rounded-xl border border-slate-700 hover:border-blue-500 bg-slate-900/60 hover:bg-slate-800/60 transition disabled:opacity-50 flex items-center gap-3"
                >
                  <Building2 size={16} style={{ color: marca.corPrimaria }} />
                  <span className="text-sm font-semibold text-slate-100">{e.nome}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setEmpresas(null)}
              className="text-xs text-slate-500 hover:text-slate-300"
            >
              Voltar
            </button>
          </div>
        )}

        {/* Card. Some enquanto a escolha de construtora está na tela —
            duas caixas de entrada ao mesmo tempo confundiriam. */}
        {!empresas && (
        <>
        <div className="glassmorphism p-8 rounded-2xl border border-slate-800/80 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3.5 rounded-xl text-xs flex items-start gap-2.5">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">
                E-mail
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  required
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#0f1422] border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50 placeholder-slate-600 font-mono"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">
                Senha
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#0f1422] border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50 placeholder-slate-600 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                  title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/10 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Autenticando...
                </>
              ) : (
                'Entrar no Sistema'
              )}
            </button>
          </form>

          {/* Footer: Forgot Password link instead of Signup */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setShowForgotModal(true)}
              className="text-xs font-semibold text-blue-400 hover:underline hover:text-blue-300 transition cursor-pointer"
            >
              Esqueceu a senha?
            </button>
          </div>
        </div>
        </>
        )}
      </div>

      {/* Modal: Esqueceu a Senha */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-[#000000]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glassmorphism w-full max-w-sm rounded-2xl border border-slate-850 shadow-2xl p-6 relative">
            <button
              onClick={() => setShowForgotModal(false)}
              className="absolute right-4 top-4 p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X size={16} />
            </button>

            <h3 className="text-sm font-bold text-white mb-2.5 flex items-center gap-2 font-sans">
              <KeyRound className="text-blue-500" size={16} /> Recuperar Senha
            </h3>
            
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              Por motivos de segurança e governança de dados da construtora, a recuperação de senha é gerenciada diretamente pelo administrador do sistema.
            </p>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              Entre em contato com o <strong>gestor do painel</strong> ou com a <strong>equipe de TI</strong> da sua empresa para solicitar a redefinição de suas credenciais de acesso.
            </p>

            <button
              onClick={() => setShowForgotModal(false)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
