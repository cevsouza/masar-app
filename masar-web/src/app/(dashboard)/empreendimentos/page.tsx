import { db } from '@/lib/db';
import KanbanBoard from '@/components/KanbanBoard';

export const revalidate = 0; // Disable server component caching to reflect real-time updates

export default async function EmpreendimentosPage() {
  const projects = await db.empreendimento.findMany({
    include: {
      _count: {
        select: { casas: true }
      }
    },
    orderBy: {
      dataCriacao: 'desc'
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl font-sans">Empreendimentos</h1>
        <p className="text-sm text-slate-400 mt-1">
          Seus empreendimentos: licenças, unidades e o andamento de cada obra.
        </p>
      </div>

      <KanbanBoard initialProjects={projects} />
    </div>
  );
}
