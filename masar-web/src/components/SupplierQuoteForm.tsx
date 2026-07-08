'use client';

import React, { useState } from 'react';
import { DollarSign, Truck, Upload, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

interface SupplierQuoteFormProps {
  solicitacaoId: string;
}

export default function SupplierQuoteForm({ solicitacaoId }: SupplierQuoteFormProps) {
  const [fornecedorNome, setFornecedorNome] = useState('');
  const [valorUnitario, setValorUnitario] = useState('');
  const [prazoEntregaDias, setPrazoEntregaDias] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fornecedorNome || !valorUnitario || !prazoEntregaDias) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('solicitacaoId', solicitacaoId);
    formData.append('fornecedorNome', fornecedorNome);
    formData.append('valorUnitario', valorUnitario);
    formData.append('prazoEntregaDias', prazoEntregaDias);
    if (file) {
      formData.append('file', file);
    }

    try {
      const response = await fetch('/api/suprimentos/cotacao', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao submeter cotação.');
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar cotação. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-8 space-y-4 animate-fade-in">
        <div className="mx-auto w-12 h-12 bg-emerald-950/40 border border-emerald-500/30 rounded-full flex items-center justify-center text-emerald-400">
          <CheckCircle2 size={32} />
        </div>
        <h3 className="text-lg font-bold text-white">Cotação Enviada!</h3>
        <p className="text-xs text-slate-400 max-w-xs mx-auto">
          Agradecemos a sua resposta. Seus preços e prazos já foram registrados no ERP da construtora.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 text-xs text-slate-300">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3.5 rounded-xl text-xs flex items-start gap-2.5">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Nome do Fornecedor */}
      <div className="space-y-1.5">
        <label className="text-slate-400 font-medium">Nome da sua Empresa (Lojista / Razão Social) *</label>
        <input
          type="text"
          required
          placeholder="Ex: Madeireira São José LTDA"
          value={fornecedorNome}
          onChange={(e) => setFornecedorNome(e.target.value)}
          className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 focus:outline-none focus:border-blue-500/50"
        />
      </div>

      {/* Valor Unitário e Prazo */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-slate-400 font-medium">Preço Unitário (R$) *</label>
          <div className="relative">
            <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              placeholder="0.00"
              value={valorUnitario}
              onChange={(e) => setValorUnitario(e.target.value)}
              className="w-full bg-[#0f1422] border border-slate-800 rounded-xl pl-8 pr-3.5 py-2.5 text-slate-200 focus:outline-none focus:border-blue-500/50 font-mono"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-slate-400 font-medium">Prazo de Entrega (Dias Úteis) *</label>
          <div className="relative">
            <Truck size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="number"
              min="0"
              required
              placeholder="Ex: 5"
              value={prazoEntregaDias}
              onChange={(e) => setPrazoEntregaDias(e.target.value)}
              className="w-full bg-[#0f1422] border border-slate-800 rounded-xl pl-8 pr-3.5 py-2.5 text-slate-200 focus:outline-none focus:border-blue-500/50 font-mono"
            />
          </div>
        </div>
      </div>

      {/* Upload do Arquivo do Orçamento */}
      <div className="space-y-1.5">
        <label className="text-slate-400 font-medium">Anexar Arquivo do Orçamento (PDF / Imagem - Opcional)</label>
        <div className="border border-dashed border-slate-850 hover:border-slate-700/60 rounded-xl p-4 text-center cursor-pointer transition relative">
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                setFile(e.target.files[0]);
              }
            }}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
          <div className="space-y-2">
            <Upload className="mx-auto text-slate-500" size={20} />
            <p className="text-[10px] text-slate-400 font-medium">
              {file ? `Selecionado: ${file.name}` : 'Arraste ou clique para selecionar o arquivo PDF'}
            </p>
          </div>
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
      >
        {loading ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            Enviando Preços...
          </>
        ) : (
          'Enviar Cotação de Preços'
        )}
      </button>
    </form>
  );
}
