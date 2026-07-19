import NovaEmpresaForm from './NovaEmpresaForm';
import { DOMINIO_BASE } from '@/lib/dominioPlataforma';

export const dynamic = 'force-dynamic';

export default function NovaEmpresaPage() {
  // A base vem daqui, não de dentro do componente cliente: DOMINIO_BASE_PLATAFORMA
  // é variável de servidor e no navegador cairia no padrão sem avisar — a tela
  // mostraria um endereço e o banco gravaria outro.
  return <NovaEmpresaForm dominioBase={DOMINIO_BASE} />;
}
