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
        select: { id: true, percentualObra: true }
      },
      documentos: {
        orderBy: { dataCriacao: 'desc' }
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
    casas: project.casas,
    documentos: project.documentos.map(doc => ({
      id: doc.id,
      nome: doc.nome,
      caminhoArquivo: doc.caminhoArquivo,
      tipo: doc.tipo,
      dataCriacao: doc.dataCriacao.toISOString()
    }))
  };

  return <ProjectTechnicalSheet project={serializedProject} />;
}
