'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Building2, 
  MapPin, 
  Home, 
  ArrowLeft, 
  ArrowRight,
  Loader2 
} from 'lucide-react';

interface Project {
  id: string;
  nome: string;
  localizacao: string;
  statusLegal: string;
  _count: {
    casas: number;
  };
}

const COLUMNS = [
  { id: 'ESTUDO_VIABILIDADE', label: 'Estudo de Viabilidade', color: 'border-t-blue-500 text-blue-400 bg-blue-500/5' },
  { id: 'APROVACAO_PREFEITURA', label: 'Aprovação Prefeitura', color: 'border-t-purple-500 text-purple-400 bg-purple-500/5' },
  { id: 'APROVACAO_CAIXA', label: 'Aprovação Caixa', color: 'border-t-amber-500 text-amber-400 bg-amber-500/5' },
  { id: 'EM_OBRA', label: 'Em Obra', color: 'border-t-emerald-500 text-emerald-400 bg-emerald-500/5' },
];

export default function KanbanBoard({ initialProjects }: { initialProjects: Project[] }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const moveProject = async (projectId: string, currentStatus: string, direction: 'left' | 'right') => {
    const currentIndex = COLUMNS.findIndex(c => c.id === currentStatus);
    let nextIndex = direction === 'right' ? currentIndex + 1 : currentIndex - 1;

    if (nextIndex < 0 || nextIndex >= COLUMNS.length) return;

    const nextStatus = COLUMNS[nextIndex].id;
    setLoadingId(projectId);

    try {
      const response = await fetch(`/api/empreendimentos/${projectId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ statusLegal: nextStatus }),
      });

      if (!response.ok) throw new Error('Falha ao mover projeto');

      router.refresh();
    } catch (error) {
      console.error(error);
      alert('Erro ao mover projeto pelas fases burocráticas.');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
      {COLUMNS.map((column) => {
        const columnProjects = initialProjects.filter(p => p.statusLegal === column.id);

        return (
          <div 
            key={column.id} 
            className="kanban-column rounded-2xl border border-slate-800/60 p-4 flex flex-col min-h-[500px]"
          >
            {/* Column Header */}
            <div className={`border-t-2 ${column.color} pt-3 pb-4 mb-4 flex items-center justify-between`}>
              <h3 className="font-bold text-sm tracking-wide uppercase">{column.label}</h3>
              <span className="text-xs bg-slate-800/80 px-2.5 py-1 rounded-full text-slate-400 font-semibold">
                {columnProjects.length}
              </span>
            </div>

            {/* Column Cards */}
            <div className="space-y-4 flex-1 overflow-y-auto max-h-[600px] pr-1">
              {columnProjects.length === 0 ? (
                <div className="border border-dashed border-slate-800/40 rounded-2xl p-6 text-center text-slate-600 text-xs my-4">
                  Nenhum projeto nesta fase
                </div>
              ) : (
                columnProjects.map((project) => {
                  const isFirst = column.id === 'ESTUDO_VIABILIDADE';
                  const isLast = column.id === 'EM_OBRA';
                  const isLoading = loadingId === project.id;

                  return (
                    <div 
                      key={project.id} 
                      className="glassmorphism p-4 rounded-xl border border-slate-800/80 hover:border-slate-700 transition relative flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Building2 size={15} className="text-blue-400 shrink-0" />
                          <h4 className="font-bold text-sm text-white leading-tight">{project.nome}</h4>
                        </div>
                        
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <MapPin size={12} className="shrink-0" />
                          <span className="truncate">{project.localizacao}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <Home size={12} className="shrink-0" />
                          <span>{project._count.casas} casas cadastradas</span>
                        </div>
                      </div>

                      {/* Kanban Action Controls */}
                      <div className="flex justify-between items-center mt-5 pt-3 border-t border-slate-800/50">
                        <button
                          onClick={() => moveProject(project.id, project.statusLegal, 'left')}
                          disabled={isFirst || isLoading}
                          className={`p-1.5 rounded-lg border border-slate-700/50 hover:bg-slate-800/80 hover:text-white transition disabled:opacity-20 disabled:hover:bg-transparent ${isFirst ? 'text-slate-600' : 'text-slate-400'}`}
                          title="Recuar fase burocrática"
                        >
                          <ArrowLeft size={14} />
                        </button>
                        
                        {isLoading && <Loader2 size={14} className="animate-spin text-slate-500" />}

                        <button
                          onClick={() => moveProject(project.id, project.statusLegal, 'right')}
                          disabled={isLast || isLoading}
                          className={`p-1.5 rounded-lg border border-slate-700/50 hover:bg-slate-800/80 hover:text-white transition disabled:opacity-20 disabled:hover:bg-transparent ${isLast ? 'text-slate-600' : 'text-slate-400'}`}
                          title="Avançar fase burocrática"
                        >
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
