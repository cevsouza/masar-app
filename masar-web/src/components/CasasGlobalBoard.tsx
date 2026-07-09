'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  Building2, 
  Home, 
  User, 
  ChevronRight, 
  Activity, 
  SlidersHorizontal,
  FolderLock,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';

interface CasasGlobalBoardProps {
  initialCasas: any[];
  empreendimentos: { id: string; nome: string }[];
}

const COLUMNS = [
  { id: 'PLAN', label: '1. Planejamento & Burocracia', color: 'border-t-amber-500 bg-amber-500/5 text-amber-400' },
  { id: 'ESTRUTURA', label: '2. Fundação & Estrutura', color: 'border-t-blue-500 bg-blue-500/5 text-blue-400' },
  { id: 'ACABAMENTO', label: '3. Instalações & Acabamento', color: 'border-t-pink-500 bg-pink-500/5 text-pink-400' },
  { id: 'REPASSE', label: '4. Vistoria & Repasse Caixa', color: 'border-t-indigo-500 bg-indigo-500/5 text-indigo-400' },
  { id: 'PRONTAS', label: '5. Prontas & Entregues', color: 'border-t-emerald-500 bg-emerald-500/5 text-emerald-400' }
];

const STAGES = [
  'BACKLOG',
  'APROVACOES',
  'INFRAESTRUTURA',
  'SUPRAESTRUTURA',
  'INSTALACOES',
  'ACABAMENTO',
  'VISTORIA_CAIXA',
  'CARTORIO',
  'VISITAS',
  'CONCLUIDA'
];

export default function CasasGlobalBoard({ initialCasas, empreendimentos }: CasasGlobalBoardProps) {
  const router = useRouter();
  const [selectedEmp, setSelectedEmp] = useState('');
  const [selectedSaleStatus, setSelectedSaleStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [movingId, setMovingId] = useState<string | null>(null);

  const handleMoveHouse = async (casaId: string, currentStatus: string, direction: 'left' | 'right') => {
    const currentIndex = STAGES.indexOf(currentStatus);
    let nextIndex = direction === 'right' ? currentIndex + 1 : currentIndex - 1;

    if (nextIndex < 0 || nextIndex >= STAGES.length) return;

    const nextStatus = STAGES[nextIndex];
    setMovingId(casaId);

    try {
      const response = await fetch(`/api/casas/${casaId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ statusObra: nextStatus }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Falha ao mover status do lote');
      }

      router.refresh();
    } catch (error: any) {
      console.error(error);
      alert(error.message || 'Erro ao mover status do lote.');
    } finally {
      setMovingId(null);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0
    }).format(val);
  };

  const getMacroStage = (status: string) => {
    switch (status) {
      case 'BACKLOG':
      case 'APROVACOES':
        return 'PLAN';
      case 'INFRAESTRUTURA':
      case 'SUPRAESTRUTURA':
        return 'ESTRUTURA';
      case 'INSTALACOES':
      case 'ACABAMENTO':
        return 'ACABAMENTO';
      case 'VISTORIA_CAIXA':
      case 'CARTORIO':
        return 'REPASSE';
      case 'VISITAS':
      case 'CONCLUIDA':
        return 'PRONTAS';
      default:
        return 'PLAN';
    }
  };

  const getStageLabel = (status: string) => {
    switch (status) {
      case 'BACKLOG': return 'Não Iniciada';
      case 'APROVACOES': return 'Burocracia';
      case 'INFRAESTRUTURA': return 'Fundação';
      case 'SUPRAESTRUTURA': return 'Supraestrutura';
      case 'INSTALACOES': return 'Instalações';
      case 'ACABAMENTO': return 'Acabamento';
      case 'VISTORIA_CAIXA': return 'Vistoria Caixa';
      case 'CARTORIO': return 'Cartório/Legalização';
      case 'VISITAS': return 'Liberada Visitas';
      case 'CONCLUIDA': return 'Entregue';
      default: return status;
    }
  };

  // Filtragem dos Lotes
  const filteredCasas = initialCasas.filter(casa => {
    // Filtro por Empreendimento
    if (selectedEmp && casa.empreendimentoId !== selectedEmp) return false;

    // Filtro por status de venda
    const isVendida = !!casa.clienteId;
    if (selectedSaleStatus === 'VENDIDA' && !isVendida) return false;
    if (selectedSaleStatus === 'ESTOQUE' && isVendida) return false;

    // Filtro de Busca textual (Lote, Quadra, Cliente ou Empreendimento)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchLote = casa.numero.toLowerCase().includes(query);
      const matchQuadra = casa.quadra.toLowerCase().includes(query);
      const matchCliente = casa.cliente?.nome?.toLowerCase().includes(query) || false;
      const matchEmp = casa.empreendimento.nome.toLowerCase().includes(query);
      return matchLote || matchQuadra || matchCliente || matchEmp;
    }

    return true;
  });

  // Agrupamento por Macro Coluna
  const columnsData: Record<string, any[]> = {
    PLAN: [],
    ESTRUTURA: [],
    ACABAMENTO: [],
    REPASSE: [],
    PRONTAS: []
  };

  filteredCasas.forEach(casa => {
    const macro = getMacroStage(casa.statusObra);
    if (columnsData[macro]) {
      columnsData[macro].push(casa);
    }
  });

  return (
    <div className="space-y-6">
      {/* Seção de Filtros */}
      <div className="glassmorphism p-5 rounded-2xl border border-slate-850 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Busca textual */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
          <input
            type="text"
            placeholder="Buscar por lote, quadra ou cliente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0f1422] border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
          />
        </div>

        {/* Combos de Filtragem */}
        <div className="flex flex-col md:flex-row w-full md:w-auto items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs w-full md:w-auto">
            <SlidersHorizontal size={14} /> Filtros:
          </div>

          {/* Empreendimento */}
          <select
            value={selectedEmp}
            onChange={(e) => setSelectedEmp(e.target.value)}
            className="w-full md:w-56 bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-350 focus:outline-none"
          >
            <option value="">Todos os Empreendimentos</option>
            {empreendimentos.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.nome}</option>
            ))}
          </select>

          {/* Status Comercial */}
          <select
            value={selectedSaleStatus}
            onChange={(e) => setSelectedSaleStatus(e.target.value)}
            className="w-full md:w-44 bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-350 focus:outline-none"
          >
            <option value="">Comercial (Todos)</option>
            <option value="VENDIDA">Vendidas</option>
            <option value="ESTOQUE">Em Estoque (Livre)</option>
          </select>
        </div>
      </div>

      {/* Grid Kanban Horizontal */}
      <div className="flex flex-col lg:flex-row gap-5 overflow-x-auto pb-4">
        {COLUMNS.map(col => {
          const casasNaColuna = columnsData[col.id] || [];
          return (
            <div 
              key={col.id} 
              className="w-full lg:w-72 flex-shrink-0 flex flex-col max-h-[80vh] bg-slate-950/20 border border-slate-900 rounded-2xl"
            >
              {/* Header Coluna */}
              <div className={`p-4 border-t-2 rounded-t-2xl flex justify-between items-center ${col.color} border-b border-slate-900/60`}>
                <span className="text-xs font-bold font-sans uppercase tracking-wider">{col.label}</span>
                <span className="bg-slate-900 text-slate-300 font-mono text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {casasNaColuna.length}
                </span>
              </div>

              {/* Cards List Container */}
              <div className="flex-1 p-3 overflow-y-auto space-y-3.5 custom-scrollbar min-h-[250px]">
                {casasNaColuna.map(casa => {
                  const isVendida = !!casa.clienteId;
                  return (
                    <div 
                      key={casa.id}
                      className="glassmorphism p-4 rounded-xl border border-slate-850 hover:border-slate-700/80 transition-all duration-200 space-y-3 flex flex-col justify-between"
                    >
                      {/* Top Info */}
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="text-xs font-bold text-slate-100 font-sans">
                            Casa {casa.numero} - Quadra {casa.quadra}
                          </h4>
                          <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded-md ${
                            isVendida ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-500'
                          }`}>
                            {isVendida ? 'VENDIDA' : 'ESTOQUE'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                          <Building2 size={10} /> {casa.empreendimento.nome}
                        </p>
                      </div>

                      {/* Progresso Físico */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[9px] text-slate-400 font-medium">
                          <span>Obra Física</span>
                          <span className="font-bold text-slate-200">{casa.percentualObra}%</span>
                        </div>
                        <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                            style={{ width: `${casa.percentualObra}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[8px] text-slate-500">
                          <span>Status: <strong>{getStageLabel(casa.statusObra)}</strong></span>
                        </div>
                      </div>

                      {/* Rodapé Financeiro e Botão de Acesso */}
                      <div className="flex justify-between items-center border-t border-slate-900/60 pt-2.5 mt-1">
                        <div className="space-y-0.5">
                          <span className="text-[8px] text-slate-500 block uppercase font-bold">Custo Apropriado</span>
                          <span className="text-[10px] font-bold text-slate-300 font-mono">
                            {formatCurrency(casa.totalApropriadoAprovado)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* Seta esquerda */}
                          <button
                            type="button"
                            disabled={casa.statusObra === 'BACKLOG' || movingId === casa.id}
                            onClick={() => handleMoveHouse(casa.id, casa.statusObra, 'left')}
                            className="p-1 bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:text-white rounded text-slate-500 hover:text-slate-300 disabled:opacity-20 disabled:hover:bg-slate-900 disabled:hover:text-slate-500 transition cursor-pointer"
                            title="Recuar fase da obra"
                          >
                            <ArrowLeft size={10} />
                          </button>

                          {/* Seta direita */}
                          <button
                            type="button"
                            disabled={casa.statusObra === 'CONCLUIDA' || movingId === casa.id}
                            onClick={() => handleMoveHouse(casa.id, casa.statusObra, 'right')}
                            className="p-1 bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:text-white rounded text-slate-500 hover:text-slate-300 disabled:opacity-20 disabled:hover:bg-slate-900 disabled:hover:text-slate-500 transition cursor-pointer"
                            title="Avançar fase da obra"
                          >
                            <ArrowRight size={10} />
                          </button>

                          <Link 
                            href={`/casas/${casa.id}`}
                            title="Ver Ficha Detalhada"
                            className="p-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:text-white rounded-lg text-slate-400 transition cursor-pointer"
                          >
                            <ChevronRight size={14} />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {casasNaColuna.length === 0 && (
                  <div className="py-12 text-center text-[11px] text-slate-600 italic">
                    Nenhum lote nesta fase.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
