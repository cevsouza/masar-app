'use client';

import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b0f19] px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 text-center animate-fade-in">
        {/* Logo and Alert */}
        <div className="flex flex-col items-center">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-500 shadow-lg shadow-amber-500/5">
            <ShieldAlert size={36} />
          </div>
          <h2 className="mt-6 text-2xl font-extrabold text-white tracking-tight font-sans">
            Cadastro Público Desativado
          </h2>
          <p className="mt-3 text-xs text-slate-400 max-w-xs leading-relaxed">
            Por motivos de governança de dados da construtora, o auto-cadastro foi desativado neste SaaS.
          </p>
          <p className="mt-1.5 text-[11px] text-slate-500 max-w-xs leading-relaxed">
            Para obter acesso ao painel, solicite a criação de sua conta diretamente à equipe de administração ou TI da empresa.
          </p>
        </div>

        {/* Card containing Action button */}
        <div className="glassmorphism p-6 rounded-2xl border border-slate-800/80 shadow-2xl space-y-4">
          <Link
            href="/login"
            className="w-full block py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition duration-200 shadow-lg shadow-blue-600/10 cursor-pointer"
          >
            Voltar para a Tela de Login
          </Link>
        </div>
      </div>
    </div>
  );
}
