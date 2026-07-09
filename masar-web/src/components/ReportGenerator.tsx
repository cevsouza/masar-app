'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Printer, 
  Settings, 
  Activity, 
  Calendar, 
  DollarSign, 
  Layers, 
  Building2, 
  SlidersHorizontal,
  Home,
  CheckCircle,
  Clock,
  AlertTriangle,
  Lightbulb
} from 'lucide-react';

interface ReportGeneratorProps {
  empreendimentos: any[];
  casas: any[];
}

export default function ReportGenerator({ empreendimentos, casas }: ReportGeneratorProps) {
  const [reportType, setReportType] = useState<'OBRAS' | 'PROJETO' | 'FINANCEIRO'>('OBRAS');
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [selectedCasaId, setSelectedCasaId] = useState('');
  
  // Customizações
  const [customTitle, setCustomTitle] = useState('');
  const [notes, setNotes] = useState('');
  
  // Toggles de Seções
  const [showSummary, setShowSummary] = useState(true);
  const [showDetails, setShowDetails] = useState(true);
  const [showFinancials, setShowFinancials] = useState(true);
  const [showLogs, setShowLogs] = useState(true);

  // Set default titles based on type
  useEffect(() => {
    if (reportType === 'OBRAS') {
      setCustomTitle('Relatório de Evolução Física e Acompanhamento de Obras');
    } else if (reportType === 'PROJETO') {
      setCustomTitle('Relatório de Fase Legal, Alvarás e Marcos de Projetos');
    } else if (reportType === 'FINANCEIRO') {
      setCustomTitle('Relatório Financeiro de Custos e Margem de Lotes');
    }
  }, [reportType]);

  // Reset casa dropdown when project selection changes
  useEffect(() => {
    setSelectedCasaId('');
  }, [selectedEmpId]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0
    }).format(val);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '--';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const getStageLabel = (status: string) => {
    switch (status) {
      case 'BACKLOG': return 'Não Iniciada';
      case 'APROVACOES': return 'Burocracia Legal';
      case 'INFRAESTRUTURA': return 'Fundação/Infra';
      case 'SUPRAESTRUTURA': return 'Alvenaria/Supra';
      case 'INSTALACOES': return 'Instalações';
      case 'ACABAMENTO': return 'Acabamento';
      case 'VISTORIA_CAIXA': return 'Aguardando Caixa';
      case 'CARTORIO': return 'Cartório/Legalização';
      case 'VISITAS': return 'Liberada p/ Visitas';
      case 'CONCLUIDA': return 'Concluída / Entregue';
      default: return status;
    }
  };

  const getMarcoLabel = (tipo: string) => {
    switch (tipo) {
      case 'ALVARA_PREFEITURA': return 'Alvará da Prefeitura';
      case 'PROJETO_CAIXA': return 'Aprovação de Projeto na Caixa';
      case 'HABITESE': return 'Habite-se';
      case 'CND_RECEITA': return 'CND da Receita Federal';
      default: return tipo.replace('_', ' ');
    }
  };

  const getMarcoDesc = (tipo: string) => {
    switch (tipo) {
      case 'ALVARA_PREFEITURA': return 'Licença municipal para o início das obras físicas.';
      case 'PROJETO_CAIXA': return 'Análise de engenharia e aprovação de repasse na CEF.';
      case 'HABITESE': return 'Certidão de conclusão da obra emitida pela prefeitura.';
      case 'CND_RECEITA': return 'Certidão de regularidade fiscal da previdência da obra.';
      default: return '';
    }
  };

  // Filtragem
  const filteredCasas = casas.filter(c => {
    if (selectedEmpId && c.empreendimentoId !== selectedEmpId) return false;
    if (selectedCasaId && c.id !== selectedCasaId) return false;
    return true;
  });

  const filteredEmp = selectedEmpId 
    ? empreendimentos.find(e => e.id === selectedEmpId)
    : null;

  // Cálculos consolidados para Obras
  const totalCasas = filteredCasas.length;
  const mediaFisica = totalCasas > 0 
    ? Math.round(filteredCasas.reduce((acc, c) => acc + (c.percentualObra || 0), 0) / totalCasas)
    : 0;

  const energiaConcluida = filteredCasas.filter(c => c.infraestrutura?.padraoEnergiaInstalado).length;
  const aguaConcluida = filteredCasas.filter(c => c.infraestrutura?.ligacaoAguaConcluida).length;
  const esgotoConcluido = filteredCasas.filter(c => c.infraestrutura?.fossaFiltroEsgotoConcluido).length;

  // Cálculos consolidados para Financeiro
  const orcadoTotal = filteredCasas.reduce((acc, c) => {
    const itens = c.orcamento?.itens || [];
    const soma = itens.reduce((s: number, item: any) => s + (item.quantidadePlanejada * item.custoUnitarioPrevisto), 0);
    return acc + soma;
  }, 0);

  const realizadoTotal = filteredCasas.reduce((acc, c) => {
    const aprops = c.apropriacoes || [];
    const soma = aprops.filter((ap: any) => ap.aprovado).reduce((s: number, ap: any) => s + ap.custoTotal, 0);
    return acc + soma;
  }, 0);

  const totalGlosado = filteredCasas.reduce((acc, c) => {
    const aprops = c.apropriacoes || [];
    const soma = aprops.filter((ap: any) => !ap.aprovado).reduce((s: number, ap: any) => s + ap.custoTotal, 0);
    return acc + soma;
  }, 0);

  // Gatilho de Impressão
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative text-xs">
      
      {/* 1. Painel de Customização (Esquerda) - Oculto na Impressão */}
      <div className="lg:col-span-4 space-y-6 no-print">
        
        {/* Escolha do Relatório */}
        <div className="glassmorphism p-5 rounded-2xl border border-slate-800 shadow-md space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider block flex items-center gap-2">
            <Settings size={16} className="text-indigo-400" /> Seletor de Modelo
          </h3>
          
          <div className="space-y-2">
            <button
              onClick={() => setReportType('OBRAS')}
              className={`w-full py-2.5 px-4 rounded-xl font-bold flex items-center gap-2 border transition ${
                reportType === 'OBRAS'
                  ? 'bg-indigo-600/15 border-indigo-500 text-indigo-400'
                  : 'bg-[#0f1422] border-slate-850 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity size={16} /> Relatório de Obras (Casas)
            </button>
            <button
              onClick={() => setReportType('PROJETO')}
              className={`w-full py-2.5 px-4 rounded-xl font-bold flex items-center gap-2 border transition ${
                reportType === 'PROJETO'
                  ? 'bg-indigo-600/15 border-indigo-500 text-indigo-400'
                  : 'bg-[#0f1422] border-slate-850 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Calendar size={16} /> Ficha Técnica & Marcos Legais
            </button>
            <button
              onClick={() => setReportType('FINANCEIRO')}
              className={`w-full py-2.5 px-4 rounded-xl font-bold flex items-center gap-2 border transition ${
                reportType === 'FINANCEIRO'
                  ? 'bg-indigo-600/15 border-indigo-500 text-indigo-400'
                  : 'bg-[#0f1422] border-slate-850 text-slate-400 hover:text-slate-200'
              }`}
            >
              <DollarSign size={16} /> Financeiro, Custos & DRE
            </button>
          </div>
        </div>

        {/* Filtros e Configurações */}
        <div className="glassmorphism p-5 rounded-2xl border border-slate-800 shadow-md space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider block flex items-center gap-2">
            <SlidersHorizontal size={16} className="text-blue-400" /> Filtros e Conteúdo
          </h3>

          <div className="space-y-3.5">
            {/* Filtro Empreendimento */}
            <div>
              <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1 font-semibold">Filtrar por Empreendimento</label>
              <select
                value={selectedEmpId}
                onChange={(e) => setSelectedEmpId(e.target.value)}
                className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none"
              >
                <option value="">Todos os Empreendimentos</option>
                {empreendimentos.map(e => (
                  <option key={e.id} value={e.id}>{e.nome}</option>
                ))}
              </select>
            </div>

            {/* Filtro Casa (Somente se não for relatório de Ficha do Empreendimento e tiver projeto selecionado) */}
            {reportType !== 'PROJETO' && selectedEmpId && (
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1 font-semibold">Filtrar por Lote/Casa Específico</label>
                <select
                  value={selectedCasaId}
                  onChange={(e) => setSelectedCasaId(e.target.value)}
                  className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none"
                >
                  <option value="">Todas as Casas do Projeto</option>
                  {casas.filter(c => c.empreendimentoId === selectedEmpId).map(c => (
                    <option key={c.id} value={c.id}>Casa {c.numero} - Quadra {c.quadra}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Título Customizado */}
            <div>
              <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1 font-semibold">Título Personalizado do Relatório</label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500/50"
              />
            </div>

            {/* Notas Customizadas */}
            <div>
              <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1 font-semibold">Notas / Considerações do Gestor</label>
              <textarea
                rows={3}
                placeholder="Insira conclusões, observações climáticas ou justificativas técnicas..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500/50"
              />
            </div>

            {/* Checkboxes de Seções */}
            <div className="space-y-2 pt-2 border-t border-slate-850">
              <span className="text-[9px] uppercase font-bold text-slate-500 block mb-1">Seções a Exibir</span>
              
              <label className="flex items-center gap-2 cursor-pointer text-slate-350 hover:text-white">
                <input
                  type="checkbox"
                  checked={showSummary}
                  onChange={(e) => setShowSummary(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-0 w-3.5 h-3.5 bg-slate-900 border-slate-800"
                />
                <span>Exibir Resumo Executivo / KPIs</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-350 hover:text-white">
                <input
                  type="checkbox"
                  checked={showDetails}
                  onChange={(e) => setShowDetails(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-0 w-3.5 h-3.5 bg-slate-900 border-slate-800"
                />
                <span>Exibir Detalhamento de Unidades</span>
              </label>

              {reportType !== 'PROJETO' && (
                <label className="flex items-center gap-2 cursor-pointer text-slate-350 hover:text-white">
                  <input
                    type="checkbox"
                    checked={showFinancials}
                    onChange={(e) => setShowFinancials(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-0 w-3.5 h-3.5 bg-slate-900 border-slate-800"
                  />
                  <span>Exibir Dados Financeiros & Custos</span>
                </label>
              )}

              {reportType === 'OBRAS' && (
                <label className="flex items-center gap-2 cursor-pointer text-slate-350 hover:text-white">
                  <input
                    type="checkbox"
                    checked={showLogs}
                    onChange={(e) => setShowLogs(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-0 w-3.5 h-3.5 bg-slate-900 border-slate-800"
                  />
                  <span>Exibir Diários de Canteiro Recentes</span>
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Ação de Imprimir */}
        <button
          onClick={handlePrint}
          className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-blue-500/15"
        >
          <Printer size={16} /> Visualizar Impressão / PDF
        </button>

      </div>

      {/* 2. Área de Pré-Visualização e Relatório (Direita) */}
      <div className="lg:col-span-8 space-y-6">
        
        {/* Folha do Relatório */}
        <div className="print-container bg-[#0b0f19] border border-slate-850 rounded-3xl p-8 shadow-2xl relative">
          
          {/* Folha de Estilos de Impressão PDF nativa */}
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              body {
                background: white !important;
                color: black !important;
              }
              /* Ocultar elementos desnecessários na folha de impressão */
              nav, aside, header, .no-print, button, select, input, textarea {
                display: none !important;
              }
              .print-container {
                border: none !important;
                background: white !important;
                color: black !important;
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 !important;
                padding: 1.2cm !important;
                box-shadow: none !important;
              }
              .print-card {
                background: white !important;
                color: black !important;
                border: 1px solid #cbd5e1 !important;
                box-shadow: none !important;
              }
              .print-table th {
                background-color: #f1f5f9 !important;
                color: #0f172a !important;
                border-bottom: 2px solid #cbd5e1 !important;
              }
              .print-table td {
                border-bottom: 1px solid #e2e8f0 !important;
                color: #334155 !important;
              }
              .print-accent {
                color: #2563eb !important;
                font-weight: bold !important;
              }
              .print-text-dark {
                color: #0f172a !important;
              }
              .print-text-muted {
                color: #64748b !important;
              }
              .page-break {
                page-break-before: always;
              }
            }
          `}} />

          {/* Cabeçalho do Relatório */}
          <div className="border-b border-slate-800/80 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-white print-text-dark font-sans tracking-tight">
                {customTitle}
              </h2>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-450 print-text-muted">
                <span className="flex items-center gap-1">
                  <Building2 size={12} /> {selectedEmpId ? empreendimentos.find(e => e.id === selectedEmpId)?.nome : 'Todos os Empreendimentos'}
                </span>
                <span>•</span>
                <span>Data de Emissão: {new Date().toLocaleDateString('pt-BR')}</span>
              </div>
            </div>
            {/* Marca d'água ERP SaaS */}
            <div className="text-right">
              <span className="font-extrabold tracking-wider text-indigo-400 print-accent text-base font-sans">MASAR</span>
              <span className="text-[9px] text-slate-500 block uppercase print-text-muted">ERP de Obras MCMV</span>
            </div>
          </div>

          {/* Notas do Gestor */}
          {notes && (
            <div className="mt-5 p-4 rounded-xl bg-slate-900/30 border border-slate-850 print-card text-slate-350 print-text-muted leading-relaxed italic">
              <strong>Nota do Emissor:</strong> {notes}
            </div>
          )}

          {/* ================= MODELO: OBRAS ================= */}
          {reportType === 'OBRAS' && (
            <div className="mt-6 space-y-6">
              
              {/* KPIs Resumo */}
              {showSummary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-[#0f1422] p-4 rounded-xl border border-slate-850 print-card text-center space-y-1">
                    <span className="text-[8px] text-slate-500 uppercase tracking-wider block font-bold">Unidades Filtradas</span>
                    <span className="text-base font-bold text-white print-text-dark">{totalCasas}</span>
                  </div>
                  <div className="bg-[#0f1422] p-4 rounded-xl border border-slate-850 print-card text-center space-y-1">
                    <span className="text-[8px] text-slate-500 uppercase tracking-wider block font-bold">Progresso Físico Médio</span>
                    <span className="text-base font-bold text-indigo-400 print-accent">{mediaFisica}%</span>
                  </div>
                  <div className="bg-[#0f1422] p-4 rounded-xl border border-slate-850 print-card text-center space-y-1">
                    <span className="text-[8px] text-slate-500 uppercase tracking-wider block font-bold">Ligações Concluídas</span>
                    <span className="text-base font-bold text-emerald-400 print-accent">
                      {Math.round(((energiaConcluida + aguaConcluida + esgotoConcluido) / (totalCasas * 3 || 1)) * 100)}%
                    </span>
                  </div>
                  <div className="bg-[#0f1422] p-4 rounded-xl border border-slate-850 print-card text-center space-y-1">
                    <span className="text-[8px] text-slate-500 uppercase tracking-wider block font-bold">Investimento Aprovado</span>
                    <span className="text-base font-bold text-slate-300 print-text-dark">{formatCurrency(realizadoTotal)}</span>
                  </div>
                </div>
              )}

              {/* Tabela de Casas */}
              {showDetails && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-white print-text-dark uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-900 pb-1 mt-4">
                    <Home size={14} className="text-blue-400 print-accent" /> Evolução Física por Unidade
                  </h4>
                  <table className="w-full text-left border-collapse print-table">
                    <thead>
                      <tr className="border-b border-slate-850 text-slate-400 text-[10px] uppercase font-bold">
                        <th className="py-2.5 px-2">Lote/Quadra</th>
                        <th className="py-2.5 px-2">Empreendimento</th>
                        <th className="py-2.5 px-2 text-center">Físico (%)</th>
                        <th className="py-2.5 px-2">Estágio Atual</th>
                        <th className="py-2.5 px-2">Status Comercial</th>
                        <th className="py-2.5 px-2 text-right">Custo Realizado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850/50">
                      {filteredCasas.map(c => (
                        <tr key={c.id} className="text-slate-300 hover:bg-slate-900/10 text-[10px]">
                          <td className="py-2.5 px-2 font-bold text-white print-text-dark">Qd {c.quadra}, Casa {c.numero}</td>
                          <td className="py-2.5 px-2">{c.empreendimento.nome}</td>
                          <td className="py-2.5 px-2 text-center font-bold text-indigo-400 print-accent">{c.percentualObra}%</td>
                          <td className="py-2.5 px-2 font-medium">{getStageLabel(c.statusObra)}</td>
                          <td className="py-2.5 px-2">
                            {c.clienteId ? (
                              <span className="text-emerald-400 font-bold">Vendido ({c.cliente?.nome})</span>
                            ) : (
                              <span className="text-amber-500 font-bold">Em Estoque</span>
                            )}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono">{formatCurrency(c.totalApropriadoAprovado)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tabela de Ligações de Infraestrutura */}
              {showSummary && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-white print-text-dark uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-900 pb-1 mt-4">
                    <Lightbulb size={14} className="text-indigo-400 print-accent" /> Conexões de Utilidades e Infraestrutura
                  </h4>
                  <table className="w-full text-left border-collapse print-table">
                    <thead>
                      <tr className="border-b border-slate-850 text-slate-400 text-[10px] uppercase font-bold">
                        <th className="py-2.5 px-2">Unidade</th>
                        <th className="py-2.5 px-2 text-center">Padrão Energia</th>
                        <th className="py-2.5 px-2 text-center">Ligação Água</th>
                        <th className="py-2.5 px-2 text-center">Fossa/Saneamento</th>
                        <th className="py-2.5 px-2">Medidor Luz</th>
                        <th className="py-2.5 px-2">Medidor Água</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850/50">
                      {filteredCasas.map(c => (
                        <tr key={c.id} className="text-slate-300 text-[10px]">
                          <td className="py-2.5 px-2 font-bold text-white print-text-dark">Qd {c.quadra}, Casa {c.numero}</td>
                          <td className="py-2.5 px-2 text-center">
                            {c.infraestrutura?.padraoEnergiaInstalado ? '✅ Concluído' : '❌ Pendente'}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            {c.infraestrutura?.ligacaoAguaConcluida ? '✅ Concluído' : '❌ Pendente'}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            {c.infraestrutura?.fossaFiltroEsgotoConcluido ? '✅ Concluído' : '❌ Pendente'}
                          </td>
                          <td className="py-2.5 px-2 font-mono">{c.infraestrutura?.numeroMedidorLuz || '--'}</td>
                          <td className="py-2.5 px-2 font-mono">{c.infraestrutura?.numeroMedidorAgua || '--'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Histórico Recente de Diários de Obra */}
              {showLogs && (
                <div className="space-y-3.5">
                  <h4 className="text-xs font-bold text-white print-text-dark uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-900 pb-1 mt-4">
                    <FileText size={14} className="text-amber-400 print-accent" /> Últimos Apontamentos do Canteiro
                  </h4>
                  <div className="space-y-3">
                    {filteredCasas.flatMap(c => (c.diarios || []).map((d: any) => ({ ...d, casaNum: c.numero, casaQd: c.quadra }))).slice(0, 8).map((d: any, idx) => (
                      <div key={idx} className="p-3 bg-[#0f1422] border border-slate-850 rounded-xl print-card space-y-1.5 text-[10px]">
                        <div className="flex justify-between items-center text-slate-400 print-text-muted">
                          <span className="font-bold text-white print-text-dark">Casa {d.casaNum} - Quadra {d.casaQd}</span>
                          <span>Data: {formatDate(d.data)} | Clima: <strong>{d.clima}</strong> | Trabalhadores: <strong>{d.efetivoTrabalhadores}</strong></span>
                        </div>
                        <p className="text-slate-300 print-text-muted leading-relaxed">
                          <strong>Atividades:</strong> {d.atividadesExecutadas}
                        </p>
                        {d.ocorrencias && (
                          <p className="text-amber-500/90 print-accent italic">
                            <strong>Ocorrências:</strong> {d.ocorrencias}
                          </p>
                        )}
                      </div>
                    ))}
                    {filteredCasas.reduce((acc, c) => acc + (c.diarios?.length || 0), 0) === 0 && (
                      <p className="text-slate-500 italic text-center py-4">Nenhum apontamento diário registrado no período.</p>
                    )}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ================= MODELO: FICHA TÉCNICA & MARCOS ================= */}
          {reportType === 'PROJETO' && (
            <div className="mt-6 space-y-6">
              
              {/* KPIs Resumo do Empreendimento */}
              {showSummary && filteredEmp && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-[#0f1422] p-4 rounded-xl border border-slate-850 print-card text-center space-y-1">
                    <span className="text-[8px] text-slate-500 uppercase tracking-wider block font-bold">Fase Legal Atual</span>
                    <span className="text-base font-bold text-indigo-400 print-accent">{filteredEmp.statusLegal.replace('_', ' ')}</span>
                  </div>
                  <div className="bg-[#0f1422] p-4 rounded-xl border border-slate-850 print-card text-center space-y-1">
                    <span className="text-[8px] text-slate-500 uppercase tracking-wider block font-bold">Marcos Legalizados</span>
                    <span className="text-base font-bold text-emerald-400 print-accent">
                      {filteredEmp.marcos.filter((m: any) => m.concluido).length} / {filteredEmp.marcos.length}
                    </span>
                  </div>
                  <div className="bg-[#0f1422] p-4 rounded-xl border border-slate-850 print-card text-center space-y-1">
                    <span className="text-[8px] text-slate-500 uppercase tracking-wider block font-bold">Data de Início do Empreendimento</span>
                    <span className="text-base font-bold text-slate-350 print-text-dark">{formatDate(filteredEmp.dataInicio)}</span>
                  </div>
                </div>
              )}

              {/* Ficha Técnica Detalhada */}
              {showDetails && filteredEmp && (
                <div className="space-y-3.5">
                  <h4 className="text-xs font-bold text-white print-text-dark uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-900 pb-1 mt-4">
                    <Building2 size={14} className="text-blue-400 print-accent" /> Ficha de Registro e Localização
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[10px]">
                    <div className="bg-[#0f1422] p-4 rounded-xl border border-slate-850 print-card space-y-2 text-slate-300 print-text-muted">
                      <p><strong>Nome:</strong> {filteredEmp.nome}</p>
                      <p><strong>Localização:</strong> {filteredEmp.localizacao}</p>
                      <p><strong>CNPJ Associado:</strong> {filteredEmp.cnpj || 'Não cadastrado'}</p>
                      <p><strong>Registro RI (Matrícula):</strong> {filteredEmp.registroIncorporacao || 'Pendente'}</p>
                    </div>
                    <div className="bg-[#0f1422] p-4 rounded-xl border border-slate-850 print-card space-y-2 text-slate-300 print-text-muted">
                      <p><strong>Status Geral:</strong> {filteredEmp.statusLegal}</p>
                      <p><strong>Prazo Previsto de Conclusão:</strong> {formatDate(filteredEmp.dataFim)}</p>
                      <p><strong>Orçamento Estimado:</strong> {formatCurrency(filteredEmp.orcamento || 0)}</p>
                      <p><strong>Total de Unidades Planejadas:</strong> {casas.filter(c => c.empreendimentoId === filteredEmp.id).length} casas</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Marcos Legais / Cronograma */}
              {showDetails && filteredEmp && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-white print-text-dark uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-900 pb-1 mt-4">
                    <Calendar size={14} className="text-indigo-400 print-accent" /> Cronograma de Aprovações e Marcos Legais
                  </h4>
                  <table className="w-full text-left border-collapse print-table">
                    <thead>
                      <tr className="border-b border-slate-850 text-slate-400 text-[10px] uppercase font-bold">
                        <th className="py-2.5 px-2">Marco / Etapa</th>
                        <th className="py-2.5 px-2">Descrição</th>
                        <th className="py-2.5 px-2">Prazo Estimado</th>
                        <th className="py-2.5 px-2 text-center">Conclusão Efetiva</th>
                        <th className="py-2.5 px-2 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850/50">
                      {filteredEmp.marcos.map((m: any) => {
                        const isConcluido = m.dataAprovacaoReal !== null;
                        const isAtrasado = !isConcluido && new Date(m.dataLimite) < new Date();
                        
                        return (
                          <tr key={m.id} className="text-slate-300 text-[10px]">
                            <td className="py-2.5 px-2 font-bold text-white print-text-dark">{getMarcoLabel(m.tipo)}</td>
                            <td className="py-2.5 px-2">{getMarcoDesc(m.tipo)}</td>
                            <td className="py-2.5 px-2 font-mono">{formatDate(m.dataLimite)}</td>
                            <td className="py-2.5 px-2 text-center font-mono">{formatDate(m.dataAprovacaoReal)}</td>
                            <td className="py-2.5 px-2 text-right font-bold">
                              {isConcluido ? (
                                <span className="text-emerald-400">✓ Concluído</span>
                              ) : isAtrasado ? (
                                <span className="text-red-500">⚠️ Atrasado</span>
                              ) : (
                                <span className="text-amber-500">Pendente</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {filteredEmp.marcos.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-slate-500 italic">
                            Nenhum marco cadastrado para este empreendimento.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {!filteredEmp && (
                <div className="p-8 text-center text-slate-500 italic">
                  Selecione um empreendimento específico no menu esquerdo para gerar o relatório de Marcos Legais.
                </div>
              )}

            </div>
          )}

          {/* ================= MODELO: FINANCEIRO & CUSTOS ================= */}
          {reportType === 'FINANCEIRO' && (
            <div className="mt-6 space-y-6">
              
              {/* KPIs Financeiros */}
              {showSummary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-[#0f1422] p-4 rounded-xl border border-slate-850 print-card text-center space-y-1">
                    <span className="text-[8px] text-slate-500 uppercase tracking-wider block font-bold">Orçamento Planejado</span>
                    <span className="text-base font-bold text-white print-text-dark">{formatCurrency(orcadoTotal)}</span>
                  </div>
                  <div className="bg-[#0f1422] p-4 rounded-xl border border-slate-850 print-card text-center space-y-1">
                    <span className="text-[8px] text-slate-500 uppercase tracking-wider block font-bold">Custo Apropriado (Real)</span>
                    <span className="text-base font-bold text-indigo-400 print-accent">{formatCurrency(realizadoTotal)}</span>
                  </div>
                  <div className="bg-[#0f1422] p-4 rounded-xl border border-slate-850 print-card text-center space-y-1">
                    <span className="text-[8px] text-slate-500 uppercase tracking-wider block font-bold">Margem do Projeto</span>
                    <span className={`text-base font-bold ${orcadoTotal - realizadoTotal >= 0 ? 'text-emerald-400' : 'text-red-500'} print-accent`}>
                      {formatCurrency(orcadoTotal - realizadoTotal)}
                    </span>
                  </div>
                  <div className="bg-[#0f1422] p-4 rounded-xl border border-slate-850 print-card text-center space-y-1">
                    <span className="text-[8px] text-slate-500 uppercase tracking-wider block font-bold">Glosa Acumulada</span>
                    <span className="text-base font-bold text-red-500 print-accent">{formatCurrency(totalGlosado)}</span>
                  </div>
                </div>
              )}

              {/* Demonstrativo por Lote */}
              {showDetails && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-white print-text-dark uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-900 pb-1 mt-4">
                    <SlidersHorizontal size={14} className="text-indigo-400 print-accent" /> Balanço de Custos por Casa/Lote
                  </h4>
                  <table className="w-full text-left border-collapse print-table">
                    <thead>
                      <tr className="border-b border-slate-850 text-slate-400 text-[10px] uppercase font-bold">
                        <th className="py-2.5 px-2">Unidade / Cliente</th>
                        <th className="py-2.5 px-2">Empreendimento</th>
                        <th className="py-2.5 px-2 text-right">Custo Orçado</th>
                        <th className="py-2.5 px-2 text-right">Custo Realizado</th>
                        <th className="py-2.5 px-2 text-right">Saldo de Margem</th>
                        <th className="py-2.5 px-2 text-right">Percentual Utilizado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850/50">
                      {filteredCasas.map(c => {
                        const orcadoCasa = (c.orcamento?.itens || []).reduce((s: number, item: any) => s + (item.quantidadePlanejada * item.custoUnitarioPrevisto), 0);
                        const realizadoCasa = (c.apropriacoes || []).filter((ap: any) => ap.aprovado).reduce((s: number, ap: any) => s + ap.custoTotal, 0);
                        const saldoMargem = orcadoCasa - realizadoCasa;
                        const percentUsado = orcadoCasa > 0 ? Math.round((realizadoCasa / orcadoCasa) * 100) : 0;

                        return (
                          <tr key={c.id} className="text-slate-300 text-[10px]">
                            <td className="py-2.5 px-2 font-bold text-white print-text-dark">Qd {c.quadra}, Casa {c.numero} {c.clienteId ? `(${c.cliente?.nome.split(' ')[0]})` : ''}</td>
                            <td className="py-2.5 px-2">{c.empreendimento.nome}</td>
                            <td className="py-2.5 px-2 text-right font-mono">{formatCurrency(orcadoCasa)}</td>
                            <td className="py-2.5 px-2 text-right font-mono text-indigo-400 print-accent">{formatCurrency(realizadoCasa)}</td>
                            <td className={`py-2.5 px-2 text-right font-mono font-bold ${saldoMargem >= 0 ? 'text-emerald-400' : 'text-red-500'}`}>{formatCurrency(saldoMargem)}</td>
                            <td className="py-2.5 px-2 text-right font-mono font-medium">{percentUsado}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Detalhe Geral das Últimas Apropriações */}
              {showFinancials && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-white print-text-dark uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-900 pb-1 mt-4">
                    <DollarSign size={14} className="text-emerald-400 print-accent" /> Últimas Apropriações de Custos de Campo
                  </h4>
                  <table className="w-full text-left border-collapse print-table">
                    <thead>
                      <tr className="border-b border-slate-850 text-slate-400 text-[10px] uppercase font-bold">
                        <th className="py-2.5 px-2">Data</th>
                        <th className="py-2.5 px-2">Unidade</th>
                        <th className="py-2.5 px-2">Insumo</th>
                        <th className="py-2.5 px-2">Categoria</th>
                        <th className="py-2.5 px-2 text-center">Qtd Aplicada</th>
                        <th className="py-2.5 px-2 text-right">Valor Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850/50">
                      {filteredCasas.flatMap(c => (c.apropriacoes || []).map((ap: any) => ({ ...ap, casaNum: c.numero, casaQd: c.quadra }))).slice(0, 15).map((ap: any, idx) => (
                        <tr key={idx} className="text-slate-300 text-[10px]">
                          <td className="py-2.5 px-2 font-mono">{formatDate(ap.dataAplicacao)}</td>
                          <td className="py-2.5 px-2 font-bold text-white print-text-dark">Qd {ap.casaQd}, Casa {ap.casaNum}</td>
                          <td className="py-2.5 px-2 font-semibold">{ap.insumo.nome}</td>
                          <td className="py-2.5 px-2">{ap.insumo.categoria}</td>
                          <td className="py-2.5 px-2 text-center font-mono">{ap.quantidadeReal} {ap.insumo.unidadeMedida}</td>
                          <td className="py-2.5 px-2 text-right font-mono text-indigo-400 print-accent">{formatCurrency(ap.custoTotal)}</td>
                        </tr>
                      ))}
                      {filteredCasas.reduce((acc, c) => acc + (c.apropriacoes?.length || 0), 0) === 0 && (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-slate-500 italic">
                            Nenhuma apropriação de custo registrada no período.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

            </div>
          )}

          {/* Rodapé da folha de relatório */}
          <div className="border-t border-slate-900/60 pt-6 mt-8 flex justify-between items-center text-[10px] text-slate-500 print-text-muted">
            <span>Relatório gerado automaticamente via ERP Masar</span>
            <span className="font-mono">Página 1 de 1</span>
          </div>

        </div>

      </div>

    </div>
  );
}
