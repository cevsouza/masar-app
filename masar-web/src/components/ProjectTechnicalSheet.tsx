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
  X
} from 'lucide-react';
import Link from 'next/link';

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

const KANBAN_STAGES = [
  { id: 'BACKLOG', label: '1. Backlog', color: 'border-t-slate-500 text-slate-400 bg-slate-900/10' },
  { id: 'APROVACOES', label: '2. Burocracia', color: 'border-t-purple-500 text-purple-400 bg-purple-900/10' },
  { id: 'INFRAESTRUTURA', label: '3. Infraestrutura', color: 'border-t-blue-500 text-blue-400 bg-blue-900/10' },
  { id: 'SUPRAESTRUTURA', label: '4. Supraestrutura', color: 'border-t-indigo-550 text-indigo-400 bg-indigo-900/10' },
  { id: 'INSTALACOES', label: '5. Instalações', color: 'border-t-cyan-500 text-cyan-400 bg-cyan-900/10' },
  { id: 'ACABAMENTO', label: '6. Acabamento', color: 'border-t-amber-500 text-amber-400 bg-amber-900/10' },
  { id: 'VISTORIA_CAIXA', label: '7. Vistoria Caixa', color: 'border-t-orange-500 text-orange-400 bg-orange-900/10' },
  { id: 'CARTORIO', label: '8. Legalização', color: 'border-t-pink-500 text-pink-400 bg-pink-900/10' },
  { id: 'VISITAS', label: '9. Visitas', color: 'border-t-teal-500 text-teal-400 bg-teal-900/10' },
  { id: 'CONCLUIDA', label: '10. Entregue', color: 'border-t-emerald-500 text-emerald-400 bg-emerald-900/10' },
];

export default function ProjectTechnicalSheet({ project }: ProjectTechnicalSheetProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'ficha' | 'financeiro' | 'kanban' | 'cofre'>('ficha');
  
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
    setDreModalCategory(category);
    setDreModalLabel(label);
    setDreInputValue('');
    setDreInputDesc('');
    setDreInputDate(new Date().toISOString().split('T')[0]);
    setDreInputRealizado(false);
    
    if (project.casas && Array.isArray(project.casas) && project.casas.length > 0) {
      setDreInputCasaId(project.casas[0].id);
    } else {
      setDreInputCasaId('');
    }

    const safeInsumos = Array.isArray(insumosList) ? insumosList : [];
    let matchedInsumo = safeInsumos.find(ins => {
      if (!ins || !ins.categoria) return false;
      if (category.includes('MATERIAIS')) return ins.categoria === 'MATERIAIS';
      if (category.includes('MAODEOBRA')) return ins.categoria === 'MAO_DE_OBRA';
      if (category.includes('LOGISTICA')) return ins.categoria === 'LOGISTICA';
      if (category.includes('MAQUINAS')) return ins.categoria === 'MAQUINAS';
      if (category.includes('EQUIPE')) return ins.categoria === 'EQUIPE_GESTAO';
      if (category.includes('CANTEIRO')) return ins.categoria === 'CANTEIRO_OBRA';
      if (category.includes('CONSUMO')) return ins.categoria === 'CONSUMO_DIARIO';
      if (category.includes('LOCACAO')) return ins.categoria === 'LOCACAO_EQUIPAMENTOS';
      if (category.includes('TAXAS')) return ins.categoria === 'TAXAS_ALVARAS';
      return false;
    });
    if (matchedInsumo) {
      setDreInputInsumoId(matchedInsumo.id);
    } else if (safeInsumos.length > 0) {
      setDreInputInsumoId(safeInsumos[0].id);
    } else {
      setDreInputInsumoId('');
    }

    setIsDreModalOpen(true);
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
      const res = await fetch(`/api/financeiro/dre?empreendimentoId=${project.id}`);
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

  const handleAddGlobalCost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cgDescricao || !cgValor) {
      alert('Por favor, preencha a descrição e o valor do custo.');
      return;
    }
    setIsSavingCg(true);
    try {
      const res = await fetch(`/api/empreendimentos/${project.id}/custos-globais`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          descricao: cgDescricao,
          tipo: cgTipo,
          valor: parseFloat(cgValor),
          realizado: cgRealizado,
          data: cgData
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao adicionar custo global.');
      }

      setCgDescricao('');
      setCgValor('');
      alert('✓ Custo global adicionado com sucesso!');
      router.refresh();
      fetchDreData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSavingCg(false);
    }
  };

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

  const [movingHouseId, setMovingHouseId] = useState<string | null>(null);

  const handleMoveHouseStage = async (houseId: string, currentPercent: number, newStage: string) => {
    setMovingHouseId(houseId);
    try {
      const res = await fetch(`/api/casas/${houseId}/evolucao`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          statusObra: newStage,
          percentualObra: newStage === 'CONCLUIDA' ? 100 : (newStage === 'BACKLOG' ? 0 : currentPercent)
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao atualizar estágio da casa.');
      }

      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setMovingHouseId(null);
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
              onClick={() => setActiveTab('kanban')} 
              className={`px-4 py-2 rounded-lg font-bold uppercase tracking-wider transition cursor-pointer ${
                activeTab === 'kanban' ? 'bg-blue-600/10 text-blue-400 border border-blue-500/15' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Kanban de Casas
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
                  src={`https://maps.google.com/maps?q=${project.latitude},${project.longitude}&t=&z=16&ie=UTF8&iwloc=&output=embed`}
                  className="rounded-xl border border-slate-800"
                  allowFullScreen
                />
                
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in text-xs text-slate-350">
          
          {/* Lado Esquerdo: Gestão de Custos Globais (Terreno, Impostos de Aquisição, Projetos Globais) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="glassmorphism p-5 rounded-2xl border border-slate-800/80 bg-[#0f1422]/20">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider block border-b border-slate-850 pb-2.5 mb-4 font-sans">
                Adicionar Custo Terreno / Global
              </h3>
              <form onSubmit={handleAddGlobalCost} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-medium">Descrição do Custo</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Imposto ITBI e Custos de Registro"
                    value={cgDescricao}
                    onChange={(e) => setCgDescricao(e.target.value)}
                    className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-slate-400 font-medium">Categoria do Custo</label>
                    <select
                      value={cgTipo}
                      onChange={(e) => setCgTipo(e.target.value)}
                      className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-slate-350 focus:outline-none focus:border-blue-500/50"
                    >
                      <option value="TERRENO">Terreno / Aquisição</option>
                      <option value="PROJETOS">Projetos & Licenças</option>
                      <option value="MARKETING">Marketing & Vendas</option>
                      <option value="OUTRO">Outros Custos Globais</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-400 font-medium">Valor Total (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="Ex: 15400.00"
                      value={cgValor}
                      onChange={(e) => setCgValor(e.target.value)}
                      className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-slate-400 font-medium">Data de Pagamento</label>
                    <input
                      type="date"
                      required
                      value={cgData}
                      onChange={(e) => setCgData(e.target.value)}
                      className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-slate-400 font-medium">Tipo de Lançamento</label>
                    <select
                      value={cgRealizado ? 'REALIZADO' : 'ORCADO'}
                      onChange={(e) => setCgRealizado(e.target.value === 'REALIZADO')}
                      className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2.5 text-slate-350 focus:outline-none focus:border-blue-500/50"
                    >
                      <option value="ORCADO">Orçado / Planejado</option>
                      <option value="REALIZADO">Realizado / Pago</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSavingCg}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1 shadow-lg shadow-blue-500/10 disabled:opacity-50"
                >
                  {isSavingCg ? 'Salvando...' : '+ Cadastrar Custo'}
                </button>
              </form>
            </div>

            {/* Listagem de custos globais cadastrados */}
            <div className="glassmorphism p-5 rounded-2xl border border-slate-800/80">
              <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider border-b border-slate-850 pb-2 font-sans">
                Custos Globais do Terreno ({project.custosGlobais?.length || 0})
              </h3>
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {project.custosGlobais && project.custosGlobais.length > 0 ? (
                  project.custosGlobais.map((cg: any) => (
                    <div key={cg.id} className="p-3 bg-[#0f1422]/60 border border-slate-850 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-200">{cg.descricao}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                          <span className={`px-1 py-0.2 bg-slate-900 border rounded text-[8px] font-bold ${cg.realizado ? 'text-emerald-400 border-emerald-500/20' : 'text-blue-400 border-blue-500/20'}`}>
                            {cg.realizado ? 'REAL' : 'ORÇADO'}
                          </span>
                          <span>{cg.tipo} | {formatDate(cg.data)}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-red-400">{formatCurrency(cg.valor)}</span>
                        {['ADMIN', 'FINANCEIRO'].includes(userRole) && (
                          <button
                            onClick={() => handleDeleteGlobalCost(cg.id)}
                            className="text-[9px] font-bold text-red-500 hover:text-red-400 px-1.5 py-0.5 bg-red-950/20 rounded border border-red-900/30 transition cursor-pointer"
                          >
                            Excluir
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 py-6 text-center">Nenhum custo global registrado para o terreno.</p>
                )}
              </div>
            </div>

            {/* Estudo de Viabilidade & Orçamento Padrão das Casas */}
            <div className="glassmorphism p-5 rounded-2xl border border-slate-800/80 bg-[#0f1422]/20 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider block border-b border-slate-850 pb-2.5 font-sans">
                Estudo de Viabilidade & Orçamento Padrão
              </h3>
              
              <div className="space-y-3 text-xs">
                {/* Preço de Venda Médio */}
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-medium">Preço de Venda Projetado por Casa (VGV) (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="Ex: 200000.00"
                    value={viabPrecoVenda}
                    onChange={(e) => setViabPrecoVenda(e.target.value)}
                    className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>

                {/* Seletor de Insumos */}
                <div className="bg-[#0f1422]/40 p-3.5 rounded-xl border border-slate-850 space-y-3">
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
                      className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-slate-350 focus:outline-none"
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
                        placeholder="Ex: 150"
                        value={viabQtd}
                        onChange={(e) => setViabQtd(e.target.value)}
                        className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-slate-455 font-medium">Custo Unitário (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Ex: 45.00"
                        value={viabCustoUnit}
                        onChange={(e) => setViabCustoUnit(e.target.value)}
                        className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddViabItem}
                    className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition cursor-pointer"
                  >
                    + Adicionar ao Orçamento Padrão
                  </button>
                </div>

                {/* Lista de Itens do Orçamento Padrão */}
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-400 text-[10px] uppercase">Itens da Tipologia Padrão ({viabItems.length})</h4>
                  
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {viabItems.map((item, idx) => (
                      <div key={idx} className="p-2.5 bg-[#0f1422]/60 border border-slate-850 rounded-xl flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-300">{item.nome}</p>
                          <p className="text-[9px] text-slate-500 mt-0.5">
                            Qtd: {item.quantidadePlanejada} {item.unidadeMedida} | Prev: R$ {item.custoUnitarioPrevisto} | Total: R$ {(item.quantidadePlanejada * item.custoUnitarioPrevisto).toLocaleString('pt-BR')}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveViabItem(idx)}
                          className="text-[9px] font-bold text-red-500 hover:text-red-400 px-2 py-0.5 bg-slate-900 border border-slate-800 rounded transition cursor-pointer"
                        >
                          Remover
                        </button>
                      </div>
                    ))}

                    {viabItems.length === 0 && (
                      <p className="text-[10px] text-slate-500 italic py-4 text-center">Nenhum item adicionado ao orçamento padrão da casa.</p>
                    )}
                  </div>
                </div>

                {/* Ação Principal de Geração de Viabilidade */}
                <button
                  type="button"
                  disabled={isGeneratingViab}
                  onClick={handleGenerateFeasibility}
                  className="w-full py-3 bg-indigo-650 hover:bg-indigo-600 text-white font-extrabold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/10 disabled:opacity-50"
                >
                  {isGeneratingViab ? 'Processando Replicação...' : 'Replicar Orçamento Padrão e Gerar Viabilidade'}
                </button>
              </div>
            </div>
          </div>

          {/* Lado Direito: DRE Comparativo de Incorporação (Projetado vs Realizado) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="glassmorphism p-6 rounded-2xl border border-slate-800/80 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800/60 pb-3 mb-5">
                <div>
                  <h3 className="text-base font-bold text-white uppercase tracking-wider font-sans">
                    Demonstração do Resultado do Exercício (DRE) - Real vs Projetado (Incorporação)
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-1">Demonstração de resultados de loteamento e construção.</p>
                </div>
                <button 
                  type="button"
                  onClick={fetchDreData}
                  disabled={isLoadingDre}
                  className="px-3 py-1.5 bg-[#0f1422] border border-slate-800 hover:bg-slate-800 rounded-lg text-[10px] text-slate-300 font-bold uppercase transition cursor-pointer"
                >
                  {isLoadingDre ? 'Atualizando...' : 'Atualizar Demonstração'}
                </button>
              </div>

              {isLoadingDre && !dreData ? (
                <div className="py-20 text-center text-slate-400 text-xs">Carregando dados da Demonstração do Resultado do Exercício...</div>
              ) : dreData ? (
                <div className="space-y-6 text-xs text-slate-350">
                  <div className="overflow-x-auto border border-slate-850 rounded-xl">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-900/40 border-b border-slate-850 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                          <th className="py-3 px-4">Demonstração de Resultado do Exercício (DRE)</th>
                          <th className="py-3 px-4 text-right">Projetado (Orçado)</th>
                          <th className="py-3 px-4 text-right">Realizado (Fechado)</th>
                          <th className="py-3 px-4 text-right">Desvio</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850 text-slate-300">
                        {/* Receita Bruta */}
                        <tr 
                          onClick={() => openDreModal('VGV', 'VGV & Preço de Venda das Casas')}
                          className="hover:bg-slate-800/15 font-semibold text-slate-200 cursor-pointer transition-all duration-150 group"
                          title="Clique para lançar/ajustar o VGV estimado"
                        >
                          <td className="py-3 px-4 group-hover:text-indigo-400 transition-colors">Receita Operacional Bruta - Valor Geral de Vendas (VGV)</td>
                          <td className="py-3 px-4 text-right font-mono">{formatCurrency(dreData.totalVGVProjetado)}</td>
                          <td className="py-3 px-4 text-right font-mono text-emerald-400">{formatCurrency(dreData.totalVGVRealizado)}</td>
                          <td className={`py-3 px-4 text-right font-mono ${(dreData.totalVGVRealizado - dreData.totalVGVProjetado) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {formatCurrency(dreData.totalVGVRealizado - dreData.totalVGVProjetado)}
                          </td>
                        </tr>

                        {/* Deduções */}
                        <tr 
                          onClick={() => openDreModal('VGV', 'Comissão de Vendas')}
                          className="hover:bg-slate-800/15 text-slate-400 cursor-pointer transition-all duration-150 group"
                          title="Clique para ajustar comissão ou VGV das unidades"
                        >
                          <td className="py-2 px-4 pl-6 group-hover:text-indigo-400 transition-colors">(-) Comissão de Vendas (Intermediação Imobiliária)</td>
                          <td className="py-2 px-4 text-right font-mono">-{formatCurrency(dreData.totalComissaoProjetada)}</td>
                          <td className="py-2 px-4 text-right font-mono">-{formatCurrency(dreData.totalComissaoRealizada)}</td>
                          <td className={`py-2 px-4 text-right font-mono ${dreData.totalComissaoRealizada > dreData.totalComissaoProjetada ? 'text-red-400' : 'text-emerald-400'}`}>
                            {formatCurrency(dreData.totalComissaoProjetada - dreData.totalComissaoRealizada)}
                          </td>
                        </tr>
                        <tr className="hover:bg-slate-800/5 text-slate-400">
                          <td className="py-2 px-4 pl-6">(-) Tributos sobre Faturamento - Regime Especial de Tributação (RET)</td>
                          <td className="py-2 px-4 text-right font-mono">-{formatCurrency(dreData.totalImpostoProjetado)}</td>
                          <td className="py-2 px-4 text-right font-mono">-{formatCurrency(dreData.totalImpostoRealizado)}</td>
                          <td className={`py-2 px-4 text-right font-mono ${dreData.totalImpostoRealizado > dreData.totalImpostoProjetado ? 'text-red-400' : 'text-emerald-400'}`}>
                            {formatCurrency(dreData.totalImpostoProjetado - dreData.totalImpostoRealizado)}
                          </td>
                        </tr>

                        {/* Custos Globais */}
                        <tr className="hover:bg-slate-800/5 font-semibold text-slate-350">
                          <td className="py-3 px-4">(-) Custos Globais do Empreendimento (Rateio Terreno / Projetos / Marketing)</td>
                          <td className="py-3 px-4 text-right font-mono">-{formatCurrency(dreData.totalRateioProj)}</td>
                          <td className="py-3 px-4 text-right font-mono">-{formatCurrency(dreData.totalRateioReal)}</td>
                          <td className={`py-3 px-4 text-right font-mono ${(dreData.totalRateioProj - dreData.totalRateioReal) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {formatCurrency(dreData.totalRateioProj - dreData.totalRateioReal)}
                          </td>
                        </tr>
                        <tr 
                          onClick={() => openDreModal('TERRENO', 'Aquisição de Terreno')}
                          className="hover:bg-slate-800/15 text-[10px] text-slate-500 pl-8 cursor-pointer transition-all duration-150 group"
                          title="Clique para lançar custo de Aquisição de Terreno"
                        >
                          <td className="py-1 px-4 pl-8 group-hover:text-indigo-400 transition-colors">Aquisição de Terreno</td>
                          <td className="py-1 px-4 text-right font-mono">-{formatCurrency(dreData.rateioTerrenoProj)}</td>
                          <td className="py-1 px-4 text-right font-mono">-{formatCurrency(dreData.rateioTerrenoReal)}</td>
                          <td className={`py-1 px-4 text-right font-mono ${(dreData.rateioTerrenoProj - dreData.rateioTerrenoReal) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {formatCurrency(dreData.rateioTerrenoProj - dreData.rateioTerrenoReal)}
                          </td>
                        </tr>
                        <tr 
                          onClick={() => openDreModal('PROJETOS', 'Projetos & Licenciamento')}
                          className="hover:bg-slate-800/15 text-[10px] text-slate-500 pl-8 cursor-pointer transition-all duration-150 group"
                          title="Clique para lançar custo de Projetos & Licenciamento"
                        >
                          <td className="py-1 px-4 pl-8 group-hover:text-indigo-400 transition-colors">Projetos & Licenciamento</td>
                          <td className="py-1 px-4 text-right font-mono">-{formatCurrency(dreData.rateioProjetosProj)}</td>
                          <td className="py-1 px-4 text-right font-mono">-{formatCurrency(dreData.rateioProjetosReal)}</td>
                          <td className={`py-1 px-4 text-right font-mono ${(dreData.rateioProjetosProj - dreData.rateioProjetosReal) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {formatCurrency(dreData.rateioProjetosProj - dreData.rateioProjetosReal)}
                          </td>
                        </tr>
                        <tr 
                          onClick={() => openDreModal('MARKETING', 'Marketing & Publicidade')}
                          className="hover:bg-slate-800/15 text-[10px] text-slate-500 pl-8 cursor-pointer transition-all duration-150 group"
                          title="Clique para lançar custo de Marketing & Publicidade"
                        >
                          <td className="py-1 px-4 pl-8 group-hover:text-indigo-400 transition-colors">Marketing & Publicidade</td>
                          <td className="py-1 px-4 text-right font-mono">-{formatCurrency(dreData.rateioMarketingProj)}</td>
                          <td className="py-1 px-4 text-right font-mono">-{formatCurrency(dreData.rateioMarketingReal)}</td>
                          <td className={`py-1 px-4 text-right font-mono ${(dreData.rateioMarketingProj - dreData.rateioMarketingReal) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {formatCurrency(dreData.rateioMarketingProj - dreData.rateioMarketingReal)}
                          </td>
                        </tr>

                        {/* Custos Fixos (MCMV) */}
                        <tr className="hover:bg-slate-800/5 font-semibold text-slate-200">
                          <td className="py-3 px-4">(-) Custos Fixos de Construção (O Relógio Contra a Margem)</td>
                          <td className="py-3 px-4 text-right font-mono">-{formatCurrency(dreData.totalFixoProjetado || 0)}</td>
                          <td className="py-3 px-4 text-right font-mono">-{formatCurrency(dreData.totalFixoRealizado || 0)}</td>
                          <td className={`py-3 px-4 text-right font-mono ${(dreData.totalFixoProjetado - dreData.totalFixoRealizado) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {formatCurrency((dreData.totalFixoProjetado || 0) - (dreData.totalFixoRealizado || 0))}
                          </td>
                        </tr>
                        <tr 
                          onClick={() => openDreModal('FIXO_EQUIPE', 'Equipe de Gestão e Supervisão (Engenharia / Campo)')}
                          className="hover:bg-slate-800/15 text-[10px] text-slate-450 pl-8 cursor-pointer transition-all duration-150 group"
                          title="Clique para lançar orçamento ou despesa de Equipe de Gestão"
                        >
                          <td className="py-1.5 px-4 pl-8 group-hover:text-indigo-400 transition-colors">Equipe de Gestão e Supervisão (Engenharia / Campo)</td>
                          <td className="py-1.5 px-4 text-right font-mono">-{formatCurrency(dreData.projFixoEquipeGestao || 0)}</td>
                          <td className="py-1.5 px-4 text-right font-mono">-{formatCurrency(dreData.realFixoEquipeGestao || 0)}</td>
                          <td className={`py-1.5 px-4 text-right font-mono ${(dreData.projFixoEquipeGestao - dreData.realFixoEquipeGestao) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {formatCurrency((dreData.projFixoEquipeGestao || 0) - (dreData.realFixoEquipeGestao || 0))}
                          </td>
                        </tr>
                        <tr 
                          onClick={() => openDreModal('FIXO_CANTEIRO', 'Instalação e Manutenção do Canteiro de Obras')}
                          className="hover:bg-slate-800/15 text-[10px] text-slate-450 pl-8 cursor-pointer transition-all duration-150 group"
                          title="Clique para lançar orçamento ou despesa de Canteiro de Obras"
                        >
                          <td className="py-1.5 px-4 pl-8 group-hover:text-indigo-400 transition-colors">Instalação e Manutenção do Canteiro de Obras</td>
                          <td className="py-1.5 px-4 text-right font-mono">-{formatCurrency(dreData.projFixoCanteiro || 0)}</td>
                          <td className="py-1.5 px-4 text-right font-mono">-{formatCurrency(dreData.realFixoCanteiro || 0)}</td>
                          <td className={`py-1.5 px-4 text-right font-mono ${(dreData.projFixoCanteiro - dreData.realFixoCanteiro) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {formatCurrency((dreData.projFixoCanteiro || 0) - (dreData.realFixoCanteiro || 0))}
                          </td>
                        </tr>
                        <tr 
                          onClick={() => openDreModal('FIXO_CONSUMO', 'Despesas de Consumo Contínuo (Concessionárias / Vigilância)')}
                          className="hover:bg-slate-800/15 text-[10px] text-slate-450 pl-8 cursor-pointer transition-all duration-150 group"
                          title="Clique para lançar orçamento ou despesa de Consumo Contínuo"
                        >
                          <td className="py-1.5 px-4 pl-8 group-hover:text-indigo-400 transition-colors">Despesas de Consumo Contínuo (Concessionárias / Vigilância)</td>
                          <td className="py-1.5 px-4 text-right font-mono">-{formatCurrency(dreData.projFixoConsumo || 0)}</td>
                          <td className="py-1.5 px-4 text-right font-mono">-{formatCurrency(dreData.realFixoConsumo || 0)}</td>
                          <td className={`py-1.5 px-4 text-right font-mono ${(dreData.projFixoConsumo - dreData.realFixoConsumo) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {formatCurrency((dreData.projFixoConsumo || 0) - (dreData.realFixoConsumo || 0))}
                          </td>
                        </tr>
                        <tr 
                          onClick={() => openDreModal('FIXO_LOCACAO', 'Locação de Equipamentos Mensais (Andaimes / Betoneiras)')}
                          className="hover:bg-slate-800/15 text-[10px] text-slate-450 pl-8 cursor-pointer transition-all duration-150 group"
                          title="Clique para lançar orçamento ou despesa de Locação de Equipamentos"
                        >
                          <td className="py-1.5 px-4 pl-8 group-hover:text-indigo-400 transition-colors">Locação de Equipamentos Mensais (Andaimes / Betoneiras)</td>
                          <td className="py-1.5 px-4 text-right font-mono">-{formatCurrency(dreData.projFixoLocacao || 0)}</td>
                          <td className="py-1.5 px-4 text-right font-mono">-{formatCurrency(dreData.realFixoLocacao || 0)}</td>
                          <td className={`py-1.5 px-4 text-right font-mono ${(dreData.projFixoLocacao - dreData.realFixoLocacao) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {formatCurrency((dreData.projFixoLocacao || 0) - (dreData.realFixoLocacao || 0))}
                          </td>
                        </tr>
                        <tr 
                          onClick={() => openDreModal('FIXO_TAXAS', 'Taxas, Alvarás e Seguros de Engenharia')}
                          className="hover:bg-slate-800/15 text-[10px] text-slate-450 pl-8 cursor-pointer transition-all duration-150 group"
                          title="Clique para lançar orçamento ou despesa de Taxas e Seguros"
                        >
                          <td className="py-1.5 px-4 pl-8 group-hover:text-indigo-400 transition-colors">Taxas, Alvarás e Seguros de Engenharia</td>
                          <td className="py-1.5 px-4 text-right font-mono">-{formatCurrency(dreData.projFixoTaxasSeguros || 0)}</td>
                          <td className="py-1.5 px-4 text-right font-mono">-{formatCurrency(dreData.realFixoTaxasSeguros || 0)}</td>
                          <td className={`py-1.5 px-4 text-right font-mono ${(dreData.projFixoTaxasSeguros - dreData.realFixoTaxasSeguros) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {formatCurrency((dreData.projFixoTaxasSeguros || 0) - (dreData.realFixoTaxasSeguros || 0))}
                          </td>
                        </tr>

                        {/* Custos Variáveis (MCMV) */}
                        <tr className="hover:bg-slate-800/5 font-semibold text-slate-200">
                          <td className="py-3 px-4">(-) Custos Variáveis de Construção (A Eficiência da Produção)</td>
                          <td className="py-3 px-4 text-right font-mono">-{formatCurrency(dreData.totalVariavelProjetado || 0)}</td>
                          <td className="py-3 px-4 text-right font-mono">-{formatCurrency(dreData.totalVariavelRealizado || 0)}</td>
                          <td className={`py-3 px-4 text-right font-mono ${(dreData.totalVariavelProjetado - dreData.totalVariavelRealizado) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {formatCurrency((dreData.totalVariavelProjetado || 0) - (dreData.totalVariavelRealizado || 0))}
                          </td>
                        </tr>
                        <tr 
                          onClick={() => openDreModal('VARIAVEL_MATERIAIS', 'Materiais de Construção (Aço / Cimento / Blocos - Curva A)')}
                          className="hover:bg-slate-800/15 text-[10px] text-slate-450 pl-8 cursor-pointer transition-all duration-150 group"
                          title="Clique para lançar orçamento ou despesa de Materiais de Construção"
                        >
                          <td className="py-1.5 px-4 pl-8 group-hover:text-indigo-400 transition-colors">Materiais de Construção (Aço / Cimento / Blocos - Curva A)</td>
                          <td className="py-1.5 px-4 text-right font-mono">-{formatCurrency(dreData.projVariavelMateriais || 0)}</td>
                          <td className="py-1.5 px-4 text-right font-mono">-{formatCurrency(dreData.realVariavelMateriais || 0)}</td>
                          <td className={`py-1.5 px-4 text-right font-mono ${(dreData.projVariavelMateriais - dreData.realVariavelMateriais) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {formatCurrency((dreData.projVariavelMateriais || 0) - (dreData.realVariavelMateriais || 0))}
                          </td>
                        </tr>
                        <tr 
                          onClick={() => openDreModal('VARIAVEL_MAODEOBRA', 'Mão de Obra Direta (Pedreiros / Carpinteiros / Medição de Produção)')}
                          className="hover:bg-slate-800/15 text-[10px] text-slate-450 pl-8 cursor-pointer transition-all duration-150 group"
                          title="Clique para lançar orçamento ou despesa de Mão de Obra Direta"
                        >
                          <td className="py-1.5 px-4 pl-8 group-hover:text-indigo-400 transition-colors">Mão de Obra Direta (Pedreiros / Carpinteiros / Medição de Produção)</td>
                          <td className="py-1.5 px-4 text-right font-mono">-{formatCurrency(dreData.projVariavelMaoDireta || 0)}</td>
                          <td className="py-1.5 px-4 text-right font-mono">-{formatCurrency(dreData.realVariavelMaoDireta || 0)}</td>
                          <td className={`py-1.5 px-4 text-right font-mono ${(dreData.projVariavelMaoDireta - dreData.realVariavelMaoDireta) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {formatCurrency((dreData.projVariavelMaoDireta || 0) - (dreData.realVariavelMaoDireta || 0))}
                          </td>
                        </tr>
                        <tr 
                          onClick={() => openDreModal('VARIAVEL_LOGISTICA', 'Logística e Fretes de Insumos')}
                          className="hover:bg-slate-800/15 text-[10px] text-slate-450 pl-8 cursor-pointer transition-all duration-150 group"
                          title="Clique para lançar orçamento ou despesa de Logística e Fretes"
                        >
                          <td className="py-1.5 px-4 pl-8 group-hover:text-indigo-400 transition-colors">Logística e Fretes de Insumos</td>
                          <td className="py-1.5 px-4 text-right font-mono">-{formatCurrency(dreData.projVariavelLogistica || 0)}</td>
                          <td className="py-1.5 px-4 text-right font-mono">-{formatCurrency(dreData.realVariavelLogistica || 0)}</td>
                          <td className={`py-1.5 px-4 text-right font-mono ${(dreData.projVariavelLogistica - dreData.realVariavelLogistica) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {formatCurrency((dreData.projVariavelLogistica || 0) - (dreData.realVariavelLogistica || 0))}
                          </td>
                        </tr>
                        <tr 
                          onClick={() => openDreModal('VARIAVEL_MAQUINAS', 'Consumo Específico de Máquinas (Terraplenagem / Fundações)')}
                          className="hover:bg-slate-800/15 text-[10px] text-slate-450 pl-8 cursor-pointer transition-all duration-150 group"
                          title="Clique para lançar orçamento ou despesa de Máquinas"
                        >
                          <td className="py-1.5 px-4 pl-8 group-hover:text-indigo-400 transition-colors">Consumo Específico de Máquinas (Terraplenagem / Fundações)</td>
                          <td className="py-1.5 px-4 text-right font-mono">-{formatCurrency(dreData.projVariavelMaquinas || 0)}</td>
                          <td className="py-1.5 px-4 text-right font-mono">-{formatCurrency(dreData.realVariavelMaquinas || 0)}</td>
                          <td className={`py-1.5 px-4 text-right font-mono ${(dreData.projVariavelMaquinas - dreData.realVariavelMaquinas) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {formatCurrency((dreData.projVariavelMaquinas || 0) - (dreData.realVariavelMaquinas || 0))}
                          </td>
                        </tr>
                        <tr className="hover:bg-slate-800/5 text-[10px] text-slate-450 pl-8">
                          <td className="py-1.5 px-4 pl-8">Impostos Incidentes sobre o Faturamento (Regime Especial de Tributação - RET)</td>
                          <td className="py-1.5 px-4 text-right font-mono">-{formatCurrency(dreData.projVariavelImpostos || 0)}</td>
                          <td className="py-1.5 px-4 text-right font-mono">-{formatCurrency(dreData.realVariavelImpostos || 0)}</td>
                          <td className={`py-1.5 px-4 text-right font-mono ${(dreData.projVariavelImpostos - dreData.realVariavelImpostos) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {formatCurrency((dreData.projVariavelImpostos || 0) - (dreData.realVariavelImpostos || 0))}
                          </td>
                        </tr>

                        {/* Lucro Líquido */}
                        <tr className="bg-slate-900/30 font-extrabold text-sm text-white">
                          <td className="py-3 px-4">(=) RESULTADO LÍQUIDO DO PROJETO</td>
                          <td className="py-3 px-4 text-right font-mono">{formatCurrency(dreData.lucroLiquidoProjetado)}</td>
                          <td className={`py-3 px-4 text-right font-mono ${dreData.lucroLiquidoRealizado >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {formatCurrency(dreData.lucroLiquidoRealizado)}
                          </td>
                          <td className={`py-3 px-4 text-right font-mono ${(dreData.lucroLiquidoRealizado - dreData.lucroLiquidoProjetado) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {formatCurrency(dreData.lucroLiquidoRealizado - dreData.lucroLiquidoProjetado)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Margem de Lucro comparativa */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-[#0f1422]/60 border border-slate-850 rounded-xl text-center">
                      <span className="text-slate-500 uppercase tracking-wider text-[8px] font-bold block">Margem Projetada</span>
                      <span className="text-white font-mono text-sm font-bold mt-1 block">
                        {dreData.totalVGVProjetado > 0 
                          ? `${((dreData.lucroLiquidoProjetado / dreData.totalVGVProjetado) * 100).toFixed(1)}%`
                          : '0.0%'
                        }
                      </span>
                    </div>
                    <div className="p-4 bg-[#0f1422]/60 border border-slate-850 rounded-xl text-center">
                      <span className="text-slate-500 uppercase tracking-wider text-[8px] font-bold block">Margem Realizada</span>
                      <span className={`font-mono text-sm font-bold mt-1 block ${dreData.lucroLiquidoRealizado >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {dreData.totalVGVRealizado > 0 
                          ? `${((dreData.lucroLiquidoRealizado / dreData.totalVGVRealizado) * 100).toFixed(1)}%`
                          : '0.0%'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-20 text-center text-slate-500 text-xs">Carregando dados da Demonstração do Resultado do Exercício... Clique em "Atualizar Demonstração" para forçar o recálculo.</div>
              )}
            </div>
          </div>

          {/* Modal de Lançamento Direto do DRE */}
          {isDreModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 text-xs">
              <div className="bg-[#0b0f19] border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-fade-in text-slate-350">
                <div className="flex items-center justify-between border-b border-slate-850 pb-3">
                  <h3 className="text-sm font-extrabold text-white uppercase tracking-wider font-sans">
                    Lançamento Rápido no DRE
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsDreModalOpen(false)}
                    className="text-slate-500 hover:text-white font-bold text-sm cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
                
                <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">
                  Linha Selecionada: {dreModalLabel}
                </p>

                <form onSubmit={handleSaveDreInput} className="space-y-4">
                  
                  {/* Form Option 1: VGV / Batch Price update */}
                  {dreModalCategory === 'VGV' && (
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-slate-400 font-medium">Preço de Venda Médio das Casas (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          placeholder="Ex: 220000.00"
                          value={dreInputValue}
                          onChange={(e) => setDreInputValue(e.target.value)}
                          className="w-full bg-[#070a13] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                        />
                        <span className="text-[10px] text-slate-500 mt-1 block">
                          Ao salvar, o preço de venda projetado será replicado para todas as casas do empreendimento.
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Form Option 2: Global Costs (Terreno, Projetos, Marketing, Outro) */}
                  {['TERRENO', 'PROJETOS', 'MARKETING', 'OUTRO'].includes(dreModalCategory) && (
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-slate-400 font-medium">Descrição do Lançamento</label>
                        <input
                          type="text"
                          required
                          placeholder={`Ex: Pagamento ${dreModalLabel}`}
                          value={dreInputDesc}
                          onChange={(e) => setDreInputDesc(e.target.value)}
                          className="w-full bg-[#070a13] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-400 font-medium">Valor (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          placeholder="Ex: 50000.00"
                          value={dreInputValue}
                          onChange={(e) => setDreInputValue(e.target.value)}
                          className="w-full bg-[#070a13] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-slate-400 font-medium">Data</label>
                          <input
                            type="date"
                            required
                            value={dreInputDate}
                            onChange={(e) => setDreInputDate(e.target.value)}
                            className="w-full bg-[#070a13] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-slate-400 font-medium">Tipo</label>
                          <select
                            value={dreInputRealizado ? 'REALIZADO' : 'ORCADO'}
                            onChange={(e) => setDreInputRealizado(e.target.value === 'REALIZADO')}
                            className="w-full bg-[#070a13] border border-slate-800 rounded-xl px-3 py-2.5 text-slate-350 focus:outline-none"
                          >
                            <option value="ORCADO">Orçado / Planejado</option>
                            <option value="REALIZADO">Realizado / Pago</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Form Option 3: House Budget & Appropriations (Fixo/Variável Obras) */}
                  {!['VGV', 'TERRENO', 'PROJETOS', 'MARKETING', 'OUTRO'].includes(dreModalCategory) && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-slate-400 font-medium">Selecionar Unidade (Casa)</label>
                          <select
                            required
                            value={dreInputCasaId}
                            onChange={(e) => setDreInputCasaId(e.target.value)}
                            className="w-full bg-[#070a13] border border-slate-800 rounded-xl px-3 py-2 text-slate-350 focus:outline-none"
                          >
                            <option value="">-- Selecione o Lote --</option>
                            {(project.casas && Array.isArray(project.casas)) ? project.casas.map((casa: any) => (
                              <option key={casa.id} value={casa.id}>Lote Qd {casa.quadra}, Casa {casa.numero}</option>
                            )) : null}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-slate-400 font-medium">Natureza</label>
                          <select
                            value={dreInputRealizado ? 'REALIZADO' : 'ORCADO'}
                            onChange={(e) => setDreInputRealizado(e.target.value === 'REALIZADO')}
                            className="w-full bg-[#070a13] border border-slate-800 rounded-xl px-3 py-2.5 text-slate-350 focus:outline-none"
                          >
                            <option value="ORCADO">Orçado (Planejado)</option>
                            <option value="REALIZADO">Realizado (Efetivo/Pago)</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-400 font-medium">Insumo correspondente</label>
                        <select
                          required
                          value={dreInputInsumoId}
                          onChange={(e) => setDreInputInsumoId(e.target.value)}
                          className="w-full bg-[#070a13] border border-slate-800 rounded-xl px-3 py-2 text-slate-350 focus:outline-none"
                        >
                          <option value="">-- Selecione o Insumo --</option>
                          {(Array.isArray(insumosList) ? insumosList : [])
                            .filter(ins => {
                              if (dreModalCategory.includes('MATERIAIS')) return ins.categoria === 'MATERIAIS';
                              if (dreModalCategory.includes('MAODEOBRA')) return ins.categoria === 'MAO_DE_OBRA';
                              if (dreModalCategory.includes('LOGISTICA')) return ins.categoria === 'LOGISTICA';
                              if (dreModalCategory.includes('MAQUINAS')) return ins.categoria === 'MAQUINAS';
                              if (dreModalCategory.includes('EQUIPE')) return ins.categoria === 'EQUIPE_GESTAO';
                              if (dreModalCategory.includes('CANTEIRO')) return ins.categoria === 'CANTEIRO_OBRA';
                              if (dreModalCategory.includes('CONSUMO')) return ins.categoria === 'CONSUMO_DIARIO';
                              if (dreModalCategory.includes('LOCACAO')) return ins.categoria === 'LOCACAO_EQUIPAMENTOS';
                              if (dreModalCategory.includes('TAXAS')) return ins.categoria === 'TAXAS_ALVARAS';
                              return true;
                            })
                            .map((ins: any) => (
                              <option key={ins.id} value={ins.id}>{ins.nome} ({ins.unidadeMedida})</option>
                            ))
                          }
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-slate-400 font-medium">Quantidade</label>
                          <input
                            type="number"
                            step="0.01"
                            required
                            value={dreInputQtd}
                            onChange={(e) => setDreInputQtd(e.target.value)}
                            className="w-full bg-[#070a13] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-slate-400 font-medium">
                            {dreInputRealizado ? 'Custo Total (R$)' : 'Custo Unitário Previsto (R$)'}
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            required
                            value={dreInputValue}
                            onChange={(e) => setDreInputValue(e.target.value)}
                            className="w-full bg-[#070a13] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                          />
                        </div>
                      </div>
                      
                      {dreInputRealizado && (
                        <span className="text-[10px] text-amber-500 block">
                          Nota: O lançamento de despesa realizada debitará o caixa geral automaticamente na Tesouraria.
                        </span>
                      )}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSavingDreInput}
                    className="w-full py-3 bg-indigo-650 hover:bg-indigo-600 text-white font-bold rounded-xl transition cursor-pointer shadow-lg shadow-indigo-600/10 disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {isSavingDreInput ? 'Salvando...' : '✓ Confirmar e Atualizar DRE'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Conteúdo Aba: Kanban de Casas (Gestão Individualizada de Obras) */}
      {activeTab === 'kanban' && (
        <div className="space-y-4 animate-fade-in text-xs">
          <div className="glassmorphism p-4 rounded-2xl border border-slate-800/80 mb-2">
            <h3 className="text-sm font-bold text-white font-sans uppercase tracking-wider">
              Quadro de Evolução Física Individual (Kanban)
            </h3>
            <p className="text-[10px] text-slate-450 mt-1">
              Gerencie cada unidade habitacional de forma independente. Clique nas setas para avançar ou retornar o estágio físico da casa, ou acesse a ficha da casa para diários de obras e apropriações detalhadas.
            </p>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent min-h-[550px]">
            {KANBAN_STAGES.map((col, idx) => {
              const housesInCol = project.casas.filter((c: any) => c.statusObra === col.id);
              return (
                <div 
                  key={col.id} 
                  className="w-[280px] shrink-0 flex flex-col bg-[#0b0f19]/40 border border-slate-850 rounded-2xl p-3 space-y-3"
                >
                  {/* Título da Coluna */}
                  <div className={`border-t-2 ${col.color} pt-2 px-1 flex items-center justify-between`}>
                    <span className="font-bold uppercase tracking-wider text-[10px]">
                      {col.label}
                    </span>
                    <span className="bg-slate-900 border border-slate-850 px-2 py-0.5 rounded-lg text-[9px] font-mono font-bold text-slate-400">
                      {housesInCol.length}
                    </span>
                  </div>

                  {/* Lista de Cartões */}
                  <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[480px] pr-1">
                    {housesInCol.map((house: any) => {
                      // Calcular KPIs financeiros do lote MCMV
                      const receitaCaixaPaga = house.medicoes
                        ? house.medicoes
                            .filter((m: any) => m.status === 'PAGA')
                            .reduce((acc: number, m: any) => acc + m.valorLiberado, 0)
                        : 0;

                      const custoRealizado = house.apropriacoes
                        ? house.apropriacoes
                            .filter((ap: any) => ap.aprovado)
                            .reduce((acc: number, ap: any) => acc + ap.custoTotal, 0)
                        : 0;

                      const orcamentoTotal = house.orcamento && house.orcamento.itens
                        ? house.orcamento.itens.reduce((acc: number, item: any) => acc + (item.quantidadePlanejada * item.custoUnitarioPrevisto), 0)
                        : 0;

                      const saldoCaixaLote = receitaCaixaPaga - custoRealizado;

                      const percentualMedidoPago = house.medicoes
                        ? house.medicoes
                            .filter((m: any) => m.status === 'PAGA')
                            .reduce((acc: number, m: any) => acc + m.percentualMedido, 0)
                        : 0;

                      const descompassoFisicoFinanceiro = house.percentualObra - percentualMedidoPago;
                      const descompassoAlto = descompassoFisicoFinanceiro > 10;
                      const temGlosa = house.medicoes ? house.medicoes.some((m: any) => m.status === 'GLOSADA_REPROVADA') : false;

                      let borderClass = 'border-slate-800/80 hover:border-slate-700';
                      if (movingHouseId === house.id) {
                        borderClass = 'border-blue-500/50 animate-pulse';
                      } else if (temGlosa) {
                        borderClass = 'border-amber-500/50 shadow-md shadow-amber-500/5';
                      } else if (saldoCaixaLote < 0 || descompassoAlto) {
                        borderClass = 'border-red-500/50 shadow-md shadow-red-500/5';
                      } else if (saldoCaixaLote > 0 && house.percentualObra > 0) {
                        borderClass = 'border-emerald-500/50 shadow-md shadow-emerald-500/5';
                      }

                      return (
                        <div 
                          key={house.id} 
                          className={`p-3 bg-[#0f1422] border ${borderClass} rounded-xl space-y-3 shadow-md transition`}
                        >
                          <div className="flex items-center justify-between">
                            <Link 
                              href={`/casas/${house.id}`}
                              className="font-bold text-white hover:text-blue-400 text-xs transition block"
                            >
                              Qd {house.quadra}, Casa {house.numero}
                            </Link>
                            {house.liberadaVenda ? (
                              <span className="text-[7px] font-mono font-extrabold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/15 uppercase">
                                Venda
                              </span>
                            ) : (
                              <span className="text-[7px] font-mono font-extrabold text-slate-500 bg-slate-550/5 px-1.5 py-0.5 rounded border border-slate-800 uppercase">
                                Reserva
                              </span>
                            )}
                          </div>

                          {/* Barra de Progresso Físico */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[9px] font-mono text-slate-450">
                              <span>Progresso Físico</span>
                              <span className="font-bold text-blue-400">{house.percentualObra.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-[#070a13] rounded-full h-1.5 overflow-hidden">
                              <div 
                                className="bg-gradient-to-r from-blue-600 to-indigo-500 h-full rounded-full transition-all duration-300"
                                style={{ width: `${house.percentualObra}%` }}
                              />
                            </div>
                          </div>

                          {/* Micro-Painel Financeiro MCMV */}
                          <div className="space-y-1.5 text-[9px] pt-1 bg-[#0b0f19]/30 p-2 rounded-lg border border-slate-850">
                            {/* Saldo de Caixa */}
                            <div className="flex justify-between items-center">
                              <span className="text-slate-450 font-medium">Saldo de Caixa:</span>
                              <span className={`font-mono font-bold ${saldoCaixaLote >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {formatCurrency(saldoCaixaLote)}
                              </span>
                            </div>

                            {/* Descompasso Físico-Financeiro */}
                            <div className="flex justify-between items-center">
                              <span className="text-slate-450 font-medium">Descompasso:</span>
                              <div className="flex items-center gap-1 font-mono">
                                <span className={descompassoAlto ? 'text-red-400 font-bold' : 'text-slate-350'}>
                                  {descompassoFisicoFinanceiro.toFixed(0)}%
                                </span>
                                {descompassoAlto && (
                                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title="Descompasso superior a 10% (Alerta de capital de giro!)" />
                                )}
                              </div>
                            </div>

                            {/* Orçado vs Realizado */}
                            <div className="flex justify-between items-center text-[8px] text-slate-500 border-t border-slate-850/60 pt-1 mt-1">
                              <span>Orçado: {formatCurrency(orcamentoTotal)}</span>
                              <span className="text-slate-400 font-medium">Real: {formatCurrency(custoRealizado)}</span>
                            </div>
                          </div>

                          {/* Ações de Movimentação Rápidas */}
                          <div className="flex items-center justify-between pt-2 border-t border-slate-850 text-[10px]">
                            <button
                              type="button"
                              disabled={idx === 0 || movingHouseId !== null}
                              onClick={() => handleMoveHouseStage(house.id, house.percentualObra, KANBAN_STAGES[idx - 1].id)}
                              className="p-1 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent text-slate-400 hover:text-white rounded border border-slate-800 transition cursor-pointer"
                              title="Mover para etapa anterior"
                            >
                              ←
                            </button>
                            
                            <Link 
                              href={`/casas/${house.id}`}
                              className="text-[9px] font-bold text-slate-400 hover:text-white px-2 py-0.5 bg-slate-850/40 rounded border border-slate-800 transition"
                            >
                              Acessar Ficha
                            </Link>

                            <button
                              type="button"
                              disabled={idx === KANBAN_STAGES.length - 1 || movingHouseId !== null}
                              onClick={() => handleMoveHouseStage(house.id, house.percentualObra, KANBAN_STAGES[idx + 1].id)}
                              className="p-1 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent text-slate-400 hover:text-white rounded border border-slate-800 transition cursor-pointer"
                              title="Mover para próxima etapa"
                            >
                              →
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {housesInCol.length === 0 && (
                      <p className="text-[10px] text-slate-600 italic text-center py-8">Vazia</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
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
