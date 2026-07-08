'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, Shield, Eye, EyeOff } from 'lucide-react';

export default function TeamManagerForm() {
  const router = useRouter();

  // Form states
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'FINANCEIRO' | 'ENGENHARIA' | 'COMERCIAL'>('COMERCIAL');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !email || !password || !role) {
      alert('Preencha todos os campos obrigatórios.');
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, password, role })
      });

      const data = await response.json();

      if (!response.ok) {
        setFeedback({
          type: 'error',
          message: data.error || 'Erro ao registrar novo usuário.'
        });
        return;
      }

      setFeedback({
        type: 'success',
        message: `✓ Usuário ${nome} registrado com sucesso! Um e-mail de onboarding com a senha de acesso foi disparado.`
      });

      // Clear states
      setNome('');
      setEmail('');
      setPassword('');
      setRole('COMERCIAL');
      router.refresh();
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', message: 'Erro ao se conectar com o servidor.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="glassmorphism p-5 rounded-2xl border border-slate-800">
      <h3 className="text-sm font-bold text-white mb-1.5 flex items-center gap-2">
        <UserPlus size={18} className="text-indigo-400" /> Adicionar Colaborador
      </h3>
      <p className="text-xs text-slate-400 mb-5">
        Cadastre um novo usuário. A credencial e link de acesso serão enviados via Resend.
      </p>

      {feedback && (
        <div className={`p-3.5 rounded-xl border text-xs leading-relaxed mb-4 ${
          feedback.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          {feedback.message}
        </div>
      )}

      <form onSubmit={handleCreateUser} className="space-y-4">
        <div>
          <label className="text-xs text-slate-400 block mb-1.5 font-semibold">Nome Completo</label>
          <input
            type="text"
            required
            placeholder="Ex: João da Silva"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full bg-[#0f1422] border border-slate-850 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50"
          />
        </div>

        <div>
          <label className="text-xs text-slate-400 block mb-1.5 font-semibold">E-mail Profissional</label>
          <input
            type="email"
            required
            placeholder="Ex: joao@construtora.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-[#0f1422] border border-slate-850 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 font-mono"
          />
        </div>

        <div>
          <label className="text-xs text-slate-400 block mb-1.5 font-semibold">Perfil de Acesso (Role)</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as any)}
            required
            className="w-full bg-[#0f1422] border border-slate-850 rounded-xl px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-indigo-500/50"
          >
            <option value="COMERCIAL">Comercial (Corretores)</option>
            <option value="ENGENHARIA">Engenharia (Mestre/Eng. Campo)</option>
            <option value="FINANCEIRO">Financeiro (Tesoureiros)</option>
            <option value="ADMIN">Administrador Geral</option>
          </select>
        </div>

        <div>
          <label className="text-xs text-slate-400 block mb-1.5 font-semibold">Senha Temporária</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              placeholder="Digite a senha temporária"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#0f1422] border border-slate-850 rounded-xl pl-3 pr-10 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 font-mono"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition cursor-pointer"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition disabled:opacity-50 cursor-pointer shadow-lg shadow-indigo-600/10"
        >
          {isSubmitting ? 'Registrando...' : 'Cadastrar e Enviar E-mail'}
        </button>
      </form>
    </div>
  );
}
