import { db } from '@/lib/db';
import SuprimentosInbox from '@/components/SuprimentosInbox';

export const revalidate = 0;

export default async function SuprimentosPage() {
  // Carregar todas as solicitações de compra e suas cotações
  const solicitacoes = await db.solicitacaoCompra.findMany({
    include: {
      insumo: true,
      casa: {
        include: { empreendimento: true }
      },
      empreendimento: true,
      cotacoes: true
    },
    orderBy: { dataCriacao: 'desc' }
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl font-sans">Gestão de Suprimentos</h1>
        <p className="text-sm text-slate-400 mt-1">
          Inbox de requisições de canteiro, comparação de preços de lojistas e emissão de ordens de compra.
        </p>
      </div>

      <SuprimentosInbox initialSolicitacoes={solicitacoes} />
    </div>
  );
}
