'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ShoppingBag, 
  Clock, 
  MapPin, 
  Link as LinkIcon, 
  ArrowRight, 
  CheckCircle, 
  FileText, 
  AlertTriangle,
  Sparkles,
  ShieldAlert,
  Loader2,
  Plus,
  Edit2,
  Trash2,
  X,
  Upload,
  Activity,
  FolderLock
} from 'lucide-react';

interface Cotacao {
  id: string;
  fornecedorNome: string;
  valorUnitario: number;
  prazoEntregaDias: number;
  comprovanteUrl: string | null;
}

interface Solicitacao {
  id: string;
  casaId: string | null;
  casa: {
    numero: string;
    empreendimento: { nome: string };
  } | null;
  empreendimentoId: string | null;
  empreendimento: { nome: string } | null;
  insumoId: string;
  insumo: { nome: string; unidadeMedida: string };
  quantidadeSolicitada: number;
  status: string;
  dataNecessidade: string | Date;
  tokenCotacao: string;
  cotacoes: Cotacao[];
  dataCriacao: string | Date;
  orcadoQtd: number | null;
  consumoQtd: number | null;
  saldoQtd: number | null;
}

interface SuprimentosInboxProps {
  initialSolicitacoes: any[];
  casas?: any[];
  insumos?: any[];
  empreendimentos?: any[];
}

export default function SuprimentosInbox({ 
  initialSolicitacoes,
  casas = [],
  insumos = [],
  empreendimentos = []
}: SuprimentosInboxProps) {
  const router = useRouter();
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>(initialSolicitacoes);
  const [selectedId, setSelectedId] = useState<string>(initialSolicitacoes[0]?.id || '');
  
  const [loading, setLoading] = useState(false);
  const [overrunData, setOverrunData] = useState<{ message: string; cotacaoId: string } | null>(null);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isManualQuoteOpen, setIsManualQuoteOpen] = useState(false);

  // Create Requisition Form State
  const [newEmpreendimentoId, setNewEmpreendimentoId] = useState('');
  const [newCasaId, setNewCasaId] = useState('');
  const [newInsumoId, setNewInsumoId] = useState('');
  const [newQuantidade, setNewQuantidade] = useState('');
  const [newDataNecessidade, setNewDataNecessidade] = useState('');

  // Edit Requisition Form State
  const [editQuantidade, setEditQuantidade] = useState('');
  const [editDataNecessidade, setEditDataNecessidade] = useState('');
  const [editStatus, setEditStatus] = useState('');

  // Manual Quote Form State
  const [quoteFornecedor, setQuoteFornecedor] = useState('');
  const [quoteValorUnitario, setQuoteValorUnitario] = useState('');
  const [quotePrazoEntrega, setQuotePrazoEntrega] = useState('');
  const [quoteFile, setQuoteFile] = useState<File | null>(null);
  const [isSubmittingQuote, setIsSubmittingQuote] = useState(false);

  const selectedSol = solicitacoes.find(s => s.id === selectedId);

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Identifica o menor preço unitário para destacar em verde
  const getLowestQuoteId = (cotacoes: Cotacao[]) => {
    if (cotacoes.length === 0) return null;
    let lowest = cotacoes[0];
    for (const c of cotacoes) {
      if (c.valorUnitario < lowest.valorUnitario) {
        lowest = c;
      }
    }
    return lowest.id;
  };

  const lowestQuoteId = selectedSol ? getLowestQuoteId(selectedSol.cotacoes) : null;

  const handleCopyLink = (token: string) => {
    const origin = window.location.origin;
    const url = `${origin}/cotacao/${token}`;
    navigator.clipboard.writeText(url);
    alert('Link de cotação pública copiado para a área de transferência!');
  };

  const handleApproveQuote = async (cotacaoId: string, force = false) => {
    setLoading(true);
    setOverrunData(null);
    try {
      const response = await fetch('/api/suprimentos/ordem-compra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cotacaoId, excepcionalAprovado: force })
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error === 'ESTOURO_ORCAMENTO') {
          setOverrunData({ message: data.message, cotacaoId });
          return;
        }
        throw new Error(data.error || 'Erro ao emitir ordem de compra.');
      }

      alert(force ? '✓ Ordem de Compra Excepcional emitida com sucesso (auditada).' : '✓ Ordem de Compra emitida e estoque movimentado com sucesso!');
      router.refresh();
      
      setSolicitacoes(prev => prev.map(s => {
        if (s.id === selectedId) {
          return { ...s, status: 'APROVADA' };
        }
        return s;
      }));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRequisition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInsumoId || !newQuantidade || !newDataNecessidade) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/suprimentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empreendimentoId: newEmpreendimentoId || null,
          casaId: newCasaId || null,
          insumoId: newInsumoId,
          quantidadeSolicitada: parseFloat(newQuantidade),
          dataNecessidade: newDataNecessidade
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao criar requisição.');

      alert('✓ Requisição de compra criada com sucesso!');
      setIsCreateOpen(false);
      
      // Reset form
      setNewEmpreendimentoId('');
      setNewCasaId('');
      setNewInsumoId('');
      setNewQuantidade('');
      setNewDataNecessidade('');

      // Refresh page to load updated data
      router.refresh();
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = () => {
    if (!selectedSol) return;
    setEditQuantidade(selectedSol.quantidadeSolicitada.toString());
    setEditDataNecessidade(new Date(selectedSol.dataNecessidade).toISOString().split('T')[0]);
    setEditStatus(selectedSol.status);
    setIsEditOpen(true);
  };

  const handleEditRequisition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !editQuantidade || !editDataNecessidade) return;
    setLoading(true);
    try {
      const res = await fetch('/api/suprimentos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedId,
          quantidadeSolicitada: parseFloat(editQuantidade),
          status: editStatus,
          dataNecessidade: editDataNecessidade
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao editar requisição.');

      alert('✓ Requisição de compra atualizada!');
      setIsEditOpen(false);
      router.refresh();
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRequisition = async () => {
    if (!selectedId) return;
    if (!confirm('Deseja realmente excluir esta requisição de compra?')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/suprimentos?id=${selectedId}`, {
        method: 'DELETE'
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao excluir requisição.');

      alert('✓ Requisição excluída com sucesso.');
      setSelectedId('');
      router.refresh();
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateManualQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !quoteFornecedor || !quoteValorUnitario || !quotePrazoEntrega) {
      alert('Preencha todos os campos obrigatórios.');
      return;
    }
    setIsSubmittingQuote(true);
    try {
      const formData = new FormData();
      formData.append('solicitacaoId', selectedId);
      formData.append('fornecedorNome', quoteFornecedor);
      formData.append('valorUnitario', quoteValorUnitario);
      formData.append('prazoEntregaDias', quotePrazoEntrega);
      if (quoteFile) {
        formData.append('file', quoteFile);
      }

      const res = await fetch('/api/suprimentos/cotacao', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao lançar cotação.');

      alert('✓ Cotação manual registrada!');
      setIsManualQuoteOpen(false);
      setQuoteFornecedor('');
      setQuoteValorUnitario('');
      setQuotePrazoEntrega('');
      setQuoteFile(null);
      router.refresh();
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmittingQuote(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDENTE':
        return <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">Pendente</span>;
      case 'EM_COTACAO':
        return <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">Em Cotação</span>;
      case 'APROVADA':
        return <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">Aprovada</span>;
      case 'REJEITADA':
        return <span className="bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">Rejeitada</span>;
      default:
        return null;
    }
  };

  // Filter houses based on selected Empreendimento in form
  const filteredCasasForForm = newEmpreendimentoId
    ? casas.filter(c => c.empreendimento.id === newEmpreendimentoId)
    : casas;

  // SLA Statistics for the list
  const totalReqs = solicitacoes.length;
  const pendingQuotes = solicitacoes.filter(s => s.cotacoes.length === 0).length;
  const urgentReqs = solicitacoes.filter(s => {
    const diff = new Date(s.dataNecessidade).getTime() - new Date().getTime();
    const diffDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 5 && s.status !== 'APROVADA';
  }).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-xs text-slate-350 relative">
      
      {/* Coluna Esquerda: Lista de Requisições */}
      <div className="lg:col-span-5 space-y-4">
        {/* SLA Metrics Header */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#0f1422] p-3 rounded-xl border border-slate-850 text-center">
            <span className="text-[8px] text-slate-500 block uppercase font-bold">Total Requisições</span>
            <span className="text-sm font-bold text-white font-mono">{totalReqs}</span>
          </div>
          <div className="bg-[#0f1422] p-3 rounded-xl border border-slate-850 text-center">
            <span className="text-[8px] text-slate-500 block uppercase font-bold">Sem Cotação</span>
            <span className="text-sm font-bold text-amber-500 font-mono">{pendingQuotes}</span>
          </div>
          <div className="bg-[#0f1422] p-3 rounded-xl border border-slate-850 text-center">
            <span className="text-[8px] text-slate-500 block uppercase font-bold">Urgentes (&lt;5d)</span>
            <span className="text-sm font-bold text-red-500 font-mono">{urgentReqs}</span>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider block">Requisições de Compra</h3>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="py-1.5 px-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-lg shadow-blue-500/15"
          >
            <Plus size={14} /> Nova Requisição
          </button>
        </div>
        
        <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
          {solicitacoes.map(s => {
            const isSelected = s.id === selectedId;
            const dest = s.casa 
              ? `${s.casa.empreendimento.nome.split(' ')[0]} - Casa ${s.casa.numero}`
              : s.empreendimento?.nome || 'Geral';

            return (
              <div
                key={s.id}
                onClick={() => {
                  setSelectedId(s.id);
                  setOverrunData(null);
                }}
                className={`p-4 rounded-2xl border cursor-pointer transition flex justify-between items-start ${
                  isSelected 
                    ? 'bg-blue-600/10 border-blue-500/30' 
                    : 'bg-[#0f1422] border-slate-800 hover:border-slate-700/60'
                }`}
              >
                <div className="space-y-1.5 max-w-[70%]">
                  <div className="flex items-center gap-1.5 text-white font-bold text-sm">
                    <ShoppingBag size={14} className="text-blue-400" />
                    <span className="truncate">{s.insumo.nome}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 flex items-center gap-1">
                    <MapPin size={10} /> {dest}
                  </p>
                  <p className="text-[10px] font-mono text-slate-500">
                    Qtd: {s.quantidadeSolicitada} {s.insumo.unidadeMedida} | Necessidade: {formatDate(s.dataNecessidade)}
                  </p>
                </div>

                <div className="text-right space-y-1.5">
                  <div>{getStatusBadge(s.status)}</div>
                  <span className="text-[10px] text-slate-500 font-mono block">
                    {s.cotacoes.length} cotaç{s.cotacoes.length === 1 ? 'ão' : 'ões'}
                  </span>
                </div>
              </div>
            );
          })}

          {solicitacoes.length === 0 && (
            <p className="text-slate-500 text-center py-12">Nenhuma requisição de compra no sistema.</p>
          )}
        </div>
      </div>

      {/* Coluna Direita: Comparativo e Ações */}
      <div className="lg:col-span-7 space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider block">Quadro Comparativo de Preços</h3>

        {selectedSol ? (
          <div className="glassmorphism p-6 rounded-2xl border border-slate-800/80 shadow-2xl space-y-6">
            
            {/* Header Solicitação */}
            <div className="flex justify-between items-start border-b border-slate-800/60 pb-4">
              <div>
                <h4 className="text-base font-bold text-white">{selectedSol.insumo.nome}</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Quantidade solicitada: <strong>{selectedSol.quantidadeSolicitada} {selectedSol.insumo.unidadeMedida}</strong> | Status: <strong className="text-slate-350">{selectedSol.status}</strong>
                </p>
              </div>
              <div className="flex gap-2">
                {selectedSol.status !== 'APROVADA' && (
                  <>
                    <button
                      onClick={openEditModal}
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition cursor-pointer"
                      title="Editar Requisição"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button
                      onClick={handleDeleteRequisition}
                      className="p-2 bg-red-950/40 border border-red-500/10 hover:border-red-500/30 text-red-400 rounded-xl transition cursor-pointer"
                      title="Excluir Requisição"
                    >
                      <Trash2 size={12} />
                    </button>
                  </>
                )}
                <button
                  onClick={() => handleCopyLink(selectedSol.tokenCotacao)}
                  className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl flex items-center gap-1 transition cursor-pointer"
                  title="Copiar Link para Lojista preencher"
                >
                  <LinkIcon size={12} /> Link Lojista
                </button>
              </div>
            </div>

            {/* Didactical Lote/Casa Budget Context Panel */}
            {selectedSol.casaId ? (
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-850 space-y-3.5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
                    <Activity size={12} className="text-indigo-405 text-indigo-400" /> Controle de Orçamento do Lote
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">
                    Casa {selectedSol.casa?.numero} - {selectedSol.casa?.empreendimento.nome}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-3 text-center">
                  <div className="bg-[#0f1422] p-2.5 rounded-lg border border-slate-850">
                    <span className="text-[8px] text-slate-500 block uppercase font-bold">Orçado</span>
                    <span className="font-mono text-xs font-bold text-slate-300">
                      {selectedSol.orcadoQtd !== null ? `${selectedSol.orcadoQtd} ${selectedSol.insumo.unidadeMedida}` : 'Não orçado'}
                    </span>
                  </div>
                  <div className="bg-[#0f1422] p-2.5 rounded-lg border border-slate-850">
                    <span className="text-[8px] text-slate-500 block uppercase font-bold">Consumido</span>
                    <span className="font-mono text-xs font-bold text-slate-400">
                      {selectedSol.consumoQtd !== null ? `${selectedSol.consumoQtd} ${selectedSol.insumo.unidadeMedida}` : '0'}
                    </span>
                  </div>
                  <div className="bg-[#0f1422] p-2.5 rounded-lg border border-slate-850">
                    <span className="text-[8px] text-slate-500 block uppercase font-bold">Solicitando</span>
                    <span className="font-mono text-xs font-bold text-blue-400">
                      {selectedSol.quantidadeSolicitada} {selectedSol.insumo.unidadeMedida}
                    </span>
                  </div>
                  <div className={`p-2.5 rounded-lg border ${
                    (selectedSol.saldoQtd ?? 0) - selectedSol.quantidadeSolicitada >= 0
                      ? 'bg-emerald-950/20 border-emerald-500/10 text-emerald-400'
                      : 'bg-red-950/20 border-red-500/10 text-red-400'
                  }`}>
                    <span className="text-[8px] text-slate-500 block uppercase font-bold">Saldo Após Compra</span>
                    <span className="font-mono text-xs font-bold">
                      {selectedSol.saldoQtd !== null 
                        ? `${((selectedSol.saldoQtd ?? 0) - selectedSol.quantidadeSolicitada).toFixed(2)} ${selectedSol.insumo.unidadeMedida}` 
                        : '--'}
                    </span>
                  </div>
                </div>

                {/* Didactical Advice */}
                {selectedSol.orcadoQtd === 0 ? (
                  <div className="p-2.5 bg-red-950/30 border border-red-500/20 rounded-lg text-[10px] text-red-400 flex items-start gap-2">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    <p>
                      <strong>Atenção:</strong> Este insumo não está planejado no orçamento original deste lote. 
                      Para emitir a ordem de compra, o sistema exigirá aprovação de estouro orçamentário.
                    </p>
                  </div>
                ) : (selectedSol.saldoQtd ?? 0) - selectedSol.quantidadeSolicitada < 0 ? (
                  <div className="p-2.5 bg-amber-555/5 border border-amber-500/20 rounded-lg text-[10px] text-amber-400 flex items-start gap-2">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    <p>
                      <strong>Alerta de Estouro:</strong> Esta compra excede o saldo físico orçado restante para o lote. 
                      Ao autorizar, você gerará uma solicitação de estouro que requer liberação administrativa.
                    </p>
                  </div>
                ) : (
                  <div className="p-2.5 bg-emerald-950/20 border border-emerald-500/15 rounded-lg text-[10px] text-emerald-400 flex items-start gap-2">
                    <CheckCircle size={14} className="shrink-0 mt-0.5" />
                    <p>
                      <strong>Viabilidade Verde:</strong> Compra em conformidade com o saldo físico e margem econômica do lote.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-850/80 text-[10px] text-slate-400 flex items-start gap-2">
                <FolderLock size={14} className="text-slate-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-300 block uppercase tracking-wider text-[8px] mb-0.5">Rateio Global</span>
                  Esta requisição é destinada a despesas gerais ou rateio global do empreendimento (não associado a um lote/casa unitário).
                </div>
              </div>
            )}

            {/* Trava de Orçamento (Excepcional) */}
            {overrunData && (
              <div className="p-4 bg-red-950/40 border border-red-500/30 text-red-400 rounded-xl leading-relaxed space-y-3">
                <div className="flex items-start gap-2.5">
                  <ShieldAlert size={20} className="shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-xs uppercase tracking-wide">Bloqueio de Orçamento ERP</h5>
                    <p className="text-xs mt-1 leading-relaxed whitespace-pre-line">{overrunData.message}</p>
                  </div>
                </div>
                
                <div className="flex gap-2 justify-end pt-2">
                  <button
                    onClick={() => setOverrunData(null)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button
                    disabled={loading}
                    onClick={() => handleApproveQuote(overrunData.cotacaoId, true)}
                    className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                  >
                    {loading && <Loader2 size={12} className="animate-spin" />}
                    Autorizar como ADMIN
                  </button>
                </div>
              </div>
            )}

            {/* Lista de Cotações */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h5 className="font-bold text-white text-xs flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-400" /> Respostas de Lojistas Recebidas
                </h5>
                {selectedSol.status !== 'APROVADA' && (
                  <button
                    onClick={() => setIsManualQuoteOpen(true)}
                    className="py-1 px-2.5 bg-indigo-650/40 hover:bg-indigo-650 text-indigo-400 hover:text-white border border-indigo-500/15 rounded-lg text-[10px] font-semibold transition cursor-pointer"
                  >
                    Lançar Cotação Manual
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedSol.cotacoes.map(c => {
                  const isLowest = c.id === lowestQuoteId;
                  const totalGeral = c.valorUnitario * selectedSol.quantidadeSolicitada;

                  return (
                    <div
                      key={c.id}
                      className={`p-4 rounded-xl border flex flex-col justify-between space-y-4 transition ${
                        isLowest 
                          ? 'bg-emerald-950/30 border-emerald-500/40 shadow-lg shadow-emerald-500/5' 
                          : 'bg-[#0f1422] border-slate-800'
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-white text-sm truncate max-w-[70%]">{c.fornecedorNome}</span>
                          {isLowest && (
                            <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[8px] font-bold px-1.5 py-0.5 rounded-md uppercase">
                              Melhor Preço
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 font-mono mt-1 flex items-center gap-1">
                          <Clock size={10} /> Entrega: {c.prazoEntregaDias} dias úteis
                        </p>
                      </div>

                      <div className="flex justify-between items-baseline pt-2 border-t border-slate-888/10">
                        <div>
                          <span className="text-[9px] text-slate-500 uppercase block">Unitário</span>
                          <span className="font-mono text-xs text-slate-300 font-bold">{formatCurrency(c.valorUnitario)}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] text-slate-500 uppercase block">Total Geral</span>
                          <span className="font-mono text-sm text-white font-bold">{formatCurrency(totalGeral)}</span>
                        </div>
                      </div>

                      {/* Botão de Compra */}
                      {selectedSol.status !== 'APROVADA' && (
                        <button
                          disabled={loading}
                          onClick={() => handleApproveQuote(c.id)}
                          className="w-full mt-2 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-[10px] transition cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          {loading ? <Loader2 size={10} className="animate-spin" /> : 'Emitir Ordem de Compra'}
                        </button>
                      )}
                    </div>
                  );
                })}

                {selectedSol.cotacoes.length === 0 && (
                  <div className="col-span-2 bg-[#0f1422] p-8 rounded-xl border border-slate-850 text-center space-y-2">
                    <AlertTriangle className="text-amber-500 mx-auto" size={24} />
                    <p className="font-bold text-white text-xs">Nenhuma cotação recebida para esta requisição.</p>
                    <p className="text-[10px] text-slate-500 max-w-xs mx-auto">
                      Envie o link de cotação pública aos seus lojistas parceiros ou registre uma cotação manual usando o botão acima.
                    </p>
                  </div>
                )}
              </div>
            </div>

          </div>
        ) : (
          <div className="glassmorphism p-12 rounded-2xl border border-slate-850 text-center text-slate-500">
            Selecione uma requisição de compra à esquerda para analisar cotações e aprovar ordens de compra.
          </div>
        )}
      </div>

      {/* MODAL 1: NOVA REQUISIÇÃO DE COMPRA */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glassmorphism w-full max-w-md rounded-2xl border border-slate-800 shadow-2xl p-6 relative">
            <button 
              onClick={() => setIsCreateOpen(false)} 
              className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X size={16} />
            </button>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-b border-slate-850 pb-2 flex items-center gap-2">
              <ShoppingBag size={16} className="text-blue-400" /> Nova Requisição de Compra
            </h4>
            <form onSubmit={handleCreateRequisition} className="space-y-4">
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1 font-semibold">Empreendimento (Opcional)</label>
                <select
                  value={newEmpreendimentoId}
                  onChange={(e) => {
                    setNewEmpreendimentoId(e.target.value);
                    setNewCasaId('');
                  }}
                  className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                >
                  <option value="">-- Empreendimento Global --</option>
                  {empreendimentos.map(e => (
                    <option key={e.id} value={e.id}>{e.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1 font-semibold">Casa/Unidade (Opcional)</label>
                <select
                  value={newCasaId}
                  onChange={(e) => {
                    setNewCasaId(e.target.value);
                    if (e.target.value) {
                      const house = casas.find(c => c.id === e.target.value);
                      if (house) setNewEmpreendimentoId(house.empreendimento.id);
                    }
                  }}
                  className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                >
                  <option value="">-- Nenhuma (Geral do Projeto) --</option>
                  {filteredCasasForForm.map(c => (
                    <option key={c.id} value={c.id}>Qd {c.quadra}, Casa {c.numero} ({c.empreendimento.nome.split(' ')[0]})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1 font-semibold">Insumo Padrão *</label>
                <select
                  value={newInsumoId}
                  onChange={(e) => setNewInsumoId(e.target.value)}
                  required
                  className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                >
                  <option value="">-- Escolha o Insumo --</option>
                  {insumos.map(i => (
                    <option key={i.id} value={i.id}>{i.nome} ({i.unidadeMedida})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1 font-semibold">Quantidade Necessária *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="Ex: 50.0"
                  value={newQuantidade}
                  onChange={(e) => setNewQuantidade(e.target.value)}
                  className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1 font-semibold">Data Limite de Necessidade *</label>
                <input
                  type="date"
                  required
                  value={newDataNecessidade}
                  onChange={(e) => setNewDataNecessidade(e.target.value)}
                  className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-lg shadow-blue-500/10"
                >
                  {loading && <Loader2 size={12} className="animate-spin" />}
                  Salvar Requisição
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDITAR REQUISIÇÃO */}
      {isEditOpen && selectedSol && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glassmorphism w-full max-w-md rounded-2xl border border-slate-800 shadow-2xl p-6 relative">
            <button 
              onClick={() => setIsEditOpen(false)} 
              className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X size={16} />
            </button>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-b border-slate-850 pb-2 flex items-center gap-2">
              <Edit2 size={16} className="text-blue-400" /> Editar Requisição
            </h4>
            <form onSubmit={handleEditRequisition} className="space-y-4">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1 font-semibold uppercase">Insumo (Bloqueado)</label>
                <input
                  type="text"
                  disabled
                  value={selectedSol.insumo.nome}
                  className="w-full bg-[#0b0f19] border border-slate-850 rounded-xl px-3 py-2 text-slate-500"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1 font-semibold">Quantidade Solicitada *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={editQuantidade}
                  onChange={(e) => setEditQuantidade(e.target.value)}
                  className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1 font-semibold">Data Limite de Necessidade *</label>
                <input
                  type="date"
                  required
                  value={editDataNecessidade}
                  onChange={(e) => setEditDataNecessidade(e.target.value)}
                  className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1 font-semibold">Status de Aquisição</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                >
                  <option value="PENDENTE">Pendente</option>
                  <option value="EM_COTACAO">Em Cotação</option>
                  <option value="APROVADA">Aprovada (Comprado)</option>
                  <option value="REJEITADA">Rejeitada</option>
                </select>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-lg shadow-blue-500/10"
                >
                  {loading && <Loader2 size={12} className="animate-spin" />}
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: LANÇAR COTAÇÃO MANUAL */}
      {isManualQuoteOpen && selectedSol && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glassmorphism w-full max-w-md rounded-2xl border border-slate-800 shadow-2xl p-6 relative">
            <button 
              onClick={() => setIsManualQuoteOpen(false)} 
              className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X size={16} />
            </button>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-b border-slate-850 pb-2 flex items-center gap-2">
              <Sparkles size={16} className="text-indigo-400" /> Registrar Cotação de Lojista
            </h4>
            <form onSubmit={handleCreateManualQuote} className="space-y-4">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1 font-semibold uppercase">Insumo Requisitado</label>
                <input
                  type="text"
                  disabled
                  value={`${selectedSol.insumo.nome} (${selectedSol.quantidadeSolicitada} ${selectedSol.insumo.unidadeMedida})`}
                  className="w-full bg-[#0b0f19] border border-slate-850 rounded-xl px-3 py-2 text-slate-500"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1 font-semibold">Nome do Lojista/Fornecedor *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Leroy Merlin, Madeireira Silva"
                  value={quoteFornecedor}
                  onChange={(e) => setQuoteFornecedor(e.target.value)}
                  className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1 font-semibold">Valor Unitário (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="Ex: 45.90"
                    value={quoteValorUnitario}
                    onChange={(e) => setQuoteValorUnitario(e.target.value)}
                    className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1 font-semibold">Prazo de Entrega (Dias) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="Ex: 3"
                    value={quotePrazoEntrega}
                    onChange={(e) => setQuotePrazoEntrega(e.target.value)}
                    className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1 font-semibold">Comprovante de Cotação / PDF (Opcional)</label>
                <div className="border border-dashed border-slate-800 hover:border-slate-700 rounded-xl p-4 text-center cursor-pointer transition relative">
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setQuoteFile(e.target.files[0]);
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="flex flex-col items-center justify-center gap-1.5 text-slate-500">
                    <Upload size={18} />
                    <span>{quoteFile ? quoteFile.name : 'Selecionar Orçamento / Proposta PDF'}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setIsManualQuoteOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingQuote}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-lg shadow-indigo-650/15"
                >
                  {isSubmittingQuote && <Loader2 size={12} className="animate-spin" />}
                  Registrar Cotação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
