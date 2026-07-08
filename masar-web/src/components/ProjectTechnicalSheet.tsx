'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Building2, 
  MapPin, 
  Compass, 
  Layers, 
  FileText, 
  DollarSign, 
  ShieldCheck, 
  Upload, 
  Download, 
  Trash2, 
  FileDigit,
  ArrowLeft,
  Sparkles,
  Info,
  Calendar,
  Loader2
} from 'lucide-react';
import Link from 'next/link';

interface Documento {
  id: string;
  nome: string;
  caminhoArquivo: string;
  tipo: string | null;
  dataCriacao: string | Date;
}

interface Empreendimento {
  id: string;
  nome: string;
  localizacao: string;
  statusLegal: string;
  endereco: string | null;
  cep: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  latitude: number | null;
  longitude: number | null;
  areaTotalTerreno: number | null;
  quantidadeCasasPrevistas: number | null;
  proprietarioAnteriorTerreno: string | null;
  valorCompraTerreno: number | null;
  amenidades: string[];
  casas: { id: string; percentualObra: number }[];
  documentos: Documento[];
}

interface ProjectTechnicalSheetProps {
  project: Empreendimento;
}

const TIPO_DOCS_GED = [
  { key: 'PROJETO_ARQUITETONICO', label: 'Projeto Arquitetônico' },
  { key: 'PROJETO_ESTRUTURAL', label: 'Projeto Estrutural' },
  { key: 'PROJETO_HIDRAULICO', label: 'Projeto Hidráulico' },
  { key: 'PROJETO_ELETRICO', label: 'Projeto Elétrico' },
  { key: 'MATRICULA_TERRENO', label: 'Matrícula do Terreno' },
  { key: 'ALVARA_LOTEAMENTO', label: 'Alvará de Loteamento' },
  { key: 'OUTRO', label: 'Outros Documentos' }
];

export default function ProjectTechnicalSheet({ project }: ProjectTechnicalSheetProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'ficha' | 'cofre'>('ficha');
  
  // Upload States
  const [file, setFile] = useState<File | null>(null);
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState('PROJETO_ARQUITETONICO');
  const [isUploading, setIsUploading] = useState(false);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  // Cálculo de progresso médio das obras do empreendimento
  const totalCasas = project.casas.length;
  const mediaProgresso = totalCasas > 0
    ? project.casas.reduce((acc, c) => acc + c.percentualObra, 0) / totalCasas
    : 0;

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !nome) {
      alert('Por favor, informe o nome do documento e selecione um arquivo.');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('nome', nome);
      formData.append('tipo', tipo);
      formData.append('empreendimentoId', project.id);

      const res = await fetch('/api/ged/documentos', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erro ao fazer upload');
      }

      setNome('');
      setFile(null);
      
      const fileInput = document.getElementById('project-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      alert('✓ Projeto cadastrado e armazenado com sucesso no cofre GED!');
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar projeto.');
    } finally {
      setIsUploading(false);
    }
  };

  // Filtragem de documentos técnicos do cofre
  const documentosTecnicos = project.documentos.filter(d => 
    d.tipo && d.tipo !== 'OUTRO'
  );

  return (
    <div className="space-y-6 animate-fade-in text-slate-350 text-xs">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1e293b] pb-6">
        <div className="space-y-1.5">
          <Link 
            href="/empreendimentos" 
            className="flex items-center gap-1 text-slate-500 hover:text-slate-300 font-bold uppercase tracking-wider text-[10px]"
          >
            <ArrowLeft size={12} /> Voltar para Projetos
          </Link>
          <h1 className="text-2xl font-bold text-white tracking-tight font-sans">
            {project.nome}
          </h1>
          <p className="text-xs text-slate-400">
            Local: {project.localizacao} | Status Legal: <strong className="text-blue-400">{project.statusLegal.replace('_', ' ')}</strong>
          </p>
        </div>

        <div className="flex border border-slate-800 bg-[#101625]/30 p-1 rounded-xl">
          <button 
            onClick={() => setActiveTab('ficha')} 
            className={`px-4 py-2 rounded-lg font-bold uppercase tracking-wider transition cursor-pointer ${
              activeTab === 'ficha' ? 'bg-blue-600/10 text-blue-400 border border-blue-500/15' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Ficha Técnica
          </button>
          <button 
            onClick={() => setActiveTab('cofre')} 
            className={`px-4 py-2 rounded-lg font-bold uppercase tracking-wider transition cursor-pointer ${
              activeTab === 'cofre' ? 'bg-blue-600/10 text-blue-400 border border-blue-500/15' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Cofre de Projetos
          </button>
        </div>
      </div>

      {/* Conteúdo Aba 1: Ficha Técnica do Terreno */}
      {activeTab === 'ficha' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Lado Esquerdo: Ficha e Detalhes */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Bloco Terreno */}
            <div className="glassmorphism p-6 rounded-2xl border border-slate-800/80 shadow-2xl space-y-5">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider block border-b border-slate-800/60 pb-2">
                Ficha Técnica do Terreno
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-[#0f1422]/60 border border-slate-850 rounded-xl">
                  <span className="text-slate-500 block uppercase text-[9px] font-bold">Área Total do Terreno</span>
                  <span className="text-slate-200 font-mono text-sm font-bold mt-0.5 block">
                    {project.areaTotalTerreno ? `${Number(project.areaTotalTerreno).toLocaleString('pt-BR')} m²` : 'Não informada'}
                  </span>
                </div>
                
                <div className="p-3 bg-[#0f1422]/60 border border-slate-850 rounded-xl">
                  <span className="text-slate-500 block uppercase text-[9px] font-bold">Valor de Aquisição</span>
                  <span className="text-emerald-400 font-mono text-sm font-bold mt-0.5 block">
                    {project.valorCompraTerreno ? formatCurrency(Number(project.valorCompraTerreno)) : 'Não informado'}
                  </span>
                </div>

                <div className="p-3 bg-[#0f1422]/60 border border-slate-850 rounded-xl col-span-2">
                  <span className="text-slate-500 block uppercase text-[9px] font-bold">Proprietário Anterior</span>
                  <span className="text-slate-200 text-xs font-bold mt-0.5 block">
                    {project.proprietarioAnteriorTerreno || 'Não informado'}
                  </span>
                </div>
              </div>
            </div>

            {/* Bloco Infraestrutura & Engenharia */}
            <div className="glassmorphism p-6 rounded-2xl border border-slate-800/80 shadow-2xl space-y-5">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider block border-b border-slate-800/60 pb-2">
                Dados Técnicos e Obras
              </h3>

              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 bg-[#0f1422]/40 border border-slate-850 rounded-xl text-center">
                  <span className="text-slate-500 block uppercase text-[8px] font-bold">Casas Previstas</span>
                  <span className="text-white font-mono text-lg font-extrabold mt-0.5 block">
                    {project.quantidadeCasasPrevistas || '---'}
                  </span>
                </div>

                <div className="p-3 bg-[#0f1422]/40 border border-slate-850 rounded-xl text-center">
                  <span className="text-slate-500 block uppercase text-[8px] font-bold">Casas Lançadas</span>
                  <span className="text-white font-mono text-lg font-extrabold mt-0.5 block">
                    {totalCasas}
                  </span>
                </div>

                <div className="p-3 bg-[#0f1422]/40 border border-slate-850 rounded-xl text-center">
                  <span className="text-slate-500 block uppercase text-[8px] font-bold">Progresso Geral</span>
                  <span className="text-blue-400 font-mono text-lg font-extrabold mt-0.5 block">
                    {mediaProgresso.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Amenidades */}
              <div className="space-y-2">
                <span className="text-slate-500 block uppercase text-[9px] font-bold">Amenidades & Pavimentação</span>
                <div className="flex flex-wrap gap-2">
                  {project.amenidades.map((amenidade, idx) => (
                    <span 
                      key={idx}
                      className="bg-blue-950/20 border border-blue-900/30 text-blue-400 font-bold px-2.5 py-1 rounded-lg uppercase text-[9px]"
                    >
                      {amenidade}
                    </span>
                  ))}

                  {project.amenidades.length === 0 && (
                    <span className="text-slate-500 italic text-[11px]">Nenhuma amenidade cadastrada.</span>
                  )}
                </div>
              </div>
            </div>

            {/* Endereço */}
            <div className="glassmorphism p-6 rounded-2xl border border-slate-800/80 shadow-2xl space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider block border-b border-slate-800/60 pb-2">
                Localização e Logística
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <span className="text-slate-500 block uppercase text-[9px] font-bold">Endereço Completo</span>
                  <span className="text-slate-200 font-semibold block mt-0.5">
                    {project.endereco || 'Não cadastrado'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block uppercase text-[9px] font-bold">Bairro</span>
                  <span className="text-slate-200 font-semibold block mt-0.5">{project.bairro || '---'}</span>
                </div>

                <div>
                  <span className="text-slate-500 block uppercase text-[9px] font-bold">CEP</span>
                  <span className="text-slate-200 font-semibold block mt-0.5">{project.cep || '---'}</span>
                </div>

                <div>
                  <span className="text-slate-500 block uppercase text-[9px] font-bold">Cidade / Estado</span>
                  <span className="text-slate-200 font-semibold block mt-0.5">
                    {project.cidade ? `${project.cidade} - ${project.estado || ''}` : '---'}
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Lado Direito: Mapa Visual Geolocalizado */}
          <div className="lg:col-span-5 space-y-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider block">Geolocalização / Satélite</h3>
            
            {project.latitude && project.longitude ? (
              <div className="glassmorphism p-4 rounded-2xl border border-slate-800/80 shadow-2xl space-y-4">
                <iframe 
                  width="100%" 
                  height="340" 
                  src={`https://maps.google.com/maps?q=${project.latitude},${project.longitude}&t=&z=16&ie=UTF8&iwloc=&output=embed`}
                  className="rounded-xl border border-slate-800"
                  allowFullScreen
                />
                
                <div className="flex justify-between items-center bg-[#0f1422]/60 p-3.5 rounded-xl border border-slate-850 font-mono text-[10px]">
                  <div>
                    <span className="text-slate-500 block uppercase text-[8px] font-bold">Latitude</span>
                    <span className="text-slate-350">{project.latitude.toFixed(6)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 block uppercase text-[8px] font-bold">Longitude</span>
                    <span className="text-slate-350">{project.longitude.toFixed(6)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="glassmorphism p-8 rounded-2xl border border-slate-850 text-center text-slate-500 space-y-3">
                <Compass className="mx-auto text-slate-650" size={32} />
                <p className="font-bold text-white text-xs">Mapa Não Disponível</p>
                <p className="text-[10px] max-w-xs mx-auto">
                  Preencha a latitude e longitude do terreno nos dados do empreendimento para plotar o mapa visual por satélite.
                </p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* Conteúdo Aba 2: Cofre de Projetos (GED Técnico) */}
      {activeTab === 'cofre' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Lado Esquerdo: Formulário de Upload Otimizado */}
          <div className="lg:col-span-5 space-y-6 animate-slide-up">
            <div className="glassmorphism p-6 rounded-2xl border border-slate-800/80 shadow-2xl space-y-5">
              <div className="border-b border-slate-800/60 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Sparkles size={16} className="text-blue-400 animate-pulse" /> Arquivar Novo Projeto
                </h3>
                <p className="text-[10px] text-slate-450 mt-1">Insira plantas estruturais, hidráulicas ou arquivos dwg/pdf no cofre do terreno.</p>
              </div>

              <form onSubmit={handleUpload} className="space-y-4 text-xs text-slate-300">
                
                {/* Nome do Documento */}
                <div className="space-y-1.5">
                  <label className="text-slate-450 font-medium">Nome do Documento (Ex: Planta Baixa Sanitária) *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Hidrossanitário - Bloco A"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 focus:outline-none focus:border-blue-500/50"
                  />
                </div>

                {/* Tipo de Documento */}
                <div className="space-y-1.5">
                  <label className="text-slate-450 font-medium">Tipo de Projeto Técnico *</label>
                  <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value)}
                    className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-250 focus:outline-none focus:border-blue-500/50"
                  >
                    {TIPO_DOCS_GED.map(t => (
                      <option key={t.key} value={t.key}>{t.label}</option>
                    ))}
                  </select>
                </div>

                {/* File Upload */}
                <div className="space-y-1.5">
                  <label className="text-slate-450 font-medium">Arquivo (PDF, DWG, PNG) *</label>
                  <div className="border border-dashed border-slate-800 hover:border-slate-700/60 rounded-xl p-4 text-center cursor-pointer transition relative">
                    <input
                      id="project-file-input"
                      type="file"
                      required
                      accept=".pdf,.dwg,.png,.jpg,.jpeg"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setFile(e.target.files[0]);
                          if (!nome) setNome(e.target.files[0].name.split('.')[0]);
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <div className="space-y-2">
                      <Upload className="mx-auto text-slate-500" size={20} />
                      <p className="text-[10px] text-slate-400 font-medium">
                        {file ? `Selecionado: ${file.name}` : 'Arraste ou clique para selecionar o projeto'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isUploading}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
                >
                  {isUploading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Arquivando no Cofre...
                    </>
                  ) : (
                    'Registrar no Cofre'
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Lado Direito: Lista de Projetos Técnicos do Cofre */}
          <div className="lg:col-span-7 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider block">Projetos Arquivados</h3>
            
            <div className="grid grid-cols-1 gap-3 max-h-[500px] overflow-y-auto pr-1">
              {documentosTecnicos.map(doc => {
                const labelObj = TIPO_DOCS_GED.find(t => t.key === doc.tipo);

                return (
                  <div 
                    key={doc.id}
                    className="p-4 bg-[#0f1422] border border-slate-800 rounded-xl flex items-center justify-between"
                  >
                    <div className="space-y-1 max-w-[70%]">
                      <div className="flex items-center gap-2 text-white font-bold text-xs">
                        <FileText size={14} className="text-blue-400 shrink-0" />
                        <span className="truncate">{doc.nome}</span>
                      </div>
                      <p className="text-[9px] text-slate-500 font-mono">
                        Enviado em: {formatDate(doc.dataCriacao)}
                      </p>
                      <span className="inline-block bg-slate-900 border border-slate-800 text-[8px] text-slate-400 font-bold px-1.5 py-0.5 rounded uppercase mt-1">
                        {labelObj ? labelObj.label : 'Especificação Técnica'}
                      </span>
                    </div>

                    <a
                      href={`/api/ged/documentos/${doc.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-slate-800/40 hover:bg-slate-800 border border-slate-800 hover:border-slate-700/60 rounded-lg text-slate-350 hover:text-white transition flex items-center justify-center"
                      title="Download do Projeto"
                    >
                      <Download size={14} />
                    </a>
                  </div>
                );
              })}

              {documentosTecnicos.length === 0 && (
                <div className="bg-[#0f1422]/60 p-12 rounded-2xl border border-slate-850 text-center text-slate-500 space-y-2">
                  <FileDigit className="mx-auto text-slate-650" size={24} />
                  <p className="font-bold text-white text-xs">Cofre de Projetos Vazio</p>
                  <p className="text-[10px] max-w-xs mx-auto">
                    Nenhum projeto complementar (elétrico, estrutural ou arquitetônico) arquivado para este terreno.
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
