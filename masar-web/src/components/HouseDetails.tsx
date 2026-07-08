'use client';

import { useState } from 'react';
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
  FileSpreadsheet
} from 'lucide-react';

interface Client {
  id: string;
  nome: string;
  cpf: string;
  statusCredito: string;
}

interface Medicao {
  id: string;
  percentualMedido: number;
  valorLiberado: number;
  status: string;
  dataMedicao: string;
}

interface House {
  id: string;
  numero: string;
  quadra: string;
  statusObra: string;
  percentualObra: number;
  prazoFisico?: string | null;
  prazoFinanceiro?: string | null;
  obstaculos?: string | null;
  empreendimento: {
    id: string;
    nome: string;
  };
  cliente: Client | null;
  medicoes: Medicao[];
}

const STAGES = [
  { id: 'SEM_INICIO', label: 'Sem Início' },
  { id: 'FUNDACAO', label: 'Fundação' },
  { id: 'ALVENARIA', label: 'Alvenaria' },
  { id: 'COBERTURA', label: 'Cobertura' },
  { id: 'ACABAMENTO', label: 'Acabamento' },
  { id: 'CONCLUIDA', label: 'Concluída' },
];

export default function HouseDetails({ initialCasa }: { initialCasa: House }) {
  const router = useRouter();
  
  // Physical form state
  const [statusObra, setStatusObra] = useState(initialCasa.statusObra);
  const [percentualObra, setPercentualObra] = useState(initialCasa.percentualObra);
  const [prazoFisico, setPrazoFisico] = useState(initialCasa.prazoFisico ? initialCasa.prazoFisico.split('T')[0] : '');
  const [prazoFinanceiro, setPrazoFinanceiro] = useState(initialCasa.prazoFinanceiro ? initialCasa.prazoFinanceiro.split('T')[0] : '');
  const [obstaculos, setObstaculos] = useState(initialCasa.obstaculos || '');
  const [isUpdatingObra, setIsUpdatingObra] = useState(false);

  // Financial form state
  const [percentualMedido, setPercentualMedido] = useState('');
  const [valorLiberado, setValorLiberado] = useState('');
  const [statusMedicao, setStatusMedicao] = useState('AGUARDANDO');
  const [checkSondagem, setCheckSondagem] = useState(false);
  const [checkEpis, setCheckEpis] = useState(false);
  const [checkMateriais, setCheckMateriais] = useState(false);
  const [isCreatingMedicao, setIsCreatingMedicao] = useState(false);

  // Status updating state
  const [updatingMedicaoId, setUpdatingMedicaoId] = useState<string | null>(null);

  // Actions
  const handleUpdateObra = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingObra(true);
    try {
      const response = await fetch(`/api/casas/${initialCasa.id}/evolucao`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          statusObra,
          percentualObra,
          prazoFisico: prazoFisico || null,
          prazoFinanceiro: prazoFinanceiro || null,
          obstaculos: obstaculos || null,
        }),
      });

      if (!response.ok) throw new Error('Falha ao atualizar obra');
      
      router.refresh();
      alert('Evolução física da obra e cronogramas salvos!');
    } catch (err) {
      console.error(err);
      alert('Erro ao atualizar obra.');
    } finally {
      setIsUpdatingObra(false);
    }
  };

  const handleCreateMedicao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!percentualMedido || !valorLiberado) {
      alert('Preencha todos os campos da medição.');
      return;
    }
    if (!checkSondagem || !checkEpis || !checkMateriais) {
      alert('Certifique todos os itens de segurança da obra antes de registrar.');
      return;
    }
    
    setIsCreatingMedicao(true);
    try {
      const response = await fetch(`/api/casas/${initialCasa.id}/medicoes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          percentualMedido,
          valorLiberado,
          status: statusMedicao,
          checklistSeguranca: {
            sondagemSolo: checkSondagem,
            episObra: checkEpis,
            materiaisConforme: checkMateriais
          }
        }),
      });

      if (!response.ok) throw new Error('Falha ao criar medição');
      
      setPercentualMedido('');
      setValorLiberado('');
      setStatusMedicao('AGUARDANDO');
      setCheckSondagem(false);
      setCheckEpis(false);
      setCheckMateriais(false);
      router.refresh();
      alert('Medição cadastrada com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao registrar medição.');
    } finally {
      setIsCreatingMedicao(false);
    }
  };

  const handleUpdateMedicaoStatus = async (medicaoId: string, newStatus: string) => {
    setUpdatingMedicaoId(medicaoId);
    try {
      const response = await fetch(`/api/medicoes/${medicaoId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error('Falha ao alterar status da medição');
      
      router.refresh();
    } catch (err) {
      console.error(err);
      alert('Erro ao alterar status da medição.');
    } finally {
      setUpdatingMedicaoId(null);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  // Determine timeline indexing
  const currentStageIndex = STAGES.findIndex(s => s.id === initialCasa.statusObra);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAGA':
        return (
          <span className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md font-semibold">
            <CheckCircle2 size={12} /> Paga
          </span>
        );
      case 'AGUARDANDO':
        return (
          <span className="flex items-center gap-1 text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md font-semibold font-sans">
            <Clock size={12} /> Aguardando
          </span>
        );
      case 'GLOSADA_REPROVADA':
        return (
          <span className="flex items-center gap-1 text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-md font-semibold animate-pulse">
            <XCircle size={12} /> Glosada
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Pitfall alert banner */}
      {initialCasa.obstaculos && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-start gap-3 animate-pulse">
          <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={18} />
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider">Atenção: Impedimento / Gargalo (Pitfall) Detectado</h4>
            <p className="text-xs text-red-200/90 mt-1 leading-relaxed">{initialCasa.obstaculos}</p>
          </div>
        </div>
      )}
      {/* Header Info */}
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
        </div>

        {/* Adquirente card */}
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

      {/* Main Side-by-Side Management */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Físico - Linha do Tempo */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glassmorphism p-5 rounded-2xl border border-slate-800/60">
            <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Hammer size={18} className="text-indigo-400" /> Evolução Física da Obra
            </h2>

            {/* Deadlines Box */}
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

            {/* Visual Progress Bar */}
            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 font-medium">Progresso Físico Real</span>
                <span className="font-bold text-indigo-400 font-mono">{initialCasa.percentualObra}%</span>
              </div>
              <div className="w-full bg-[#0f1422] h-2.5 rounded-full overflow-hidden border border-slate-800">
                <div 
                  className="bg-indigo-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${initialCasa.percentualObra}%` }}
                />
              </div>
            </div>

            {/* Vertical Timeline */}
            <div className="relative pl-6 border-l border-slate-800 space-y-6 ml-2 my-4">
              {STAGES.map((stage, idx) => {
                const isPassed = idx < currentStageIndex;
                const isCurrent = idx === currentStageIndex;
                const isFuture = idx > currentStageIndex;

                return (
                  <div key={stage.id} className="relative">
                    {/* Circle Pin */}
                    <span className={`absolute -left-9 top-1 w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${
                      isPassed 
                        ? 'bg-emerald-950 border-emerald-500 text-emerald-400' 
                        : isCurrent 
                        ? 'bg-indigo-950 border-indigo-500 text-indigo-400 animate-pulse' 
                        : 'bg-[#0f1422] border-slate-800 text-slate-500'
                    }`}>
                      {isPassed ? '✓' : idx + 1}
                    </span>

                    <div>
                      <h4 className={`text-sm font-bold leading-none ${isCurrent ? 'text-indigo-400' : isFuture ? 'text-slate-500' : 'text-slate-300'}`}>
                        {stage.label}
                      </h4>
                      {isCurrent && (
                        <span className="text-[10px] text-slate-400 mt-1 block">Estágio Atual da Construção</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form to Update Physical Stage */}
          <div className="glassmorphism p-5 rounded-2xl border border-slate-800/60">
            <h3 className="text-sm font-bold text-white mb-4">Atualizar Evolução Física</h3>
            <form onSubmit={handleUpdateObra} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1.5 font-medium">Estágio da Obra</label>
                <select
                  value={statusObra}
                  onChange={(e) => setStatusObra(e.target.value)}
                  className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-indigo-500/50"
                >
                  {STAGES.map(s => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1.5 font-medium">Percentual Concluído (%)</label>
                <div className="relative">
                  <Percent size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={percentualObra}
                    onChange={(e) => setPercentualObra(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#0f1422] border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1.5 font-medium">Prazo Físico de Entrega</label>
                <input
                  type="date"
                  value={prazoFisico}
                  onChange={(e) => setPrazoFisico(e.target.value)}
                  className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1.5 font-medium">Prazo Financeiro Liberação CEF</label>
                <input
                  type="date"
                  value={prazoFinanceiro}
                  onChange={(e) => setPrazoFinanceiro(e.target.value)}
                  className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1.5 font-medium">Obstáculos / Impedimentos (Pitfalls)</label>
                <textarea
                  placeholder="Ex: Atraso na liberação da prefeitura..."
                  value={obstaculos}
                  onChange={(e) => setObstaculos(e.target.value)}
                  rows={2}
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

        {/* Right Column: Financeiro - Medições Caixa */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Tabela de Medições da Caixa */}
          <div className="glassmorphism p-5 rounded-2xl border border-slate-800/60">
            <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <FileSpreadsheet size={18} className="text-amber-400" /> Controle de Medição CEF
            </h2>

            {/* Sum metrics */}
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div className="p-3 bg-[#0f1422] rounded-xl border border-slate-800">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Total Pago pela Caixa</p>
                <p className="text-base font-bold text-emerald-400 font-mono mt-1">
                  {formatCurrency(initialCasa.medicoes.filter(m => m.status === 'PAGA').reduce((acc, curr) => acc + curr.valorLiberado, 0))}
                </p>
              </div>
              <div className="p-3 bg-[#0f1422] rounded-xl border border-slate-800">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Total Pendente / Retido</p>
                <p className="text-base font-bold text-amber-400 font-mono mt-1">
                  {formatCurrency(initialCasa.medicoes.filter(m => m.status !== 'PAGA').reduce((acc, curr) => acc + curr.valorLiberado, 0))}
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
                    initialCasa.medicoes.map((med) => (
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

          {/* Form to Log New Measurement */}
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

              {/* Checklist de Segurança Mandatório */}
              <div className="md:col-span-2 bg-[#0b0f19]/80 border border-slate-800 rounded-xl p-3.5 space-y-2 mt-2">
                <p className="text-[10px] text-amber-500 uppercase tracking-wider font-bold mb-1 flex items-center gap-1.5">
                  <AlertTriangle size={12} /> Checklist Mandatório de Vistoria
                </p>
                <label className="flex items-start gap-2.5 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checkSondagem}
                    onChange={(e) => setCheckSondagem(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>A sondagem do solo deste lote foi validada e está em conformidade?</span>
                </label>
                <label className="flex items-start gap-2.5 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checkEpis}
                    onChange={(e) => setCheckEpis(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>Todos os operários em campo utilizam os EPIs regulamentares?</span>
                </label>
                <label className="flex items-start gap-2.5 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checkMateriais}
                    onChange={(e) => setCheckMateriais(e.target.checked)}
                    className="mt-0.5"
                  />
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
    </div>
  );
}
