import { redirect } from 'next/navigation';

// A pagina Canteiro foi dividida em Ponto e Diario de Obra.
// Mantido como redirecionamento para nao quebrar links antigos.
export default function CanteiroIndexPage() {
  redirect('/canteiro/ponto');
}
