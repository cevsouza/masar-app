import { db } from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import FluxoCaixaCockpit from '@/components/FluxoCaixaCockpit';
import { calcularFluxoCaixaProjetado } from '@/lib/cashFlowService';

export const revalidate = 0; // Garantir dados em tempo real

export default async function FluxoDeCaixaPage() {
  // 1. Validar permissões
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('masar_session')?.value;
  const session = sessionToken ? await verifySession(sessionToken) : null;

  if (!session || !['ADMIN', 'FINANCEIRO'].includes(session.role)) {
    redirect('/');
  }

  // 2. Carregar empreendimentos para o filtro
  const empreendimentos = await db.empreendimento.findMany({
    select: { id: true, nome: true },
    orderBy: { nome: 'asc' }
  });

  // 3. Obter os dados iniciais consolidando todos os empreendimentos
  const initialData = await calcularFluxoCaixaProjetado();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl font-sans">
          Cockpit de Fluxo de Caixa Temporal
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Visão preditiva de caixa cruzando saldos, recebíveis, custos a incorrer e a regra do ciclo operacional da Caixa Econômica Federal.
        </p>
      </div>

      <FluxoCaixaCockpit 
        empreendimentos={empreendimentos} 
        initialData={initialData} 
      />
    </div>
  );
}
