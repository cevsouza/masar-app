import { db } from '@/lib/db';
import { Users } from 'lucide-react';
import TeamManagerForm from '@/components/TeamManagerForm';
import TeamList from '@/components/TeamList';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth';

export const revalidate = 0; // Real-time updates

export default async function UsuariosPage() {
  // 1. Carregar ID do usuário logado atual
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('masar_session')?.value;
  const session = sessionToken ? await verifySession(sessionToken) : null;
  const currentUserId = session?.userId || '';

  // 2. Buscar todos os colaboradores cadastrados
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl font-sans">Gestão da Equipe</h1>
        <p className="text-sm text-slate-400 mt-1">
          Controle de credenciais de acesso da construtora, corretores parceiros e engenheiros de campo.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Formulário de criação de colaboradores */}
        <div className="lg:col-span-5">
          <TeamManagerForm />
        </div>

        {/* Lista de colaboradores com modificadores interativos */}
        <div className="lg:col-span-7 glassmorphism p-5 rounded-2xl border border-slate-800/80">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Users size={16} className="text-blue-400" /> Colaboradores Cadastrados
          </h3>

          <TeamList initialUsers={users} currentUserId={currentUserId} />
        </div>
      </div>
    </div>
  );
}
