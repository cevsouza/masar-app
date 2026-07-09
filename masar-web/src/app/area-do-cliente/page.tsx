import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/auth';
import ClientPortalDashboard from '@/components/ClientPortalDashboard';

export const revalidate = 0;

export default async function AreaDoClientePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('masar_client_session')?.value;

  if (!token) {
    redirect('/area-do-cliente/login');
  }

  const session = await verifySession(token);
  if (!session || session.role !== 'CLIENT') {
    redirect('/area-do-cliente/login');
  }

  // Buscar dados do cliente logado no portal e suas relações V11
  const cliente = await db.cliente.findUnique({
    where: { id: session.clienteId },
    include: {
      contratos: {
        include: {
          casa: {
            include: {
              empreendimento: true,
              documentos: true
            }
          },
          transacoes: {
            where: { natureza: 'RECEITA' },
            orderBy: { dataVencimento: 'asc' }
          },
          corretor: true
        }
      }
    }
  });

  if (!cliente) {
    redirect('/area-do-cliente/login');
  }

  // Adaptar/Serializar datas do Prisma para props limpas
  const serializedCliente: any = {
    id: cliente.id,
    nome: cliente.nome,
    email: cliente.email,
    telefone: cliente.telefone,
    etapaAtual: cliente.etapaAtual,
    contrachequeUrl: cliente.contrachequeUrl,
    contratos: cliente.contratos.map((contrato: any) => ({
      id: contrato.id,
      valorVenda: contrato.valorVenda,
      entrada: contrato.entrada,
      financiamento: contrato.financiamento,
      status: contrato.status,
      casa: {
        id: contrato.casa.id,
        numero: contrato.casa.numero,
        statusObra: contrato.casa.statusObra,
        percentualObra: contrato.casa.percentualObra,
        prazoFisico: contrato.casa.prazoFisico ? contrato.casa.prazoFisico.toISOString() : null,
        prazoFinanceiro: contrato.casa.prazoFinanceiro ? contrato.casa.prazoFinanceiro.toISOString() : null,
        empreendimento: {
          nome: contrato.casa.empreendimento.nome
        },
        documentos: contrato.casa.documentos.map((doc: any) => ({
          id: doc.id,
          nome: doc.nome,
          caminhoArquivo: doc.caminhoArquivo
        }))
      },
      contasReceber: contrato.transacoes.map((p: any, idx: number) => ({
        id: p.id,
        numeroParcela: idx + 1,
        valor: p.valor,
        dataVencimento: p.dataVencimento.toISOString(),
        pago: p.status === 'PAGO'
      })),
      corretor: contrato.corretor ? {
        nome: contrato.corretor.nome,
        creci: contrato.corretor.creci
      } : null
    }))
  };

  return <ClientPortalDashboard cliente={serializedCliente} />;
}
