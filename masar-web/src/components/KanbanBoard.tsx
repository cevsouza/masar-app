'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Building2,
  MapPin,
  Home,
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Loader2,
  Plus,
  X
} from 'lucide-react';

interface Project {
  id: string;
  nome: string;
  localizacao: string;
  statusLegal: string;
  dataInicio?: Date | string | null;
  dataFim?: Date | string | null;
  orcamento?: number | null;
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

  // New Project modal state
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectLoc, setNewProjectLoc] = useState('');
  const [newProjectBudget, setNewProjectBudget] = useState('');
  const [newProjectStart, setNewProjectStart] = useState('');
  const [newProjectEnd, setNewProjectEnd] = useState('');
  const [newProjectStatus, setNewProjectStatus] = useState('ESTUDO_VIABILIDADE');
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  // New House modal state
  const [activeProjectIdForHouse, setActiveProjectIdForHouse] = useState<string | null>(null);
  const [activeProjectNameForHouse, setActiveProjectNameForHouse] = useState('');
  const [newHouseNum, setNewHouseNum] = useState('');
  const [newHouseQuadra, setNewHouseQuadra] = useState('');
  const [newHouseStatus, setNewHouseStatus] = useState('BACKLOG');
  const [newHousePercent, setNewHousePercent] = useState('0');
  const [isCreatingHouse, setIsCreatingHouse] = useState(false);

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
      alert('Erro ao mover projeto.');
    } finally {
      setLoadingId(null);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName || !newProjectLoc) {
      alert('Nome e localização são obrigatórios');
      return;
    }

    setIsCreatingProject(true);
    try {
      const response = await fetch('/api/empreendimentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: newProjectName,
          localizacao: newProjectLoc,
          statusLegal: newProjectStatus,
          orcamento: (() => {
            if (!newProjectBudget) return null;
            const clean = newProjectBudget.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
            const num = parseFloat(clean);
            return isNaN(num) ? null : num;
          })(),
          dataInicio: newProjectStart ? new Date(newProjectStart) : null,
          dataFim: newProjectEnd ? new Date(newProjectEnd) : null,
        }),
      });

      if (!response.ok) throw new Error('Erro ao criar empreendimento');

      // Clear state
      setNewProjectName('');
      setNewProjectLoc('');
      setNewProjectBudget('');
      setNewProjectStart('');
      setNewProjectEnd('');
      setNewProjectStatus('ESTUDO_VIABILIDADE');
      setIsProjectModalOpen(false);
      
      router.refresh();
      alert('Empreendimento cadastrado com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao criar projeto.');
    } finally {
      setIsCreatingProject(false);
    }
  };

  const handleCreateHouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHouseNum || !newHouseQuadra || !activeProjectIdForHouse) {
      alert('Número e quadra são obrigatórios');
      return;
    }

    setIsCreatingHouse(true);
    try {
      const response = await fetch('/api/casas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numero: newHouseNum,
          quadra: newHouseQuadra,
          empreendimentoId: activeProjectIdForHouse,
          statusObra: newHouseStatus,
          percentualObra: parseFloat(newHousePercent) || 0.0,
        }),
      });

      if (!response.ok) throw new Error('Erro ao cadastrar casa');

      // Clear state
      setNewHouseNum('');
      setNewHouseQuadra('');
      setNewHouseStatus('BACKLOG');
      setNewHousePercent('0');
      setActiveProjectIdForHouse(null);

      router.refresh();
      alert('Unidade habitacional cadastrada com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao criar unidade.');
    } finally {
      setIsCreatingHouse(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Top action header */}
      <div className="flex justify-between items-center bg-[#151b2c] p-4 rounded-xl border border-slate-800/80">
        <span className="text-xs text-slate-400 font-medium">Controle de aprovação e inclusão gráfica de novos projetos</span>
        <button
          onClick={() => setIsProjectModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-blue-500/10 cursor-pointer"
        >
          <Plus size={14} /> Novo Empreendimento
        </button>
      </div>

      {/* Kanban columns grid */}
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

                    const faseIndex = COLUMNS.findIndex(c => c.id === project.statusLegal);
                    const fasePercent = ((faseIndex + 1) / COLUMNS.length) * 100;

                    return (
                      <div
                        key={project.id}
                        className="glassmorphism p-4 rounded-xl border border-slate-850 hover:border-slate-700/80 transition-all duration-200 space-y-3 flex flex-col justify-between"
                      >
                        {/* Top Info */}
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="text-xs font-bold text-slate-100 font-sans flex items-center gap-1.5 truncate">
                              <Building2 size={12} className="text-blue-400 shrink-0" />
                              {project.nome}
                            </h4>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-400">
                                {project._count.casas} unidades
                              </span>
                              <button
                                onClick={() => {
                                  setActiveProjectIdForHouse(project.id);
                                  setActiveProjectNameForHouse(project.nome);
                                }}
                                className="p-1 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-500 hover:text-white rounded transition cursor-pointer"
                                title="Adicionar Casa"
                              >
                                <Plus size={10} />
                              </button>
                            </div>
                          </div>
                          <p className="text-[10px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                            <MapPin size={10} className="shrink-0" /> {project.localizacao}
                          </p>
                        </div>

                        {/* Progresso da Fase do Empreendimento */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px] text-slate-400 font-medium">
                            <span>Fase do Empreendimento</span>
                            <span className="font-bold text-slate-200">{Math.round(fasePercent)}%</span>
                          </div>
                          <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                              style={{ width: `${fasePercent}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[8px] text-slate-500">
                            <span>Status: <strong>{column.label}</strong></span>
                          </div>
                        </div>

                        {/* Rodapé Financeiro e Botão de Acesso */}
                        <div className="flex justify-between items-center border-t border-slate-900/60 pt-2.5 mt-1">
                          <div className="space-y-0.5">
                            <span className="text-[8px] text-slate-500 block uppercase font-bold">Orçamento</span>
                            <span className="text-[10px] font-bold text-slate-300 font-mono">
                              {project.orcamento ? formatCurrency(project.orcamento) : '—'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={isFirst || isLoading}
                              onClick={() => moveProject(project.id, project.statusLegal, 'left')}
                              className="p-1 bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:text-white rounded text-slate-500 hover:text-slate-300 disabled:opacity-20 disabled:hover:bg-slate-900 disabled:hover:text-slate-500 transition cursor-pointer"
                              title="Recuar fase do empreendimento"
                            >
                              <ArrowLeft size={10} />
                            </button>

                            <button
                              type="button"
                              disabled={isLast || isLoading}
                              onClick={() => moveProject(project.id, project.statusLegal, 'right')}
                              className="p-1 bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:text-white rounded text-slate-500 hover:text-slate-300 disabled:opacity-20 disabled:hover:bg-slate-900 disabled:hover:text-slate-500 transition cursor-pointer"
                              title="Avançar fase do empreendimento"
                            >
                              <ArrowRight size={10} />
                            </button>

                            {isLoading ? (
                              <Loader2 size={14} className="animate-spin text-slate-500" />
                            ) : (
                              <Link
                                href={`/empreendimentos/${project.id}/ficha-tecnica`}
                                title="Ver Ficha Detalhada"
                                className="p-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:text-white rounded-lg text-slate-400 transition cursor-pointer"
                              >
                                <ChevronRight size={14} />
                              </Link>
                            )}
                          </div>
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

      {/* Modal: Novo Empreendimento */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#000000]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glassmorphism w-full max-w-lg rounded-2xl border border-slate-800 shadow-2xl p-6 relative">
            <button
              onClick={() => setIsProjectModalOpen(false)}
              className="absolute right-4 top-4 p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
            >
              <X size={18} />
            </button>

            <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2 font-sans">
              <Building2 className="text-blue-500" size={20} /> Cadastrar Novo Empreendimento
            </h3>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="text-xs text-slate-400 block mb-1.5 font-medium">Nome do Empreendimento</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Residencial Flores"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs text-slate-400 block mb-1.5 font-medium">Localização</label>
                  <input
                    type="text"
                    required
                    placeholder="Cidade, Estado"
                    value={newProjectLoc}
                    onChange={(e) => setNewProjectLoc(e.target.value)}
                    className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1.5 font-medium">Orçamento Previsto (R$)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Ex: 500.000,00"
                    value={newProjectBudget}
                    onChange={(e) => {
                      // Permitir apenas dígitos, pontos, vírgulas e espaço
                      const val = e.target.value.replace(/[^0-9.,\s]/g, '');
                      setNewProjectBudget(val);
                    }}
                    className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1.5 font-medium">Fase Burocrática Inicial</label>
                  <select
                    value={newProjectStatus}
                    onChange={(e) => setNewProjectStatus(e.target.value)}
                    className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500/50"
                  >
                    <option value="ESTUDO_VIABILIDADE">Estudo de Viabilidade</option>
                    <option value="APROVACAO_PREFEITURA">Aprovação Prefeitura</option>
                    <option value="APROVACAO_CAIXA">Aprovação Caixa</option>
                    <option value="EM_OBRA">Em Obra</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1.5 font-medium">Data de Início</label>
                  <input
                    type="date"
                    value={newProjectStart}
                    onChange={(e) => setNewProjectStart(e.target.value)}
                    className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1.5 font-medium">Previsão de Entrega</label>
                  <input
                    type="date"
                    value={newProjectEnd}
                    onChange={(e) => setNewProjectEnd(e.target.value)}
                    className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsProjectModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingProject}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                >
                  {isCreatingProject ? 'Cadastrando...' : 'Cadastrar Empreendimento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Adicionar Casa */}
      {activeProjectIdForHouse && (
        <div className="fixed inset-0 z-50 bg-[#000000]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glassmorphism w-full max-w-md rounded-2xl border border-slate-800 shadow-2xl p-6 relative">
            <button
              onClick={() => setActiveProjectIdForHouse(null)}
              className="absolute right-4 top-4 p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
            >
              <X size={18} />
            </button>

            <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2 font-sans">
              <Home className="text-indigo-400" size={20} /> Cadastrar Nova Unidade
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Adicionar lote/casa no projeto <strong>{activeProjectNameForHouse}</strong>
            </p>

            <form onSubmit={handleCreateHouse} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1.5 font-medium">Número da Casa</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 105"
                    value={newHouseNum}
                    onChange={(e) => setNewHouseNum(e.target.value)}
                    className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1.5 font-medium">Quadra</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: C"
                    value={newHouseQuadra}
                    onChange={(e) => setNewHouseQuadra(e.target.value)}
                    className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-xs text-slate-400 block mb-1.5 font-medium">Estágio Físico da Obra</label>
                  <select
                    value={newHouseStatus}
                    onChange={(e) => setNewHouseStatus(e.target.value)}
                    className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-indigo-500/50"
                  >
                    <option value="BACKLOG">Não Iniciado (Backlog)</option>
                    <option value="APROVACOES">Burocracia e Aprovações</option>
                    <option value="INFRAESTRUTURA">Infraestrutura (Base)</option>
                    <option value="SUPRAESTRUTURA">Supraestrutura e Cobertura</option>
                    <option value="INSTALACOES">Instalações (Embutidas)</option>
                    <option value="ACABAMENTO">Acabamentos</option>
                    <option value="VISTORIA_CAIXA">Aguardando Vistoria Caixa</option>
                    <option value="CARTORIO">Legalização e Cartório</option>
                    <option value="VISITAS">Liberado para Visitas</option>
                    <option value="CONCLUIDA">Concluído / Entregue</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="text-xs text-slate-400 block mb-1.5 font-medium">Percentual Concluído (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newHousePercent}
                    onChange={(e) => setNewHousePercent(e.target.value)}
                    className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveProjectIdForHouse(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingHouse}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                >
                  {isCreatingHouse ? 'Adicionando...' : 'Adicionar Unidade'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
