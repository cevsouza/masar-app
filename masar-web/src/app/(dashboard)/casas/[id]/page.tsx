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
      transacoes: {
        include: {
          insumo: true
        },
        orderBy: { dataVencimento: 'desc' }
      },
      diarios: {
        orderBy: { data: 'desc' }
      },
      medicoes: {
        orderBy: { dataMedicao: 'desc' }
      },
      atividadesCronograma: {
        where: { escopo: 'LOTE' },
        orderBy: [{ ordem: 'asc' }, { dataInicioPrevista: 'asc' }]
      }
    }
  });

  if (!casa) {
    notFound();
  }

  // Limites MCMV da faixa do empreendimento (para avisos inline de teto/área).
  let mcmvLimites: { faixa: string; tetoValorImovel: number; areaUtilMinima: number; percentualUnidadesAcessiveis: number } | null = null;
  if (casa.empreendimento?.regimeMCMV && casa.empreendimento?.faixaMCMV) {
    const p = await db.parametroMCMV.findFirst({ where: { faixa: casa.empreendimento.faixaMCMV } });
    if (p) {
      mcmvLimites = {
        faixa: casa.empreendimento.faixaMCMV,
        tetoValorImovel: Number(p.tetoValorImovel),
        areaUtilMinima: Number(p.areaUtilMinima),
        percentualUnidadesAcessiveis: p.percentualUnidadesAcessiveis,
      };
    }
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
    transacoes: casa.transacoes.map(t => ({
      ...t,
      dataVencimento: t.dataVencimento.toISOString(),
      dataPagamento: t.dataPagamento ? t.dataPagamento.toISOString() : null,
    })),
    diarios: casa.diarios.map(d => ({
      ...d,
      data: d.data.toISOString(),
    })),
    contrato: casa.contrato ? {
      ...casa.contrato,
      dataCriacao: casa.contrato.dataCriacao.toISOString(),
      dataAtualizacao: casa.contrato.dataAtualizacao.toISOString(),
    } : null,
    atividadesCronograma: casa.atividadesCronograma.map(a => ({
      id: a.id,
      titulo: a.titulo,
      descricao: a.descricao,
      status: a.status,
      ordem: a.ordem,
      dataInicioPrevista: a.dataInicioPrevista.toISOString(),
      dataFimPrevista: a.dataFimPrevista.toISOString(),
      dataInicioReal: a.dataInicioReal ? a.dataInicioReal.toISOString() : null,
      dataFimReal: a.dataFimReal ? a.dataFimReal.toISOString() : null,
      percentualConcluido: a.percentualConcluido
    }))
  };

  return <HouseDetails initialCasa={serializedCasa} allInsumos={allInsumos} mcmvLimites={mcmvLimites} />;
}
