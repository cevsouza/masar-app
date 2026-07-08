import { db } from '@/lib/db';
import { Users, UserCheck, Shield, Mail, Calendar } from 'lucide-react';
import TeamManagerForm from '@/components/TeamManagerForm';

export const revalidate = 0; // Real-time user list updates

export default async function UsuariosPage() {
  const users = await db.user.findMany({
    select: {
      id: true,
      nome: true,
      email: true,
      role: true,
      dataCriacao: true
    },
    orderBy: { dataCriacao: 'desc' }
  });

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-500/10 text-red-400 border border-red-500/20';
      case 'FINANCEIRO':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      case 'ENGENHARIA':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'COMERCIAL':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl font-sans">Gestão da Equipe</h1>
        <p className="text-sm text-slate-400 mt-1">
          Controle de credenciais de acesso da construtora, corretores parceiros e engenheiros de campo.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Formulário de criação de usuários */}
        <div className="lg:col-span-5">
          <TeamManagerForm />
        </div>

        {/* Lista de usuários cadastrados */}
        <div className="lg:col-span-7 glassmorphism p-5 rounded-2xl border border-slate-800/80">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Users size={16} className="text-blue-400" /> Colaboradores Cadastrados
          </h3>

          <div className="space-y-3.5 max-h-[550px] overflow-y-auto pr-1">
            {users.map(u => (
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
                  </div>
                </div>

                <div className="text-right shrink-0 space-y-1.5">
                  <span className={`inline-block text-[9px] font-extrabold uppercase px-2 py-0.5 rounded ${getRoleBadge(u.role)}`}>
                    {u.role}
                  </span>
                  <p className="text-[9px] text-slate-500 flex items-center gap-1 justify-end font-mono">
                    <Calendar size={10} /> {formatDate(u.dataCriacao)}
                  </p>
                </div>
              </div>
            ))}

            {users.length === 0 && (
              <p className="text-xs text-slate-500 text-center py-8">Nenhum colaborador registrado.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
