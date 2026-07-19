import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { adminPlataformaAtual } from '@/lib/plataforma';
import LoginPlataformaForm from './LoginPlataformaForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Console da Plataforma',
  // O console não é conteúdo público; não deve aparecer em busca.
  robots: { index: false, follow: false },
};

export default async function LoginPlataformaPage() {
  // Já logado não precisa ver a tela de entrada de novo.
  if (await adminPlataformaAtual()) redirect('/plataforma');
  return <LoginPlataformaForm />;
}
