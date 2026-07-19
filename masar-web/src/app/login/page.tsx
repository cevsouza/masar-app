import type { Metadata } from 'next';
import { identidadeVisualDoHost } from '@/lib/empresaVisual';
import LoginForm from './LoginForm';

// A marca sai do banco e depende do Host, então esta página não pode ser
// pré-renderizada em tempo de build.
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const marca = await identidadeVisualDoHost();
  return { title: `Entrar | ${marca.nome}` };
}

export default async function LoginPage() {
  const marca = await identidadeVisualDoHost();
  return <LoginForm marca={marca} />;
}
