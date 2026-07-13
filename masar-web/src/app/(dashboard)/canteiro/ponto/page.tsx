import { db } from '@/lib/db';
import PontoQrCode from '@/components/PontoQrCode';

export const revalidate = 0; // Real-time data loading for canteiro operations

export default async function CanteiroPontoPage() {
  const casas = await db.casa.findMany({
    include: { empreendimento: true },
    orderBy: { numero: 'asc' },
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
        <h1 className="text-lg font-bold text-white">Ponto do Canteiro</h1>
        <p className="text-xs text-slate-400 mt-1">Batida de ponto dos operários por QR Code</p>
      </div>

      <PontoQrCode casas={simplifiedCasas} />
    </div>
  );
}
