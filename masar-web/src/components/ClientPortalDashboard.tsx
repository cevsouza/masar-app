'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Building2, 
  Home, 
  Calendar, 
  FileText, 
  Download, 
  LogOut, 
  Percent, 
  CheckCircle2, 
  AlertCircle,
  Upload,
  Clock,
  User,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  Loader2,
  AlertTriangle
} from 'lucide-react';

interface Parcela {
  id: string;
  numeroParcela: number;
  valor: number;
  dataVencimento: string | Date;
  pago: boolean;
}

interface ClienteData {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  etapaAtual: string;
  contrachequeUrl: string | null;
  contratos: {
    id: string;
    valorVenda: number;
    entrada: number;
    financiamento: number;
    status: string;
    casa: {
      id: string;
      numero: string;
      statusObra: string;
      percentualObra: number;
      prazoFisico: string | Date | null;
      prazoFinanceiro: string | Date | null;
      empreendimento: { nome: string };
      documentos: { id: string; nome: string; caminhoArquivo: string }[];
    };
    contasReceber: Parcela[];
    corretor: { nome: string; creci: string } | null;
  }[];
}

interface ClientPortalDashboardProps {
  cliente: ClienteData;
}

// Mapeamento dos 7 estágios da jornada
const JORNADA_ETAPAS = [
  { key: 'CAPTACAO', label: 'Prospecção', desc: 'Primeiro contato e cadastro inicial' },
  { key: 'SIMULACAO_SICAQ', label: 'Simulação Caixa', desc: 'Avaliação de crédito preliminar' },
  { key: 'UPLOAD_DOCUMENTOS', label: 'Envio de Documentos', desc: 'Envio de RG e contracheques' },
  { key: 'APROVACAO_BANCARIA', label: 'Aprovação CEF', desc: 'Análise de crédito na Caixa Econômica' },
  { key: 'ASSINATURA_DIGITAL', label: 'Assinatura Contrato', desc: 'Assinatura eletrônica do contrato de compra' },
  { key: 'PAGAMENTO_ENTRADA', label: 'Pagamento Entrada', desc: 'Sinal e parcelas de entrada da construtora' },
  { key: 'CHAVES_ENTREGUES', label: 'Chaves Entregues', desc: 'Unidade finalizada e chaves entregues!' }
];

export default function ClientPortalDashboard({ cliente }: ClientPortalDashboardProps) {
  const router = useRouter();
  const contratoAtivo = cliente.contratos[0];
  
  const [uploading, setUploading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Calcula etapa numérica (1 a 7)
  const activeStepIndex = JORNADA_ETAPAS.findIndex(e => e.key === cliente.etapaAtual);
  const currentStepNum = activeStepIndex === -1 ? 1 : activeStepIndex + 1;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  // Upload de arquivos contracheque/RG
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, tipo: 'contracheque' | 'rg') => {
    if (!e.target.files || !e.target.files[0]) return;

    setUploading(tipo);
    setFeedback(null);
    const file = e.target.files[0];

    const formData = new FormData();
    formData.append('file', file);
    formData.append('tipo', tipo);

    try {
      const response = await fetch('/api/cliente/documentos', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Falha no envio do arquivo.');
      }

      setFeedback(`✓ ${tipo.toUpperCase()} enviado com sucesso! Etapa avançada.`);
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploading(null);
    }
  };

  // Fotos para o carrossel (se não houver fotos reais no GED, exibe fotos demonstrativas estéticas de canteiro)
  const mockObraPhotos = [
    { url: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=600&q=80', caption: 'Fundação da Unidade Concluída' },
    { url: 'https://images.unsplash.com/photo-1590069261209-f8e9b8642343?auto=format&fit=crop&w=600&q=80', caption: 'Erguimento de Alvenaria das Paredes' },
    { url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=600&q=80', caption: 'Estruturação da Laje e Telhas' }
  ];

  const [activePhotoIdx, setActivePhotoIdx] = useState(0);

  // Determinar tarefas pendentes baseadas na etapa atual
  const pendingTasks = [];
  if (!cliente.contrachequeUrl) {
    pendingTasks.push({ id: 'doc', label: 'Enviar holerite/contracheque comprovante de renda', type: 'contracheque' });
  }
  if (contratoAtivo && contratoAtivo.status !== 'ASSINADO_CAIXA') {
    pendingTasks.push({ id: 'signature', label: 'Assinar contrato de venda (Assinatura Eletrônica pendente)', type: 'assinatura' });
  }
  if (contratoAtivo && contratoAtivo.contasReceber.some(p => p.numeroParcela === 0 && !p.pago)) {
    pendingTasks.push({ id: 'downpayment', label: 'Efetuar pagamento do boleto de sinal/entrada', type: 'boleto' });
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-300">
      {/* Header */}
      <header className="bg-[#0f1422] border-b border-slate-800/80 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-600 rounded-xl text-white shadow-lg shadow-emerald-500/20">
            <Building2 size={20} />
          </div>
          <div>
            <span className="font-extrabold text-base text-white tracking-wide block font-sans">MASAR</span>
            <span className="text-[10px] text-emerald-400 font-semibold tracking-wider uppercase block">Portal do Cliente</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <span className="text-xs text-slate-400 block">Proprietário</span>
            <span className="text-xs font-bold text-white block">{cliente.nome}</span>
          </div>

          <form action="/api/auth/cliente/logout" method="POST">
            <button
              type="submit"
              className="p-2.5 bg-slate-800/40 hover:bg-red-500/10 border border-slate-800 hover:border-red-500/20 rounded-xl text-slate-400 hover:text-red-400 transition cursor-pointer"
              title="Sair do Portal"
            >
              <LogOut size={16} />
            </button>
          </form>
        </div>
      </header>

      {/* Corpo Principal */}
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        
        {/* Stepper Superior da Jornada do Comprador */}
        <div className="glassmorphism p-6 rounded-2xl border border-slate-800/80 space-y-6">
          <div className="flex justify-between items-baseline">
            <div>
              <h3 className="text-base font-bold text-white">Sua Jornada de Aquisição</h3>
              <p className="text-xs text-slate-400 mt-1">Você está no estágio <strong>{currentStepNum} de 7</strong> da sua compra</p>
            </div>
            <span className="text-xs text-emerald-450 font-bold bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/15">
              Etapa: {JORNADA_ETAPAS[currentStepNum - 1]?.label}
            </span>
          </div>

          {/* Stepper Horizontal */}
          <div className="relative pt-4 hidden md:block">
            <div className="absolute top-8 left-4 right-4 h-0.5 bg-slate-800 -z-10" />
            <div 
              className="absolute top-8 left-4 h-0.5 bg-emerald-500 -z-10 transition-all duration-300"
              style={{ width: `${((currentStepNum - 1) / 6) * 100}%` }}
            />

            <div className="flex justify-between items-start text-center">
              {JORNADA_ETAPAS.map((etapa, idx) => {
                const stepIdx = idx + 1;
                const isCompleted = stepIdx < currentStepNum;
                const isActive = stepIdx === currentStepNum;

                return (
                  <div key={etapa.key} className="flex flex-col items-center max-w-[120px]">
                    <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs transition duration-300 ${
                      isCompleted 
                        ? 'bg-emerald-600 border-emerald-500 text-white' 
                        : isActive 
                        ? 'bg-blue-600 border-blue-500 text-white animate-pulse'
                        : 'bg-[#0f1422] border-slate-800 text-slate-500'
                    }`}>
                      {isCompleted ? '✓' : stepIdx}
                    </div>
                    <span className={`text-[10px] font-bold mt-2 ${isActive ? 'text-white' : 'text-slate-500'}`}>
                      {etapa.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Lado Esquerdo: Casa, Carrossel de Fotos, Uploads */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Bloco 1: Minha Unidade e Progresso de Obra */}
            {contratoAtivo && (
              <div className="glassmorphism p-6 rounded-2xl border border-slate-800/80 space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Home size={18} className="text-emerald-450" /> Casa {contratoAtivo.casa.numero} - {contratoAtivo.casa.empreendimento.nome}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">Status Físico: {contratoAtivo.casa.statusObra.replace('_', ' ')}</p>
                  </div>
                  <div className="flex items-center gap-1 text-white font-bold text-sm bg-slate-900 px-3 py-1 rounded-xl border border-slate-800 font-mono">
                    <Percent size={12} /> {contratoAtivo.casa.percentualObra}% Concluído
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-[#0a0d16] rounded-full h-3 border border-slate-900 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-emerald-600 to-teal-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${contratoAtivo.casa.percentualObra}%` }}
                  />
                </div>

                {/* Carrossel de Fotos da Obra */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Diário Fotográfico de Construção</h4>
                  <div className="relative h-64 bg-[#0a0d16] rounded-2xl border border-slate-900 overflow-hidden group">
                    <img 
                      src={mockObraPhotos[activePhotoIdx].url} 
                      alt="Etapa Obra"
                      className="w-full h-full object-cover opacity-85 transition-all duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent flex items-end p-4">
                      <p className="text-xs text-white font-semibold">{mockObraPhotos[activePhotoIdx].caption}</p>
                    </div>

                    <button 
                      onClick={() => setActivePhotoIdx((prev) => (prev === 0 ? mockObraPhotos.length - 1 : prev - 1))}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 p-2 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 rounded-full text-white cursor-pointer"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button 
                      onClick={() => setActivePhotoIdx((prev) => (prev === mockObraPhotos.length - 1 ? 0 : prev + 1))}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 rounded-full text-white cursor-pointer"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Bloco 2: Área de Documentação e Upload de Documentos */}
            <div className="glassmorphism p-6 rounded-2xl border border-slate-800/80 space-y-4">
              <h3 className="text-sm font-bold text-white">Central de Documentação do Comprador</h3>
              <p className="text-xs text-slate-400">Faça o envio dos seus comprovantes cadastrais para acelerar o processo de aprovação na Caixa Econômica.</p>
              
              {feedback && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs flex items-center gap-2">
                  <ShieldCheck size={16} />
                  <span>{feedback}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {/* Upload Contracheque */}
                <div className="bg-[#0f1422] p-4 rounded-xl border border-slate-850 flex flex-col justify-between space-y-3 relative">
                  <div>
                    <h4 className="font-bold text-white text-xs">Comprovante de Renda</h4>
                    <p className="text-[10px] text-slate-500 mt-1">Holerite ou contracheque consolidado dos últimos 3 meses (PDF).</p>
                  </div>
                  {cliente.contrachequeUrl ? (
                    <span className="text-[10px] text-emerald-450 font-bold bg-emerald-950/20 border border-emerald-900/30 px-2.5 py-1.5 rounded-lg text-center">
                      ✓ Contracheque Enviado
                    </span>
                  ) : (
                    <div className="relative border border-dashed border-slate-800 hover:border-slate-700/60 rounded-xl p-3 text-center cursor-pointer transition">
                      <input 
                        type="file" 
                        accept=".pdf"
                        disabled={uploading !== null}
                        onChange={(e) => handleFileUpload(e, 'contracheque')}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      <span className="text-[10px] text-blue-400 font-bold flex items-center justify-center gap-1">
                        {uploading === 'contracheque' ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                        Anexar Contracheque
                      </span>
                    </div>
                  )}
                </div>

                {/* Upload RG */}
                <div className="bg-[#0f1422] p-4 rounded-xl border border-slate-850 flex flex-col justify-between space-y-3 relative">
                  <div>
                    <h4 className="font-bold text-white text-xs">Documento de Identidade (RG/CNH)</h4>
                    <p className="text-[10px] text-slate-500 mt-1">Frente e verso nítidos do documento oficial de identificação.</p>
                  </div>
                  <div className="relative border border-dashed border-slate-800 hover:border-slate-700/60 rounded-xl p-3 text-center cursor-pointer transition">
                    <input 
                      type="file" 
                      accept=".pdf,.png,.jpg,.jpeg"
                      disabled={uploading !== null}
                      onChange={(e) => handleFileUpload(e, 'rg')}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <span className="text-[10px] text-blue-400 font-bold flex items-center justify-center gap-1">
                      {uploading === 'rg' ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                      Anexar Cópia do RG
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Lado Direito: Tarefas Pendentes e Boletos */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Bloco 3: Tarefas Pendentes da Jornada */}
            <div className="glassmorphism p-5 rounded-2xl border border-slate-800/80 space-y-4">
              <h3 className="text-sm font-bold text-white">Suas Pendências Cadastrais</h3>
              
              <div className="space-y-3">
                {pendingTasks.map(task => (
                  <div key={task.id} className="p-3 bg-slate-900/50 border border-slate-800/60 rounded-xl flex items-start gap-2.5 text-xs text-slate-400">
                    <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={14} />
                    <div>
                      <span className="font-semibold text-slate-300 block">{task.label}</span>
                      {task.type === 'contracheque' && (
                        <span className="text-[10px] text-blue-400 hover:underline block mt-1">Use a caixa ao lado para enviar</span>
                      )}
                      {task.type === 'assinatura' && (
                        <span className="text-[10px] text-blue-400 hover:underline block mt-1">Aguarde o link ZapSign no seu e-mail</span>
                      )}
                    </div>
                  </div>
                ))}

                {pendingTasks.length === 0 && (
                  <div className="text-center py-6 text-slate-500 space-y-1">
                    <CheckCircle2 className="text-emerald-400 mx-auto" size={24} />
                    <p className="font-bold text-white text-xs">Tudo em conformidade!</p>
                    <p className="text-[10px]">Nenhuma ação pendente na sua jornada.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Bloco 4: Contas / Boletos */}
            {contratoAtivo && (
              <div className="glassmorphism p-5 rounded-2xl border border-slate-800/80 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileText size={16} className="text-emerald-450" /> Parcelas e Boletos
                </h3>

                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {contratoAtivo.contasReceber.map(parcela => (
                    <div 
                      key={parcela.id} 
                      className="bg-[#0f1422] p-3 rounded-xl border border-slate-850 flex justify-between items-center text-xs"
                    >
                      <div className="space-y-0.5">
                        <p className="font-semibold text-slate-200">
                          {parcela.numeroParcela === 0 ? 'Sinal / Entrada' : `Parcela ${parcela.numeroParcela}`}
                        </p>
                        <p className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                          <Calendar size={10} /> Vence: {formatDate(parcela.dataVencimento)}
                        </p>
                        <p className="font-bold text-white font-mono mt-1">{formatCurrency(parcela.valor)}</p>
                      </div>

                      <div>
                        {parcela.pago ? (
                          <span className="text-[9px] text-emerald-450 font-bold bg-emerald-950/20 border border-emerald-900/30 px-2 py-1 rounded-lg block">
                            Pago
                          </span>
                        ) : (
                          // NÃO reintroduzir geração de boleto no cliente.
                          // Aqui havia um alert() com boleto FABRICADO: favorecido fixo,
                          // banco 104 e linha digitável inventada. Enquanto o app era de
                          // uso próprio era mock inofensivo; para um comprador de casa é
                          // uma linha digitável falsa que ele pode tentar pagar.
                          // Só volta como integração real de cobrança (banco/PSP).
                          <span className="text-[9px] text-slate-400 font-semibold bg-slate-800/40 border border-slate-700/40 px-2 py-1 rounded-lg block">
                            Em aberto
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>

      </main>
    </div>
  );
}
