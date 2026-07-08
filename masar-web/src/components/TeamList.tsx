'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Shield, Mail, Calendar, UserCheck, Loader2 } from 'lucide-react';

interface User {
  id: string;
  nome: string;
  email: string;
  role: string;
  dataCriacao: Date | string;
}

interface TeamListProps {
  initialUsers: User[];
  currentUserId: string;
}

export default function TeamList({ initialUsers, currentUserId }: TeamListProps) {
  const router = useRouter();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleUpdateRole = async (userId: string, newRole: string) => {
    setUpdatingId(userId);
    try {
      const res = await fetch('/api/admin/usuarios', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, role: newRole })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erro ao atualizar perfil');
      }

      router.refresh();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Falha ao atualizar o perfil do usuário.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (userId === currentUserId) {
      alert('Você não pode excluir sua própria conta de administrador ativa.');
      return;
    }

    if (!confirm(`Deseja realmente remover o colaborador "${userName}" da equipe? Ele perderá acesso ao painel.`)) {
      return;
    }

    setDeletingId(userId);
    try {
      const res = await fetch(`/api/admin/usuarios?id=${userId}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erro ao excluir usuário');
      }

      router.refresh();
      alert('✓ Colaborador removido com sucesso.');
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Falha ao remover colaborador.');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateInput: Date | string) => {
    const d = new Date(dateInput);
    return d.toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-3.5 max-h-[550px] overflow-y-auto pr-1">
      {initialUsers.map(u => (
        <div key={u.id} className="p-4 bg-[#0f1422]/60 border border-slate-850 rounded-xl flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 shrink-0">
              <UserCheck size={16} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white leading-tight">{u.nome}</h4>
              <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-1 font-mono">
                <Mail size={10} /> {u.email}
              </p>
              <p className="text-[9px] text-slate-500 flex items-center gap-1 mt-0.5 font-mono">
                <Calendar size={10} /> {formatDate(u.dataCriacao)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Seletor de Perfil (Role) */}
            <div className="relative">
              {updatingId === u.id ? (
                <div className="p-1 text-slate-500">
                  <Loader2 size={12} className="animate-spin" />
                </div>
              ) : (
                <select
                  value={u.role}
                  onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-[10px] text-slate-300 font-semibold focus:outline-none focus:border-indigo-500/50 cursor-pointer"
                >
                  <option value="COMERCIAL">COMERCIAL</option>
                  <option value="ENGENHARIA">ENGENHARIA</option>
                  <option value="FINANCEIRO">FINANCEIRO</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              )}
            </div>

            {/* Ação de Exclusão (Não pode excluir a si mesmo) */}
            {u.id !== currentUserId ? (
              <button
                onClick={() => handleDeleteUser(u.id, u.nome)}
                disabled={deletingId === u.id}
                className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/30 rounded-lg transition cursor-pointer disabled:opacity-50"
                title="Excluir Colaborador"
              >
                {deletingId === u.id ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Trash2 size={12} />
                )}
              </button>
            ) : (
              <span className="text-[9px] text-slate-500 bg-slate-800 px-2 py-1 rounded-lg border border-slate-750 font-bold select-none cursor-default">
                VOCÊ
              </span>
            )}
          </div>
        </div>
      ))}

      {initialUsers.length === 0 && (
        <p className="text-xs text-slate-500 text-center py-8">Nenhum colaborador registrado.</p>
      )}
    </div>
  );
}
