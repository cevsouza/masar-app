'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ShoppingBag, 
  Clock, 
  MapPin, 
  Link as LinkIcon, 
  Copy, 
  ArrowRight, 
  CheckCircle, 
  FileText, 
  AlertTriangle,
  Sparkles,
  ShieldAlert,
  Loader2
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
}

interface SuprimentosInboxProps {
  initialSolicitacoes: any[];
}

export default function SuprimentosInbox({ initialSolicitacoes }: SuprimentosInboxProps) {
  const router = useRouter();
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>(initialSolicitacoes);
  const [selectedId, setSelectedId] = useState<string>(initialSolicitacoes[0]?.id || '');
  
  const [loading, setLoading] = useState(false);
  const [overrunData, setOverrunData] = useState<{ message: string; cotacaoId: string } | null>(null);

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
      // Atualiza estado local simplificado
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-xs text-slate-300">
      
      {/* Coluna Esquerda: Lista de Requisições (Caixa de Entrada) */}
      <div className="lg:col-span-5 space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider block">Requisições de Compra</h3>
        
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
                    Qtd: {s.quantidadeSolicitada} {s.insumo.unidadeMedida} | Data: {formatDate(s.dataCriacao)}
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
                  Quantidade total solicitada: <strong>{selectedSol.quantidadeSolicitada} {selectedSol.insumo.unidadeMedida}</strong>
                </p>
              </div>
              <button
                onClick={() => handleCopyLink(selectedSol.tokenCotacao)}
                className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl flex items-center gap-1 transition cursor-pointer"
                title="Copiar Link para Lojista preencher"
              >
                <LinkIcon size={12} /> Copiar Link Lojista
              </button>
            </div>

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
              <h5 className="font-bold text-white text-xs flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-400" /> Respostas de Lojistas Recebidas
              </h5>

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

                      <div className="flex justify-between items-baseline pt-2 border-t border-slate-800/60">
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
                      Envie o link de cotação pública aos seus lojistas parceiros para que eles insiram seus preços diretamente no sistema.
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

    </div>
  );
}
