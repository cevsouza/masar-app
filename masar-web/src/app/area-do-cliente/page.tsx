import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/auth';
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
  Clock,
  User
} from 'lucide-react';

export const revalidate = 0;

export default async function AreaDoClientePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('masar_client_session')?.value;

  if (!token) {
    redirect('/area-do-cliente/login');
  }

  const session = await verifySession(token);
  if (!session || session.role !== 'CLIENT') {
    redirect('/area-do-cliente/login');
  }

  // Buscar dados do cliente logado
  const cliente = await db.cliente.findUnique({
    where: { id: session.clienteId },
    include: {
      contratos: {
        include: {
          casa: {
            include: {
              empreendimento: true,
              documentos: true
            }
          },
          contasReceber: {
            orderBy: { numeroParcela: 'asc' }
          },
          corretor: true
        }
      }
    }
  });

  if (!cliente) {
    redirect('/area-do-cliente/login');
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(val);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const mapStatusObra = (status: string) => {
    switch (status) {
      case 'SEM_INICIO': return 'Sem Início';
      case 'FUNDACAO': return 'Fundação';
      case 'ALVENARIA': return 'Alvenaria';
      case 'COBERTURA': return 'Cobertura';
      case 'ACABAMENTO': return 'Acabamento';
      case 'CONCLUIDA': return 'Concluída';
      default: return status;
    }
  };

  // Pega o contrato ativo principal do cliente
  const contratoAtivo = cliente.contratos[0];

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
            <span className="text-xs text-slate-400 block">Bem-vindo(a),</span>
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

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {!contratoAtivo ? (
          <div className="glassmorphism p-8 rounded-2xl border border-slate-850 text-center space-y-3">
            <AlertCircle size={36} className="text-amber-400 mx-auto" />
            <h2 className="text-white font-bold text-base">Nenhum contrato ativo encontrado</h2>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Seu cadastro foi realizado, mas não identificamos nenhum contrato de compra associado à sua conta. Entre em contato com seu corretor.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Lado Esquerdo: Progresso e Casa */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Box 1: Progresso Físico da Obra */}
              <div className="glassmorphism p-6 rounded-2xl border border-slate-800/80 space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Home size={18} className="text-emerald-450" /> Sua Unidade: Casa {contratoAtivo.casa.numero}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Empreendimento: {contratoAtivo.casa.empreendimento.nome}
                    </p>
                  </div>
                  <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase">
                    Estágio: {mapStatusObra(contratoAtivo.casa.statusObra)}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-400">Progresso Físico de Obra</span>
                    <span className="text-white font-mono flex items-center gap-0.5"><Percent size={12} />{contratoAtivo.casa.percentualObra}%</span>
                  </div>
                  <div className="w-full bg-[#0a0d16] rounded-full h-3.5 border border-slate-900 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-emerald-600 to-teal-500 h-full rounded-full transition-all duration-500 shadow-md"
                      style={{ width: `${contratoAtivo.casa.percentualObra}%` }}
                    />
                  </div>
                </div>

                {/* Datas Estimadas */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800/60 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">Prazo de Conclusão Física</span>
                    <span className="text-white font-bold mt-1 block">
                      {contratoAtivo.casa.prazoFisico ? formatDate(contratoAtivo.casa.prazoFisico) : 'Em definição'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Previsão Entrega de Chaves</span>
                    <span className="text-white font-bold mt-1 block">
                      {contratoAtivo.casa.prazoFinanceiro ? formatDate(contratoAtivo.casa.prazoFinanceiro) : 'Em definição'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Box 2: Cronograma Financeiro Geral */}
              <div className="glassmorphism p-6 rounded-2xl border border-slate-800/80 space-y-4">
                <h3 className="text-sm font-bold text-white">Resumo Geral do Contrato</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-[#0f1422] p-3.5 rounded-xl border border-slate-850">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Valor da Unidade</span>
                    <p className="text-sm font-bold text-white mt-1 font-mono">{formatCurrency(contratoAtivo.valorVenda)}</p>
                  </div>
                  <div className="bg-[#0f1422] p-3.5 rounded-xl border border-slate-850">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Total Pago</span>
                    <p className="text-sm font-bold text-emerald-400 mt-1 font-mono">
                      {formatCurrency(contratoAtivo.contasReceber.filter(p => p.pago).reduce((acc, c) => acc + c.valor, 0) + contratoAtivo.entrada)}
                    </p>
                  </div>
                  <div className="bg-[#0f1422] p-3.5 rounded-xl border border-slate-850">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Financiamento Caixa</span>
                    <p className="text-sm font-bold text-sky-400 mt-1 font-mono">{formatCurrency(contratoAtivo.financiamento)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Lado Direito: Boletos / Parcelas */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Box 3: Parcelas e Download de Boletos */}
              <div className="glassmorphism p-5 rounded-2xl border border-slate-800/80 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileText size={16} className="text-emerald-450" /> Parcelas e Boletos
                </h3>

                <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                  {contratoAtivo.contasReceber.map(parcela => (
                    <div 
                      key={parcela.id} 
                      className="bg-[#0f1422] p-3 rounded-xl border border-slate-850 flex justify-between items-center text-xs"
                    >
                      <div className="space-y-0.5">
                        <p className="font-semibold text-slate-200">Parcela {parcela.numeroParcela}</p>
                        <p className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                          <Calendar size={10} /> Vence: {formatDate(parcela.dataVencimento)}
                        </p>
                        <p className="font-bold text-white font-mono mt-1">{formatCurrency(parcela.valor)}</p>
                      </div>

                      <div>
                        {parcela.pago ? (
                          <div className="flex items-center gap-1 text-emerald-400 font-semibold text-[10px] uppercase bg-emerald-950/20 border border-emerald-900/30 px-2 py-1 rounded-lg">
                            <CheckCircle2 size={12} /> Pago
                          </div>
                        ) : (
                          <a
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              alert(`Boleto Gerado!\nInstruções:\nFavorecido: Masar Empreendimentos LTDA\nBanco: 104 - Caixa Econômica Federal\nValor: ${formatCurrency(parcela.valor)}\nLinha Digitável: 10490.12345 67890.123456 78901.234567 1 999900000${Math.floor(parcela.valor)}`);
                            }}
                            className="flex items-center gap-1 text-blue-400 hover:text-white font-semibold text-[10px] uppercase bg-blue-950/20 border border-blue-900/30 px-2.5 py-1.5 rounded-lg transition hover:bg-blue-600"
                          >
                            <Download size={12} /> Boleto
                          </a>
                        )}
                      </div>
                    </div>
                  ))}

                  {contratoAtivo.contasReceber.length === 0 && (
                    <p className="text-xs text-slate-500 text-center py-6">Nenhuma parcela cadastrada no cronograma.</p>
                  )}
                </div>
              </div>

              {/* Box 4: Atendimento do Corretor */}
              {contratoAtivo.corretor && (
                <div className="glassmorphism p-4 rounded-2xl border border-slate-800/60 flex items-center gap-3">
                  <div className="p-2.5 bg-slate-800 rounded-xl text-slate-400">
                    <User size={18} />
                  </div>
                  <div className="text-xs">
                    <span className="text-slate-500 block uppercase font-bold text-[9px] tracking-wider">Seu Gestor de Conta</span>
                    <span className="text-white font-bold block">{contratoAtivo.corretor.nome}</span>
                    <span className="text-[10px] text-slate-400 block font-mono">CRECI: {contratoAtivo.corretor.creci}</span>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
