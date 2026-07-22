import { db } from '@/lib/db';
import { Building2, Calendar, ShoppingBag, Truck, DollarSign, Upload, CheckCircle } from 'lucide-react';
import { runSemEscopoDeEmpresa } from '@/lib/tenant';
import { identidadeVisualDaEmpresa } from '@/lib/empresaVisual';
import SupplierQuoteForm from '@/components/SupplierQuoteForm';

interface PageProps {
  params: Promise<{ token: string }>;
}

export const revalidate = 0;

export default async function SupplierQuotePage({ params }: PageProps) {
  const { token } = await params;

  // Página pública: quem abre é o FORNECEDOR do cliente, sem conta no sistema.
  // O token secreto da URL é a credencial e é o que identifica o tenant, então
  // a busca roda sem escopo — é ela que descobre de qual empresa é a cotação.
  const solicitacao = await runSemEscopoDeEmpresa(() =>
    db.solicitacaoCompra.findUnique({
      where: { tokenCotacao: token },
      include: {
        insumo: true,
        casa: {
          include: { empreendimento: true }
        },
        empreendimento: true
      }
    })
  );

  if (!solicitacao) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center p-4">
        <div className="glassmorphism max-w-md w-full p-8 rounded-2xl border border-slate-800 text-center space-y-4 shadow-2xl">
          <AlertCircleIcon className="text-red-500 mx-auto w-12 h-12" />
          <h2 className="text-xl font-bold text-white">Link de Cotação Inválido</h2>
          <p className="text-xs text-slate-400">
            Este link expirou, foi cancelado ou não existe no sistema da construtora. Verifique com o setor de suprimentos.
          </p>
        </div>
      </div>
    );
  }

  // O link não pode ser eterno. Sem esta checagem, um fornecedor que recebeu o
  // endereço meses atrás continuava conseguindo lançar preço num processo já
  // decidido — e o token, sendo @unique e permanente, nunca caducava.
  const ABERTAS_PARA_COTACAO = ['PENDENTE', 'ABERTA', 'EM_COTACAO'];
  if (!ABERTAS_PARA_COTACAO.includes(solicitacao.status)) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center p-4">
        <div className="glassmorphism max-w-md w-full p-8 rounded-2xl border border-slate-800 text-center space-y-4 shadow-2xl">
          <AlertCircleIcon className="text-amber-500 mx-auto w-12 h-12" />
          <h2 className="text-xl font-bold text-white">Cotação Encerrada</h2>
          <p className="text-xs text-slate-400">
            Esta solicitação não está mais recebendo propostas. Se você acredita que
            deveria estar aberta, fale com o setor de suprimentos da construtora.
          </p>
        </div>
      </div>
    );
  }

  // A marca aqui é a da CONSTRUTORA cliente, não a nossa: quem lê esta página é
  // o fornecedor dela, e ver a marca de outra empresa levantaria a pergunta
  // errada no meio de uma cotação.
  const marca = await identidadeVisualDaEmpresa(solicitacao.empresaId);

  // Nome do projeto destino
  const localDestino = solicitacao.casa
    ? `${solicitacao.casa.empreendimento.nome} - Casa ${solicitacao.casa.numero}`
    : solicitacao.empreendimento?.nome || 'Estoque Geral';

  return (
    <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center p-4 py-12">
      <div className="max-w-xl w-full space-y-6">
        {/* Marca da construtora cliente */}
        <div className="flex flex-col items-center">
          {marca.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={marca.logoUrl} alt={marca.nome} className="h-14 w-auto max-w-[220px] object-contain" />
          ) : (
            <div
              className="p-3 rounded-2xl text-white shadow-lg"
              style={{ backgroundColor: marca.corPrimaria }}
            >
              <Building2 size={36} />
            </div>
          )}
          <h2 className="mt-4 text-center text-2xl font-bold text-white font-sans">
            Portal do Fornecedor
          </h2>
          <p className="text-xs text-slate-400 mt-1">{marca.nome} — Cotação de Preços</p>
        </div>

        {/* Informações da Demanda */}
        <div className="glassmorphism p-6 rounded-2xl border border-slate-800/80 shadow-2xl space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider block border-b border-slate-800 pb-2">
            Detalhes da Demanda
          </h3>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <span className="text-slate-500 block uppercase font-semibold">Material Solicitado</span>
              <span className="text-slate-200 font-bold flex items-center gap-1.5">
                <ShoppingBag size={14} className="text-blue-400" /> {solicitacao.insumo.nome}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-slate-500 block uppercase font-semibold">Quantidade Solicitada</span>
              <span className="text-slate-200 font-mono font-bold">
                {solicitacao.quantidadeSolicitada} {solicitacao.insumo.unidadeMedida}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-slate-500 block uppercase font-semibold">Local de Entrega</span>
              <span className="text-slate-200 font-bold block truncate">{localDestino}</span>
            </div>

            <div className="space-y-1">
              <span className="text-slate-500 block uppercase font-semibold">Necessidade de Entrega</span>
              <span className="text-slate-200 font-bold flex items-center gap-1.5">
                <Calendar size={14} className="text-blue-400" />
                {new Date(solicitacao.dataNecessidade).toLocaleDateString('pt-BR')}
              </span>
            </div>
          </div>
        </div>

        {/* Formulário de Resposta */}
        <div className="glassmorphism p-6 rounded-2xl border border-slate-800/80 shadow-2xl">
          <SupplierQuoteForm token={token} />
        </div>
      </div>
    </div>
  );
}

function AlertCircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}
