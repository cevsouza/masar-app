import { db } from '@/lib/db';
import CasasGlobalBoard from '@/components/CasasGlobalBoard';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const revalidate = 0; // Disable server component caching to reflect real-time updates

export default async function CasasPage() {
  // 1. Verificar permissões
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('masar_session')?.value;
  const session = sessionToken ? await verifySession(sessionToken) : null;

  if (!session || !['ADMIN', 'FINANCEIRO', 'ENGENHARIA'].includes(session.role)) {
    redirect('/');
  }

  // 2. Carregar Empreendimentos para o filtro
  const empreendimentos = await db.empreendimento.findMany({
    select: { id: true, nome: true },
    orderBy: { nome: 'asc' }
  });

  // 3. Carregar Casas com dados essenciais de controle físico e financeiro
  const casas = await db.casa.findMany({
    include: {
      empreendimento: {
        select: { nome: true }
      },
      cliente: {
        select: { nome: true }
      },
      medicoes: {
        select: { valorLiberado: true, status: true, percentualMedido: true },
        orderBy: { dataMedicao: 'desc' }
      },
      transacoes: {
        select: { valor: true, status: true, natureza: true }
      }
    },
    orderBy: [
      { quadra: 'asc' },
      { numero: 'asc' }
    ]
  });

  // Serializar datas se houver (não estamos puxando datas, mas é boa prática para serialização de props)
  const serializedCasas = casas.map(c => ({
    ...c,
    // total apropriado aprovado e pendente
    totalApropriadoAprovado: c.transacoes
      .filter((t: any) => t.natureza === 'DESPESA' && t.status === 'PAGO')
      .reduce((acc: number, t: any) => acc + t.valor, 0),
    totalApropriadoPendente: c.transacoes
      .filter((t: any) => t.natureza === 'DESPESA' && t.status === 'PENDENTE')
      .reduce((acc: number, t: any) => acc + t.valor, 0),
    // medições Caixa pagas
    totalMedidoCaixa: c.medicoes
      .filter(m => m.status === 'PAGA')
      .reduce((acc: number, m: any) => acc + m.valorLiberado, 0)
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl font-sans">
          Gestão de Obras (Casas/Lotes)
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Quadro operacional de progresso físico, conformidade burocrática e apropriação financeira de todas as unidades habitacionais.
        </p>
      </div>

      <CasasGlobalBoard initialCasas={serializedCasas} empreendimentos={empreendimentos} />
    </div>
  );
}
