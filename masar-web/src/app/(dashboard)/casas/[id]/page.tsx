import { db } from '@/lib/db';
import HouseDetails from '@/components/HouseDetails';
import { notFound } from 'next/navigation';

export const revalidate = 0; // Disable server component caching to reflect real-time updates

export default async function CasaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const casa = await db.casa.findUnique({
    where: { id },
    include: {
      empreendimento: {
        include: {
          custosGlobais: true,
          casas: {
            select: { id: true }
          }
        }
      },
      cliente: true,
      infraestrutura: true,
      contrato: true,
      orcamento: {
        include: {
          itens: {
            include: {
              insumo: true
            }
          }
        }
      },
      apropriacoes: {
        include: {
          insumo: true
        },
        orderBy: { dataAplicacao: 'desc' }
      },
      diarios: {
        orderBy: { data: 'desc' }
      },
      medicoes: {
        orderBy: { dataMedicao: 'desc' }
      }
    }
  });

  if (!casa) {
    notFound();
  }

  // Load all standard insumos for the budgeting forms
  const allInsumos = await db.insumoPadrao.findMany({
    orderBy: { nome: 'asc' }
  });

  // Convert Date objects to string for simple prop serialization
  const serializedCasa = {
    ...casa,
    dataCriacao: casa.dataCriacao.toISOString(),
    dataAtualizacao: casa.dataAtualizacao.toISOString(),
    prazoFisico: casa.prazoFisico ? casa.prazoFisico.toISOString() : null,
    prazoFinanceiro: casa.prazoFinanceiro ? casa.prazoFinanceiro.toISOString() : null,
    medicoes: casa.medicoes.map(m => ({
      ...m,
      dataMedicao: m.dataMedicao.toISOString(),
      dataCriacao: m.dataCriacao.toISOString(),
      dataAtualizacao: m.dataAtualizacao.toISOString(),
    })),
    apropriacoes: casa.apropriacoes.map(ap => ({
      ...ap,
      dataAplicacao: ap.dataAplicacao.toISOString(),
    })),
    diarios: casa.diarios.map(d => ({
      ...d,
      data: d.data.toISOString(),
    })),
    contrato: casa.contrato ? {
      ...casa.contrato,
      dataCriacao: casa.contrato.dataCriacao.toISOString(),
      dataAtualizacao: casa.contrato.dataAtualizacao.toISOString(),
    } : null
  };

  return <HouseDetails initialCasa={serializedCasa} allInsumos={allInsumos} />;
}
