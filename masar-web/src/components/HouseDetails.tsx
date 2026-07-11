'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Home, 
  User, 
  DollarSign, 
  Percent, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Play,
  Hammer,
  ChevronRight,
  TrendingUp,
  FileSpreadsheet,
  Sun,
  CloudRain,
  Lightbulb,
  Droplet,
  Smartphone,
  ShieldCheck,
  Activity,
  FileText,
  X,
  Edit2,
  Trash2,
  Loader2,
  Layers,
  Calculator
} from 'lucide-react';
import GedManager from '@/components/GedManager';
import ModalNovoLancamento from './ModalNovoLancamento';
import CronogramaPanel from './CronogramaPanel';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

interface HouseDetailsProps {
  initialCasa: any;
  allInsumos?: any[];
}

const STAGES = [
  { id: 'BACKLOG', label: '1. Não Iniciado (Backlog)' },
  { id: 'APROVACOES', label: '2. Burocracia e Aprovações' },
  { id: 'INFRAESTRUTURA', label: '3. Infraestrutura (Base)' },
  { id: 'SUPRAESTRUTURA', label: '4. Supraestrutura e Cobertura' },
  { id: 'INSTALACOES', label: '5. Instalações (Embutidas)' },
  { id: 'ACABAMENTO', label: '6. Acabamentos' },
  { id: 'VISTORIA_CAIXA', label: '7. Aguardando Vistoria Caixa' },
  { id: 'CARTORIO', label: '8. Legalização e Cartório' },
  { id: 'VISITAS', label: '9. Liberado para Visitas' },
  { id: 'CONCLUIDA', label: '10. Concluído / Entregue' },
];

export const getInsumoMCMVType = (nome: string, categoria: string): 'FIXO' | 'VARIAVEL' => {
  const nomeLower = nome.toLowerCase();
  if (
    nomeLower.includes('gestão') || 
    nomeLower.includes('supervisão') || 
    nomeLower.includes('engenheiro') || 
    nomeLower.includes('mestre') || 
    nomeLower.includes('segurança') || 
    nomeLower.includes('administrativo') ||
    nomeLower.includes('equipe') ||
    nomeLower.includes('canteiro') || 
    nomeLower.includes('mobilização') || 
    nomeLower.includes('desmobilização') || 
    nomeLower.includes('tapume') || 
    nomeLower.includes('contêiner') || 
    nomeLower.includes('refeitório') || 
    nomeLower.includes('sanitário') ||
    nomeLower.includes('barracão') ||
    nomeLower.includes('consumo') || 
    nomeLower.includes('água') || 
    nomeLower.includes('energia') || 
    nomeLower.includes('luz') || 
    nomeLower.includes('internet') || 
    nomeLower.includes('vigilância') ||
    nomeLower.includes('vigilante') ||
    nomeLower.includes('alarme') ||
    nomeLower.includes('aluguel') || 
    nomeLower.includes('locação') || 
    nomeLower.includes('andaime') || 
    nomeLower.includes('escoramento') || 
    nomeLower.includes('betoneira') ||
    nomeLower.includes('grua') ||
    nomeLower.includes('taxa') || 
    nomeLower.includes('alvará') || 
    nomeLower.includes('seguro') || 
    nomeLower.includes('crea') || 
    nomeLower.includes('cau') || 
    nomeLower.includes('prefeitura') ||
    nomeLower.includes('registro') ||
    nomeLower.includes('emolumento') ||
    categoria === 'TAXA'
  ) {
    return 'FIXO';
  }
  return 'VARIAVEL';
};

export default function HouseDetails({ initialCasa, allInsumos = [] }: HouseDetailsProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'geral' | 'financeiro' | 'infra' | 'ged' | 'cronograma'>('geral');
  const [isUpdatingApproval, setIsUpdatingApproval] = useState<string | null>(null);

  // Budget (Previsto) Form State
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [budgetInsumoId, setBudgetInsumoId] = useState('');
  const [budgetQuantidade, setBudgetQuantidade] = useState('');
  const [budgetCustoUnitario, setBudgetCustoUnitario] = useState('');
  const [isSubmittingBudget, setIsSubmittingBudget] = useState(false);

  // Universal Financial Modal State
  const [isUniversalModalOpen, setIsUniversalModalOpen] = useState(false);

  // Physical evolution state
  const [statusObra, setStatusObra] = useState(initialCasa.statusObra);
  const [percentualObra, setPercentualObra] = useState(initialCasa.percentualObra.toString());
  const [prazoFisicoInput, setPrazoFisicoInput] = useState(initialCasa.prazoFisico ? initialCasa.prazoFisico.split('T')[0] : '');
  const [prazoFinanceiroInput, setPrazoFinanceiroInput] = useState(initialCasa.prazoFinanceiro ? initialCasa.prazoFinanceiro.split('T')[0] : '');
  const [obstaculosInput, setObstaculosInput] = useState(initialCasa.obstaculos || '');
  const [isUpdatingObra, setIsUpdatingObra] = useState(false);

  // Financial form state
  const [percentualMedido, setPercentualMedido] = useState('');
  const [valorLiberado, setValorLiberado] = useState('');
  const [statusMedicao, setStatusMedicao] = useState('AGUARDANDO');
  const [checkSondagem, setCheckSondagem] = useState(false);
  const [checkEpis, setCheckEpis] = useState(false);
  const [checkMateriais, setCheckMateriais] = useState(false);
  const [isCreatingMedicao, setIsCreatingMedicao] = useState(false);

  // Auto-calcular valor liberado baseado no percentual medido para facilitar o preenchimento
  useEffect(() => {
    const pct = parseFloat(percentualMedido);
    if (!isNaN(pct) && pct >= 0 && pct <= 100) {
      const totalCEF = initialCasa.contrato 
        ? initialCasa.contrato.financiamento 
        : (Number(initialCasa.valorVendaProjetado || 0) * 0.8);
      const calculated = (totalCEF * pct / 100).toFixed(2);
      setValorLiberado(calculated);
    }
  }, [percentualMedido, initialCasa]);

  // Status updating state
  const [updatingMedicaoId, setUpdatingMedicaoId] = useState<string | null>(null);

  // Admin Edit/Delete House States
  const [userRole, setUserRole] = useState('COMERCIAL');
  const [isDeletingHouse, setIsDeletingHouse] = useState(false);
  const [isEditHouseModalOpen, setIsEditHouseModalOpen] = useState(false);
  const [editNumero, setEditNumero] = useState(initialCasa.numero);
  const [editQuadra, setEditQuadra] = useState(initialCasa.quadra);
  const [editAreaConstruida, setEditAreaConstruida] = useState(initialCasa.areaConstruida ? initialCasa.areaConstruida.toString() : '');
  const [editAreaLote, setEditAreaLote] = useState(initialCasa.areaLote ? initialCasa.areaLote.toString() : '');
  const [editValorVendaProjetado, setEditValorVendaProjetado] = useState(initialCasa.valorVendaProjetado ? initialCasa.valorVendaProjetado.toString() : '');
  const [editQuartos, setEditQuartos] = useState(initialCasa.quantidadeQuartos.toString());
  const [editSuites, setEditSuites] = useState(initialCasa.quantidadeSuites.toString());
  const [editBanheiros, setEditBanheiros] = useState(initialCasa.quantidadeBanheiros.toString());
  const [editVagas, setEditVagas] = useState(initialCasa.vagasGaragem.toString());
  const [editQuintal, setEditQuintal] = useState(initialCasa.possuiQuintal);
  const [editSalaConjugada, setEditSalaConjugada] = useState(initialCasa.salaConjugada);
  const [editLiberadaVenda, setEditLiberadaVenda] = useState(initialCasa.liberadaVenda || false);
  const [isSavingHouse, setIsSavingHouse] = useState(false);

  // Concessionaire utilities (infra) state
  const [padraoEnergia, setPadraoEnergia] = useState(initialCasa.infraestrutura?.padraoEnergiaInstalado || false);
  const [ligacaoAgua, setLigacaoAgua] = useState(initialCasa.infraestrutura?.ligacaoAguaConcluida || false);
  const [fossaFiltro, setFossaFiltro] = useState(initialCasa.infraestrutura?.fossaFiltroEsgotoConcluido || false);
  const [medidorLuz, setMedidorLuz] = useState(initialCasa.infraestrutura?.numeroMedidorLuz || '');
  const [medidorAgua, setMedidorAgua] = useState(initialCasa.infraestrutura?.numeroMedidorAgua || '');
  const [updatingInfra, setUpdatingInfra] = useState(false);

  // Daily diary state
  const [isDiarioModalOpen, setIsDiarioModalOpen] = useState(false);
  const [diarioClima, setDiarioClima] = useState<'BOM' | 'CHUVA' | 'IMPRATICAVEL'>('BOM');
  const [diarioEfetivo, setDiarioEfetivo] = useState('1');
  const [diarioAtividades, setDiarioAtividades] = useState('');
  const [diarioOcorrencias, setDiarioOcorrencias] = useState('');
  const [savingDiario, setSavingDiario] = useState(false);

  useEffect(() => {
    if (initialCasa.infraestrutura) {
      setPadraoEnergia(initialCasa.infraestrutura.padraoEnergiaInstalado || false);
      setLigacaoAgua(initialCasa.infraestrutura.ligacaoAguaConcluida || false);
      setFossaFiltro(initialCasa.infraestrutura.fossaFiltroEsgotoConcluido || false);
      setMedidorLuz(initialCasa.infraestrutura.numeroMedidorLuz || '');
      setMedidorAgua(initialCasa.infraestrutura.numeroMedidorAgua || '');
    }
  }, [initialCasa.infraestrutura]);

  const handleSaveInfra = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setUpdatingInfra(true);
      const res = await fetch(`/api/casas/${initialCasa.id}/infra`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          padraoEnergiaInstalado: padraoEnergia,
          ligacaoAguaConcluida: ligacaoAgua,
          fossaFiltroEsgotoConcluido: fossaFiltro,
          numeroMedidorLuz: medidorLuz,
          numeroMedidorAgua: medidorAgua,
        })
      });
      if (res.ok) {
        alert('✓ Infraestrutura e utilidades salvas!');
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao salvar infraestrutura.');
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erro de rede.');
    } finally {
      setUpdatingInfra(false);
    }
  };

  const handleSaveDiario = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingDiario(true);
      const res = await fetch(`/api/casas/${initialCasa.id}/diarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clima: diarioClima,
          efetivoTrabalhadores: diarioEfetivo,
          atividadesExecutadas: diarioAtividades,
          ocorrencias: diarioOcorrencias,
        })
      });
      if (res.ok) {
        alert('✓ Diário de Obra registrado com sucesso!');
        setIsDiarioModalOpen(false);
        setDiarioAtividades('');
        setDiarioOcorrencias('');
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao registrar diário.');
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erro de rede.');
    } finally {
      setSavingDiario(false);
    }
  };

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.authenticated) {
          setUserRole(data.role || 'COMERCIAL');
        }
      })
      .catch(err => console.error(err));
  }, []);

  const handleDeleteHouse = async () => {
    if (!confirm(`Tem certeza que deseja excluir a Casa ${initialCasa.numero} da Quadra ${initialCasa.quadra}?\nEsta ação excluirá todos os lançamentos financeiros, diários e apropriações vinculados.`)) {
      return;
    }
    setIsDeletingHouse(true);
    try {
      const res = await fetch(`/api/casas/${initialCasa.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao excluir casa.');
      }
      alert('✓ Casa excluída com sucesso!');
      router.push(`/empreendimentos`);
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsDeletingHouse(false);
    }
  };

  const handleSaveHouse = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingHouse(true);
    try {
      const res = await fetch(`/api/casas/${initialCasa.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numero: editNumero,
          quadra: editQuadra,
          areaConstruida: editAreaConstruida ? parseFloat(editAreaConstruida) : null,
          areaLote: editAreaLote ? parseFloat(editAreaLote) : null,
          valorVendaProjetado: editValorVendaProjetado ? parseFloat(editValorVendaProjetado) : null,
          quantidadeQuartos: parseInt(editQuartos, 10) || 0,
          quantidadeSuites: parseInt(editSuites, 10) || 0,
          quantidadeBanheiros: parseInt(editBanheiros, 10) || 0,
          vagasGaragem: parseInt(editVagas, 10) || 0,
          possuiQuintal: editQuintal === true,
          salaConjugada: editSalaConjugada === true,
          liberadaVenda: editLiberadaVenda === true
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao salvar alterações.');
      }

      setIsEditHouseModalOpen(false);
      alert('✓ Dados da casa atualizados com sucesso!');
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSavingHouse(false);
    }
  };

  // Budget stats
  const totalOrado = initialCasa.orcamento?.itens.reduce((acc: number, item: any) => acc + (item.quantidadePlanejada * item.custoUnitarioPrevisto), 0) || 0;
  // Regime de competência: toda despesa lançada para a casa conta como gasto incorrido,
  // pago ou nao (consistente com o DRE - o extrato/livro-caixa e quem distingue pago vs pendente).
  const totalGasto = initialCasa.transacoes?.filter((t: any) => t.natureza === 'DESPESA').reduce((acc: number, t: any) => acc + t.valor, 0) || 0;
  const totalRealPendente = initialCasa.transacoes?.filter((t: any) => t.natureza === 'DESPESA' && t.status === 'PENDENTE').reduce((acc: number, t: any) => acc + t.valor, 0) || 0;

  // Chart data
  const chartData = [
    { name: 'Previsto Orçado', valor: totalOrado, color: '#6366f1' },
    { name: 'Real Aprovado', valor: totalGasto, color: '#10b981' },
    { name: 'Excesso Pendente', valor: totalRealPendente, color: '#f59e0b' }
  ];

  // ABC calculation
  const itemsABC = initialCasa.orcamento?.itens.map((item: any) => {
    const realTotal = initialCasa.transacoes
      ?.filter((t: any) => t.insumoId === item.insumoId && t.natureza === 'DESPESA')
      .reduce((acc: number, t: any) => acc + t.valor, 0) || 0;

    const previstoTotal = item.quantidadePlanejada * item.custoUnitarioPrevisto;
    const desvio = realTotal - previstoTotal;

    return {
      nome: item.insumo.nome,
      categoria: item.insumo.categoria,
      previsto: previstoTotal,
      realizado: realTotal,
      desvio
    };
  }) || [];

  const unbudgetedApropriacoes = initialCasa.transacoes
    ?.filter((t: any) => t.natureza === 'DESPESA' && t.insumoId && !initialCasa.orcamento?.itens.some((item: any) => item.insumoId === t.insumoId))
    .reduce((acc: any[], t: any) => {
      const existing = acc.find(item => item.insumoId === t.insumoId);
      if (existing) {
        existing.realizado += t.valor;
        existing.desvio += t.valor;
      } else {
        acc.push({
          nome: t.insumo?.nome || t.descricao,
          categoria: t.categoria,
          previsto: 0,
          realizado: t.valor,
          desvio: t.valor
        });
      }
      return acc;
    }, []) || [];

  const totalABC = [...itemsABC, ...unbudgetedApropriacoes].sort((a, b) => b.realizado - a.realizado);

  const handleUpdatePhysical = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingObra(true);
    try {
      const response = await fetch(`/api/casas/${initialCasa.id}/evolucao`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statusObra, percentualObra: parseFloat(percentualObra), prazoFisico: prazoFisicoInput, prazoFinanceiro: prazoFinanceiroInput, obstaculos: obstaculosInput }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Falha ao atualizar');
      router.refresh();
      alert('Dados de obra atualizados!');
    } catch (err: any) { 
      alert(err.message || 'Erro ao atualizar obra.'); 
    } finally { 
      setIsUpdatingObra(false); 
    }
  };

  const handleCreateMedicao = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingMedicao(true);
    try {
      const response = await fetch(`/api/casas/${initialCasa.id}/medicoes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ percentualMedido, valorLiberado, status: statusMedicao }),
      });
      if (!response.ok) throw new Error('Falha');
      router.refresh();
    } catch (err) { alert('Erro.'); } finally { setIsCreatingMedicao(false); }
  };

  const handleUpdateMedicaoStatus = async (medicaoId: string, newStatus: string) => {
    setUpdatingMedicaoId(medicaoId);
    try {
      await fetch(`/api/medicoes/${medicaoId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      router.refresh();
    } catch (err) { alert('Erro'); } finally { setUpdatingMedicaoId(null); }
  };

  const handleApproveApropriacao = async (apropriacaoId: string, aprovado: boolean) => {
    setIsUpdatingApproval(apropriacaoId);
    try {
      const res = await fetch(`/api/casas/${initialCasa.id}/apropriacoes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apropriacaoId, aprovado })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao atualizar aprovação.');
      alert(aprovado ? '✓ Apropriação aprovada!' : 'Apropriação rejeitada.');
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsUpdatingApproval(null);
    }
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!budgetInsumoId || !budgetQuantidade || !budgetCustoUnitario) return;
    setIsSubmittingBudget(true);
    try {
      const res = await fetch(`/api/casas/${initialCasa.id}/orcamento`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          insumoId: budgetInsumoId,
          quantidadePlanejada: parseFloat(budgetQuantidade),
          custoUnitarioPrevisto: parseFloat(budgetCustoUnitario)
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar item de orçamento.');
      alert('✓ Item de orçamento planejado salvo!');
      setIsBudgetModalOpen(false);
      setBudgetInsumoId('');
      setBudgetQuantidade('');
      setBudgetCustoUnitario('');
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmittingBudget(false);
    }
  };

  const handleDeleteBudget = async (insumoId: string) => {
    if (!confirm('Deseja realmente remover este insumo do orçamento planejado?')) return;
    try {
      const res = await fetch(`/api/casas/${initialCasa.id}/orcamento?insumoId=${insumoId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao remover item.');
      alert('✓ Item removido do orçamento.');
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    }
  };



  const handleDeleteApropriacao = async (apropId: string) => {
    if (!confirm('Deseja realmente estornar/excluir este custo apropriado?')) return;
    try {
      const res = await fetch(`/api/casas/${initialCasa.id}/apropriacoes?apropriacaoId=${apropId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao excluir apropriação.');
      alert('✓ Custo estornado com sucesso.');
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('pt-BR');
  const getStatusBadge = (status: string) => {
    if (status === 'PAGA') return <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20">Paga</span>;
    if (status === 'AGUARDANDO') return <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full border border-amber-500/20">Aguardando</span>;
    return <span className="text-[10px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded-full border border-red-500/20">Glosada</span>;
  };

  return (
    <div className="space-y-6">
      {initialCasa.obstaculos && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-start gap-3 animate-pulse">
          <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={18} />
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider">Atenção: Impedimento / Gargalo (Pitfall) Detectado</h4>
            <p className="text-xs text-red-200/90 mt-1 leading-relaxed">{initialCasa.obstaculos}</p>
          </div>
        </div>
      )}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1e293b] pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-blue-400 font-semibold uppercase tracking-wider">
            <Home size={14} /> Unidade Habitacional
          </div>
          <h1 className="text-2xl font-bold text-white mt-1">
            Casa {initialCasa.numero} - Quadra {initialCasa.quadra}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Projeto: <strong>{initialCasa.empreendimento.nome}</strong>
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {initialCasa.liberadaVenda ? (
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                ✓ Liberada para Venda (Comercial)
              </span>
            ) : (
              <span className="text-[10px] text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                ✗ Bloqueada para Vendas (Interno)
              </span>
            )}
          </div>
          {userRole === 'ADMIN' && (
            <div className="flex gap-2 items-center mt-3">
              <button
                onClick={() => setIsEditHouseModalOpen(true)}
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 border border-blue-500/20 text-white font-bold rounded-lg text-[9px] uppercase tracking-wider transition cursor-pointer flex items-center gap-1"
              >
                Editar Unidade
              </button>
              <button
                onClick={handleDeleteHouse}
                disabled={isDeletingHouse}
                className="px-2.5 py-1 bg-red-650 hover:bg-red-600 border border-red-500/20 text-white font-bold rounded-lg text-[9px] uppercase tracking-wider transition cursor-pointer flex items-center gap-1 disabled:opacity-50"
              >
                {isDeletingHouse ? 'Excluindo...' : 'Excluir Unidade'}
              </button>
            </div>
          )}
        </div>

        <div className="glassmorphism py-3 px-4.5 rounded-xl border border-slate-800/80 flex items-center gap-3 max-w-sm self-start md:self-auto">
          <div className="p-2 bg-slate-800 text-slate-400 rounded-lg shrink-0">
            <User size={18} />
          </div>
          <div className="overflow-hidden">
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Adquirente</p>
            <p className="text-xs font-bold text-white truncate">
              {initialCasa.cliente ? initialCasa.cliente.nome : 'Disponível em Estoque'}
            </p>
            {initialCasa.cliente && (
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/10 px-1.5 py-0.5 rounded mt-1 inline-block font-semibold">
                Crédito: {initialCasa.cliente.statusCredito.replace('_', ' ')}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex border-b border-slate-800/60 pb-px gap-1 bg-[#101625]/30 p-1.5 rounded-xl">
        <button onClick={() => setActiveTab('geral')} className={`flex items-center gap-1.5 px-4.5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer ${activeTab === 'geral' ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-slate-400 hover:text-slate-200'}`}>
          <Hammer size={14} /> Geral & Vistoria Caixa Econômica Federal (CEF)
        </button>
        <button onClick={() => setActiveTab('financeiro')} className={`flex items-center gap-1.5 px-4.5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer ${activeTab === 'financeiro' ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-slate-400 hover:text-slate-200'}`}>
          <DollarSign size={14} /> Extrato da Obra
        </button>
        <button onClick={() => setActiveTab('infra')} className={`flex items-center gap-1.5 px-4.5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer ${activeTab === 'infra' ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-slate-400 hover:text-slate-200'}`}>
          <Lightbulb size={14} /> Diário & Utilidades
        </button>
        <button onClick={() => setActiveTab('ged')} className={`flex items-center gap-1.5 px-4.5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer ${activeTab === 'ged' ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-slate-400 hover:text-slate-200'}`}>
          <FileText size={14} /> Documentação - Gestão Eletrônica de Documentos (GED)
        </button>
        <button onClick={() => setActiveTab('cronograma')} className={`flex items-center gap-1.5 px-4.5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer ${activeTab === 'cronograma' ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-slate-400 hover:text-slate-200'}`}>
          <Calendar size={14} /> Cronograma
        </button>
      </div>

      {activeTab === 'geral' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-6">
            {/* Card Comercial / Ficha de Tipologia da Unidade */}
            <div className="glassmorphism p-5 rounded-2xl border border-slate-800/60 bg-[#0f1422]/20">
              <h2 className="text-base font-bold text-white mb-3.5 flex items-center gap-2">
                <Home size={18} className="text-blue-400" /> Ficha Técnica & Tipologia
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-[#0f1422]/60 rounded-xl border border-slate-850">
                    <span className="text-slate-500 block uppercase tracking-wider text-[9px] font-bold">Área Construída</span>
                    <span className="text-slate-200 font-bold font-mono text-sm mt-0.5 block">
                      {initialCasa.areaConstruida ? `${initialCasa.areaConstruida} m²` : '---'}
                    </span>
                  </div>
                  <div className="p-3 bg-[#0f1422]/60 rounded-xl border border-slate-850">
                    <span className="text-slate-500 block uppercase tracking-wider text-[9px] font-bold">Área do Lote</span>
                    <span className="text-slate-200 font-bold font-mono text-sm mt-0.5 block">
                      {initialCasa.areaLote ? `${initialCasa.areaLote} m²` : '---'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-[#0f1422]/60 rounded-xl border border-slate-850">
                    <span className="text-slate-500 block uppercase tracking-wider text-[9px] font-bold">Venda Projetada</span>
                    <span className="text-blue-400 font-bold font-mono text-sm mt-0.5 block">
                      {initialCasa.valorVendaProjetado ? formatCurrency(Number(initialCasa.valorVendaProjetado)) : '---'}
                    </span>
                  </div>
                  <div className="p-3 bg-[#0f1422]/60 rounded-xl border border-slate-850">
                    <span className="text-slate-500 block uppercase tracking-wider text-[9px] font-bold">Venda Realizada</span>
                    <span className="text-emerald-400 font-bold font-mono text-sm mt-0.5 block">
                      {initialCasa.contrato ? formatCurrency(Number(initialCasa.contrato.valorVenda)) : 'Em Estoque'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2.5 bg-[#0f1422]/40 rounded-lg border border-slate-850">
                    <span className="text-slate-500 block text-[9px] font-bold uppercase">Quartos</span>
                    <span className="text-white font-extrabold text-sm block mt-0.5">{initialCasa.quantidadeQuartos || 0}</span>
                  </div>
                  <div className="p-2.5 bg-[#0f1422]/40 rounded-lg border border-slate-850">
                    <span className="text-slate-500 block text-[9px] font-bold uppercase">Suítes</span>
                    <span className="text-white font-extrabold text-sm block mt-0.5">{initialCasa.quantidadeSuites || 0}</span>
                  </div>
                  <div className="p-2.5 bg-[#0f1422]/40 rounded-lg border border-slate-850">
                    <span className="text-slate-500 block text-[9px] font-bold uppercase">Banh.</span>
                    <span className="text-white font-extrabold text-sm block mt-0.5">{initialCasa.quantidadeBanheiros || 0}</span>
                  </div>
                  <div className="p-2.5 bg-[#0f1422]/40 rounded-lg border border-slate-850">
                    <span className="text-slate-500 block text-[9px] font-bold uppercase">Vagas</span>
                    <span className="text-white font-extrabold text-sm block mt-0.5">{initialCasa.vagasGaragem || 0}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-md border ${initialCasa.possuiQuintal ? 'bg-emerald-950/20 border-emerald-900/30 text-emerald-400' : 'bg-slate-900/40 border-slate-850 text-slate-500'}`}>
                    {initialCasa.possuiQuintal ? '✓ Possui Quintal' : '✗ Sem Quintal'}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-md border ${initialCasa.salaConjugada ? 'bg-blue-950/20 border-blue-900/30 text-blue-400' : 'bg-slate-900/40 border-slate-850 text-slate-500'}`}>
                    {initialCasa.salaConjugada ? '✓ Sala Conjugada' : '✗ Sala Separada'}
                  </span>
                </div>
              </div>
            </div>

            <div className="glassmorphism p-5 rounded-2xl border border-slate-800/60">
              <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <Hammer size={18} className="text-indigo-400" /> Evolução Física da Obra
              </h2>

              <div className="grid grid-cols-2 gap-4 bg-[#0f1422] p-3 rounded-xl border border-slate-800 mb-5 text-xs">
                <div>
                  <span className="text-slate-500 block uppercase tracking-wider text-[9px] font-bold">Prazo Físico Obra</span>
                  <span className="text-slate-200 font-semibold mt-1 block">
                    {initialCasa.prazoFisico ? formatDate(initialCasa.prazoFisico) : 'Não definido'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block uppercase tracking-wider text-[9px] font-bold">Prazo Liberação CEF</span>
                  <span className="text-slate-200 font-semibold mt-1 block">
                    {initialCasa.prazoFinanceiro ? formatDate(initialCasa.prazoFinanceiro) : 'Não definido'}
                  </span>
                </div>
              </div>

              {/* Velocímetros Físico-Financeiros do Lote */}
              <div className="grid grid-cols-2 gap-4 mb-5">
                {/* Gauge Físico */}
                <div className="flex flex-col items-center justify-center p-3 bg-[#0d111d]/80 border border-slate-850 rounded-2xl text-center">
                  <div className="relative w-16 h-16 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="32" cy="32" r="26" className="stroke-slate-800" strokeWidth="5" fill="transparent" />
                      <circle
                        cx="32"
                        cy="32"
                        r="26"
                        className="stroke-indigo-500 transition-all duration-500 ease-out"
                        strokeWidth="5"
                        strokeDasharray={2 * Math.PI * 26}
                        strokeDashoffset={2 * Math.PI * 26 - (percentualObra ? parseFloat(percentualObra) : 0) / 100 * (2 * Math.PI * 26)}
                        strokeLinecap="round"
                        fill="transparent"
                      />
                    </svg>
                    <span className="absolute font-mono font-black text-[11px] text-white">
                      {parseFloat(percentualObra).toFixed(1)}%
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase mt-2 block">Progresso Físico</span>
                  <span className="text-[8px] text-slate-500 mt-0.5 block">Executado em obra</span>
                </div>

                {/* Gauge Financeiro */}
                <div className="flex flex-col items-center justify-center p-3 bg-[#0d111d]/80 border border-slate-850 rounded-2xl text-center">
                  <div className="relative w-16 h-16 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="32" cy="32" r="26" className="stroke-slate-800" strokeWidth="5" fill="transparent" />
                      <circle
                        cx="32"
                        cy="32"
                        r="26"
                        className={`${
                          (totalOrado > 0 ? (totalGasto / totalOrado) * 100 : 0) > parseFloat(percentualObra)
                            ? (totalOrado > 0 ? (totalGasto / totalOrado) * 100 : 0) - parseFloat(percentualObra) <= 10
                              ? 'stroke-amber-500'
                              : 'stroke-red-500'
                            : 'stroke-emerald-500'
                        } transition-all duration-500 ease-out`}
                        strokeWidth="5"
                        strokeDasharray={2 * Math.PI * 26}
                        strokeDashoffset={2 * Math.PI * 26 - (Math.min(100, totalOrado > 0 ? (totalGasto / totalOrado) * 100 : 0) / 100) * (2 * Math.PI * 26)}
                        strokeLinecap="round"
                        fill="transparent"
                      />
                    </svg>
                    <span className="absolute font-mono font-black text-[11px] text-white">
                      {(totalOrado > 0 ? (totalGasto / totalOrado) * 100 : 0).toFixed(1)}%
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase mt-2 block">Orçamento Consumido</span>
                  <span className="text-[8px] text-slate-500 mt-0.5 block">Total Gasto: {formatCurrency(totalGasto)}</span>
                </div>
              </div>

              {/* Alerta de Descompasso */}
              {(totalOrado > 0 ? (totalGasto / totalOrado) * 100 : 0) > parseFloat(percentualObra) && (
                <div className={`p-2.5 rounded-xl text-[9px] border mb-5 flex items-start gap-1.5 ${
                  (totalOrado > 0 ? (totalGasto / totalOrado) * 100 : 0) - parseFloat(percentualObra) <= 10
                    ? 'bg-amber-950/20 border-amber-500/20 text-amber-400'
                    : 'bg-red-950/20 border-red-500/20 text-red-400'
                }`}>
                  <span className="font-bold">⚠️ DESCOMPASSO ATIVO:</span>
                  <span>
                    O consumo financeiro ({((totalOrado > 0 ? (totalGasto / totalOrado) * 100 : 0)).toFixed(1)}%) superou o avanço físico ({parseFloat(percentualObra).toFixed(1)}%).
                  </span>
                </div>
              )}

              <form onSubmit={handleUpdatePhysical} className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1.5 font-medium">Estágio Atual da Obra</label>
                  <select
                    value={statusObra}
                    onChange={(e) => setStatusObra(e.target.value)}
                    className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-indigo-500/50"
                  >
                    <option value="BACKLOG">1. Não Iniciado (Backlog)</option>
                    <option value="APROVACOES">2. Burocracia e Aprovações</option>
                    <option value="INFRAESTRUTURA">3. Infraestrutura (Base)</option>
                    <option value="SUPRAESTRUTURA">4. Supraestrutura e Cobertura</option>
                    <option value="INSTALACOES">5. Instalações (Embutidas)</option>
                    <option value="ACABAMENTO">6. Acabamentos</option>
                    <option value="VISTORIA_CAIXA">7. Aguardando Vistoria Caixa</option>
                    <option value="CARTORIO">8. Legalização e Cartório</option>
                    <option value="VISITAS">9. Liberado para Visitas</option>
                    <option value="CONCLUIDA">10. Concluído / Entregue</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1.5 font-medium">Execução Física (%)</label>
                  <div className="relative">
                    <Percent size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      placeholder="Ex: 45.5"
                      value={percentualObra}
                      onChange={(e) => setPercentualObra(e.target.value)}
                      className="w-full bg-[#0f1422] border border-slate-800 rounded-xl pl-8 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1.5 font-medium">Editar Prazo de Conclusão Física</label>
                  <input
                    type="date"
                    value={prazoFisicoInput}
                    onChange={(e) => setPrazoFisicoInput(e.target.value)}
                    className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1.5 font-medium">Editar Prazo de Liberação CEF</label>
                  <input
                    type="date"
                    value={prazoFinanceiroInput}
                    onChange={(e) => setPrazoFinanceiroInput(e.target.value)}
                    className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1.5 font-medium">Obstáculos ou Gargalos (Pitfalls)</label>
                  <textarea
                    rows={2}
                    placeholder="Relate problemas, greves ou atrasos que travam a obra..."
                    value={obstaculosInput}
                    onChange={(e) => setObstaculosInput(e.target.value)}
                    className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isUpdatingObra}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs transition disabled:opacity-50"
                >
                  {isUpdatingObra ? 'Salvando...' : 'Salvar Evolução Física'}
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-6">
            <div className="glassmorphism p-5 rounded-2xl border border-slate-800/60">
              <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <FileSpreadsheet size={18} className="text-amber-400" /> Controle de Medição CEF
              </h2>

              <div className="grid grid-cols-2 gap-4 mb-5">
                <div className="p-3 bg-[#0f1422] rounded-xl border border-slate-800">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Total Pago pela Caixa</p>
                  <p className="text-base font-bold text-emerald-400 font-mono mt-1">
                    {formatCurrency(initialCasa.medicoes.filter((m: any) => m.status === 'PAGA').reduce((acc: number, curr: any) => acc + curr.valorLiberado, 0))}
                  </p>
                </div>
                <div className="p-3 bg-[#0f1422] rounded-xl border border-slate-800">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Total Pendente / Retido</p>
                  <p className="text-base font-bold text-amber-400 font-mono mt-1">
                    {formatCurrency(initialCasa.medicoes.filter((m: any) => m.status !== 'PAGA').reduce((acc: number, curr: any) => acc + curr.valorLiberado, 0))}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-800/80 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900/30 border-b border-slate-800 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Data</th>
                      <th className="py-3 px-4">Medido (%)</th>
                      <th className="py-3 px-4">Valor Liberado</th>
                      <th className="py-3 px-4">Status CEF</th>
                      <th className="py-3 px-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-xs text-slate-300">
                    {initialCasa.medicoes.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-500">
                          Nenhuma medição registrada para esta casa.
                        </td>
                      </tr>
                    ) : (
                      initialCasa.medicoes.map((med: any) => (
                        <tr key={med.id} className="hover:bg-slate-800/5 transition">
                          <td className="py-3.5 px-4 font-mono">{formatDate(med.dataMedicao)}</td>
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-200">{med.percentualMedido}%</td>
                          <td className="py-3.5 px-4 font-mono">{formatCurrency(med.valorLiberado)}</td>
                          <td className="py-3.5 px-4">{getStatusBadge(med.status)}</td>
                          <td className="py-3.5 px-4 text-right">
                            <select
                              value={med.status}
                              disabled={updatingMedicaoId === med.id}
                              onChange={(e) => handleUpdateMedicaoStatus(med.id, e.target.value)}
                              className="bg-[#0f1422] border border-slate-800 rounded-md px-1 py-1 text-[10px] text-slate-300 focus:outline-none"
                            >
                              <option value="AGUARDANDO">Aguardando</option>
                              <option value="PAGA">Paga</option>
                              <option value="GLOSADA_REPROVADA">Glosada</option>
                            </select>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="glassmorphism p-5 rounded-2xl border border-slate-800/60">
              <h3 className="text-sm font-bold text-white mb-4">Registrar Nova Medição (CEF)</h3>
              <form onSubmit={handleCreateMedicao} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1.5 font-medium">Percentual Medido (%)</label>
                  <div className="relative">
                    <Percent size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      placeholder="Ex: 15.0"
                      value={percentualMedido}
                      onChange={(e) => setPercentualMedido(e.target.value)}
                      className="w-full bg-[#0f1422] border border-slate-800 rounded-xl pl-8 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500/50 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1.5 font-medium">Valor Liberado (R$)</label>
                  <div className="relative">
                    <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Ex: 25000.00"
                      value={valorLiberado}
                      onChange={(e) => setValorLiberado(e.target.value)}
                      className="w-full bg-[#0f1422] border border-slate-800 rounded-xl pl-8 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500/50 font-mono"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs text-slate-400 block mb-1.5 font-medium">Status da Medição</label>
                  <select
                    value={statusMedicao}
                    onChange={(e) => setStatusMedicao(e.target.value)}
                    className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-amber-500/50"
                  >
                    <option value="AGUARDANDO">Aguardando Pagamento</option>
                    <option value="PAGA">Paga (Recurso Liberado)</option>
                    <option value="GLOSADA_REPROVADA">Glosada (Reprovada pela CEF)</option>
                  </select>
                </div>

                <div className="md:col-span-2 bg-[#0b0f19]/80 border border-slate-800 rounded-xl p-3.5 space-y-2 mt-2">
                  <p className="text-[10px] text-amber-500 uppercase tracking-wider font-bold mb-1 flex items-center gap-1.5">
                    <AlertTriangle size={12} /> Checklist Mandatório de Vistoria
                  </p>
                  <label className="flex items-start gap-2.5 text-xs text-slate-300 cursor-pointer">
                    <input type="checkbox" checked={checkSondagem} onChange={(e) => setCheckSondagem(e.target.checked)} className="mt-0.5" />
                    <span>A sondagem do solo deste lote foi validada e está em conformidade?</span>
                  </label>
                  <label className="flex items-start gap-2.5 text-xs text-slate-300 cursor-pointer">
                    <input type="checkbox" checked={checkEpis} onChange={(e) => setCheckEpis(e.target.checked)} className="mt-0.5" />
                    <span>Todos os operários em campo utilizam os EPIs regulamentares?</span>
                  </label>
                  <label className="flex items-start gap-2.5 text-xs text-slate-300 cursor-pointer">
                    <input type="checkbox" checked={checkMateriais} onChange={(e) => setCheckMateriais(e.target.checked)} className="mt-0.5" />
                    <span>Os materiais aplicados estão em perfeita conformidade com o memorial descritivo aprovado?</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isCreatingMedicao || !(checkSondagem && checkEpis && checkMateriais)}
                  className="md:col-span-2 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-30 disabled:hover:bg-amber-600 text-white font-semibold rounded-xl text-xs transition disabled:opacity-50 mt-2 cursor-pointer"
                >
                  {isCreatingMedicao ? 'Registrando...' : 'Registrar Medição da Caixa'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'financeiro' && (() => {
        const transacoes = initialCasa.transacoes || [];
        
        // Sums
        const receitasPagas = transacoes.filter((t: any) => t.natureza === 'RECEITA' && t.status === 'PAGO').reduce((acc: number, t: any) => acc + t.valor, 0) || 0;
        const despesasPagas = transacoes.filter((t: any) => t.natureza === 'DESPESA' && t.status === 'PAGO').reduce((acc: number, t: any) => acc + t.valor, 0) || 0;
        
        const receitasPendentes = transacoes.filter((t: any) => t.natureza === 'RECEITA' && t.status === 'PENDENTE').reduce((acc: number, t: any) => acc + t.valor, 0) || 0;
        const despesasPendentes = transacoes.filter((t: any) => t.natureza === 'DESPESA' && t.status === 'PENDENTE').reduce((acc: number, t: any) => acc + t.valor, 0) || 0;
        
        const margemLiquida = receitasPagas - despesasPagas;
        const margemPorcentagem = receitasPagas > 0 ? (margemLiquida / receitasPagas) * 100 : 0;

        const percentUsado = totalOrado > 0 ? (totalGasto / totalOrado) * 100 : 0;
        const falta = totalOrado - totalGasto;
        const percentObraNum = parseFloat(percentualObra) || 0;
        const gastandoMaisRapido = percentUsado > percentObraNum;

        return (
          <div className="space-y-6 animate-fadeIn">
            {/* Card único: Orçado -> Gasto -> Falta */}
            <div className="glassmorphism p-6 rounded-2xl border border-slate-800 bg-[#0f1422]/10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">Quanto essa casa já custou</span>
                  <div className="flex items-baseline gap-2 mt-1 flex-wrap">
                    <h2 className="text-2xl font-extrabold text-white font-mono">{formatCurrency(totalGasto)}</h2>
                    <span className="text-xs text-slate-500">de {formatCurrency(totalOrado)} orçados</span>
                  </div>
                </div>
                <div className={`px-4 py-2.5 rounded-xl border text-right shrink-0 ${
                  falta >= 0 ? 'border-emerald-500/20 bg-emerald-950/10' : 'border-red-500/20 bg-red-950/10'
                }`}>
                  <span className="text-[9px] uppercase font-bold block text-slate-400">
                    {falta >= 0 ? 'Ainda disponível' : 'Estourou o orçamento'}
                  </span>
                  <span className={`font-mono font-bold text-lg ${falta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatCurrency(Math.abs(falta))}
                  </span>
                </div>
              </div>

              <div className="mt-4">
                <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      percentUsado > 100 ? 'bg-red-500' : percentUsado > 90 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, percentUsado)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 mt-1.5">
                  <span>{percentUsado.toFixed(0)}% do orçamento usado</span>
                  <span>Obra {percentObraNum.toFixed(0)}% concluída</span>
                </div>
              </div>

              {gastandoMaisRapido && (
                <p className="text-[10px] text-amber-400 mt-3 flex items-center gap-1.5 bg-amber-950/10 border border-amber-500/20 rounded-lg px-3 py-2">
                  <AlertTriangle size={11} className="shrink-0" />
                  Essa casa está gastando mais rápido do que a obra avança fisicamente - vale acompanhar de perto.
                </p>
              )}
            </div>

            {/* Resumo Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="glassmorphism p-5 rounded-2xl border border-slate-800 bg-[#0f1422]/10">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">Receitas Realizadas (Entradas)</span>
                <h3 className="text-xl font-bold text-emerald-450 font-mono mt-1.5">{formatCurrency(receitasPagas)}</h3>
                <p className="text-[9px] text-slate-500 mt-1">Previsão a receber: {formatCurrency(receitasPendentes)}</p>
              </div>

              <div className="glassmorphism p-5 rounded-2xl border border-slate-800 bg-[#0f1422]/10">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">Custos Efetivos (Despesas)</span>
                <h3 className="text-xl font-bold text-red-400 font-mono mt-1.5">{formatCurrency(despesasPagas)}</h3>
                <p className="text-[9px] text-slate-500 mt-1">Custos previstos: {formatCurrency(despesasPendentes)}</p>
              </div>

              <div className="glassmorphism p-5 rounded-2xl border border-slate-800/80 bg-[#0f1422]/10">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">Margem Líquida do Lote</span>
                <h3 className={`text-xl font-bold font-mono mt-1.5 ${margemLiquida >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatCurrency(margemLiquida)}
                </h3>
                <p className="text-[9px] text-slate-500 mt-1">Rentabilidade atual: <span className={`font-bold ${margemLiquida >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{margemPorcentagem.toFixed(1)}%</span></p>
              </div>
            </div>

            {/* Extrato Ledger Table */}
            <div className="glassmorphism p-6 rounded-2xl border border-slate-850">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
                  <FileSpreadsheet size={16} className="text-indigo-400" /> Extrato da Obra
                </h3>
                <button
                  onClick={() => setIsUniversalModalOpen(true)}
                  className="px-4 py-2 bg-indigo-650 hover:bg-indigo-600 border border-indigo-500/25 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5"
                >
                  <DollarSign size={14} />
                  + Lançar Custo / Receita do Lote
                </button>
              </div>
              
              <div className="overflow-x-auto border border-slate-900 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-950/80 border-b border-slate-900 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Data Venc./Pag.</th>
                      <th className="py-3 px-4">Descrição</th>
                      <th className="py-3 px-4">Categoria</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Fluxo / Valor</th>
                      <th className="py-3 px-4 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/60 text-slate-300 font-mono">
                    {transacoes.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-500 italic font-sans">
                          Nenhuma transação lançada no livro-caixa para este lote.
                        </td>
                      </tr>
                    ) : (
                      transacoes.map((t: any) => {
                        const isIncome = t.natureza === 'RECEITA';
                        const isPaid = t.status === 'PAGO';
                        const dateToUse = isPaid && t.dataPagamento ? t.dataPagamento : t.dataVencimento;

                        return (
                          <tr key={t.id} className="hover:bg-slate-900/20 transition-all">
                            <td className="py-3.5 px-4 font-sans text-slate-400">
                              {formatDate(dateToUse)}
                            </td>
                            <td className="py-3.5 px-4 font-sans font-medium text-slate-200">
                              {t.descricao}
                            </td>
                            <td className="py-3.5 px-4 font-sans text-xs text-slate-400">
                              {t.categoria === 'MEDICAO_CAIXA' && 'Medição CEF'}
                              {t.categoria === 'ENTRADA_CLIENTE' && 'Entrada Cliente'}
                              {t.categoria === 'MATERIAL' && 'Materiais'}
                              {t.categoria === 'MAO_DE_OBRA' && 'Mão de Obra'}
                              {t.categoria === 'TERRENO' && 'Aquisição Terreno'}
                              {t.categoria === 'PROJETOS' && 'Projetos/Licença'}
                              {t.categoria === 'IMPOSTOS' && 'Impostos RET'}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-sans font-bold leading-normal ${
                                isPaid
                                  ? 'bg-emerald-950/40 border border-emerald-800/40 text-emerald-400'
                                  : 'bg-amber-950/40 border border-amber-800/40 text-amber-400'
                              }`}>
                                {isPaid ? 'Liquidado' : 'Pendente'}
                              </span>
                            </td>
                            <td className={`py-3.5 px-4 text-right font-bold ${isIncome ? 'text-emerald-450' : 'text-red-400'}`}>
                              {isIncome ? '+' : '-'}{formatCurrency(t.valor)}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <button
                                onClick={() => handleDeleteApropriacao(t.id)}
                                className="p-1 hover:bg-slate-800 rounded text-slate-500 hover:text-red-400 transition cursor-pointer"
                                title="Estornar Lançamento"
                              >
                                <Trash2 size={12} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Curva ABC de Custos Simplificada */}
            <div className="glassmorphism p-5 rounded-2xl border border-slate-800/80">
              <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Custos por Item</h3>
              <div className="overflow-x-auto border border-slate-800/80 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900/30 border-b border-slate-800 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                      <th className="py-2.5 px-3">Item</th>
                      <th className="py-2.5 px-3">Categoria</th>
                      <th className="py-2.5 px-3 text-right">Orçado</th>
                      <th className="py-2.5 px-3 text-right">Gasto</th>
                      <th className="py-2.5 px-3 text-right">Diferença</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 text-slate-300">
                    {totalABC.map((abc, index) => {
                      const desvioPercent = abc.previsto > 0 ? (abc.desvio / abc.previsto) * 100 : 100;
                      const isOver = abc.desvio > 0;
                      return (
                        <tr key={index} className="hover:bg-slate-800/5">
                          <td className="py-2.5 px-3 font-semibold text-slate-200">{abc.nome}</td>
                          <td className="py-2.5 px-3 uppercase text-[9px] font-bold text-slate-400">{abc.categoria.replace('_', ' ')}</td>
                          <td className="py-2.5 px-3 text-right font-mono">{formatCurrency(abc.previsto)}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-200">{formatCurrency(abc.realizado)}</td>
                          <td className={`py-2.5 px-3 text-right font-mono font-bold ${isOver ? 'text-red-400' : 'text-emerald-400'}`}>
                            {abc.desvio === 0 ? '—' : `${isOver ? '+' : ''}${formatCurrency(abc.desvio)} (${desvioPercent.toFixed(0)}%)`}
                          </td>
                        </tr>
                      );
                    })}
                    {totalABC.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-500 italic">Nenhum custo registrado para insumos neste lote.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        );
      })()}

      {activeTab === 'infra' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-6">
            <div className="glassmorphism p-5 rounded-2xl border border-slate-800/60">
              <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2 font-sans">
                <Lightbulb size={18} className="text-yellow-400" /> Ligações de Concessionárias
              </h2>
              <form onSubmit={handleSaveInfra} className="space-y-4">
                {/* Padrão Energia */}
                <div className="p-4 bg-[#0f1422] border border-slate-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-slate-350 font-semibold flex items-center gap-1.5 cursor-pointer">
                      <Lightbulb size={14} className="text-yellow-500" /> Padrão Energia Instalado
                    </label>
                    <input
                      type="checkbox"
                      checked={padraoEnergia}
                      onChange={(e) => setPadraoEnergia(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-[#0f1422] border-slate-800 cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-medium">Número do Medidor de Luz (Cemig/Concessionária)</label>
                    <input
                      type="text"
                      value={medidorLuz}
                      onChange={(e) => setMedidorLuz(e.target.value)}
                      placeholder="Ex: 1234567-8"
                      className="w-full bg-[#070b13] border border-slate-850 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500/50"
                    />
                  </div>
                </div>

                {/* Ligação de Água */}
                <div className="p-4 bg-[#0f1422] border border-slate-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-slate-350 font-semibold flex items-center gap-1.5 cursor-pointer">
                      <Droplet size={14} className="text-blue-400" /> Ligação de Água Concluída
                    </label>
                    <input
                      type="checkbox"
                      checked={ligacaoAgua}
                      onChange={(e) => setLigacaoAgua(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-[#0f1422] border-slate-800 cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-medium">Número do Medidor de Água (Copasa/Concessionária)</label>
                    <input
                      type="text"
                      value={medidorAgua}
                      onChange={(e) => setMedidorAgua(e.target.value)}
                      placeholder="Ex: H-123456"
                      className="w-full bg-[#070b13] border border-slate-850 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500/50"
                    />
                  </div>
                </div>

                {/* Fossa Filtro Esgoto */}
                <div className="p-4 bg-[#0f1422] border border-slate-800 rounded-xl flex items-center justify-between">
                  <label className="text-xs text-slate-350 font-semibold flex items-center gap-1.5 cursor-pointer">
                    <Layers size={14} className="text-emerald-400" /> Fossa, Filtro e Sumidouro Concluídos
                  </label>
                  <input
                    type="checkbox"
                    checked={fossaFiltro}
                    onChange={(e) => setFossaFiltro(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-[#0f1422] border-slate-800 cursor-pointer"
                  />
                </div>

                <button
                  type="submit"
                  disabled={updatingInfra}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold py-2 px-4 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {updatingInfra ? (
                    <>
                      <Loader2 className="animate-spin" size={14} /> Salvando...
                    </>
                  ) : (
                    'Salvar Ligações'
                  )}
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-4">
            <div className="glassmorphism p-5 rounded-2xl border border-slate-800/60">
              <div className="flex justify-between items-center mb-5 border-b border-slate-850 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 font-sans">
                  <Activity size={18} className="text-amber-400" /> Diários de Obra do Lote
                </h3>
                <button
                  type="button"
                  onClick={() => setIsDiarioModalOpen(true)}
                  className="bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-600 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1"
                >
                  + Novo Diário
                </button>
              </div>

              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                {initialCasa.diarios?.map((diario: any) => (
                  <div key={diario.id} className="p-4 bg-[#0f1422]/60 border border-slate-800/80 rounded-xl text-xs space-y-2">
                    <div className="flex justify-between items-center border-b border-slate-850 pb-2">
                      <span className="font-semibold text-slate-350 font-mono">{formatDate(diario.data)}</span>
                      <div className="flex items-center gap-2">
                        {/* Clima badge */}
                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          diario.clima === 'BOM' ? 'bg-amber-500/10 text-amber-400' :
                          diario.clima === 'CHUVA' ? 'bg-blue-500/10 text-blue-400' :
                          'bg-red-500/10 text-red-400'
                        }`}>
                          {diario.clima === 'BOM' ? <Sun size={10} /> : <CloudRain size={10} />}
                          {diario.clima}
                        </span>

                        {/* Efetivo Workers */}
                        <span className="bg-slate-850 text-slate-400 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1">
                          <User size={10} /> {diario.efetivoTrabalhadores} traba.
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-slate-350">
                      <p>
                        <strong className="text-slate-400 font-semibold">Atividades executadas:</strong><br />
                        <span className="text-slate-200">{diario.atividadesExecutadas}</span>
                      </p>
                      {diario.ocorrencias && (
                        <div className="bg-red-500/5 border border-red-500/10 p-2.5 rounded-lg mt-2 text-rose-400">
                          <strong className="flex items-center gap-1 text-[10px] uppercase font-bold text-rose-400 mb-0.5">
                            <AlertTriangle size={12} /> Ocorrências:
                          </strong>
                          <span>{diario.ocorrencias}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {(!initialCasa.diarios || initialCasa.diarios.length === 0) && (
                  <div className="py-12 text-center text-slate-500 italic">
                    Nenhum diário de obra registrado para esta casa.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {activeTab === 'ged' && (
        <div className="glassmorphism p-6 rounded-2xl border border-slate-800/60 max-w-4xl mx-auto">
          <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
            <FileText size={18} className="text-indigo-400" /> Gestão Eletrônica de Documentos (GED)
          </h2>
          <p className="text-xs text-slate-400 mb-6">Mapeamento de laudos, alvarás, relatórios de vistoria e documentações do adquirente.</p>
          <GedManager casaId={initialCasa.id} clienteId={initialCasa.clienteId} />
        </div>
      )}

      {/* Modal: Novo Diário de Obra */}
      {isDiarioModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#000000]/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="glassmorphism w-full max-w-md rounded-2xl border border-slate-800 shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto my-8">
            <button
              type="button"
              onClick={() => setIsDiarioModalOpen(false)}
              className="absolute right-4 top-4 p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
            >
              <X size={18} />
            </button>

            <h3 className="text-base font-bold text-white mb-5 flex items-center gap-2 font-sans uppercase tracking-wide border-b border-slate-850 pb-2">
              <Activity className="text-indigo-400" size={18} /> Registrar Diário de Obra
            </h3>

            <form onSubmit={handleSaveDiario} className="space-y-4 text-slate-350 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-medium">Clima predominante</label>
                  <select
                    value={diarioClima}
                    onChange={(e: any) => setDiarioClima(e.target.value)}
                    className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500/50"
                  >
                    <option value="BOM">☀️ BOM</option>
                    <option value="CHUVA">🌧️ CHUVA</option>
                    <option value="IMPRATICAVEL">⛈️ IMPRATICÁVEL</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-medium">Efetivo de Trabalhadores</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={diarioEfetivo}
                    onChange={(e) => setDiarioEfetivo(e.target.value)}
                    className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500/50"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 font-medium">Atividades Executadas (Mão de Obra / Frente de Trabalho)</label>
                <textarea
                  required
                  rows={4}
                  value={diarioAtividades}
                  onChange={(e) => setDiarioAtividades(e.target.value)}
                  placeholder="Ex: Execução de alvenaria de vedação no primeiro pavimento e início do reboco interno..."
                  className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500/50 resize-none font-sans"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 font-medium">Ocorrências / Observações (Opcional)</label>
                <textarea
                  rows={3}
                  value={diarioOcorrencias}
                  onChange={(e) => setDiarioOcorrencias(e.target.value)}
                  placeholder="Ex: Atraso na entrega do cimento por parte do fornecedor X devido a trânsito..."
                  className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500/50 resize-none font-sans"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setIsDiarioModalOpen(false)}
                  className="px-4 py-2 bg-slate-900 border border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingDiario}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
                >
                  {savingDiario ? (
                    <>
                      <Loader2 className="animate-spin" size={14} /> Salvando...
                    </>
                  ) : (
                    'Registrar Diário'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Casa (Admin) */}
      {isEditHouseModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#000000]/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="glassmorphism w-full max-w-lg rounded-2xl border border-slate-800 shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto my-8">
            <button
              type="button"
              onClick={() => setIsEditHouseModalOpen(false)}
              className="absolute right-4 top-4 p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
            >
              <X size={18} />
            </button>

            <h3 className="text-base font-bold text-white mb-5 flex items-center gap-2 font-sans uppercase tracking-wide border-b border-slate-850 pb-2">
              <Home className="text-blue-555" size={18} /> Editar Unidade Habitacional
            </h3>

            <form onSubmit={handleSaveHouse} className="space-y-4 text-slate-350 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-medium">Número da Casa</label>
                  <input
                    type="text"
                    required
                    value={editNumero}
                    onChange={(e) => setEditNumero(e.target.value)}
                    className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500/50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-medium">Quadra</label>
                  <input
                    type="text"
                    required
                    value={editQuadra}
                    onChange={(e) => setEditQuadra(e.target.value)}
                    className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500/50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-medium">Área Construída (m²)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editAreaConstruida}
                    onChange={(e) => setEditAreaConstruida(e.target.value)}
                    className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500/50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-medium">Área do Lote (m²)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editAreaLote}
                    onChange={(e) => setEditAreaLote(e.target.value)}
                    className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500/50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-medium">Valor de Venda Projetado (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editValorVendaProjetado}
                    onChange={(e) => setEditValorVendaProjetado(e.target.value)}
                    className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500/50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-medium">Quartos</label>
                  <input
                    type="number"
                    value={editQuartos}
                    onChange={(e) => setEditQuartos(e.target.value)}
                    className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500/50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-medium">Suítes</label>
                  <input
                    type="number"
                    value={editSuites}
                    onChange={(e) => setEditSuites(e.target.value)}
                    className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500/50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-medium">Banheiros</label>
                  <input
                    type="number"
                    value={editBanheiros}
                    onChange={(e) => setEditBanheiros(e.target.value)}
                    className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500/50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-medium">Vagas Garagem</label>
                  <input
                    type="number"
                    value={editVagas}
                    onChange={(e) => setEditVagas(e.target.value)}
                    className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500/50"
                  />
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="editQuintal"
                    checked={editQuintal}
                    onChange={(e) => setEditQuintal(e.target.checked)}
                    className="rounded bg-[#0f1422] border-slate-800 text-blue-600 focus:ring-0 w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="editQuintal" className="text-[10px] text-slate-400 cursor-pointer select-none">Possui Quintal</label>
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="editSalaConjugada"
                    checked={editSalaConjugada}
                    onChange={(e) => setEditSalaConjugada(e.target.checked)}
                    className="rounded bg-[#0f1422] border-slate-800 text-blue-600 focus:ring-0 w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="editSalaConjugada" className="text-[10px] text-slate-400 cursor-pointer select-none">Sala Conjugada</label>
                </div>

                <div className="flex items-center gap-2 pt-6 col-span-2">
                  <input
                    type="checkbox"
                    id="editLiberadaVenda"
                    checked={editLiberadaVenda}
                    onChange={(e) => setEditLiberadaVenda(e.target.checked)}
                    className="rounded bg-[#0f1422] border-slate-800 text-emerald-500 focus:ring-0 w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="editLiberadaVenda" className="text-[10px] text-slate-400 cursor-pointer select-none font-bold text-emerald-400">
                    Liberar Unidade para Venda no Comercial
                  </label>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex gap-3 justify-end pt-4 border-t border-slate-850 mt-5">
                <button
                  type="button"
                  onClick={() => setIsEditHouseModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-350 hover:text-white font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingHouse}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-lg shadow-blue-500/10"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL: MANIPULAR ORÇAMENTO PREVISTO */}
      {isBudgetModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glassmorphism w-full max-w-md rounded-2xl border border-slate-800 shadow-2xl p-6 relative">
            <button 
              onClick={() => setIsBudgetModalOpen(false)} 
              className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X size={16} />
            </button>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-b border-slate-850 pb-2 flex items-center gap-2">
              <DollarSign size={16} className="text-blue-400" /> Definir Item de Orçamento Previsto
            </h4>
            <form onSubmit={handleSaveBudget} className="space-y-4 text-xs">
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1 font-semibold">Insumo Padrão *</label>
                <select
                  value={budgetInsumoId}
                  onChange={(e) => setBudgetInsumoId(e.target.value)}
                  required
                  className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                >
                  <option value="">-- Escolha o Insumo --</option>
                  {allInsumos.map(i => (
                    <option key={i.id} value={i.id}>{i.nome} ({i.unidadeMedida})</option>
                  ))}
                </select>
                {(() => {
                  const selectedInsumo = allInsumos.find(i => i.id === budgetInsumoId);
                  if (!selectedInsumo) return null;
                  const type = getInsumoMCMVType(selectedInsumo.nome, selectedInsumo.categoria);
                  return type === 'FIXO' ? (
                    <div className="mt-2 px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded text-[9px] font-bold inline-block uppercase">
                      Custo Fixo (Cronograma)
                    </div>
                  ) : (
                    <div className="mt-2 px-2 py-0.5 bg-emerald-500/10 border border-emerald-555/20 text-emerald-400 rounded text-[9px] font-bold inline-block uppercase">
                      Custo Variável (Produção)
                    </div>
                  );
                })()}
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1 font-semibold">Quantidade Planejada *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="Ex: 100.0"
                  value={budgetQuantidade}
                  onChange={(e) => setBudgetQuantidade(e.target.value)}
                  className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1 font-semibold">Custo Unitário Previsto (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="Ex: 35.50"
                  value={budgetCustoUnitario}
                  onChange={(e) => setBudgetCustoUnitario(e.target.value)}
                  className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none font-mono"
                />
              </div>

              {(() => {
                const totalCalculated = (parseFloat(budgetQuantidade) || 0) * (parseFloat(budgetCustoUnitario) || 0);
                if (totalCalculated === 0) return null;
                return (
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1 font-semibold">Total Planejado (Calculado)</label>
                    <div className="w-full bg-slate-900/40 border border-slate-800 rounded-xl px-3 py-2 text-indigo-400 font-bold font-mono">
                      {formatCurrency(totalCalculated)}
                    </div>
                  </div>
                );
              })()}

              <div className="flex gap-2 justify-end pt-3 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setIsBudgetModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-350 font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBudget}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-lg shadow-blue-500/10"
                >
                  {isSubmittingBudget && <Loader2 size={12} className="animate-spin" />}
                  Salvar Previsto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'cronograma' && (
        <CronogramaPanel
          escopo="LOTE"
          empreendimentoId={initialCasa.empreendimentoId}
          casaId={initialCasa.id}
          initialAtividades={initialCasa.atividadesCronograma || []}
        />
      )}

      {isUniversalModalOpen && (
        <ModalNovoLancamento
          isOpen={isUniversalModalOpen}
          onClose={() => setIsUniversalModalOpen(false)}
          defaultEmpreendimentoId={initialCasa.empreendimentoId}
          defaultCasaId={initialCasa.id}
          defaultDestino="CASA"
          defaultNatureza="DESPESA"
          onSuccess={() => {
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
