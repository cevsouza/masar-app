'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Sun, 
  CloudRain, 
  XCircle, 
  AlertTriangle, 
  CheckCircle2, 
  DollarSign, 
  Hammer, 
  Lightbulb, 
  Droplet, 
  FileText,
  Activity
} from 'lucide-react';

interface Insumo {
  id: string;
  nome: string;
  unidadeMedida: string;
  categoria: string;
}

interface Infra {
  padraoEnergiaInstalado: boolean;
  ligacaoAguaConcluida: boolean;
  fossaFiltroEsgotoConcluido: boolean;
  numeroMedidorLuz: string | null;
  numeroMedidorAgua: string | null;
}

interface Casa {
  id: string;
  numero: string;
  quadra: string;
  empreendimento: {
    nome: string;
  };
  statusObra: string;
  percentualObra: number;
  infraestrutura: Infra | null;
}

interface CanteiroFormProps {
  initialCasas: Casa[];
  initialInsumos: Insumo[];
}

export default function CanteiroForm({ initialCasas, initialInsumos }: CanteiroFormProps) {
  const router = useRouter();
  const [selectedCasaId, setSelectedCasaId] = useState('');

  // 1. Diario de Obra states
  const [clima, setClima] = useState<'BOM' | 'CHUVA' | 'IMPRATICAVEL'>('BOM');
  const [efetivoTrabalhadores, setEfetivoTrabalhadores] = useState('');
  const [atividadesExecutadas, setAtividadesExecutadas] = useState('');
  const [ocorrencias, setOcorrencias] = useState('');
  const [isSubmittingDiario, setIsSubmittingDiario] = useState(false);

  // 2. Infraestrutura states
  const [infraEnergia, setInfraEnergia] = useState(false);
  const [infraAgua, setInfraAgua] = useState(false);
  const [infraEsgoto, setInfraEsgoto] = useState(false);
  const [medidorLuz, setMedidorLuz] = useState('');
  const [medidorAgua, setMedidorAgua] = useState('');
  const [isSubmittingInfra, setIsSubmittingInfra] = useState(false);

  // 3. Apropriacao (Cost logging) states
  const [selectedInsumoId, setSelectedInsumoId] = useState('');
  const [quantidadeReal, setQuantidadeReal] = useState('');
  const [custoTotal, setCustoTotal] = useState('');
  const [isSubmittingApropriacao, setIsSubmittingApropriacao] = useState(false);
  const [apropriacaoFeedback, setApropriacaoFeedback] = useState<{ type: 'success' | 'warning' | 'error'; message: string } | null>(null);

  // Sync infra states when casa selection changes
  useEffect(() => {
    if (!selectedCasaId) return;
    const casa = initialCasas.find(c => c.id === selectedCasaId);
    if (casa && casa.infraestrutura) {
      setInfraEnergia(casa.infraestrutura.padraoEnergiaInstalado);
      setInfraAgua(casa.infraestrutura.ligacaoAguaConcluida);
      setInfraEsgoto(casa.infraestrutura.fossaFiltroEsgotoConcluido);
      setMedidorLuz(casa.infraestrutura.numeroMedidorLuz || '');
      setMedidorAgua(casa.infraestrutura.numeroMedidorAgua || '');
    } else {
      setInfraEnergia(false);
      setInfraAgua(false);
      setInfraEsgoto(false);
      setMedidorLuz('');
      setMedidorAgua('');
    }
    setApropriacaoFeedback(null);
  }, [selectedCasaId, initialCasas]);

  const activeCasa = initialCasas.find(c => c.id === selectedCasaId);

  const handleSaveDiario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCasaId) {
      alert('Selecione uma casa/unidade primeiro.');
      return;
    }
    if (!efetivoTrabalhadores || !atividadesExecutadas) {
      alert('Efetivo e atividades executadas são obrigatórios.');
      return;
    }

    setIsSubmittingDiario(true);
    try {
      const response = await fetch(`/api/casas/${selectedCasaId}/diarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clima,
          efetivoTrabalhadores: parseInt(efetivoTrabalhadores),
          atividadesExecutadas,
          ocorrencias,
        })
      });

      if (!response.ok) throw new Error('Erro ao salvar diário');
      
      setEfetivoTrabalhadores('');
      setAtividadesExecutadas('');
      setOcorrencias('');
      alert('Diário de Obra registrado com sucesso!');
      router.refresh();
    } catch (err) {
      console.error(err);
      alert('Erro ao registrar diário.');
    } finally {
      setIsSubmittingDiario(false);
    }
  };

  const handleSaveInfra = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCasaId) {
      alert('Selecione uma casa/unidade primeiro.');
      return;
    }

    setIsSubmittingInfra(true);
    try {
      const response = await fetch(`/api/casas/${selectedCasaId}/infra`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          padraoEnergiaInstalado: infraEnergia,
          ligacaoAguaConcluida: infraAgua,
          fossaFiltroEsgotoConcluido: infraEsgoto,
          numeroMedidorLuz: medidorLuz,
          numeroMedidorAgua: medidorAgua
        })
      });

      if (!response.ok) throw new Error('Erro ao salvar utilidades');
      alert('Infraestrutura de ligações atualizada!');
      router.refresh();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar infraestrutura.');
    } finally {
      setIsSubmittingInfra(false);
    }
  };

  const handleSaveApropriacao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCasaId || !selectedInsumoId || !quantidadeReal || !custoTotal) {
      alert('Preencha todos os campos do custo.');
      return;
    }

    setIsSubmittingApropriacao(true);
    setApropriacaoFeedback(null);
    try {
      const response = await fetch(`/api/casas/${selectedCasaId}/apropriacoes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          insumoId: selectedInsumoId,
          quantidadeReal: parseFloat(quantidadeReal),
          custoTotal: parseFloat(custoTotal)
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setApropriacaoFeedback({
          type: 'error',
          message: data.error || 'Erro ao lançar custo.'
        });
        return;
      }

      if (data.warning === 'OVERBUDGET_DETECTION') {
        setApropriacaoFeedback({
          type: 'warning',
          message: '⚠️ Alerta de Estouro: Esta despesa excedeu o orçamento previsto para este insumo e ficará pendente de liberação do sócio.'
        });
      } else {
        setApropriacaoFeedback({
          type: 'success',
          message: '✓ Custo apropriado e debitado no orçamento com sucesso!'
        });
      }

      setQuantidadeReal('');
      setCustoTotal('');
      setSelectedInsumoId('');
      router.refresh();
    } catch (err) {
      console.error(err);
      setApropriacaoFeedback({ type: 'error', message: 'Erro de comunicação com o servidor.' });
    } finally {
      setIsSubmittingApropriacao(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Casa Dropdown Select */}
      <div className="glassmorphism p-5 rounded-2xl border border-slate-800 shadow-lg">
        <label className="text-xs text-slate-400 block mb-2 font-bold uppercase tracking-wider">Selecionar Unidade (Casa)</label>
        <select
          value={selectedCasaId}
          onChange={(e) => setSelectedCasaId(e.target.value)}
          className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50"
        >
          <option value="">-- Escolha uma Casa Ativa --</option>
          {initialCasas.map(casa => (
            <option key={casa.id} value={casa.id}>
              Qd {casa.quadra}, Casa {casa.numero} ({casa.empreendimento.nome})
            </option>
          ))}
        </select>
        {activeCasa && (
          <div className="mt-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-3">
            <div className="flex justify-between items-center text-xs font-bold font-sans text-slate-300">
              <span className="flex items-center gap-1">
                <Activity size={12} className="text-indigo-400" /> Painel de Progresso Físico
              </span>
              <span className="text-indigo-400 uppercase text-[10px]">
                {activeCasa.statusObra.replace('_', ' ')}
              </span>
            </div>

            {/* Progress bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-slate-450 font-semibold">
                <span className="text-slate-400">Evolução Física</span>
                <span className="font-bold text-slate-200">{activeCasa.percentualObra || 0}%</span>
              </div>
              <div className="w-full bg-[#0f1422] h-2 rounded-full overflow-hidden border border-slate-800">
                <div 
                  className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${activeCasa.percentualObra || 0}%` }}
                />
              </div>
            </div>

            {/* Checklist de Utilidades / Ligações */}
            <div className="grid grid-cols-3 gap-2 text-center text-[9px] pt-1">
              <div className={`p-1.5 rounded-lg border ${
                activeCasa.infraestrutura?.padraoEnergiaInstalado 
                  ? 'bg-emerald-950/20 border-emerald-500/10 text-emerald-400' 
                  : 'bg-slate-950/30 border-slate-850 text-slate-500 font-medium'
              }`}>
                Energia: {activeCasa.infraestrutura?.padraoEnergiaInstalado ? 'Instalado' : 'Pendente'}
              </div>
              <div className={`p-1.5 rounded-lg border ${
                activeCasa.infraestrutura?.ligacaoAguaConcluida 
                  ? 'bg-emerald-950/20 border-emerald-500/10 text-emerald-400' 
                  : 'bg-slate-950/30 border-slate-850 text-slate-500 font-medium'
              }`}>
                Água: {activeCasa.infraestrutura?.ligacaoAguaConcluida ? 'Concluída' : 'Pendente'}
              </div>
              <div className={`p-1.5 rounded-lg border ${
                activeCasa.infraestrutura?.fossaFiltroEsgotoConcluido 
                  ? 'bg-emerald-950/20 border-emerald-500/10 text-emerald-400' 
                  : 'bg-slate-950/30 border-slate-850 text-slate-500 font-medium'
              }`}>
                Esgoto: {activeCasa.infraestrutura?.fossaFiltroEsgotoConcluido ? 'Instalado' : 'Pendente'}
              </div>
            </div>

            {/* Didactical Tip */}
            <div className="p-2.5 bg-slate-950/50 border border-slate-850 rounded-lg text-[10px] text-slate-400 flex items-start gap-1.5 leading-relaxed">
              <Lightbulb size={12} className="text-yellow-500 shrink-0 mt-0.5" />
              <p>
                <strong>Dica de Canteiro:</strong> Preencha o diário detalhando os serviços realizados no lote. 
                Isso documenta o progresso para a liberação de recursos de medições na Caixa Econômica!
              </p>
            </div>
          </div>
        )}
      </div>

      {selectedCasaId ? (
        <div className="space-y-6">
          {/* 2. Diário de Obra Card */}
          <div className="glassmorphism p-5 rounded-2xl border border-slate-800 shadow-md">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <FileText size={18} className="text-amber-400" /> Diário de Obra
            </h3>

            <form onSubmit={handleSaveDiario} className="space-y-4">
              {/* Clima Selection (Big touch-friendly buttons) */}
              <div>
                <label className="text-xs text-slate-400 block mb-2 font-semibold">Clima no Canteiro</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setClima('BOM')}
                    className={`py-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition ${
                      clima === 'BOM' 
                        ? 'bg-amber-500/10 border-amber-500 text-amber-400 font-bold' 
                        : 'bg-[#0f1422] border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Sun size={20} />
                    <span className="text-[10px] uppercase">Sol / Bom</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setClima('CHUVA')}
                    className={`py-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition ${
                      clima === 'CHUVA' 
                        ? 'bg-blue-500/10 border-blue-500 text-blue-400 font-bold' 
                        : 'bg-[#0f1422] border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <CloudRain size={20} />
                    <span className="text-[10px] uppercase">Chuva</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setClima('IMPRATICAVEL')}
                    className={`py-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition ${
                      clima === 'IMPRATICAVEL' 
                        ? 'bg-red-500/10 border-red-500 text-red-400 font-bold' 
                        : 'bg-[#0f1422] border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <XCircle size={20} />
                    <span className="text-[10px] uppercase">Parado</span>
                  </button>
                </div>
              </div>

              {/* Workers Count */}
              <div>
                <label className="text-xs text-slate-400 block mb-1.5 font-semibold">Efetivo de Trabalhadores</label>
                <input
                  type="number"
                  min="0"
                  required
                  placeholder="Ex: 8"
                  value={efetivoTrabalhadores}
                  onChange={(e) => setEfetivoTrabalhadores(e.target.value)}
                  className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50"
                />
              </div>

              {/* Activities executed */}
              <div>
                <label className="text-xs text-slate-400 block mb-1.5 font-semibold">Atividades Executadas</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Descreva o que foi feito hoje..."
                  value={atividadesExecutadas}
                  onChange={(e) => setAtividadesExecutadas(e.target.value)}
                  className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50"
                />
              </div>

              {/* Occurrences */}
              <div>
                <label className="text-xs text-slate-400 block mb-1.5 font-semibold">Ocorrências / Observações (Opcional)</label>
                <textarea
                  rows={2}
                  placeholder="Faltas, quebras de ferramentas, atraso de entrega..."
                  value={ocorrencias}
                  onChange={(e) => setOcorrencias(e.target.value)}
                  className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingDiario}
                className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs transition disabled:opacity-50 cursor-pointer shadow-lg shadow-amber-600/10"
              >
                {isSubmittingDiario ? 'Salvando...' : 'Salvar Diário de Obra'}
              </button>
            </form>
          </div>

          {/* 3. Infraestrutura / Utilidades Card */}
          <div className="glassmorphism p-5 rounded-2xl border border-slate-800 shadow-md">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Lightbulb size={18} className="text-indigo-400" /> Infraestrutura & Conexões
            </h3>

            <form onSubmit={handleSaveInfra} className="space-y-4">
              <div className="space-y-3.5 bg-[#0f1422] p-4 rounded-xl border border-slate-800/80">
                <label className="flex items-center gap-3 text-sm text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={infraEnergia}
                    onChange={(e) => setInfraEnergia(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-0"
                  />
                  <div className="flex items-center gap-1.5">
                    <Lightbulb size={14} className="text-yellow-400" />
                    <span>Padrão de Energia Instalado</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 text-sm text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={infraAgua}
                    onChange={(e) => setInfraAgua(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-0"
                  />
                  <div className="flex items-center gap-1.5">
                    <Droplet size={14} className="text-blue-400" />
                    <span>Ligação de Água Concluída</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 text-sm text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={infraEsgoto}
                    onChange={(e) => setInfraEsgoto(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-0"
                  />
                  <div className="flex items-center gap-1.5">
                    <Hammer size={14} className="text-green-400" />
                    <span>Fossa / Filtro / Esgoto Concluído</span>
                  </div>
                </label>
              </div>

              {/* Medidor Luz input */}
              <div>
                <label className="text-xs text-slate-400 block mb-1.5 font-semibold">Número do Medidor de Luz (CEEE/Equatorial/etc)</label>
                <input
                  type="text"
                  placeholder="Ex: LUZ-12345"
                  value={medidorLuz}
                  onChange={(e) => setMedidorLuz(e.target.value)}
                  className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 font-mono"
                />
              </div>

              {/* Medidor Agua input */}
              <div>
                <label className="text-xs text-slate-400 block mb-1.5 font-semibold">Número do Medidor de Água (Sabesp/Corsan/etc)</label>
                <input
                  type="text"
                  placeholder="Ex: AGUA-98765"
                  value={medidorAgua}
                  onChange={(e) => setMedidorAgua(e.target.value)}
                  className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingInfra}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition disabled:opacity-50 cursor-pointer shadow-lg shadow-indigo-600/10"
              >
                {isSubmittingInfra ? 'Gravando...' : 'Atualizar Ligações'}
              </button>
            </form>
          </div>

          {/* 4. Cost logging Card */}
          <div className="glassmorphism p-5 rounded-2xl border border-slate-800 shadow-md">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <DollarSign size={18} className="text-emerald-400" /> Apropriar Insumo / Custo Real
            </h3>

            {apropriacaoFeedback && (
              <div className={`p-3.5 rounded-xl border text-xs leading-relaxed mb-4 ${
                apropriacaoFeedback.type === 'success' 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                  : apropriacaoFeedback.type === 'warning'
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}>
                {apropriacaoFeedback.message}
              </div>
            )}

            <form onSubmit={handleSaveApropriacao} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1.5 font-semibold">Material / Equipamento / Mão de Obra</label>
                <select
                  value={selectedInsumoId}
                  onChange={(e) => setSelectedInsumoId(e.target.value)}
                  required
                  className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-indigo-500/50"
                >
                  <option value="">-- Escolha o Insumo --</option>
                  {initialInsumos.map(insumo => (
                    <option key={insumo.id} value={insumo.id}>
                      {insumo.nome} ({insumo.unidadeMedida})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1.5 font-semibold">Qtd. Efetiva</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="Ex: 5"
                    value={quantidadeReal}
                    onChange={(e) => setQuantidadeReal(e.target.value)}
                    className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1.5 font-semibold">Custo Total (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="Ex: 190.00"
                    value={custoTotal}
                    onChange={(e) => setCustoTotal(e.target.value)}
                    className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmittingApropriacao}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition disabled:opacity-50 cursor-pointer shadow-lg shadow-emerald-600/10"
              >
                {isSubmittingApropriacao ? 'Lançando...' : 'Lançar Apropriação'}
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="bg-[#0b0f19] border border-slate-800 rounded-2xl p-8 text-center text-slate-500 text-sm">
          Selecione uma casa acima para carregar as operações e apontamentos do canteiro.
        </div>
      )}
    </div>
  );
}
