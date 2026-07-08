import { db } from '@/lib/db';
import HouseDetails from '@/components/HouseDetails';
import { notFound } from 'next/navigation';

export const revalidate = 0; // Disable server component caching to reflect real-time updates

export default async function CasaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const casa = await db.casa.findUnique({
    where: { id },
    include: {
      empreendimento: true,
      cliente: true,
      medicoes: {
        orderBy: { dataMedicao: 'desc' }
      }
    }
  });

  if (!casa) {
    notFound();
  }

  // Convert Date objects to string for simple prop serialization
  const serializedCasa = {
    ...casa,
    dataCriacao: casa.dataCriacao.toISOString(),
    dataAtualizacao: casa.dataAtualizacao.toISOString(),
    medicoes: casa.medicoes.map(m => ({
      ...m,
      dataMedicao: m.dataMedicao.toISOString(),
      dataCriacao: m.dataCriacao.toISOString(),
      dataAtualizacao: m.dataAtualizacao.toISOString(),
    }))
  };

  return <HouseDetails initialCasa={serializedCasa} />;
}
