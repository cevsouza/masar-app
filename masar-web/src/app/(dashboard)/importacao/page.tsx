import { FileSpreadsheet } from 'lucide-react';
import { db } from '@/lib/db';
import ImportadorUnidades from './ImportadorUnidades';

export const dynamic = 'force-dynamic';

export default async function ImportacaoPage() {
  const empreendimentos = await db.empreendimento.findMany({
    select: { id: true, nome: true },
    orderBy: { dataCriacao: 'desc' },
  });

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-900 pb-5">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-indigo-400">
          Operação · Importação
        </span>
        <h1 className="mt-0.5 flex items-center gap-2 text-2xl font-bold tracking-tight text-white">
          <FileSpreadsheet className="text-indigo-400" size={24} /> Importar unidades da planilha
        </h1>
        <p className="mt-1 max-w-2xl text-xs text-slate-400">
          Toda construtora vem de planilha. Aqui ela entra inteira, você confere o que vai ser
          criado antes de gravar, e corrige o que estiver faltando sem precisar mexer no arquivo e
          subir de novo.
        </p>
      </div>

      <ImportadorUnidades empreendimentos={empreendimentos} />
    </div>
  );
}
