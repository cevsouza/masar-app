'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Building2, 
  MapPin, 
  Compass, 
  Layers, 
  FileText, 
  DollarSign, 
  ShieldCheck, 
  Upload, 
  Download, 
  Trash2, 
  FileDigit,
  ArrowLeft,
  Sparkles,
  Info,
  Calendar,
  Loader2,
  X,
  Edit
} from 'lucide-react';
import Link from 'next/link';
import ModalNovoLancamento from './ModalNovoLancamento';
import CronogramaPanel from './CronogramaPanel';

interface Documento {
  id: string;
  nome: string;
  caminhoArquivo: string;
  tipo: string | null;
  dataCriacao: string | Date;
}

interface Empreendimento {
  id: string;
  nome: string;
  localizacao: string;
  statusLegal: string;
  endereco: string | null;
  cep: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  latitude: number | null;
  longitude: number | null;
  areaTotalTerreno: number | null;
  quantidadeCasasPrevistas: number | null;
  proprietarioAnteriorTerreno: string | null;
  valorCompraTerreno: number | null;
  amenidades: string[];
  padraoAreaConstruida: number | null;
  padraoAreaLote: number | null;
  padraoQuantidadeQuartos: number;
  padraoQuantidadeSuites: number;
  padraoQuantidadeBanheiros: number;
  padraoVagasGaragem: number;
  padraoPossuiQuintal: boolean;
  padraoSalaConjugada: boolean;
  casas: { id: string; percentualObra: number }[];
  documentos: Documento[];
  custosGlobais?: {
    id: string;
    descricao: string;
    tipo: string;
    valor: number;
    data: string;
  }[];
  atividadesCronograma?: {
    id: string;
    titulo: string;
    descricao: string | null;
    status: string;
    ordem: number;
    dataInicioPrevista: string;
    dataFimPrevista: string;
    dataInicioReal: string | null;
    dataFimReal: string | null;
    percentualConcluido: number;
  }[];
}

interface ProjectTechnicalSheetProps {
  project: Empreendimento;
}

const TIPO_DOCS_GED = [
  { key: 'PROJETO_ARQUITETONICO', label: 'Projeto Arquitetônico' },
  { key: 'PROJETO_ESTRUTURAL', label: 'Projeto Estrutural' },
  { key: 'PROJETO_HIDRAULICO', label: 'Projeto Hidráulico' },
  { key: 'PROJETO_ELETRICO', label: 'Projeto Elétrico' },
  { key: 'MATRICULA_TERRENO', label: 'Matrícula do Terreno' },
  { key: 'ALVARA_LOTEAMENTO', label: 'Alvará de Loteamento' },
  { key: 'OUTRO', label: 'Outros Documentos' }
];



export default function ProjectTechnicalSheet({ project }: ProjectTechnicalSheetProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'ficha' | 'financeiro' | 'cofre' | 'cronograma'>(() => {
    if (typeof window !== 'undefined') {
      const tabParam = new URLSearchParams(window.location.search).get('tab');
      if (tabParam === 'financeiro' || tabParam === 'cofre' || tabParam === 'ficha' || tabParam === 'cronograma') {
        return tabParam;
      }
    }
    return 'ficha';
  });
  
  // Upload States
  const [file, setFile] = useState<File | null>(null);
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState('PROJETO_ARQUITETONICO');
  const [isUploading, setIsUploading] = useState(false);

  // Edit States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editEndereco, setEditEndereco] = useState(project.endereco || '');
  const [editCep, setEditCep] = useState(project.cep || '');
  const [editBairro, setEditBairro] = useState(project.bairro || '');
  const [editCidade, setEditCidade] = useState(project.cidade || '');
  const [editEstado, setEditEstado] = useState(project.estado || '');
  const [editLatitude, setEditLatitude] = useState(project.latitude ? project.latitude.toString() : '');
  const [editLongitude, setEditLongitude] = useState(project.longitude ? project.longitude.toString() : '');
  const [editAreaTotalTerreno, setEditAreaTotalTerreno] = useState(project.areaTotalTerreno ? project.areaTotalTerreno.toString() : '');
  const [editQuantidadeCasasPrevistas, setEditQuantidadeCasasPrevistas] = useState(project.quantidadeCasasPrevistas ? project.quantidadeCasasPrevistas.toString() : '');
  const [editProprietarioAnteriorTerreno, setEditProprietarioAnteriorTerreno] = useState(project.proprietarioAnteriorTerreno || '');
  const [editValorCompraTerreno, setEditValorCompraTerreno] = useState(project.valorCompraTerreno ? project.valorCompraTerreno.toString() : '');
  const [editAmenidades, setEditAmenidades] = useState(project.amenidades.join(', '));
  
  // Default House Specs Template States
  const [editPadraoAreaConstruida, setEditPadraoAreaConstruida] = useState(project.padraoAreaConstruida ? project.padraoAreaConstruida.toString() : '');
  const [editPadraoAreaLote, setEditPadraoAreaLote] = useState(project.padraoAreaLote ? project.padraoAreaLote.toString() : '');
  const [editPadraoQuantidadeQuartos, setEditPadraoQuantidadeQuartos] = useState(project.padraoQuantidadeQuartos.toString());
  const [editPadraoQuantidadeSuites, setEditPadraoQuantidadeSuites] = useState(project.padraoQuantidadeSuites.toString());
  const [editPadraoQuantidadeBanheiros, setEditPadraoQuantidadeBanheiros] = useState(project.padraoQuantidadeBanheiros.toString());
  const [editPadraoVagasGaragem, setEditPadraoVagasGaragem] = useState(project.padraoVagasGaragem.toString());
  const [editPadraoPossuiQuintal, setEditPadraoPossuiQuintal] = useState(project.padraoPossuiQuintal);
  const [editPadraoSalaConjugada, setEditPadraoSalaConjugada] = useState(project.padraoSalaConjugada);
  const [replicarTipologia, setReplicarTipologia] = useState(false);

  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [userRole, setUserRole] = useState('COMERCIAL');
  const [isDeleting, setIsDeleting] = useState(false);

  React.useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.authenticated) {
          setUserRole(data.role || 'COMERCIAL');
        }
      })
      .catch(err => console.error('Erro ao buscar role:', err));
  }, []);

  const handleDeleteProject = async () => {
    if (!confirm(`Tem certeza absoluta que deseja excluir o empreendimento "${project.nome}"?\nEsta ação é irreversível e excluirá todas as casas e documentos associados.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/empreendimentos/${project.id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao excluir empreendimento.');
      }

      alert('✓ Empreendimento excluído com sucesso!');
      router.push('/empreendimentos');
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Global Cost and DRE states
  const [dreData, setDreData] = useState<any>(null);
  const [isLoadingDre, setIsLoadingDre] = useState(false);
  const [cgDescricao, setCgDescricao] = useState('');
  const [cgTipo, setCgTipo] = useState('TERRENO');
  const [cgValor, setCgValor] = useState('');
  const [cgData, setCgData] = useState(new Date().toISOString().split('T')[0]);
  const [cgRealizado, setCgRealizado] = useState(false);
  const [isSavingCg, setIsSavingCg] = useState(false);

  // Estudo de Viabilidade States
  const [insumosList, setInsumosList] = useState<any[]>([]);
  const [viabPrecoVenda, setViabPrecoVenda] = useState('200000');
  const [viabItems, setViabItems] = useState<any[]>([]);
  const [selectedInsumoId, setSelectedInsumoId] = useState('');
  const [viabQtd, setViabQtd] = useState('');
  const [viabCustoUnit, setViabCustoUnit] = useState('');
  const [isGeneratingViab, setIsGeneratingViab] = useState(false);

  useEffect(() => {
    fetch('/api/insumos')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setInsumosList(data);
        } else {
          console.error('Insumos data is not an array:', data);
          setInsumosList([]);
        }
      })
      .catch(err => {
        console.error('Erro ao buscar insumos:', err);
        setInsumosList([]);
      });
  }, []);

  const handleAddViabItem = () => {
    if (!selectedInsumoId || !viabQtd || !viabCustoUnit) {
      alert('Preencha o insumo, quantidade e custo unitário.');
      return;
    }
    const insumoObj = insumosList.find(i => i.id === selectedInsumoId);
    if (!insumoObj) return;

    setViabItems(prev => [
      ...prev,
      {
        insumoId: selectedInsumoId,
        nome: insumoObj.nome,
        categoria: insumoObj.categoria,
        unidadeMedida: insumoObj.unidadeMedida,
        quantidadePlanejada: parseFloat(viabQtd),
        custoUnitarioPrevisto: parseFloat(viabCustoUnit)
      }
    ]);

    setSelectedInsumoId('');
    setViabQtd('');
    setViabCustoUnit('');
  };

  const handleRemoveViabItem = (index: number) => {
    setViabItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleGenerateFeasibility = async () => {
    if (viabItems.length === 0) {
      alert('Adicione pelo menos um item ao orçamento padrão da viabilidade.');
      return;
    }
    if (!confirm('Esta ação irá sobrepor todos os orçamentos e preços de venda planejados das casas deste projeto. Deseja continuar?')) {
      return;
    }
    setIsGeneratingViab(true);
    try {
      const res = await fetch(`/api/empreendimentos/${project.id}/viabilidade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          precoVendaProjetado: parseFloat(viabPrecoVenda),
          itensOrcamento: viabItems.map(item => ({
            insumoId: item.insumoId,
            quantidadePlanejada: item.quantidadePlanejada,
            custoUnitarioPrevisto: item.custoUnitarioPrevisto
          }))
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao gerar viabilidade.');
      }

      alert('✓ Estudo de Viabilidade gerado com sucesso! Orçamento e VGV replicados para todas as casas.');
      router.refresh();
      fetchDreData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsGeneratingViab(false);
    }
  };

  // Universal Financial Modal
  const [isUniversalModalOpen, setIsUniversalModalOpen] = useState(false);
  const [universalNatureza, setUniversalNatureza] = useState<'RECEITA' | 'DESPESA' | undefined>(undefined);
  const [universalCategoria, setUniversalCategoria] = useState<string | undefined>(undefined);
  const [universalDestino, setUniversalDestino] = useState<'GLOBAL' | 'CASA' | undefined>(undefined);
  const [universalCasaId, setUniversalCasaId] = useState<string | undefined>(undefined);

  // DRE Interactive Input Modal States
  const [isDreModalOpen, setIsDreModalOpen] = useState(false);
  const [dreModalCategory, setDreModalCategory] = useState('');
  const [dreModalLabel, setDreModalLabel] = useState('');
  const [dreInputValue, setDreInputValue] = useState('');
  const [dreInputDesc, setDreInputDesc] = useState('');
  const [dreInputDate, setDreInputDate] = useState(new Date().toISOString().split('T')[0]);
  const [dreInputRealizado, setDreInputRealizado] = useState(false);
  const [dreInputCasaId, setDreInputCasaId] = useState('');
  const [dreInputInsumoId, setDreInputInsumoId] = useState('');
  const [dreInputQtd, setDreInputQtd] = useState('1');
  const [isSavingDreInput, setIsSavingDreInput] = useState(false);

  const openDreModal = (category: string, label: string) => {
    if (category === 'VGV') {
      setDreModalCategory('VGV');
      setDreModalLabel(label);
      setDreInputValue('');
      setIsDreModalOpen(true);
      return;
    }

    // Map other categories to the single ledger categories
    if (category === 'TERRENO') {
      setUniversalNatureza('DESPESA');
      setUniversalCategoria('TERRENO');
      setUniversalDestino('GLOBAL');
      setUniversalCasaId(undefined);
    } else if (category === 'PROJETOS') {
      setUniversalNatureza('DESPESA');
      setUniversalCategoria('PROJETOS');
      setUniversalDestino('GLOBAL');
      setUniversalCasaId(undefined);
    } else if (category === 'MARKETING' || category === 'OUTRO') {
      setUniversalNatureza('DESPESA');
      setUniversalCategoria('PROJETOS');
      setUniversalDestino('GLOBAL');
      setUniversalCasaId(undefined);
    } else if (category.includes('TAXAS')) {
      setUniversalNatureza('DESPESA');
      setUniversalCategoria('IMPOSTOS');
      setUniversalDestino('GLOBAL');
      setUniversalCasaId(undefined);
    } else {
      setUniversalNatureza('DESPESA');
      if (category.includes('MAODEOBRA')) {
        setUniversalCategoria('MAO_DE_OBRA');
      } else {
        setUniversalCategoria('MATERIAL');
      }
      setUniversalDestino('CASA');
      if (project.casas && project.casas.length > 0) {
        setUniversalCasaId(project.casas[0].id);
      }
    }

    setIsUniversalModalOpen(true);
  };

  const handleSaveDreInput = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dreInputValue) {
      alert('Por favor, informe o valor.');
      return;
    }
    setIsSavingDreInput(true);
    try {
      if (dreModalCategory === 'VGV') {
        const res = await fetch(`/api/empreendimentos/${project.id}/viabilidade`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            precoVendaProjetado: parseFloat(dreInputValue)
          })
        });
        if (!res.ok) throw new Error('Erro ao atualizar preço de venda das casas.');
        alert('✓ VGV atualizado com sucesso para todas as unidades!');
      } 
      else if (['TERRENO', 'PROJETOS', 'MARKETING', 'OUTRO'].includes(dreModalCategory)) {
        const res = await fetch(`/api/empreendimentos/${project.id}/custos-globais`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            descricao: dreInputDesc || dreModalLabel,
            tipo: dreModalCategory,
            valor: parseFloat(dreInputValue),
            realizado: dreInputRealizado,
            data: dreInputDate
          })
        });
        if (!res.ok) throw new Error('Erro ao cadastrar custo global.');
        alert('✓ Custo global registrado diretamente pelo DRE!');
      } 
      else {
        if (!dreInputCasaId) {
          throw new Error('Nenhuma casa selecionada.');
        }

        if (dreInputRealizado) {
          const res = await fetch(`/api/casas/${dreInputCasaId}/apropriacoes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              insumoId: dreInputInsumoId,
              quantidadeReal: parseFloat(dreInputQtd),
              custoTotal: parseFloat(dreInputValue),
              comprovanteUrl: null
            })
          });
          if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || 'Erro ao registrar apropriação.');
          }
          alert('✓ Custo Realizado apropriado com sucesso na casa!');
        } else {
          const res = await fetch(`/api/casas/${dreInputCasaId}/orcamento`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              insumoId: dreInputInsumoId,
              quantidadePlanejada: parseFloat(dreInputQtd),
              custoUnitarioPrevisto: parseFloat(dreInputValue)
            })
          });
          if (!res.ok) throw new Error('Erro ao adicionar item de orçamento.');
          alert('✓ Item de Orçamento adicionado com sucesso na casa!');
        }
      }

      setIsDreModalOpen(false);
      router.refresh();
      fetchDreData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSavingDreInput(false);
    }
  };

  const fetchDreData = async () => {
    setIsLoadingDre(true);
    try {
      const res = await fetch(`/api/financeiro/dre?empreendimentoId=${project.id}&_t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setDreData(data);
      }
    } catch (err) {
      console.error('Erro ao buscar DRE:', err);
    } finally {
      setIsLoadingDre(false);
    }
  };

  React.useEffect(() => {
    if (activeTab === 'financeiro') {
      fetchDreData();
    }
  }, [activeTab]);



  const handleDeleteGlobalCost = async (costId: string) => {
    if (!confirm('Deseja realmente excluir este custo global do empreendimento?')) {
      return;
    }
    try {
      const res = await fetch(`/api/financeiro/custos-globais/${costId}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao excluir custo.');
      }
      alert('✓ Custo global excluído com sucesso!');
      router.refresh();
      fetchDreData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingEdit(true);
    try {
      const res = await fetch(`/api/empreendimentos/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endereco: editEndereco || null,
          cep: editCep || null,
          bairro: editBairro || null,
          cidade: editCidade || null,
          estado: editEstado || null,
          latitude: editLatitude ? parseFloat(editLatitude) : null,
          longitude: editLongitude ? parseFloat(editLongitude) : null,
          areaTotalTerreno: editAreaTotalTerreno ? parseFloat(editAreaTotalTerreno) : null,
          quantidadeCasasPrevistas: editQuantidadeCasasPrevistas ? parseInt(editQuantidadeCasasPrevistas, 10) : null,
          proprietarioAnteriorTerreno: editProprietarioAnteriorTerreno || null,
          valorCompraTerreno: editValorCompraTerreno ? parseFloat(editValorCompraTerreno) : null,
          amenidades: editAmenidades.split(',').map(a => a.trim()).filter(Boolean),
          padraoAreaConstruida: editPadraoAreaConstruida ? parseFloat(editPadraoAreaConstruida) : null,
          padraoAreaLote: editPadraoAreaLote ? parseFloat(editPadraoAreaLote) : null,
          padraoQuantidadeQuartos: parseInt(editPadraoQuantidadeQuartos, 10) || 0,
          padraoQuantidadeSuites: parseInt(editPadraoQuantidadeSuites, 10) || 0,
          padraoQuantidadeBanheiros: parseInt(editPadraoQuantidadeBanheiros, 10) || 0,
          padraoVagasGaragem: parseInt(editPadraoVagasGaragem, 10) || 0,
          padraoPossuiQuintal: editPadraoPossuiQuintal === true,
          padraoSalaConjugada: editPadraoSalaConjugada === true,
          replicarTipologia: replicarTipologia
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao salvar alterações.');
      }

      setIsEditModalOpen(false);
      alert('✓ Ficha técnica atualizada com sucesso!');
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSavingEdit(false);
    }
  };



  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  // Cálculo de progresso médio das obras do empreendimento
  const totalCasas = project.casas.length;
  const mediaProgresso = totalCasas > 0
    ? project.casas.reduce((acc, c) => acc + c.percentualObra, 0) / totalCasas
    : 0;

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !nome) {
      alert('Por favor, informe o nome do documento e selecione um arquivo.');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('nome', nome);
      formData.append('tipo', tipo);
      formData.append('empreendimentoId', project.id);

      const res = await fetch('/api/ged/documentos', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erro ao fazer upload');
      }

      setNome('');
      setFile(null);
      
      const fileInput = document.getElementById('project-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      alert('✓ Projeto cadastrado e armazenado com sucesso no cofre GED!');
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar projeto.');
    } finally {
      setIsUploading(false);
    }
  };

  // Filtragem de documentos técnicos do cofre
  const documentosTecnicos = project.documentos.filter(d => 
    d.tipo && d.tipo !== 'OUTRO'
  );

  return (
    <div className="space-y-6 animate-fade-in text-slate-350 text-xs">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1e293b] pb-6">
        <div className="space-y-1.5">
          <Link 
            href="/empreendimentos" 
            className="flex items-center gap-1 text-slate-500 hover:text-slate-300 font-bold uppercase tracking-wider text-[10px]"
          >
            <ArrowLeft size={12} /> Voltar para Projetos
          </Link>
          <h1 className="text-2xl font-bold text-white tracking-tight font-sans">
            {project.nome}
          </h1>
          <p className="text-xs text-slate-400">
            Local: {project.localizacao} | Status Legal: <strong className="text-blue-400">{project.statusLegal.replace('_', ' ')}</strong>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex border border-slate-800 bg-[#101625]/30 p-1 rounded-xl">
            <button 
              onClick={() => setActiveTab('ficha')} 
              className={`px-4 py-2 rounded-lg font-bold uppercase tracking-wider transition cursor-pointer ${
                activeTab === 'ficha' ? 'bg-blue-600/10 text-blue-400 border border-blue-500/15' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Ficha Técnica
            </button>
            <button 
              onClick={() => setActiveTab('financeiro')} 
              className={`px-4 py-2 rounded-lg font-bold uppercase tracking-wider transition cursor-pointer ${
                activeTab === 'financeiro' ? 'bg-blue-600/10 text-blue-400 border border-blue-500/15' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Financeiro & Demonstração de Resultados
            </button>
            <button
              onClick={() => setActiveTab('cofre')}
              className={`px-4 py-2 rounded-lg font-bold uppercase tracking-wider transition cursor-pointer ${
                activeTab === 'cofre' ? 'bg-blue-600/10 text-blue-400 border border-blue-500/15' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Cofre de Projetos
            </button>
            <button
              onClick={() => setActiveTab('cronograma')}
              className={`px-4 py-2 rounded-lg font-bold uppercase tracking-wider transition cursor-pointer ${
                activeTab === 'cronograma' ? 'bg-blue-600/10 text-blue-400 border border-blue-500/15' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Cronograma
            </button>
          </div>

          {userRole === 'ADMIN' && (
            <button
              onClick={handleDeleteProject}
              disabled={isDeleting}
              className="px-4 py-2 bg-red-650 hover:bg-red-600 text-white font-bold rounded-lg uppercase tracking-wider transition cursor-pointer flex items-center gap-1 shadow-lg shadow-red-500/10 disabled:opacity-50"
            >
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </button>
          )}

          <button
            onClick={() => setIsEditModalOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg uppercase tracking-wider transition cursor-pointer flex items-center gap-1 shadow-lg shadow-blue-500/10"
          >
            Editar Ficha
          </button>
        </div>
      </div>

      {/* Conteúdo Aba 1: Ficha Técnica do Terreno */}
      {activeTab === 'ficha' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Lado Esquerdo: Ficha e Detalhes */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Bloco Terreno */}
            <div className="glassmorphism p-6 rounded-2xl border border-slate-800/80 shadow-2xl space-y-5">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider block border-b border-slate-800/60 pb-2">
                Ficha Técnica do Terreno
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-[#0f1422]/60 border border-slate-850 rounded-xl">
                  <span className="text-slate-500 block uppercase text-[9px] font-bold">Área Total do Terreno</span>
                  <span className="text-slate-200 font-mono text-sm font-bold mt-0.5 block">
                    {project.areaTotalTerreno ? `${Number(project.areaTotalTerreno).toLocaleString('pt-BR')} m²` : 'Não informada'}
                  </span>
                </div>
                
                <div className="p-3 bg-[#0f1422]/60 border border-slate-850 rounded-xl">
                  <span className="text-slate-500 block uppercase text-[9px] font-bold">Valor de Aquisição</span>
                  <span className="text-emerald-400 font-mono text-sm font-bold mt-0.5 block">
                    {project.valorCompraTerreno ? formatCurrency(Number(project.valorCompraTerreno)) : 'Não informado'}
                  </span>
                </div>

                <div className="p-3 bg-[#0f1422]/60 border border-slate-850 rounded-xl col-span-2">
                  <span className="text-slate-500 block uppercase text-[9px] font-bold">Proprietário Anterior</span>
                  <span className="text-slate-200 text-xs font-bold mt-0.5 block">
                    {project.proprietarioAnteriorTerreno || 'Não informado'}
                  </span>
                </div>
              </div>
            </div>

            {/* Bloco Infraestrutura & Engenharia */}
            <div className="glassmorphism p-6 rounded-2xl border border-slate-800/80 shadow-2xl space-y-5">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider block border-b border-slate-800/60 pb-2">
                Dados Técnicos e Obras
              </h3>

              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 bg-[#0f1422]/40 border border-slate-850 rounded-xl text-center">
                  <span className="text-slate-500 block uppercase text-[8px] font-bold">Casas Previstas</span>
                  <span className="text-white font-mono text-lg font-extrabold mt-0.5 block">
                    {project.quantidadeCasasPrevistas || '---'}
                  </span>
                </div>

                <div className="p-3 bg-[#0f1422]/40 border border-slate-850 rounded-xl text-center">
                  <span className="text-slate-500 block uppercase text-[8px] font-bold">Casas Lançadas</span>
                  <span className="text-white font-mono text-lg font-extrabold mt-0.5 block">
                    {totalCasas}
                  </span>
                </div>

                <div className="p-3 bg-[#0f1422]/40 border border-slate-850 rounded-xl text-center">
                  <span className="text-slate-500 block uppercase text-[8px] font-bold">Progresso Geral</span>
                  <span className="text-blue-400 font-mono text-lg font-extrabold mt-0.5 block">
                    {mediaProgresso.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Amenidades */}
              <div className="space-y-2">
                <span className="text-slate-500 block uppercase text-[9px] font-bold">Amenidades & Pavimentação</span>
                <div className="flex flex-wrap gap-2">
                  {project.amenidades.map((amenidade, idx) => (
                    <span 
                      key={idx}
                      className="bg-blue-950/20 border border-blue-900/30 text-blue-400 font-bold px-2.5 py-1 rounded-lg uppercase text-[9px]"
                    >
                      {amenidade}
                    </span>
                  ))}

                  {project.amenidades.length === 0 && (
                    <span className="text-slate-500 italic text-[11px]">Nenhuma amenidade cadastrada.</span>
                  )}
                </div>
              </div>
            </div>

            {/* Bloco Tipologia Padrão */}
            <div className="glassmorphism p-6 rounded-2xl border border-slate-800/80 shadow-2xl space-y-5">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider block border-b border-slate-800/60 pb-2">
                Tipologia Padrão das Casas (Gabarito)
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-[#0f1422]/60 border border-slate-850 rounded-xl">
                  <span className="text-slate-500 block uppercase text-[8px] font-bold">Área Construída</span>
                  <span className="text-slate-200 font-mono text-xs font-bold mt-0.5 block">
                    {project.padraoAreaConstruida ? `${Number(project.padraoAreaConstruida).toLocaleString('pt-BR')} m²` : '—'}
                  </span>
                </div>
                
                <div className="p-3 bg-[#0f1422]/60 border border-slate-850 rounded-xl">
                  <span className="text-slate-500 block uppercase text-[8px] font-bold">Área do Lote</span>
                  <span className="text-slate-200 font-mono text-xs font-bold mt-0.5 block">
                    {project.padraoAreaLote ? `${Number(project.padraoAreaLote).toLocaleString('pt-BR')} m²` : '—'}
                  </span>
                </div>

                <div className="p-3 bg-[#0f1422]/60 border border-slate-850 rounded-xl">
                  <span className="text-slate-500 block uppercase text-[8px] font-bold">Quartos</span>
                  <span className="text-slate-200 font-mono text-xs font-bold mt-0.5 block">
                    {project.padraoQuantidadeQuartos || 0}
                  </span>
                </div>

                <div className="p-3 bg-[#0f1422]/60 border border-slate-850 rounded-xl">
                  <span className="text-slate-500 block uppercase text-[8px] font-bold">Suítes</span>
                  <span className="text-slate-200 font-mono text-xs font-bold mt-0.5 block">
                    {project.padraoQuantidadeSuites || 0}
                  </span>
                </div>

                <div className="p-3 bg-[#0f1422]/60 border border-slate-850 rounded-xl">
                  <span className="text-slate-500 block uppercase text-[8px] font-bold">Banheiros</span>
                  <span className="text-slate-200 font-mono text-xs font-bold mt-0.5 block">
                    {project.padraoQuantidadeBanheiros || 0}
                  </span>
                </div>

                <div className="p-3 bg-[#0f1422]/60 border border-slate-850 rounded-xl">
                  <span className="text-slate-500 block uppercase text-[8px] font-bold">Vagas Garagem</span>
                  <span className="text-slate-200 font-mono text-xs font-bold mt-0.5 block">
                    {project.padraoVagasGaragem || 0}
                  </span>
                </div>

                <div className="p-3 bg-[#0f1422]/60 border border-slate-850 rounded-xl">
                  <span className="text-slate-500 block uppercase text-[8px] font-bold">Quintal</span>
                  <span className="text-slate-200 text-xs font-bold mt-0.5 block">
                    {project.padraoPossuiQuintal ? 'Possui' : 'Não possui'}
                  </span>
                </div>

                <div className="p-3 bg-[#0f1422]/60 border border-slate-850 rounded-xl">
                  <span className="text-slate-500 block uppercase text-[8px] font-bold">Sala Conjugada</span>
                  <span className="text-slate-200 text-xs font-bold mt-0.5 block">
                    {project.padraoSalaConjugada ? 'Sim' : 'Não'}
                  </span>
                </div>
              </div>
            </div>

            {/* Endereço */}
            <div className="glassmorphism p-6 rounded-2xl border border-slate-800/80 shadow-2xl space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider block border-b border-slate-800/60 pb-2">
                Localização e Logística
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <span className="text-slate-500 block uppercase text-[9px] font-bold">Endereço Completo</span>
                  <span className="text-slate-200 font-semibold block mt-0.5">
                    {project.endereco || 'Não cadastrado'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block uppercase text-[9px] font-bold">Bairro</span>
                  <span className="text-slate-200 font-semibold block mt-0.5">{project.bairro || '---'}</span>
                </div>

                <div>
                  <span className="text-slate-500 block uppercase text-[9px] font-bold">CEP</span>
                  <span className="text-slate-200 font-semibold block mt-0.5">{project.cep || '---'}</span>
                </div>

                <div>
                  <span className="text-slate-500 block uppercase text-[9px] font-bold">Cidade / Estado</span>
                  <span className="text-slate-200 font-semibold block mt-0.5">
                    {project.cidade ? `${project.cidade} - ${project.estado || ''}` : '---'}
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Lado Direito: Mapa Visual Geolocalizado */}
          <div className="lg:col-span-5 space-y-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider block">Geolocalização / Satélite</h3>
            
            {project.latitude && project.longitude ? (
              <div className="glassmorphism p-4 rounded-2xl border border-slate-800/80 shadow-2xl space-y-4">
                <iframe 
                  width="100%" 
                  height="340" 
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${project.longitude - 0.005}%2C${project.latitude - 0.005}%2C${project.longitude + 0.005}%2C${project.latitude + 0.005}&layer=mapnik&marker=${project.latitude}%2C${project.longitude}`}
                  className="rounded-xl border border-slate-800"
                  allowFullScreen
                />
                
                <div className="flex gap-2 mt-2">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${project.latitude},${project.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-800 hover:bg-slate-750 text-white rounded-xl text-[10px] font-bold transition text-center cursor-pointer border border-slate-700/50"
                  >
                    <MapPin size={12} className="text-indigo-400" /> Abrir no Google Maps (Visão Satélite)
                  </a>
                </div>
                
                <div className="flex justify-between items-center bg-[#0f1422]/60 p-3.5 rounded-xl border border-slate-850 font-mono text-[10px]">
                  <div>
                    <span className="text-slate-500 block uppercase text-[8px] font-bold">Latitude</span>
                    <span className="text-slate-350">{project.latitude.toFixed(6)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 block uppercase text-[8px] font-bold">Longitude</span>
                    <span className="text-slate-350">{project.longitude.toFixed(6)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="glassmorphism p-8 rounded-2xl border border-slate-850 text-center text-slate-500 space-y-3">
                <Compass className="mx-auto text-slate-650" size={32} />
                <p className="font-bold text-white text-xs">Mapa Não Disponível</p>
                <p className="text-[10px] max-w-xs mx-auto">
                  Preencha a latitude e longitude do terreno nos dados do empreendimento para plotar o mapa visual por satélite.
                </p>
              </div>
            )}
          </div>

        </div>
      )}
{/* Conteúdo Aba 2: Gestão Financeira Global (Custos Globais e DRE Comparativo) */}
      {activeTab === 'financeiro' && (
        <div className="space-y-8 animate-fade-in text-xs text-slate-350">
          
          {/* 1. Nubank-Style Summary Cards Strip */}
          {dreData && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1: Resultado Líquido */}
              <div className="glassmorphism p-6 rounded-3xl border border-slate-800 bg-[#0d121f]/40 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500" />
                <span className="text-[10px] text-slate-455 uppercase tracking-widest font-bold block">Resultado Líquido</span>
                <h2 className={`text-2xl font-black font-mono tracking-tight mt-2 ${dreData.lucroLiquidoRealizado >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatCurrency(dreData.lucroLiquidoRealizado)}
                </h2>
                <div className="flex items-center justify-between mt-3 text-[10px] text-slate-500 pt-3 border-t border-slate-850/50">
                  <span>Projetado / Estimado:</span>
                  <span className="font-mono text-slate-350">{formatCurrency(dreData.lucroLiquidoProjetado)}</span>
                </div>
              </div>

              {/* Card 2: VGV Estimado */}
              <div className="glassmorphism p-6 rounded-3xl border border-slate-800 bg-[#0d121f]/40 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-purple-500" />
                <span className="text-[10px] text-slate-455 uppercase tracking-widest font-bold block">VGV Estimado</span>
                <h2 className="text-2xl font-black font-mono text-white tracking-tight mt-2">
                  {formatCurrency(dreData.totalVGVRealizado > 0 ? dreData.totalVGVRealizado : dreData.totalVGVProjetado)}
                </h2>
                <div className="flex items-center justify-between mt-3 text-[10px] text-slate-500 pt-3 border-t border-slate-850/50">
                  <span>Projetado Real:</span>
                  <span className="font-mono text-slate-350">{formatCurrency(dreData.totalVGVProjetado)}</span>
                </div>
              </div>

              {/* Card 3: Margem de Lucro */}
              <div className="glassmorphism p-6 rounded-3xl border border-slate-800 bg-[#0d121f]/40 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
                <span className="text-[10px] text-slate-455 uppercase tracking-widest font-bold block">Margem de Lucro</span>
                <h2 className={`text-2xl font-black font-mono tracking-tight mt-2 ${dreData.lucroLiquidoRealizado >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {dreData.totalVGVRealizado > 0 
                    ? `${((dreData.lucroLiquidoRealizado / dreData.totalVGVRealizado) * 100).toFixed(1)}%`
                    : '0.0%'
                  }
                </h2>
                <div className="flex items-center justify-between mt-3 text-[10px] text-slate-500 pt-3 border-t border-slate-850/50">
                  <span>Margem Projetada:</span>
                  <span className="font-mono text-slate-350">
                    {dreData.totalVGVProjetado > 0 
                      ? `${((dreData.lucroLiquidoProjetado / dreData.totalVGVProjetado) * 100).toFixed(1)}%`
                      : '0.0%'
                    }
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 2. DRE Table & Detailed Statements */}
          <div className="glassmorphism p-6 rounded-3xl border border-slate-800 bg-[#0d121f]/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-850 pb-5 mb-6">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-sans flex items-center gap-2">
                  <Sparkles size={16} className="text-purple-400" /> Demonstração do Resultado do Exercício (DRE)
                </h3>
                <p className="text-[10px] text-slate-455 mt-1">Clique nas linhas destacadas para realizar novos lançamentos ou retificar valores.</p>
              </div>
              <button 
                type="button"
                onClick={fetchDreData}
                disabled={isLoadingDre}
                className="px-4 py-2 bg-indigo-650 hover:bg-indigo-600 disabled:opacity-50 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 shadow-lg shadow-indigo-600/10"
              >
                {isLoadingDre ? 'Atualizando...' : 'Atualizar DRE'}
              </button>
            </div>

            {isLoadingDre && !dreData ? (
              <div className="py-20 text-center text-slate-500 text-xs italic">Carregando dados da demonstração...</div>
            ) : dreData ? (
              <div className="overflow-x-auto border border-slate-850/60 rounded-2xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#0b0f19] border-b border-slate-850 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-3.5 px-5">Estrutura do DRE</th>
                      <th className="py-3.5 px-5 text-right">Orçado / Projetado</th>
                      <th className="py-3.5 px-5 text-right">Realizado / Pago</th>
                      <th className="py-3.5 px-5 text-right">Desvio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850/60 text-slate-300">
                    
                    {/* ROB - VGV */}
                    <tr 
                      onClick={() => openDreModal('VGV', 'Preço de Venda Médio / VGV')}
                      className="hover:bg-purple-500/5 hover:text-white cursor-pointer transition-all duration-150 group font-bold text-slate-200"
                    >
                      <td className="py-4 px-5 flex items-center gap-2 group-hover:text-purple-400 transition-colors">
                        <span>Receita Bruta - Valor Geral de Vendas (VGV)</span>
                        <Edit size={12} className="opacity-0 group-hover:opacity-100 text-purple-400 transition-opacity" />
                      </td>
                      <td className="py-4 px-5 text-right font-mono">{formatCurrency(dreData.totalVGVProjetado)}</td>
                      <td className="py-4 px-5 text-right font-mono text-emerald-455">{formatCurrency(dreData.totalVGVRealizado)}</td>
                      <td className={`py-4 px-5 text-right font-mono ${(dreData.totalVGVRealizado - dreData.totalVGVProjetado) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatCurrency(dreData.totalVGVRealizado - dreData.totalVGVProjetado)}
                      </td>
                    </tr>

                    {/* Comissão */}
                    <tr 
                      onClick={() => openDreModal('VGV', 'Comissão de Vendas')}
                      className="hover:bg-purple-500/5 hover:text-white cursor-pointer transition-all duration-150 group text-slate-400"
                    >
                      <td className="py-3 px-5 pl-8 flex items-center gap-2 group-hover:text-purple-400 transition-colors">
                        <span>(-) Comissão de Vendas</span>
                        <Edit size={12} className="opacity-0 group-hover:opacity-100 text-purple-400 transition-opacity" />
                      </td>
                      <td className="py-3 px-5 text-right font-mono">-{formatCurrency(dreData.totalComissaoProjetada)}</td>
                      <td className="py-3 px-5 text-right font-mono">-{formatCurrency(dreData.totalComissaoRealizada)}</td>
                      <td className={`py-3 px-5 text-right font-mono ${dreData.totalComissaoRealizada > dreData.totalComissaoProjetada ? 'text-red-400' : 'text-emerald-400'}`}>
                        {formatCurrency(dreData.totalComissaoProjetada - dreData.totalComissaoRealizada)}
                      </td>
                    </tr>

                    {/* Impostos RET */}
                    <tr className="hover:bg-slate-900/10 text-slate-450">
                      <td className="py-3 px-5 pl-8">(-) Impostos Regime Especial Tributário (RET)</td>
                      <td className="py-3 px-5 text-right font-mono">-{formatCurrency(dreData.totalImpostoProjetado)}</td>
                      <td className="py-3 px-5 text-right font-mono">-{formatCurrency(dreData.totalImpostoRealizado)}</td>
                      <td className={`py-3 px-5 text-right font-mono ${dreData.totalImpostoRealizado > dreData.totalImpostoProjetado ? 'text-red-400' : 'text-emerald-400'}`}>
                        {formatCurrency(dreData.totalImpostoProjetado - dreData.totalImpostoRealizado)}
                      </td>
                    </tr>

                    {/* Rateios de Custos Globais */}
                    <tr className="bg-slate-950/20 font-semibold text-slate-200">
                      <td className="py-4 px-5">(-) Custos Globais do Empreendimento (Macro Rateados)</td>
                      <td className="py-4 px-5 text-right font-mono">-{formatCurrency(dreData.totalRateioProj)}</td>
                      <td className="py-4 px-5 text-right font-mono">-{formatCurrency(dreData.totalRateioReal)}</td>
                      <td className={`py-4 px-5 text-right font-mono ${(dreData.totalRateioProj - dreData.totalRateioReal) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatCurrency(dreData.totalRateioProj - dreData.totalRateioReal)}
                      </td>
                    </tr>

                    <tr 
                      onClick={() => openDreModal('TERRENO', 'Aquisição de Terreno')}
                      className="hover:bg-purple-500/5 hover:text-white cursor-pointer transition-all duration-150 group text-slate-455"
                    >
                      <td className="py-2.5 px-5 pl-8 flex items-center gap-2 group-hover:text-purple-400 transition-colors">
                        <span>Aquisição de Terreno</span>
                        <Edit size={12} className="opacity-0 group-hover:opacity-100 text-purple-400 transition-opacity" />
                      </td>
                      <td className="py-2.5 px-5 text-right font-mono">-{formatCurrency(dreData.rateioTerrenoProj)}</td>
                      <td className="py-2.5 px-5 text-right font-mono">-{formatCurrency(dreData.rateioTerrenoReal)}</td>
                      <td className={`py-2.5 px-5 text-right font-mono ${(dreData.rateioTerrenoProj - dreData.rateioTerrenoReal) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatCurrency(dreData.rateioTerrenoProj - dreData.rateioTerrenoReal)}
                      </td>
                    </tr>

                    <tr 
                      onClick={() => openDreModal('PROJETOS', 'Projetos & Licenciamento')}
                      className="hover:bg-purple-500/5 hover:text-white cursor-pointer transition-all duration-150 group text-slate-455"
                    >
                      <td className="py-2.5 px-5 pl-8 flex items-center gap-2 group-hover:text-purple-400 transition-colors">
                        <span>Projetos & Licenciamento</span>
                        <Edit size={12} className="opacity-0 group-hover:opacity-100 text-purple-400 transition-opacity" />
                      </td>
                      <td className="py-2.5 px-5 text-right font-mono">-{formatCurrency(dreData.rateioProjetosProj)}</td>
                      <td className="py-2.5 px-5 text-right font-mono">-{formatCurrency(dreData.rateioProjetosReal)}</td>
                      <td className={`py-2.5 px-5 text-right font-mono ${(dreData.rateioProjetosProj - dreData.rateioProjetosReal) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatCurrency(dreData.rateioProjetosProj - dreData.rateioProjetosReal)}
                      </td>
                    </tr>

                    <tr 
                      onClick={() => openDreModal('MARKETING', 'Marketing & Publicidade')}
                      className="hover:bg-purple-500/5 hover:text-white cursor-pointer transition-all duration-150 group text-slate-455"
                    >
                      <td className="py-2.5 px-5 pl-8 flex items-center gap-2 group-hover:text-purple-400 transition-colors">
                        <span>Marketing & Publicidade</span>
                        <Edit size={12} className="opacity-0 group-hover:opacity-100 text-purple-400 transition-opacity" />
                      </td>
                      <td className="py-2.5 px-5 text-right font-mono">-{formatCurrency(dreData.rateioMarketingProj)}</td>
                      <td className="py-2.5 px-5 text-right font-mono">-{formatCurrency(dreData.rateioMarketingReal)}</td>
                      <td className={`py-2.5 px-5 text-right font-mono ${(dreData.rateioMarketingProj - dreData.rateioMarketingReal) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatCurrency(dreData.rateioMarketingProj - dreData.rateioMarketingReal)}
                      </td>
                    </tr>

                    {/* Custos Fixos */}
                    <tr className="bg-slate-950/20 font-semibold text-slate-200">
                      <td className="py-4 px-5">(-) Custos Fixos de Construção (Apoio & Canteiro)</td>
                      <td className="py-4 px-5 text-right font-mono">-{formatCurrency(dreData.totalFixoProjetado || 0)}</td>
                      <td className="py-4 px-5 text-right font-mono">-{formatCurrency(dreData.totalFixoRealizado || 0)}</td>
                      <td className={`py-4 px-5 text-right font-mono ${(dreData.totalFixoProjetado - dreData.totalFixoRealizado) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatCurrency((dreData.totalFixoProjetado || 0) - (dreData.totalFixoRealizado || 0))}
                      </td>
                    </tr>

                    <tr 
                      onClick={() => openDreModal('MAODEOBRA', 'Equipe de Gestão e Campo')}
                      className="hover:bg-purple-500/5 hover:text-white cursor-pointer transition-all duration-150 group text-slate-455"
                    >
                      <td className="py-2.5 px-5 pl-8 flex items-center gap-2 group-hover:text-purple-400 transition-colors">
                        <span>Equipe de Gestão e Supervisão (Campo/Engenharia)</span>
                        <Edit size={12} className="opacity-0 group-hover:opacity-100 text-purple-400 transition-opacity" />
                      </td>
                      <td className="py-2.5 px-5 text-right font-mono">-{formatCurrency(dreData.projFixoEquipeGestao || 0)}</td>
                      <td className="py-2.5 px-5 text-right font-mono">-{formatCurrency(dreData.realFixoEquipeGestao || 0)}</td>
                      <td className={`py-2.5 px-5 text-right font-mono ${(dreData.projFixoEquipeGestao - dreData.realFixoEquipeGestao) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatCurrency((dreData.projFixoEquipeGestao || 0) - (dreData.realFixoEquipeGestao || 0))}
                      </td>
                    </tr>

                    <tr 
                      onClick={() => openDreModal('MATERIAL', 'Canteiro de Obras')}
                      className="hover:bg-purple-500/5 hover:text-white cursor-pointer transition-all duration-150 group text-slate-455"
                    >
                      <td className="py-2.5 px-5 pl-8 flex items-center gap-2 group-hover:text-purple-400 transition-colors">
                        <span>Manutenção do Canteiro de Obras</span>
                        <Edit size={12} className="opacity-0 group-hover:opacity-100 text-purple-400 transition-opacity" />
                      </td>
                      <td className="py-2.5 px-5 text-right font-mono">-{formatCurrency(dreData.projFixoCanteiro || 0)}</td>
                      <td className="py-2.5 px-5 text-right font-mono">-{formatCurrency(dreData.realFixoCanteiro || 0)}</td>
                      <td className={`py-2.5 px-5 text-right font-mono ${(dreData.projFixoCanteiro - dreData.realFixoCanteiro) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatCurrency((dreData.projFixoCanteiro || 0) - (dreData.realFixoCanteiro || 0))}
                      </td>
                    </tr>

                    <tr 
                      onClick={() => openDreModal('MATERIAL', 'Consumo Contínuo')}
                      className="hover:bg-purple-500/5 hover:text-white cursor-pointer transition-all duration-150 group text-slate-455"
                    >
                      <td className="py-2.5 px-5 pl-8 flex items-center gap-2 group-hover:text-purple-400 transition-colors">
                        <span>Consumo Contínuo (Concessionárias / Seguranças)</span>
                        <Edit size={12} className="opacity-0 group-hover:opacity-100 text-purple-400 transition-opacity" />
                      </td>
                      <td className="py-2.5 px-5 text-right font-mono">-{formatCurrency(dreData.projFixoConsumo || 0)}</td>
                      <td className="py-2.5 px-5 text-right font-mono">-{formatCurrency(dreData.realFixoConsumo || 0)}</td>
                      <td className={`py-2.5 px-5 text-right font-mono ${(dreData.projFixoConsumo - dreData.realFixoConsumo) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatCurrency((dreData.projFixoConsumo || 0) - (dreData.realFixoConsumo || 0))}
                      </td>
                    </tr>

                    <tr 
                      onClick={() => openDreModal('MATERIAL', 'Locação de Andaimes / Betoneiras')}
                      className="hover:bg-purple-500/5 hover:text-white cursor-pointer transition-all duration-150 group text-slate-455"
                    >
                      <td className="py-2.5 px-5 pl-8 flex items-center gap-2 group-hover:text-purple-400 transition-colors">
                        <span>Locações Mensais (Andaimes / Betoneiras)</span>
                        <Edit size={12} className="opacity-0 group-hover:opacity-100 text-purple-400 transition-opacity" />
                      </td>
                      <td className="py-2.5 px-5 text-right font-mono">-{formatCurrency(dreData.projFixoLocacao || 0)}</td>
                      <td className="py-2.5 px-5 text-right font-mono">-{formatCurrency(dreData.realFixoLocacao || 0)}</td>
                      <td className={`py-2.5 px-5 text-right font-mono ${(dreData.projFixoLocacao - dreData.realFixoLocacao) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatCurrency((dreData.projFixoLocacao || 0) - (dreData.realFixoLocacao || 0))}
                      </td>
                    </tr>

                    <tr 
                      onClick={() => openDreModal('TAXAS', 'Taxas, Alvarás e Emplacamento')}
                      className="hover:bg-purple-500/5 hover:text-white cursor-pointer transition-all duration-150 group text-slate-455"
                    >
                      <td className="py-2.5 px-5 pl-8 flex items-center gap-2 group-hover:text-purple-400 transition-colors">
                        <span>Tributos e Alvarás de Construção</span>
                        <Edit size={12} className="opacity-0 group-hover:opacity-100 text-purple-400 transition-opacity" />
                      </td>
                      <td className="py-2.5 px-5 text-right font-mono">-{formatCurrency(dreData.projFixoTaxasSeguros || 0)}</td>
                      <td className="py-2.5 px-5 text-right font-mono">-{formatCurrency(dreData.realFixoTaxasSeguros || 0)}</td>
                      <td className={`py-2.5 px-5 text-right font-mono ${(dreData.projFixoTaxasSeguros - dreData.realFixoTaxasSeguros) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatCurrency((dreData.projFixoTaxasSeguros || 0) - (dreData.realFixoTaxasSeguros || 0))}
                      </td>
                    </tr>

                    {/* Custos Variáveis */}
                    <tr className="bg-slate-950/20 font-semibold text-slate-200">
                      <td className="py-4 px-5">(-) Custos Variáveis de Construção (Materiais & Serviços)</td>
                      <td className="py-4 px-5 text-right font-mono">-{formatCurrency(dreData.totalVariavelProjetado || 0)}</td>
                      <td className="py-4 px-5 text-right font-mono">-{formatCurrency(dreData.totalVariavelRealizado || 0)}</td>
                      <td className={`py-4 px-5 text-right font-mono ${(dreData.totalVariavelProjetado - dreData.totalVariavelRealizado) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatCurrency((dreData.totalVariavelProjetado || 0) - (dreData.totalVariavelRealizado || 0))}
                      </td>
                    </tr>

                    <tr 
                      onClick={() => openDreModal('MATERIAL', 'Materiais de Construção')}
                      className="hover:bg-purple-500/5 hover:text-white cursor-pointer transition-all duration-150 group text-slate-455"
                    >
                      <td className="py-2.5 px-5 pl-8 flex items-center gap-2 group-hover:text-purple-400 transition-colors">
                        <span>Materiais da Obra (Curva A - Ferro/Cimento/Blocos)</span>
                        <Edit size={12} className="opacity-0 group-hover:opacity-100 text-purple-400 transition-opacity" />
                      </td>
                      <td className="py-2.5 px-5 text-right font-mono">-{formatCurrency(dreData.projVariavelMateriais || 0)}</td>
                      <td className="py-2.5 px-5 text-right font-mono">-{formatCurrency(dreData.realVariavelMateriais || 0)}</td>
                      <td className={`py-2.5 px-5 text-right font-mono ${(dreData.projVariavelMateriais - dreData.realVariavelMateriais) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatCurrency((dreData.projVariavelMateriais || 0) - (dreData.realVariavelMateriais || 0))}
                      </td>
                    </tr>

                    <tr 
                      onClick={() => openDreModal('MAODEOBRA', 'Mão de Obra Direta')}
                      className="hover:bg-purple-500/5 hover:text-white cursor-pointer transition-all duration-150 group text-slate-455"
                    >
                      <td className="py-2.5 px-5 pl-8 flex items-center gap-2 group-hover:text-purple-400 transition-colors">
                        <span>Mão de Obra de Produção (Empreiteiro/Pedreiros)</span>
                        <Edit size={12} className="opacity-0 group-hover:opacity-100 text-purple-400 transition-opacity" />
                      </td>
                      <td className="py-2.5 px-5 text-right font-mono">-{formatCurrency(dreData.projVariavelMaoDireta || 0)}</td>
                      <td className="py-2.5 px-5 text-right font-mono">-{formatCurrency(dreData.realVariavelMaoDireta || 0)}</td>
                      <td className={`py-2.5 px-5 text-right font-mono ${(dreData.projVariavelMaoDireta - dreData.realVariavelMaoDireta) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatCurrency((dreData.projVariavelMaoDireta || 0) - (dreData.realVariavelMaoDireta || 0))}
                      </td>
                    </tr>

                    <tr 
                      onClick={() => openDreModal('MATERIAL', 'Logística e Fretes')}
                      className="hover:bg-purple-500/5 hover:text-white cursor-pointer transition-all duration-150 group text-slate-455"
                    >
                      <td className="py-2.5 px-5 pl-8 flex items-center gap-2 group-hover:text-purple-400 transition-colors">
                        <span>Frete de Insumos e Logística</span>
                        <Edit size={12} className="opacity-0 group-hover:opacity-100 text-purple-400 transition-opacity" />
                      </td>
                      <td className="py-2.5 px-5 text-right font-mono">-{formatCurrency(dreData.projVariavelLogistica || 0)}</td>
                      <td className="py-2.5 px-5 text-right font-mono">-{formatCurrency(dreData.realVariavelLogistica || 0)}</td>
                      <td className={`py-2.5 px-5 text-right font-mono ${(dreData.projVariavelLogistica - dreData.realVariavelLogistica) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatCurrency((dreData.projVariavelLogistica || 0) - (dreData.realVariavelLogistica || 0))}
                      </td>
                    </tr>

                    <tr 
                      onClick={() => openDreModal('MATERIAL', 'Locações e Máquinas')}
                      className="hover:bg-purple-500/5 hover:text-white cursor-pointer transition-all duration-150 group text-slate-455"
                    >
                      <td className="py-2.5 px-5 pl-8 flex items-center gap-2 group-hover:text-purple-400 transition-colors">
                        <span>Locações de Máquinas (Terraplenagem / Fundações)</span>
                        <Edit size={12} className="opacity-0 group-hover:opacity-100 text-purple-400 transition-opacity" />
                      </td>
                      <td className="py-2.5 px-5 text-right font-mono">-{formatCurrency(dreData.projVariavelMaquinas || 0)}</td>
                      <td className="py-2.5 px-5 text-right font-mono">-{formatCurrency(dreData.realVariavelMaquinas || 0)}</td>
                      <td className={`py-2.5 px-5 text-right font-mono ${(dreData.projVariavelMaquinas - dreData.realVariavelMaquinas) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatCurrency((dreData.projVariavelMaquinas || 0) - (dreData.realVariavelMaquinas || 0))}
                      </td>
                    </tr>

                    {/* Resultado Líquido */}
                    <tr className="bg-slate-900/60 font-extrabold text-sm text-white border-t-2 border-slate-800">
                      <td className="py-4.5 px-5">(=) RESULTADO LÍQUIDO OPERACIONAL</td>
                      <td className="py-4.5 px-5 text-right font-mono">{formatCurrency(dreData.lucroLiquidoProjetado)}</td>
                      <td className={`py-4.5 px-5 text-right font-mono ${dreData.lucroLiquidoRealizado >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatCurrency(dreData.lucroLiquidoRealizado)}
                      </td>
                      <td className={`py-4.5 px-5 text-right font-mono ${(dreData.lucroLiquidoRealizado - dreData.lucroLiquidoProjetado) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatCurrency(dreData.lucroLiquidoRealizado - dreData.lucroLiquidoProjetado)}
                      </td>
                    </tr>

                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-16 text-center text-slate-500 italic">DRE indisponível no momento. Clique em log de atualização.</div>
            )}
          </div>

          {/* 3. Controls & History Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Controls: Registrar + Viabilidade */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Quick Transaction Registration Card */}
              <div className="glassmorphism p-6 rounded-3xl border border-slate-800 bg-[#0d121f]/20 flex flex-col justify-between space-y-5">
                <div className="space-y-1.5">
                  <span className="text-[10px] text-purple-400 uppercase tracking-widest font-bold block">Registros Rápidos</span>
                  <h3 className="text-base font-bold text-white font-sans">Lançamento Geral / Rateios</h3>
                  <p className="text-[10px] text-slate-455">Lance despesas globais do terreno, projetos de arquitetura, alvarás, RET ou comissões diretamente no livro-caixa.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setUniversalNatureza('DESPESA');
                    setUniversalCategoria('TERRENO');
                    setUniversalDestino('GLOBAL');
                    setUniversalCasaId(undefined);
                    setIsUniversalModalOpen(true);
                  }}
                  className="w-full py-3 bg-purple-650 hover:bg-purple-600 text-white font-bold rounded-2xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-purple-650/10 text-xs"
                >
                  <DollarSign size={14} />
                  + Novo Lançamento Geral / Rateio
                </button>
              </div>

              {/* standard budget & feasibility generator */}
              <div className="glassmorphism p-6 rounded-3xl border border-slate-800 bg-[#0d121f]/20 space-y-5">
                <div className="space-y-1">
                  <span className="text-[10px] text-indigo-400 uppercase tracking-widest font-bold block">Geração de Viabilidade</span>
                  <h3 className="text-base font-bold text-white font-sans">Orçamento Padrão & VGV</h3>
                  <p className="text-[10px] text-slate-455">Configure a tipologia do orçamento padrão da casa e replique para todas as casas do empreendimento de forma preditiva.</p>
                </div>
                
                <div className="space-y-4 text-xs">
                  <div className="space-y-1.5">
                    <label className="text-slate-400 font-medium">Preço de Venda Médio das Casas (VGV) (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="Ex: 215000.00"
                      value={viabPrecoVenda}
                      onChange={(e) => setViabPrecoVenda(e.target.value)}
                      className="w-full bg-[#070a13] border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500/50 font-mono"
                    />
                  </div>

                  <div className="bg-[#070a13]/60 p-4 rounded-2xl border border-slate-855/70 space-y-3">
                    <h4 className="font-bold text-slate-350 text-[10px] uppercase">Lançar Item do Orçamento Padrão</h4>
                    
                    <div className="space-y-1.5">
                      <label className="text-slate-455 font-medium">Selecionar Insumo Padrão</label>
                      <select
                        value={selectedInsumoId}
                        onChange={(e) => {
                          setSelectedInsumoId(e.target.value);
                          const ins = insumosList.find(i => i.id === e.target.value);
                          if (ins) setViabCustoUnit('1');
                        }}
                        className="w-full bg-[#0d121f] border border-slate-800 rounded-xl px-3 py-2 text-slate-355 focus:outline-none"
                      >
                        <option value="">-- Selecione o Insumo --</option>
                        {insumosList.map((ins: any) => (
                          <option key={ins.id} value={ins.id}>{ins.nome} ({ins.unidadeMedida}) - {ins.categoria}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-slate-455 font-medium">Qtd Planejada</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0"
                          value={viabQtd}
                          onChange={(e) => setViabQtd(e.target.value)}
                          className="w-full bg-[#0d121f] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-slate-455 font-medium">Custo Unitário (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={viabCustoUnit}
                          onChange={(e) => setViabCustoUnit(e.target.value)}
                          className="w-full bg-[#0d121f] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none font-mono"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddViabItem}
                      className="w-full py-2 bg-slate-850 hover:bg-slate-800 text-slate-300 font-bold rounded-xl transition cursor-pointer text-xs"
                    >
                      + Adicionar Item ao Modelo
                    </button>
                  </div>

                  {/* List of items in standard budget template */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-400 text-[10px] uppercase">Itens Adicionados ({viabItems.length})</h4>
                    <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                      {viabItems.map((item, idx) => (
                        <div key={idx} className="p-2.5 bg-[#070a13]/40 border border-slate-855 rounded-xl flex items-center justify-between text-[10px]">
                          <div>
                            <p className="font-bold text-slate-300">{item.nome}</p>
                            <p className="text-[9px] text-slate-500 mt-0.5">
                              Qtd: {item.quantidadePlanejada} {item.unidadeMedida} | Unit: R$ {item.custoUnitarioPrevisto}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveViabItem(idx)}
                            className="text-[9px] font-bold text-red-500 hover:text-red-400 px-2 py-0.5 bg-slate-900 border border-slate-855 rounded transition cursor-pointer"
                          >
                            Remover
                          </button>
                        </div>
                      ))}
                      {viabItems.length === 0 && (
                        <p className="text-[10px] text-slate-555 italic py-2 text-center">Nenhum item orçado no modelo.</p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isGeneratingViab}
                    onClick={handleGenerateFeasibility}
                    className="w-full py-3 bg-indigo-650 hover:bg-indigo-600 disabled:opacity-50 text-white font-extrabold rounded-2xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-655/15"
                  >
                    {isGeneratingViab ? 'Processando Replicação...' : 'Replicar Orçamento e Gerar Viabilidade'}
                  </button>

                </div>
              </div>

            </div>

            {/* Right Controls: Historico de Custos Globais */}
            <div className="lg:col-span-7 space-y-6">
              <div className="glassmorphism p-6 rounded-3xl border border-slate-800 bg-[#0d121f]/20 space-y-4">
                <div className="border-b border-slate-855 pb-3">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-sans">
                    Extrato de Rateios e Custos Globais ({project.custosGlobais?.length || 0})
                  </h3>
                  <p className="text-[10px] text-slate-455 mt-1">Lançamentos de nível macro rateados sobre o VGV do projeto.</p>
                </div>
                
                <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                  {project.custosGlobais && project.custosGlobais.length > 0 ? (
                    project.custosGlobais.map((cg: any) => (
                      <div key={cg.id} className="p-3.5 bg-[#070a13]/40 border border-slate-855 hover:border-slate-800 rounded-2xl flex items-center justify-between transition-all duration-200">
                        <div>
                          <p className="font-bold text-slate-200 text-xs">{cg.descricao}</p>
                          <div className="text-[10px] text-slate-500 mt-1.5 flex items-center gap-2">
                            <span className={`px-1.5 py-0.2 bg-slate-900 border rounded text-[8px] font-bold ${cg.realizado ? 'text-emerald-400' : 'text-blue-400'}`}>
                              {cg.realizado ? 'REAL' : 'ORÇADO'}
                            </span>
                            <span>{cg.tipo}</span>
                            <span>•</span>
                            <span>{formatDate(cg.data)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-mono font-bold text-red-400 text-xs">{formatCurrency(cg.valor)}</span>
                          {['ADMIN', 'FINANCEIRO'].includes(userRole) && (
                            <button
                              onClick={() => handleDeleteGlobalCost(cg.id)}
                              className="text-[9px] font-bold text-red-500 hover:text-red-400 px-2 py-1 bg-red-955/20 rounded-lg border border-red-900/30 transition cursor-pointer"
                            >
                              Excluir
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 py-12 text-center italic">Nenhum custo global registrado.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <ModalNovoLancamento
            isOpen={isUniversalModalOpen}
            onClose={() => setIsUniversalModalOpen(false)}
            defaultEmpreendimentoId={project.id}
            defaultCasaId={universalCasaId}
            defaultNatureza={universalNatureza}
            defaultCategoria={universalCategoria}
            defaultDestino={universalDestino}
            onSuccess={() => {
              router.refresh();
              fetchDreData();
            }}
          />
        </div>
      )}



      {/* Conteúdo Aba 3: Cofre de Projetos (GED Técnico) */}
      {activeTab === 'cofre' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Lado Esquerdo: Formulário de Upload Otimizado */}
          <div className="lg:col-span-5 space-y-6 animate-slide-up">
            <div className="glassmorphism p-6 rounded-2xl border border-slate-800/80 shadow-2xl space-y-5">
              <div className="border-b border-slate-800/60 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Sparkles size={16} className="text-blue-400 animate-pulse" /> Arquivar Novo Projeto
                </h3>
                <p className="text-[10px] text-slate-450 mt-1">Insira plantas estruturais, hidráulicas ou arquivos dwg/pdf no cofre do terreno.</p>
              </div>

              <form onSubmit={handleUpload} className="space-y-4 text-xs text-slate-300">
                
                {/* Nome do Documento */}
                <div className="space-y-1.5">
                  <label className="text-slate-450 font-medium">Nome do Documento (Ex: Planta Baixa Sanitária) *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Hidrossanitário - Bloco A"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 focus:outline-none focus:border-blue-500/50"
                  />
                </div>

                {/* Tipo de Documento */}
                <div className="space-y-1.5">
                  <label className="text-slate-450 font-medium">Tipo de Projeto Técnico *</label>
                  <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value)}
                    className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-250 focus:outline-none focus:border-blue-500/50"
                  >
                    {TIPO_DOCS_GED.map(t => (
                      <option key={t.key} value={t.key}>{t.label}</option>
                    ))}
                  </select>
                </div>

                {/* File Upload */}
                <div className="space-y-1.5">
                  <label className="text-slate-450 font-medium">Arquivo (PDF, DWG, PNG) *</label>
                  <div className="border border-dashed border-slate-800 hover:border-slate-700/60 rounded-xl p-4 text-center cursor-pointer transition relative">
                    <input
                      id="project-file-input"
                      type="file"
                      required
                      accept=".pdf,.dwg,.png,.jpg,.jpeg"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setFile(e.target.files[0]);
                          if (!nome) setNome(e.target.files[0].name.split('.')[0]);
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <div className="space-y-2">
                      <Upload className="mx-auto text-slate-500" size={20} />
                      <p className="text-[10px] text-slate-400 font-medium">
                        {file ? `Selecionado: ${file.name}` : 'Arraste ou clique para selecionar o projeto'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isUploading}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
                >
                  {isUploading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Arquivando no Cofre...
                    </>
                  ) : (
                    'Registrar no Cofre'
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Lado Direito: Lista de Projetos Técnicos do Cofre */}
          <div className="lg:col-span-7 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider block">Projetos Arquivados</h3>
            
            <div className="grid grid-cols-1 gap-3 max-h-[500px] overflow-y-auto pr-1">
              {documentosTecnicos.map(doc => {
                const labelObj = TIPO_DOCS_GED.find(t => t.key === doc.tipo);

                return (
                  <div 
                    key={doc.id}
                    className="p-4 bg-[#0f1422] border border-slate-800 rounded-xl flex items-center justify-between"
                  >
                    <div className="space-y-1 max-w-[70%]">
                      <div className="flex items-center gap-2 text-white font-bold text-xs">
                        <FileText size={14} className="text-blue-400 shrink-0" />
                        <span className="truncate">{doc.nome}</span>
                      </div>
                      <p className="text-[9px] text-slate-500 font-mono">
                        Enviado em: {formatDate(doc.dataCriacao)}
                      </p>
                      <span className="inline-block bg-slate-900 border border-slate-800 text-[8px] text-slate-400 font-bold px-1.5 py-0.5 rounded uppercase mt-1">
                        {labelObj ? labelObj.label : 'Especificação Técnica'}
                      </span>
                    </div>

                    <a
                      href={`/api/ged/documentos/${doc.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-slate-800/40 hover:bg-slate-800 border border-slate-800 hover:border-slate-700/60 rounded-lg text-slate-350 hover:text-white transition flex items-center justify-center"
                      title="Download do Projeto"
                    >
                      <Download size={14} />
                    </a>
                  </div>
                );
              })}

              {documentosTecnicos.length === 0 && (
                <div className="bg-[#0f1422]/60 p-12 rounded-2xl border border-slate-850 text-center text-slate-500 space-y-2">
                  <FileDigit className="mx-auto text-slate-650" size={24} />
                  <p className="font-bold text-white text-xs">Cofre de Projetos Vazio</p>
                  <p className="text-[10px] max-w-xs mx-auto">
                    Nenhum projeto complementar (elétrico, estrutural ou arquitetônico) arquivado para este terreno.
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* Conteúdo Aba 4: Cronograma Geral do Empreendimento */}
      {activeTab === 'cronograma' && (
        <CronogramaPanel
          escopo="GERAL"
          empreendimentoId={project.id}
          initialAtividades={project.atividadesCronograma || []}
        />
      )}

      {/* Modal: Editar Ficha Técnica */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#000000]/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="glassmorphism w-full max-w-2xl rounded-2xl border border-slate-800 shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto my-8">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="absolute right-4 top-4 p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
            >
              <X size={18} />
            </button>

            <h3 className="text-base font-bold text-white mb-5 flex items-center gap-2 font-sans uppercase tracking-wide border-b border-slate-850 pb-2">
              <Building2 className="text-blue-550" size={18} /> Editar Ficha Técnica do Empreendimento
            </h3>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-slate-300">
              
              {/* Seção 1: Dados do Terreno */}
              <div>
                <h4 className="font-bold text-white text-[10px] uppercase tracking-wider mb-2 text-blue-400">1. Dados de Aquisição do Terreno</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-medium">Área do Terreno (m²)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Ex: 5000.00"
                      value={editAreaTotalTerreno}
                      onChange={(e) => setEditAreaTotalTerreno(e.target.value)}
                      className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-medium">Valor de Compra (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Ex: 350000.00"
                      value={editValorCompraTerreno}
                      onChange={(e) => setEditValorCompraTerreno(e.target.value)}
                      className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-medium">Proprietário Anterior</label>
                    <input
                      type="text"
                      placeholder="Ex: Espólio Silva"
                      value={editProprietarioAnteriorTerreno}
                      onChange={(e) => setEditProprietarioAnteriorTerreno(e.target.value)}
                      className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500/50"
                    />
                  </div>
                </div>
              </div>

              {/* Seção 2: Engenharia e Obras */}
              <div>
                <h4 className="font-bold text-white text-[10px] uppercase tracking-wider mb-2 text-blue-400">2. Planejamento de Obras</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-medium">Quantidade de Casas Previstas</label>
                    <input
                      type="number"
                      placeholder="Ex: 24"
                      value={editQuantidadeCasasPrevistas}
                      onChange={(e) => setEditQuantidadeCasasPrevistas(e.target.value)}
                      className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-medium">Amenidades (Separadas por vírgula)</label>
                    <input
                      type="text"
                      placeholder="Muro, Pavimentação, Iluminação"
                      value={editAmenidades}
                      onChange={(e) => setEditAmenidades(e.target.value)}
                      className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500/50"
                    />
                  </div>
                </div>
              </div>

              {/* Seção 3: Localização Exata e Geolocalização */}
              <div>
                <h4 className="font-bold text-white text-[10px] uppercase tracking-wider mb-2 text-blue-400">3. Endereço e Coordenadas</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[10px] text-slate-400 font-medium">Endereço (Rua, Número)</label>
                    <input
                      type="text"
                      placeholder="Ex: Rodovia BR-101, Km 12"
                      value={editEndereco}
                      onChange={(e) => setEditEndereco(e.target.value)}
                      className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-medium">CEP</label>
                    <input
                      type="text"
                      placeholder="Ex: 59000-000"
                      value={editCep}
                      onChange={(e) => setEditCep(e.target.value)}
                      className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-medium">Bairro</label>
                    <input
                      type="text"
                      placeholder="Ex: Centro"
                      value={editBairro}
                      onChange={(e) => setEditBairro(e.target.value)}
                      className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-medium">Cidade</label>
                    <input
                      type="text"
                      placeholder="Ex: Natal"
                      value={editCidade}
                      onChange={(e) => setEditCidade(e.target.value)}
                      className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-medium">Estado (UF)</label>
                    <input
                      type="text"
                      placeholder="Ex: RN"
                      value={editEstado}
                      onChange={(e) => setEditEstado(e.target.value)}
                      className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-medium">Latitude</label>
                    <input
                      type="number"
                      step="0.000001"
                      placeholder="Ex: -5.79448"
                      value={editLatitude}
                      onChange={(e) => setEditLatitude(e.target.value)}
                      className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-medium">Longitude</label>
                    <input
                      type="number"
                      step="0.000001"
                      placeholder="Ex: -35.211"
                      value={editLongitude}
                      onChange={(e) => setEditLongitude(e.target.value)}
                      className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500/50"
                    />
                  </div>
                </div>
              </div>

              {/* Seção 4: Tipologia Padrão das Casas (Gabarito) */}
              <div>
                <h4 className="font-bold text-white text-[10px] uppercase tracking-wider mb-2 text-blue-400">4. Tipologia Padrão das Casas (Gabarito)</h4>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-medium">Área Construída Padrão (m²)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Ex: 50.00"
                      value={editPadraoAreaConstruida}
                      onChange={(e) => setEditPadraoAreaConstruida(e.target.value)}
                      className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500/50"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-medium">Área do Lote Padrão (m²)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Ex: 200.00"
                      value={editPadraoAreaLote}
                      onChange={(e) => setEditPadraoAreaLote(e.target.value)}
                      className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500/50"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-medium">Quartos Padrão</label>
                    <input
                      type="number"
                      value={editPadraoQuantidadeQuartos}
                      onChange={(e) => setEditPadraoQuantidadeQuartos(e.target.value)}
                      className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500/50"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-medium">Suítes Padrão</label>
                    <input
                      type="number"
                      value={editPadraoQuantidadeSuites}
                      onChange={(e) => setEditPadraoQuantidadeSuites(e.target.value)}
                      className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500/50"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-medium">Banheiros Padrão</label>
                    <input
                      type="number"
                      value={editPadraoQuantidadeBanheiros}
                      onChange={(e) => setEditPadraoQuantidadeBanheiros(e.target.value)}
                      className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500/50"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-medium">Vagas Garagem Padrão</label>
                    <input
                      type="number"
                      value={editPadraoVagasGaragem}
                      onChange={(e) => setEditPadraoVagasGaragem(e.target.value)}
                      className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500/50"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-6">
                    <input
                      type="checkbox"
                      id="editPadraoPossuiQuintal"
                      checked={editPadraoPossuiQuintal}
                      onChange={(e) => setEditPadraoPossuiQuintal(e.target.checked)}
                      className="rounded bg-[#0f1422] border-slate-800 text-blue-600 focus:ring-0 w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor="editPadraoPossuiQuintal" className="text-[10px] text-slate-400 cursor-pointer select-none">Possui Quintal</label>
                  </div>

                  <div className="flex items-center gap-2 pt-6">
                    <input
                      type="checkbox"
                      id="editPadraoSalaConjugada"
                      checked={editPadraoSalaConjugada}
                      onChange={(e) => setEditPadraoSalaConjugada(e.target.checked)}
                      className="rounded bg-[#0f1422] border-slate-800 text-blue-600 focus:ring-0 w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor="editPadraoSalaConjugada" className="text-[10px] text-slate-400 cursor-pointer select-none">Sala Conjugada</label>
                  </div>
                </div>

                {/* Caixa de Replicação */}
                <div className="mt-4 p-3 bg-blue-950/20 border border-blue-900/30 rounded-xl flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    id="replicarTipologia"
                    checked={replicarTipologia}
                    onChange={(e) => setReplicarTipologia(e.target.checked)}
                    className="rounded bg-[#0f1422] border-blue-800 text-blue-600 focus:ring-0 w-4.5 h-4.5 cursor-pointer"
                  />
                  <div className="text-[10px]">
                    <label htmlFor="replicarTipologia" className="font-bold text-white block cursor-pointer select-none">
                      Replicar esta tipologia para todas as casas deste empreendimento
                    </label>
                    <span className="text-slate-400 block mt-0.5">
                      Se marcado, todas as casas deste empreendimento serão sobrescritas com as especificações acima ao salvar.
                    </span>
                  </div>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex gap-3 justify-end pt-4 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-350 hover:text-white font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-lg shadow-blue-500/10"
                >
                  {isSavingEdit && <Loader2 size={12} className="animate-spin" />}
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
