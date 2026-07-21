import { redirect } from 'next/navigation';
import { adminPlataformaAtual } from '@/lib/plataforma';
import { competenciaAtual } from '@/lib/cobranca';
import PainelCobrancas from './PainelCobrancas';

export const dynamic = 'force-dynamic';

export default async function CobrancasPage() {
  // Layout e página renderizam em PARALELO no Next: sem esta checagem a página
  // executa mesmo com o redirect do layout em curso.
  if (!(await adminPlataformaAtual())) redirect('/plataforma/login');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-stone-100">Faturamento</h1>
        <p className="text-xs text-stone-500 mt-1 max-w-2xl">
          Quem cobrar neste mês, quanto, e quem não pagou. Não há integração de pagamento aqui
          de propósito: com um punhado de contratos, PIX e boleto manual resolvem — o que faltava
          era não esquecer de faturar.
        </p>
      </div>

      <PainelCobrancas competenciaInicial={competenciaAtual()} />
    </div>
  );
}
