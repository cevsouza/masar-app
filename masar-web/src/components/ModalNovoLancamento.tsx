'use client';

import { useState, useEffect } from 'react';
import { 
  X, 
  DollarSign, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Building2, 
  Home, 
  Info,
  Calendar,
  AlertTriangle
} from 'lucide-react';

interface ModalNovoLancamentoProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  // Pre-fill parameters
  defaultEmpreendimentoId?: string;
  defaultCasaId?: string;
}

export default function ModalNovoLancamento({
  isOpen,
  onClose,
  onSuccess,
  defaultEmpreendimentoId,
  defaultCasaId
}: ModalNovoLancamentoProps) {
  const [step, setStep] = useState(1);
  const [loadingData, setLoadingData] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Dropdowns lists
  const [empreendimentos, setEmpreendimentos] = useState<any[]>([]);
  const [casas, setCasas] = useState<any[]>([]);
  const [insumos, setInsumos] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);

  // Form states
  const [natureza, setNatureza] = useState<'RECEITA' | 'DESPESA'>('DESPESA');
  const [empreendimentoId, setEmpreendimentoId] = useState('');
  const [destino, setDestino] = useState<'GLOBAL' | 'CASA'>('CASA');
  const [casaId, setCasaId] = useState('');
  
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [dataVencimento, setDataVencimento] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<'PENDENTE' | 'PAGO'>('PAGO');
  const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().split('T')[0]);
  const [categoria, setCategoria] = useState('');
  
  // Optional associations
  const [insumoId, setInsumoId] = useState('');
  const [quantidade, setQuantidade] = useState('1');
  const [clienteId, setClienteId] = useState('');

  // Load dropdown lists on mount
  useEffect(() => {
    if (!isOpen) return;
    
    // Reset wizard
    setStep(1);
    setErrorMsg(null);

    const loadInitialData = async () => {
      setLoadingData(true);
      try {
        const [resEmp, resInsumos, resClientes] = await Promise.all([
          fetch('/api/empreendimentos').then(r => r.json()),
          fetch('/api/insumos').then(r => r.json()),
          fetch('/api/clientes').then(r => r.json())
        ]);
        
        setEmpreendimentos(resEmp || []);
        setInsumos(resInsumos || []);
        setClientes(resClientes || []);

        // Apply default values from context
        if (defaultEmpreendimentoId) {
          setEmpreendimentoId(defaultEmpreendimentoId);
        } else if (resEmp && resEmp.length > 0) {
          setEmpreendimentoId(resEmp[0].id);
        }

        if (defaultCasaId) {
          setCasaId(defaultCasaId);
          setDestino('CASA');
        } else {
          setDestino('CASA');
        }
      } catch (err) {
        console.error('Erro ao carregar dados do modal:', err);
      } finally {
        setLoadingData(false);
      }
    };

    loadInitialData();
  }, [isOpen, defaultEmpreendimentoId, defaultCasaId]);

  // Load houses when empreendimento changes
  useEffect(() => {
    if (!empreendimentoId) return;
    
    const loadHouses = async () => {
      try {
        const res = await fetch(`/api/empreendimentos/${empreendimentoId}`).then(r => r.json());
        setCasas(res.casas || []);
        if (defaultCasaId) {
          setCasaId(defaultCasaId);
        } else if (res.casas && res.casas.length > 0) {
          setCasaId(res.casas[0].id);
        } else {
          setCasaId('');
        }
      } catch (err) {
        console.error('Erro ao carregar lotes do projeto:', err);
      }
    };

    loadHouses();
  }, [empreendimentoId, defaultCasaId]);

  // Set default category when nature changes
  useEffect(() => {
    if (natureza === 'RECEITA') {
      setCategoria('MEDICAO_CAIXA');
    } else {
      setCategoria('MATERIAL');
    }
  }, [natureza]);

  const handleNextStep = () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      if (!empreendimentoId) {
        setErrorMsg('Por favor, selecione um empreendimento.');
        return;
      }
      if (destino === 'CASA' && !casaId) {
        setErrorMsg('Por favor, selecione uma casa.');
        return;
      }
      setErrorMsg(null);
      setStep(3);
    }
  };

  const handlePrevStep = () => {
    setStep(prev => Math.max(1, prev - 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricao || !valor || !categoria) {
      setErrorMsg('Por favor, preencha a descrição, valor e categoria.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    // Build the payload
    const payload = {
      descricao,
      valor: parseFloat(valor),
      dataVencimento: new Date(dataVencimento),
      dataPagamento: status === 'PAGO' ? new Date(dataPagamento) : null,
      natureza,
      status: status === 'PAGO' ? 'PAGO' : 'PENDENTE',
      categoria,
      empreendimentoId,
      casaId: destino === 'CASA' ? casaId : null,
      clienteId: (natureza === 'RECEITA' && clienteId) ? clienteId : null,
      insumoId: (natureza === 'DESPESA' && (categoria === 'MATERIAL' || categoria === 'MAO_DE_OBRA') && insumoId) ? insumoId : null,
      quantidade: (natureza === 'DESPESA' && quantidade) ? parseFloat(quantidade) : 1
    };

    try {
      // Determine target API endpoint
      let url = `/api/empreendimentos/${empreendimentoId}/custos-globais`; // Fallback for global
      if (destino === 'CASA') {
        url = `/api/casas/${casaId}/apropriacoes`; // House costs/receivables route
      }

      // However, we can also POST to a unified general endpoint or create one!
      // Let's create a unified API POST route `/api/financeiro/transacoes` or direct to db using server actions if preferred.
      // Wait, let's check if we can direct post to `/api/financeiro/transacoes`. Let's build a unified endpoint!
      // This is extremely clean and avoids splitting routes.
      const res = await fetch('/api/financeiro/transacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao registrar lançamento.');
      }

      // Success
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Erro ao salvar lançamento:', err);
      setErrorMsg(err.message || 'Erro de conexão com o servidor.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#0d121f] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl transition-all duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800/60 bg-[#0f1525]">
          <div>
            <h3 className="font-semibold text-slate-100 flex items-center gap-2">
              <DollarSign size={18} className="text-emerald-500" />
              Lançamento Financeiro Universal
            </h3>
            <p className="text-[10px] text-slate-400">Padrão Single Ledger - Simplificação Extrema</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-200 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {errorMsg && (
            <div className="p-3 mb-4 bg-red-950/40 border border-red-800/50 rounded-2xl flex items-center gap-2 text-xs text-red-400">
              <AlertTriangle size={14} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {loadingData ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-xs">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mb-3"></div>
              Carregando formulário e catálogos...
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* STEP 1: NATUREZA (Dinheiro Entrando vs Saindo) */}
              {step === 1 && (
                <div className="space-y-4 animate-fadeIn">
                  <span className="text-[10px] text-indigo-400 uppercase tracking-widest font-bold block mb-1">Passo 1: Tipo da Transação</span>
                  <p className="text-xs text-slate-400">Selecione o fluxo do recurso financeiro no livro-caixa:</p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setNatureza('RECEITA')}
                      className={`p-6 rounded-2xl border flex flex-col items-center text-center gap-3 transition cursor-pointer ${
                        natureza === 'RECEITA'
                          ? 'bg-emerald-950/20 border-emerald-500/80 text-emerald-400 ring-2 ring-emerald-500/10'
                          : 'bg-[#090d16] border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-300'
                      }`}
                    >
                      <div className={`p-3 rounded-xl ${natureza === 'RECEITA' ? 'bg-emerald-500/10' : 'bg-slate-800/30'}`}>
                        <DollarSign size={24} className={natureza === 'RECEITA' ? 'text-emerald-400' : 'text-slate-400'} />
                      </div>
                      <div>
                        <span className="font-semibold text-sm block">Dinheiro Entrando</span>
                        <span className="text-[10px] opacity-75">Receita (VGV, Medição CEF, etc.)</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNatureza('DESPESA')}
                      className={`p-6 rounded-2xl border flex flex-col items-center text-center gap-3 transition cursor-pointer ${
                        natureza === 'DESPESA'
                          ? 'bg-red-950/20 border-red-500/80 text-red-400 ring-2 ring-red-500/10'
                          : 'bg-[#090d16] border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-300'
                      }`}
                    >
                      <div className={`p-3 rounded-xl ${natureza === 'DESPESA' ? 'bg-red-500/10' : 'bg-slate-800/30'}`}>
                        <DollarSign size={24} className={natureza === 'DESPESA' ? 'text-red-400' : 'text-slate-400'} />
                      </div>
                      <div>
                        <span className="font-semibold text-sm block">Dinheiro Saindo</span>
                        <span className="text-[10px] opacity-75">Despesa (Material, Equipe, Terreno)</span>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: CONTEXTO/DESTINO (Empreendimento vs Casa) */}
              {step === 2 && (
                <div className="space-y-4 animate-fadeIn">
                  <span className="text-[10px] text-indigo-400 uppercase tracking-widest font-bold block mb-1">Passo 2: Destino do Recurso</span>
                  
                  <div className="space-y-3">
                    <label className="text-xs text-slate-400 font-medium block">Empreendimento de Vínculo</label>
                    <select
                      value={empreendimentoId}
                      onChange={(e) => setEmpreendimentoId(e.target.value)}
                      className="w-full bg-[#070a13] border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50"
                    >
                      <option value="">Selecione o Projeto...</option>
                      {empreendimentos.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.nome}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-3 pt-1">
                    <label className="text-xs text-slate-400 font-medium block">Onde está ocorrendo este fluxo?</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setDestino('GLOBAL')}
                        className={`p-4 rounded-xl border flex items-center gap-3 transition cursor-pointer text-left ${
                          destino === 'GLOBAL'
                            ? 'bg-[#151c30] border-emerald-500/60 text-slate-200'
                            : 'bg-[#070a13] border-slate-800/80 hover:border-slate-700 text-slate-400'
                        }`}
                      >
                        <Building2 size={16} className={destino === 'GLOBAL' ? 'text-emerald-400' : 'text-slate-500'} />
                        <div>
                          <span className="font-medium text-xs block">Custo Global</span>
                          <span className="text-[9px] opacity-75">Terreno/Marketing/Projetos</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDestino('CASA')}
                        className={`p-4 rounded-xl border flex items-center gap-3 transition cursor-pointer text-left ${
                          destino === 'CASA'
                            ? 'bg-[#151c30] border-emerald-500/60 text-slate-200'
                            : 'bg-[#070a13] border-slate-800/80 hover:border-slate-700 text-slate-400'
                        }`}
                      >
                        <Home size={16} className={destino === 'CASA' ? 'text-emerald-400' : 'text-slate-500'} />
                        <div>
                          <span className="font-medium text-xs block">Casa/Lote</span>
                          <span className="text-[9px] opacity-75">Material ou Mão de Obra Lote</span>
                        </div>
                      </button>
                    </div>
                  </div>

                  {destino === 'CASA' && (
                    <div className="space-y-3 pt-1 animate-fadeIn">
                      <label className="text-xs text-slate-400 font-medium block">Selecione a Casa/Unidade</label>
                      <select
                        value={casaId}
                        onChange={(e) => setCasaId(e.target.value)}
                        className="w-full bg-[#070a13] border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50"
                      >
                        <option value="">Selecione o Lote...</option>
                        {casas.map(c => (
                          <option key={c.id} value={c.id}>Qd {c.quadra}, Casa {c.numero} (Cliente: {c.cliente?.nome || 'Livre'})</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: DETALHES DA TRANSAÇÃO */}
              {step === 3 && (
                <div className="space-y-4 animate-fadeIn max-h-[420px] overflow-y-auto pr-1">
                  <span className="text-[10px] text-indigo-400 uppercase tracking-widest font-bold block mb-1">Passo 3: Detalhes do Lançamento</span>
                  
                  {/* Descricao & Valor */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2 space-y-1.5">
                      <label className="text-xs text-slate-400 font-medium block">Descrição / Histórico</label>
                      <input
                        type="text"
                        placeholder="Ex: Compra de Cimento CP-II"
                        required
                        value={descricao}
                        onChange={(e) => setDescricao(e.target.value)}
                        className="w-full bg-[#070a13] border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-400 font-medium block">Valor (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        required
                        value={valor}
                        onChange={(e) => setValor(e.target.value)}
                        className="w-full bg-[#070a13] border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50 font-mono"
                      />
                    </div>
                  </div>

                  {/* Categoria */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 font-medium block">Categoria Financeira</label>
                    <select
                      value={categoria}
                      onChange={(e) => setCategoria(e.target.value)}
                      className="w-full bg-[#070a13] border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-emerald-500/50"
                    >
                      {natureza === 'RECEITA' ? (
                        <>
                          <option value="MEDICAO_CAIXA">Repasse/Medição CEF</option>
                          <option value="ENTRADA_CLIENTE">Entrada/Parcela Cliente</option>
                        </>
                      ) : (
                        <>
                          <option value="MATERIAL">Materiais Obra</option>
                          <option value="MAO_DE_OBRA">Mão de Obra / Empreiteiro</option>
                          <option value="TERRENO">Aquisição de Terreno (Global)</option>
                          <option value="PROJETOS">Projetos & Licenciamentos (Global)</option>
                          <option value="IMPOSTOS">Tributos e Impostos (RET)</option>
                        </>
                      )}
                    </select>
                  </div>

                  {/* Condicionais Insumo (Despesa Obra) ou Cliente (Receita) */}
                  {natureza === 'DESPESA' && (categoria === 'MATERIAL' || categoria === 'MAO_DE_OBRA') && (
                    <div className="grid grid-cols-3 gap-3 p-3 bg-[#070a13]/55 border border-slate-800/80 rounded-2xl animate-fadeIn">
                      <div className="col-span-2 space-y-1.5">
                        <label className="text-[10px] text-slate-450 uppercase font-semibold">Vincular Insumo do Catálogo</label>
                        <select
                          value={insumoId}
                          onChange={(e) => setInsumoId(e.target.value)}
                          className="w-full bg-[#0d121f] border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500/50"
                        >
                          <option value="">Selecione o Insumo...</option>
                          {insumos
                            .filter(ins => ins.categoria === categoria)
                            .map(ins => (
                              <option key={ins.id} value={ins.id}>{ins.nome} ({ins.unidadeMedida})</option>
                            ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-slate-450 uppercase font-semibold">Qtd Real</label>
                        <input
                          type="number"
                          step="0.01"
                          value={quantidade}
                          onChange={(e) => setQuantidade(e.target.value)}
                          className="w-full bg-[#0d121f] border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-slate-200 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {natureza === 'RECEITA' && categoria === 'ENTRADA_CLIENTE' && (
                    <div className="p-3 bg-[#070a13]/55 border border-slate-800/80 rounded-2xl animate-fadeIn space-y-1.5">
                      <label className="text-[10px] text-slate-450 uppercase font-semibold block">Vincular ao Cliente Pagador</label>
                      <select
                        value={clienteId}
                        onChange={(e) => setClienteId(e.target.value)}
                        className="w-full bg-[#0d121f] border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-slate-300 focus:outline-none"
                      >
                        <option value="">Selecione o Cliente...</option>
                        {clientes.map(cli => (
                          <option key={cli.id} value={cli.id}>{cli.nome} ({cli.cpf})</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Status, Vencimento & Pagamento */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-400 font-medium block">Vencimento</label>
                      <div className="relative">
                        <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="date"
                          value={dataVencimento}
                          onChange={(e) => setDataVencimento(e.target.value)}
                          className="w-full bg-[#070a13] border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-200 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-400 font-medium block">Situação</label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as 'PENDENTE' | 'PAGO')}
                        className="w-full bg-[#070a13] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                      >
                        <option value="PAGO">Pago / Efetivado</option>
                        <option value="PENDENTE">Aguardando / Pendente</option>
                      </select>
                    </div>
                  </div>

                  {status === 'PAGO' && (
                    <div className="space-y-1.5 animate-fadeIn">
                      <label className="text-xs text-slate-400 font-medium block">Data da Efetivação / Pagamento</label>
                      <div className="relative">
                        <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="date"
                          value={dataPagamento}
                          onChange={(e) => setDataPagamento(e.target.value)}
                          className="w-full bg-[#070a13] border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-200 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* Informação sobre impactos de Caixa */}
                  <div className="p-2.5 bg-slate-900/40 border border-slate-800 rounded-xl flex items-start gap-2 text-[10px] text-slate-400">
                    <Info size={14} className="text-indigo-400 shrink-0 mt-0.5" />
                    <span>Lançamentos "Efetivados" impactam o caixa livre imediatamente. Lançamentos "Pendentes" constam como previstos no fluxo de caixa preditivo de 10 meses.</span>
                  </div>

                </div>
              )}

              {/* Footer Controls */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800/60 mt-4">
                <div>
                  {step > 1 && (
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      className="px-4 py-2 border border-slate-800 text-slate-350 hover:text-slate-200 rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5"
                    >
                      <ArrowLeft size={12} />
                      Voltar
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {step < 3 ? (
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="px-5 py-2.5 bg-indigo-650 hover:bg-indigo-600 text-white rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                    >
                      Avançar
                      <ArrowRight size={12} />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-6 py-2.5 bg-emerald-650 hover:bg-emerald-600 disabled:opacity-40 text-white rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                    >
                      {submitting ? 'Salvando...' : 'Confirmar Lançamento'}
                      <Check size={12} />
                    </button>
                  )}
                </div>
              </div>

            </form>
          )}
        </div>

      </div>
    </div>
  );
}
