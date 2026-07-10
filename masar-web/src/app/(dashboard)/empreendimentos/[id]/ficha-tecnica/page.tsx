import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import ProjectTechnicalSheet from '@/components/ProjectTechnicalSheet';

interface PageProps {
  params: Promise<{ id: string }>;
}

export const revalidate = 0;

export default async function FichaTecnicaPage({ params }: PageProps) {
  const { id } = await params;

  const project = await db.empreendimento.findUnique({
    where: { id },
    include: {
      casas: {
        include: {
          medicoes: true,
          transacoes: {
            include: {
              insumo: true
            }
          },
          orcamento: {
            include: {
              itens: {
                include: {
                  insumo: true
                }
              }
            }
          }
        },
        orderBy: [
          { quadra: 'asc' },
          { numero: 'asc' }
        ]
      },
      documentos: {
        orderBy: { dataCriacao: 'desc' }
      },
      transacoes: {
        where: {
          casaId: null,
          natureza: 'DESPESA'
        },
        orderBy: { dataVencimento: 'desc' }
      },
      atividadesCronograma: {
        where: { escopo: 'GERAL' },
        orderBy: [{ ordem: 'asc' }, { dataInicioPrevista: 'asc' }]
      }
    }
  });

  if (!project) {
    notFound();
  }

  // Serialização de datas do Prisma
  const serializedProject: any = {
    id: project.id,
    nome: project.nome,
    localizacao: project.localizacao,
    statusLegal: project.statusLegal,
    endereco: project.endereco,
    cep: project.cep,
    bairro: project.bairro,
    cidade: project.cidade,
    estado: project.estado,
    latitude: project.latitude,
    longitude: project.longitude,
    areaTotalTerreno: project.areaTotalTerreno ? Number(project.areaTotalTerreno) : null,
    quantidadeCasasPrevistas: project.quantidadeCasasPrevistas,
    proprietarioAnteriorTerreno: project.proprietarioAnteriorTerreno,
    valorCompraTerreno: project.valorCompraTerreno ? Number(project.valorCompraTerreno) : null,
    amenidades: project.amenidades,
    padraoAreaConstruida: project.padraoAreaConstruida ? Number(project.padraoAreaConstruida) : null,
    padraoAreaLote: project.padraoAreaLote ? Number(project.padraoAreaLote) : null,
    padraoQuantidadeQuartos: project.padraoQuantidadeQuartos,
    padraoQuantidadeSuites: project.padraoQuantidadeSuites,
    padraoQuantidadeBanheiros: project.padraoQuantidadeBanheiros,
    padraoVagasGaragem: project.padraoVagasGaragem,
    padraoPossuiQuintal: project.padraoPossuiQuintal,
    padraoSalaConjugada: project.padraoSalaConjugada,
    casas: project.casas.map(casa => ({
      id: casa.id,
      numero: casa.numero,
      quadra: casa.quadra,
      statusObra: casa.statusObra,
      percentualObra: casa.percentualObra,
      liberadaVenda: casa.liberadaVenda,
      medicoes: casa.medicoes.map(m => ({
        id: m.id,
        percentualMedido: m.percentualMedido,
        valorLiberado: m.valorLiberado,
        status: m.status,
        dataMedicao: m.dataMedicao.toISOString()
      })),
      apropriacoes: casa.transacoes.map((t: any) => ({
        id: t.id,
        custoTotal: t.valor,
        aprovado: t.status === 'PAGO',
        dataAplicacao: t.dataVencimento.toISOString(),
        insumo: t.insumo ? {
          id: t.insumo.id,
          nome: t.insumo.nome,
          categoria: t.insumo.categoria
        } : null
      })),
      orcamento: casa.orcamento ? {
        id: casa.orcamento.id,
        itens: casa.orcamento.itens.map(item => ({
          id: item.id,
          quantidadePlanejada: item.quantidadePlanejada,
          custoUnitarioPrevisto: item.custoUnitarioPrevisto,
          insumo: {
            id: item.insumo.id,
            nome: item.insumo.nome,
            categoria: item.insumo.categoria
          }
        }))
      } : null
    })),
    documentos: project.documentos.map(doc => ({
      id: doc.id,
      nome: doc.nome,
      caminhoArquivo: doc.caminhoArquivo,
      tipo: doc.tipo,
      dataCriacao: doc.dataCriacao.toISOString()
    })),
    custosGlobais: project.transacoes.map((cg: any) => ({
      id: cg.id,
      descricao: cg.descricao,
      tipo: cg.categoria === 'TERRENO' ? 'TERRENO' : (cg.categoria === 'PROJETOS' ? 'PROJETOS' : 'OUTRO'),
      valor: cg.valor,
      data: cg.dataVencimento.toISOString()
    })),
    atividadesCronograma: project.atividadesCronograma.map(a => ({
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

  return <ProjectTechnicalSheet project={serializedProject} />;
}
