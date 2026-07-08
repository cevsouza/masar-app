import { db } from '@/lib/db';
import CanteiroForm from '@/components/CanteiroForm';
import PontoQrCode from '@/components/PontoQrCode';

export const revalidate = 0; // Real-time data loading for canteiro operations

export default async function CanteiroPage() {
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

  // Simplifica as casas para o leitor de QR Code
  const simplifiedCasas = casas.map(c => ({
    id: c.id,
    numero: c.numero,
    empreendimento: {
      nome: c.empreendimento.nome
    }
  }));

  return (
    <div className="max-w-md mx-auto p-2 sm:p-4 space-y-5 animate-fade-in">
      <div className="bg-[#151b2c] p-4 rounded-2xl border border-slate-800 text-center shadow-lg">
        <h1 className="text-lg font-bold text-white">Painel do Canteiro</h1>
        <p className="text-xs text-slate-400 mt-1">Apontamento rápido mobile para Mestres de Obras</p>
      </div>

      {/* Leitor de QR Code para Operários */}
      <PontoQrCode casas={simplifiedCasas} />

      {/* Formulário de Apontamento de Evolução de Casas/Insumos */}
      <CanteiroForm initialCasas={casas} initialInsumos={insumos} />
    </div>
  );
}
