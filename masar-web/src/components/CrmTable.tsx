'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Filter, ShieldAlert, ShieldCheck, Clock, UserMinus, Eye, Plus, X, UserPlus } from 'lucide-react';
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

export default function CrmTable({ initialHouses }: { initialHouses: House[] }) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // New Client modal state
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientCpf, setNewClientCpf] = useState('');
  const [newClientIncome, setNewClientIncome] = useState('');
  const [newClientCredit, setNewClientCredit] = useState('DOCUMENTACAO_PENDENTE');
  const [selectedHouseId, setSelectedHouseId] = useState('');
  const [isCreatingClient, setIsCreatingClient] = useState(false);

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

  // Filter logic
  const filteredHouses = initialHouses.filter(house => {
    const clientName = house.cliente?.nome.toLowerCase() || 'estoque';
    const clientCpf = house.cliente?.cpf || '';
    const houseNum = house.numero.toLowerCase();
    const houseQuadra = house.quadra.toLowerCase();
    const empName = house.empreendimento.nome.toLowerCase();

    const matchesSearch = 
      clientName.includes(searchTerm.toLowerCase()) || 
      clientCpf.includes(searchTerm) ||
      houseNum.includes(searchTerm.toLowerCase()) ||
      houseQuadra.includes(searchTerm.toLowerCase()) ||
      empName.includes(searchTerm.toLowerCase());

    const matchesStatus = 
      statusFilter === 'ALL' || 
      (statusFilter === 'ESTOQUE' && !house.cliente) ||
      (house.cliente?.statusCredito === statusFilter);

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APROVADO':
        return (
          <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full font-semibold w-fit">
            <ShieldCheck size={14} /> Aprovado
          </span>
        );
      case 'APROVADO_CONDICIONADO':
        return (
          <span className="flex items-center gap-1.5 text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-full font-semibold w-fit">
            <Clock size={14} /> Aprovado Condic.
          </span>
        );
      case 'EM_ANALISE_CAIXA':
        return (
          <span className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full font-semibold w-fit">
            <Clock size={14} /> Análise Caixa
          </span>
        );
      case 'DOCUMENTACAO_PENDENTE':
        return (
          <span className="flex items-center gap-1.5 text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-full font-semibold w-fit">
            <ShieldAlert size={14} /> Pendente
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Top action header */}
      <div className="flex justify-between items-center bg-[#151b2c] p-4 rounded-xl border border-slate-800/80">
        <span className="text-xs text-slate-400 font-medium">Gestão e vinculação de adquirentes e aprovação de crédito na CEF</span>
        <button
          onClick={() => setIsClientModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-blue-500/10 cursor-pointer"
        >
          <UserPlus size={14} /> Novo Cliente
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar por cliente, CPF, quadra..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#151b2c] border border-slate-800/85 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
          />
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Filter size={16} className="text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#151b2c] border border-slate-800/85 rounded-xl px-4 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-blue-500/50 grow md:grow-0"
          >
            <option value="ALL">Todos os Status</option>
            <option value="APROVADO">Crédito Aprovado</option>
            <option value="APROVADO_CONDICIONADO">Crédito Aprovado Condic.</option>
            <option value="EM_ANALISE_CAIXA">Em Análise Caixa</option>
            <option value="DOCUMENTACAO_PENDENTE">Pendência de Doc</option>
            <option value="ESTOQUE">Em Estoque (Sem Cliente)</option>
          </select>
        </div>
      </div>

      {/* CRM Table */}
      <div className="glassmorphism rounded-2xl border border-slate-800/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#1e293b] bg-slate-900/20 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-5">Unidade / Empreendimento</th>
                <th className="py-4 px-5">Adquirente (Cliente)</th>
                <th className="py-4 px-5">Renda Mensal</th>
                <th className="py-4 px-5">Status de Crédito (CEF)</th>
                <th className="py-4 px-5">Ações CRM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e293b] text-sm text-slate-300">
              {filteredHouses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    Nenhuma unidade encontrada correspondente aos filtros.
                  </td>
                </tr>
              ) : (
                filteredHouses.map((house) => {
                  const client = house.cliente;

                  return (
                    <tr key={house.id} className="hover:bg-slate-800/10 transition">
                      {/* Casa */}
                      <td className="py-4 px-5">
                        <div>
                          <p className="font-bold text-white">Qd {house.quadra}, Casa {house.numero}</p>
                          <span className="text-xs text-slate-400">{house.empreendimento.nome}</span>
                        </div>
                      </td>

                      {/* Cliente */}
                      <td className="py-4 px-5">
                        {client ? (
                          <div>
                            <p className="font-medium text-white">{client.nome}</p>
                            <span className="text-xs text-slate-500">CPF: {client.cpf}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                            <UserMinus size={14} /> Unidade em Estoque
                          </div>
                        )}
                      </td>

                      {/* Renda */}
                      <td className="py-4 px-5 font-mono">
                        {client ? formatCurrency(client.rendaComprovada) : '—'}
                      </td>

                      {/* Status de Crédito */}
                      <td className="py-4 px-5">
                        {client ? (
                          <div className="space-y-1.5">
                            {getStatusBadge(client.statusCredito)}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500 font-semibold bg-slate-500/10 border border-slate-500/10 px-2.5 py-1 rounded-full w-fit block">
                            Disponível
                          </span>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          {client ? (
                            <select
                              value={client.statusCredito}
                              disabled={updatingId === client.id}
                              onChange={(e) => handleStatusChange(client.id, e.target.value)}
                              className="bg-[#0f1422] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500/50"
                            >
                              <option value="DOCUMENTACAO_PENDENTE">Pendente</option>
                              <option value="EM_ANALISE_CAIXA">Em Análise</option>
                              <option value="APROVADO_CONDICIONADO">Aprovado Condic.</option>
                              <option value="APROVADO">Aprovado</option>
                            </select>
                          ) : (
                            <span className="text-xs text-slate-500">Nenhum vínculo</span>
                          )}

                          <Link 
                            href={`/casas/${house.id}`}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition border border-slate-700/50"
                            title="Ver detalhes da obra"
                          >
                            <Eye size={14} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
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
                  className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50"
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
                  className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50 font-mono"
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
                  className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50 font-mono"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1.5 font-medium">Status de Crédito Inicial</label>
                <select
                  value={newClientCredit}
                  onChange={(e) => setNewClientCredit(e.target.value)}
                  className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500/50"
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
                  className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500/50"
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
    </div>
  );
}
