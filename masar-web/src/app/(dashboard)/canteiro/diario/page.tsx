import { db } from '@/lib/db';
import CanteiroForm from '@/components/CanteiroForm';

export const revalidate = 0; // Real-time data loading for canteiro operations

export default async function CanteiroDiarioPage() {
  const casas = await db.casa.findMany({
    include: {
      empreendimento: true,
      infraestrutura: true,
    },
    orderBy: { numero: 'asc' },
  });

  const insumos = await db.insumoPadrao.findMany({
    orderBy: { nome: 'asc' },
  });

  return (
    <div className="max-w-md mx-auto p-2 sm:p-4 space-y-5 animate-fade-in">
      <div className="bg-[#151b2c] p-4 rounded-2xl border border-slate-800 text-center shadow-lg">
        <h1 className="text-lg font-bold text-white">Diário de Obra</h1>
        <p className="text-xs text-slate-400 mt-1">Registro do dia, infraestrutura e insumos usados</p>
      </div>

      <CanteiroForm initialCasas={casas} initialInsumos={insumos} />
    </div>
  );
}
