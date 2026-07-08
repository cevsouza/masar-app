'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Upload, Calendar, Download, Eye, FileDigit, Clock } from 'lucide-react';

interface Documento {
  id: string;
  nome: string;
  dataVencimento: string | null;
  status: string;
  dataCriacao: string;
}

interface GedManagerProps {
  casaId?: string;
  clienteId?: string;
  empreendimentoId?: string;
}

export default function GedManager({ casaId, clienteId, empreendimentoId }: GedManagerProps) {
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [nome, setNome] = useState('');
  const [dataVencimento, setDataVencimento] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, [casaId, clienteId, empreendimentoId]);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      let query = '';
      if (casaId) query = `?casaId=${casaId}`;
      else if (clienteId) query = `?clienteId=${clienteId}`;
      else if (empreendimentoId) query = `?empreendimentoId=${empreendimentoId}`;

      const res = await fetch(`/api/ged/documentos${query}`);
      const data = await res.json();
      if (res.ok) {
        setDocumentos(data);
      }
    } catch (err) {
      console.error('Erro ao buscar documentos do GED:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !nome) {
      alert('Selecione um arquivo e informe o nome do documento.');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('nome', nome);
      if (dataVencimento) formData.append('dataVencimento', dataVencimento);
      if (casaId) formData.append('casaId', casaId);
      if (clienteId) formData.append('clienteId', clienteId);
      if (empreendimentoId) formData.append('empreendimentoId', empreendimentoId);

      const res = await fetch('/api/ged/documentos', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erro no upload');
      }

      setNome('');
      setDataVencimento('');
      setFile(null);
      // Reset input element
      const fileInput = document.getElementById('ged-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      fetchDocuments();
      alert('✓ Documento GED anexado com sucesso!');
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erro ao realizar upload do arquivo.');
    } finally {
      setIsUploading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-5">
      {/* Upload Form */}
      <form onSubmit={handleUpload} className="p-4 bg-[#0f1422]/60 border border-slate-850 rounded-xl space-y-4">
        <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
          <Upload size={14} className="text-blue-400" /> Anexar Novo Documento (GED)
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-[10px] text-slate-400 block mb-1 font-semibold">Nome do Documento</label>
            <input
              type="text"
              required
              placeholder="Ex: Alvará de Construção"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full bg-[#0f1422] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50"
            />
          </div>

          <div>
            <label className="text-[10px] text-slate-400 block mb-1 font-semibold">Data de Vencimento (Opcional)</label>
            <input
              type="date"
              value={dataVencimento}
              onChange={(e) => setDataVencimento(e.target.value)}
              className="w-full bg-[#0f1422] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50 font-mono"
            />
          </div>

          <div>
            <label className="text-[10px] text-slate-400 block mb-1 font-semibold">Arquivo (PDF, PNG, JPG)</label>
            <input
              id="ged-file-input"
              type="file"
              required
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-slate-400 text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-indigo-600/10 file:text-indigo-400 file:hover:bg-indigo-600/20 file:cursor-pointer"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isUploading}
          className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-[10px] transition disabled:opacity-50 cursor-pointer shadow-md"
        >
          {isUploading ? 'Enviando...' : 'Adicionar ao Volume de Documentos'}
        </button>
      </form>

      {/* Documents List */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
          <FileText size={14} className="text-slate-400" /> Acervo de Documentos
        </h4>

        {isLoading ? (
          <p className="text-[10px] text-slate-500 py-3 text-center">Carregando acervo...</p>
        ) : documentos.length === 0 ? (
          <p className="text-[10px] text-slate-500 py-3 text-center">Nenhum documento anexado a esta pasta.</p>
        ) : (
          <div className="divide-y divide-slate-850 border border-slate-850 rounded-xl overflow-hidden text-xs">
            {documentos.map(doc => (
              <div key={doc.id} className="p-3.5 bg-[#0f1422]/30 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <FileDigit size={16} className="text-slate-400 shrink-0" />
                  <div>
                    <h5 className="font-semibold text-slate-200 leading-tight">{doc.nome}</h5>
                    <div className="flex items-center gap-2 mt-1 text-[9px] text-slate-500">
                      <span>Anexado em: {formatDate(doc.dataCriacao)}</span>
                      {doc.dataVencimento && (
                        <span className="flex items-center gap-0.5">
                          <Clock size={10} /> Vence: {formatDate(doc.dataVencimento)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <a
                  href={`/api/ged/documentos/${doc.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition border border-slate-700/60 cursor-pointer shrink-0"
                  title="Ver documento"
                >
                  <Eye size={12} />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
