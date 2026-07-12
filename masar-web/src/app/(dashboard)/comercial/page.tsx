import { db } from '@/lib/db';
import CrmTable from '@/components/CrmTable';

export const revalidate = 0; // Disable server component caching to reflect real-time updates

export default async function ComercialPage() {
  const houses = await db.casa.findMany({
    include: {
      empreendimento: true,
      cliente: true,
    },
    orderBy: [
      { quadra: 'asc' },
      { numero: 'asc' },
    ]
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl font-sans">CRM Comercial & Crédito</h1>
        <p className="text-sm text-slate-400 mt-1">
          Casas, compradores e como está a aprovação do crédito de cada um na Caixa.
        </p>
      </div>

      <CrmTable initialHouses={houses} />
    </div>
  );
}
