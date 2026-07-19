import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import BootstrapForm from './BootstrapForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Primeiro acesso do console',
  robots: { index: false, follow: false },
};

/**
 * A página só existe enquanto não houver administrador de plataforma.
 *
 * A checagem acontece aqui TAMBÉM (a API já recusa) porque uma tela de criação
 * de conta que continua visível depois de cumprir seu papel é um convite —
 * mesmo que o back-end recuse, ela sugere que há algo a explorar ali.
 */
export default async function BootstrapPage() {
  const jaExistem = await db.adminPlataforma.count();
  if (jaExistem > 0) redirect('/plataforma/login');
  return <BootstrapForm />;
}
