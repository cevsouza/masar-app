import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth';
import { iaConfigurada } from '@/lib/mcmv/portariaIA';
import ParametrosMCMVManager from '@/components/ParametrosMCMVManager';
import { ShieldAlert } from 'lucide-react';

export const revalidate = 0;

export default async function ParametrosMCMVPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('masar_session')?.value;
  const session = sessionToken ? await verifySession(sessionToken) : null;

  if (!session || session.role !== 'ADMIN') {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center space-y-3">
        <ShieldAlert className="mx-auto text-red-400" size={40} />
        <h1 className="text-xl font-bold text-white">Acesso restrito</h1>
        <p className="text-sm text-slate-400">Apenas administradores podem gerenciar os parâmetros MCMV.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl font-sans">Parâmetros MCMV / Caixa</h1>
        <p className="text-sm text-slate-400 mt-1">
          Teto de valor do imóvel, área útil mínima e % de unidades acessíveis por faixa. Esses limites alimentam os
          controles de conformidade dos empreendimentos MCMV.
        </p>
      </div>

      <ParametrosMCMVManager iaConfigurada={iaConfigurada()} />
    </div>
  );
}
