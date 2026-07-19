import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import { adminPlataformaAtual } from '@/lib/plataforma';
import SairPlataforma from './SairPlataforma';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Console da Plataforma',
  robots: { index: false, follow: false },
};

/**
 * Casca do CONTROL PLANE.
 *
 * A guarda mora aqui, e não no middleware, porque o middleware valida o cookie
 * do staff — que não serve para nada neste namespace. Quem manda é
 * adminPlataformaAtual(), que confere tipo do token e se o admin segue ativo.
 */
export default async function PainelPlataformaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await adminPlataformaAtual();
  if (!admin) redirect('/plataforma/login');

  return (
    <div className="min-h-screen bg-[#0c0a09] text-stone-200">
      {/* Faixa permanente. O console é âmbar e o app do cliente é azul, de
          propósito: em nenhum momento deve haver dúvida sobre onde se está. */}
      <div className="bg-amber-500 text-stone-950">
        <div className="max-w-6xl mx-auto px-6 py-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider">
          <ShieldAlert size={14} />
          Console da plataforma — você está fora do sistema dos clientes
        </div>
      </div>

      <header className="border-b border-stone-800/80">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-extrabold text-white tracking-tight">Instâncias</h1>
            <p className="text-xs text-stone-500">
              Panorama agregado · contagens e saúde, sem conteúdo de cliente
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-stone-300">{admin.nome}</p>
              <p className="text-[11px] text-stone-600">{admin.email}</p>
            </div>
            <SairPlataforma />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
