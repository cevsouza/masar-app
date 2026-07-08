'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  ShieldAlert, 
  ShieldCheck, 
  Clock, 
  UserMinus, 
  Eye, 
  UserPlus, 
  X,
  FileText,
  DollarSign
} from 'lucide-react';
import Link from 'next/link';

interface Client {
  id: string;
  nome: string;
  cpf: string;
  rendaComprovada: number;
  statusCredito: string;
}

interface House {
  id: string;
  numero: string;
  quadra: string;
  statusObra: string;
  percentualObra: number;
  empreendimento: {
    nome: string;
  };
  cliente: Client | null;
}

const STAGES = [
  { id: 'DOCUMENTACAO_PENDENTE', label: 'Prospecção / Pendente', color: 'border-red-500/30 text-red-400 bg-red-950/20' },
  { id: 'EM_ANALISE_CAIXA', label: 'Análise Caixa', color: 'border-amber-500/30 text-amber-400 bg-amber-950/20' },
  { id: 'APROVADO_CONDICIONADO', label: 'Assinado Provisório / Condic.', color: 'border-blue-500/30 text-blue-400 bg-blue-950/20' },
  { id: 'APROVADO', label: 'Assinado Caixa / Aprovado', color: 'border-emerald-500/30 text-emerald-400 bg-emerald-950/20' }
];

export default function CrmTable({ initialHouses }: { initialHouses: House[] }) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // New Client modal state
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientCpf, setNewClientCpf] = useState('');
  const [newClientIncome, setNewClientIncome] = useState('');
  const [newClientCredit, setNewClientCredit] = useState('DOCUMENTACAO_PENDENTE');
  const [selectedHouseId, setSelectedHouseId] = useState('');
  const [isCreatingClient, setIsCreatingClient] = useState(false);

  // Edit Client modal state
  const [userRole, setUserRole] = useState('COMERCIAL');
  const [isEditClientModalOpen, setIsEditClientModalOpen] = useState(false);
  const [editingClientId, setEditingClientId] = useState('');
  const [editClientName, setEditClientName] = useState('');
  const [editClientCpf, setEditClientCpf] = useState('');
  const [editClientIncome, setEditClientIncome] = useState('');
  const [editClientCredit, setEditClientCredit] = useState('DOCUMENTACAO_PENDENTE');
  const [isSavingClient, setIsSavingClient] = useState(false);

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

  const handleOpenEditClient = (client: any) => {
    setEditingClientId(client.id);
    setEditClientName(client.nome);
    setEditClientCpf(client.cpf);
    setEditClientIncome(client.rendaComprovada.toString());
    setEditClientCredit(client.statusCredito);
    setIsEditClientModalOpen(true);
  };

  const handleDeleteClient = async (clientId: string, clientNome: string) => {
    if (!confirm(`Deseja realmente excluir o cliente "${clientNome}" permanentemente do CRM?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/clientes/${clientId}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao excluir cliente.');
      }
      alert('✓ Cliente excluído com sucesso!');
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingClient(true);
    try {
      const res = await fetch(`/api/clientes/${editingClientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: editClientName,
          cpf: editClientCpf,
          rendaComprovada: parseFloat(editClientIncome),
          statusCredito: editClientCredit
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao salvar cliente.');
      }

      setIsEditClientModalOpen(false);
      alert('✓ Dados do cliente atualizados com sucesso!');
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSavingClient(false);
    }
  };

  // Filter available houses (without adquirente) for the dropdown list
  const availableHouses = initialHouses.filter(h => h.cliente === null);

  const handleStatusChange = async (clientId: string, newStatus: string) => {
    setUpdatingId(clientId);
    try {
      const response = await fetch(`/api/clientes/${clientId}/credito`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ statusCredito: newStatus }),
      });

      if (!response.ok) throw new Error('Falha ao atualizar crédito');
      
      router.refresh();
    } catch (err) {
      console.error(err);
      alert('Erro ao atualizar status de crédito.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName || !newClientCpf || !newClientIncome) {
      alert('Nome, CPF e renda comprovada são obrigatórios');
      return;
    }

    // UI validation block
    if (selectedHouseId && !['APROVADO_CONDICIONADO', 'APROVADO'].includes(newClientCredit)) {
      alert('Bloqueio Comercial: O cliente selecionado deve possuir crédito Aprovado ou Aprovado Condicionado para ser vinculado a uma unidade em estoque.');
      return;
    }

    setIsCreatingClient(true);
    try {
      const response = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: newClientName,
          cpf: newClientCpf,
          rendaComprovada: parseFloat(newClientIncome),
          statusCredito: newClientCredit,
          casaId: selectedHouseId || null,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao cadastrar cliente');

      // Clear state
      setNewClientName('');
      setNewClientCpf('');
      setNewClientIncome('');
      setNewClientCredit('DOCUMENTACAO_PENDENTE');
      setSelectedHouseId('');
      setIsClientModalOpen(false);

      router.refresh();
      alert('Adquirente cadastrado e associado com sucesso!');
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erro ao criar cliente.');
    } finally {
      setIsCreatingClient(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);
  };

  // Filter houses with clients based on search terms
  const housesWithClients = initialHouses.filter(h => h.cliente !== null);
  const stockHouses = initialHouses.filter(h => h.cliente === null);

  const filterCards = (cards: House[]) => {
    return cards.filter(house => {
      const clientName = house.cliente?.nome.toLowerCase() || 'estoque';
      const clientCpf = house.cliente?.cpf || '';
      const houseNum = house.numero.toLowerCase();
      const houseQuadra = house.quadra.toLowerCase();
      const empName = house.empreendimento.nome.toLowerCase();

      return (
        clientName.includes(searchTerm.toLowerCase()) || 
        clientCpf.includes(searchTerm) ||
        houseNum.includes(searchTerm.toLowerCase()) ||
        houseQuadra.includes(searchTerm.toLowerCase()) ||
        empName.includes(searchTerm.toLowerCase())
      );
    });
  };

  const activeFilteredCards = filterCards(housesWithClients);
  const stockFilteredCards = filterCards(stockHouses);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APROVADO':
        return <ShieldCheck size={14} className="text-emerald-400" />;
      case 'APROVADO_CONDICIONADO':
        return <Clock size={14} className="text-blue-400" />;
      case 'EM_ANALISE_CAIXA':
        return <Clock size={14} className="text-amber-400" />;
      case 'DOCUMENTACAO_PENDENTE':
        return <ShieldAlert size={14} className="text-red-400" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-[#151b2c] p-4 rounded-xl border border-slate-800/80 gap-3">
        <div>
          <span className="text-xs text-slate-400 font-medium">Pipeline Comercial (CRM) e de Análise de Crédito da Caixa Econômica Federal.</span>
        </div>
        <button
          onClick={() => setIsClientModalOpen(true)}
          className="flex items-center gap-1.5 px-4.5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-blue-500/10 cursor-pointer w-full sm:w-auto justify-center"
        >
          <UserPlus size={14} /> Novo Cliente
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative w-full max-w-md">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Pesquisar por adquirente, CPF, casa ou quadra..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-[#151b2c] border border-slate-800/85 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
        />
      </div>

      {/* Kanban Board Container */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
        {STAGES.map(stage => {
          const cardsInStage = activeFilteredCards.filter(h => h.cliente?.statusCredito === stage.id);
          const totalIncomeInStage = cardsInStage.reduce((acc, h) => acc + (h.cliente?.rendaComprovada || 0), 0);

          return (
            <div key={stage.id} className="bg-[#0f1422]/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col min-h-[450px]">
              {/* Header de coluna */}
              <div className="mb-4">
                <div className={`p-2.5 rounded-xl border ${stage.color} text-xs font-bold uppercase tracking-wider flex items-center justify-between`}>
                  <span>{stage.label}</span>
                  <span className="bg-slate-900/60 px-2 py-0.5 rounded text-[10px]">{cardsInStage.length}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2 px-1">
                  <span>Renda Mensal Total:</span>
                  <span className="font-mono font-bold text-slate-400">{formatCurrency(totalIncomeInStage)}</span>
                </div>
              </div>

              {/* Lista de cartões */}
              <div className="space-y-3.5 overflow-y-auto flex-1 max-h-[500px] pr-1">
                {cardsInStage.map(house => {
                  const client = house.cliente!;
                  return (
                    <div key={house.id} className="bg-[#151b2c] border border-slate-850 hover:border-slate-700/60 p-4 rounded-xl transition space-y-3 shadow-md">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-xs font-bold text-white leading-tight">{client.nome}</h4>
                          <span className="text-[10px] text-slate-500 font-mono">CPF: {client.cpf}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {['ADMIN', 'COMERCIAL'].includes(userRole) && (
                            <>
                              <button
                                onClick={() => handleOpenEditClient(client)}
                                className="px-1.5 py-0.5 bg-[#0f1422] hover:bg-slate-800 text-blue-400 border border-slate-800 rounded transition text-[9px] font-bold cursor-pointer"
                                title="Editar Cliente"
                              >
                                Ed
                              </button>
                              <button
                                onClick={() => handleDeleteClient(client.id, client.nome)}
                                className="px-1.5 py-0.5 bg-red-950/20 hover:bg-red-900/60 text-red-400 border border-red-900/30 rounded transition text-[9px] font-bold cursor-pointer"
                                title="Excluir Cliente"
                              >
                                Ex
                              </button>
                            </>
                          )}
                          <Link 
                            href={`/casas/${house.id}`}
                            className="p-1.5 bg-[#0f1422] hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition border border-slate-800"
                          >
                            <Eye size={12} />
                          </Link>
                        </div>
                      </div>

                      <div className="p-2.5 bg-[#0f1422]/80 border border-slate-850 rounded-lg text-[10px] text-slate-300">
                        <p className="font-semibold text-slate-200">Qd {house.quadra}, Casa {house.numero}</p>
                        <p className="text-slate-500 mt-0.5">{house.empreendimento.nome}</p>
                      </div>

                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-slate-500">Renda Comprovada:</span>
                        <span className="font-mono font-bold text-slate-300">{formatCurrency(client.rendaComprovada)}</span>
                      </div>

                      {/* Dropdown de ação rápida de CRM */}
                      <div className="pt-2 border-t border-slate-850 flex items-center justify-between gap-2">
                        <span className="text-[9px] text-slate-500 uppercase font-semibold flex items-center gap-1">
                          {getStatusIcon(client.statusCredito)} Mover
                        </span>
                        <select
                          value={client.statusCredito}
                          disabled={updatingId === client.id}
                          onChange={(e) => handleStatusChange(client.id, e.target.value)}
                          className="bg-[#0f1422] border border-slate-800 rounded-lg px-2 py-1 text-[10px] text-slate-300 focus:outline-none focus:border-blue-500/50"
                        >
                          <option value="DOCUMENTACAO_PENDENTE">Pendente</option>
                          <option value="EM_ANALISE_CAIXA">Análise Caixa</option>
                          <option value="APROVADO_CONDICIONADO">Condicionado</option>
                          <option value="APROVADO">Aprovado</option>
                        </select>
                      </div>
                    </div>
                  );
                })}

                {cardsInStage.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-32 border border-dashed border-slate-800/40 rounded-xl text-[10px] text-slate-500">
                    Sem adquirentes
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Unidades em Estoque (Destaque Lateral/Inferior) */}
      <div className="glassmorphism p-5 rounded-2xl border border-slate-800/60">
        <h3 className="text-xs font-extrabold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          <UserMinus size={16} className="text-slate-500" /> Unidades Disponíveis em Estoque ({stockFilteredCards.length})
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {stockFilteredCards.map(house => (
            <div key={house.id} className="p-3 bg-[#0f1422] border border-slate-850 rounded-xl text-center flex flex-col justify-between min-h-[90px]">
              <div>
                <p className="text-xs font-bold text-white">Qd {house.quadra}, Casa {house.numero}</p>
                <p className="text-[9px] text-slate-500 truncate mt-0.5">{house.empreendimento.nome}</p>
              </div>
              <div className="mt-2.5 flex items-center justify-center gap-1.5">
                <span className="text-[8px] font-bold text-slate-400 bg-slate-500/10 px-1.5 py-0.5 rounded border border-slate-500/10 uppercase">
                  Estoque
                </span>
                <Link 
                  href={`/casas/${house.id}`}
                  className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded border border-slate-700/60"
                >
                  <Eye size={10} />
                </Link>
              </div>
            </div>
          ))}

          {stockFilteredCards.length === 0 && (
            <p className="text-xs text-slate-500 col-span-full text-center py-4">Nenhuma unidade em estoque disponível.</p>
          )}
        </div>
      </div>

      {/* Modal: Novo Cliente */}
      {isClientModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#000000]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glassmorphism w-full max-w-md rounded-2xl border border-slate-800 shadow-2xl p-6 relative">
            <button
              onClick={() => setIsClientModalOpen(false)}
              className="absolute right-4 top-4 p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
            >
              <X size={18} />
            </button>

            <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2 font-sans">
              <UserPlus className="text-blue-500" size={20} /> Cadastrar Novo Adquirente
            </h3>

            <form onSubmit={handleCreateClient} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1.5 font-medium">Nome do Cliente</label>
                <input
                  type="text"
                  required
                  placeholder="Nome Completo"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1.5 font-medium">CPF</label>
                <input
                  type="text"
                  required
                  placeholder="000.000.000-00"
                  value={newClientCpf}
                  onChange={(e) => setNewClientCpf(e.target.value)}
                  className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50 font-mono"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1.5 font-medium">Renda Comprovada Mensal (R$)</label>
                <input
                  type="number"
                  required
                  min="0"
                  placeholder="Ex: 4500"
                  value={newClientIncome}
                  onChange={(e) => setNewClientIncome(e.target.value)}
                  className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50 font-mono"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1.5 font-medium">Status de Crédito Inicial</label>
                <select
                  value={newClientCredit}
                  onChange={(e) => setNewClientCredit(e.target.value)}
                  className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-blue-500/50"
                >
                  <option value="DOCUMENTACAO_PENDENTE">Documentação Pendente</option>
                  <option value="EM_ANALISE_CAIXA">Em Análise na Caixa</option>
                  <option value="APROVADO_CONDICIONADO">Aprovado Condicionado</option>
                  <option value="APROVADO">Crédito Aprovado</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1.5 font-medium">Vincular Unidade Disponível (Estoque)</label>
                <select
                  value={selectedHouseId}
                  onChange={(e) => setSelectedHouseId(e.target.value)}
                  className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-blue-500/50"
                >
                  <option value="">-- Deixar em Estoque (Sem Vínculo) --</option>
                  {availableHouses.map(house => (
                    <option key={house.id} value={house.id}>
                      Qd {house.quadra}, Casa {house.numero} ({house.empreendimento.nome})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsClientModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingClient}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                >
                  {isCreatingClient ? 'Cadastrando...' : 'Cadastrar e Vincular'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Cliente (Admin ou Comercial) */}
      {isEditClientModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#000000]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glassmorphism w-full max-w-md rounded-2xl border border-slate-800 shadow-2xl p-6 relative">
            <button
              onClick={() => setIsEditClientModalOpen(false)}
              className="absolute right-4 top-4 p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
            >
              <X size={18} />
            </button>

            <h3 className="text-base font-bold text-white mb-5 flex items-center gap-2 font-sans">
              Editar Dados do Comprador
            </h3>

            <form onSubmit={handleSaveClient} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1.5 font-medium">Nome Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Nome do cliente"
                  value={editClientName}
                  onChange={(e) => setEditClientName(e.target.value)}
                  className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1.5 font-medium">CPF</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 000.000.000-00"
                  value={editClientCpf}
                  onChange={(e) => setEditClientCpf(e.target.value)}
                  className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1.5 font-medium">Renda Mensal Comprovada (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="Ex: 3500.00"
                  value={editClientIncome}
                  onChange={(e) => setEditClientIncome(e.target.value)}
                  className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1.5 font-medium">Status de Crédito Caixa</label>
                <select
                  value={editClientCredit}
                  onChange={(e) => setEditClientCredit(e.target.value)}
                  className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-350 focus:outline-none focus:border-blue-500/50"
                >
                  <option value="DOCUMENTACAO_PENDENTE">Documentação Pendente</option>
                  <option value="EM_ANALISE_CAIXA">Em Análise na Caixa</option>
                  <option value="APROVADO_CONDICIONADO">Aprovado Condicionado</option>
                  <option value="APROVADO">Crédito Aprovado</option>
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-800 mt-5">
                <button
                  type="button"
                  onClick={() => setIsEditClientModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingClient}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                >
                  {isSavingClient ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
