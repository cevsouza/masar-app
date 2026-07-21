import { AlertTriangle, CalendarClock } from 'lucide-react';
import { estadoLicenca } from '@/lib/licenca';

/**
 * Avisos de licença no painel: teto de unidades chegando e contrato vencendo.
 *
 * Os dois avisos existem pelo mesmo motivo — o cliente não pode descobrir
 * nenhum dos dois no momento em que é impedido. Descobrir o teto ao tentar
 * cadastrar a unidade, ou o vencimento na tela de login recusada, transforma
 * uma conversa comercial rotineira numa reclamação.
 *
 * Renderiza no servidor e some sozinho quando não há o que dizer: nada de
 * faixa permanente ocupando o topo do painel de quem está em dia.
 */
export default async function FaixaLicenca() {
  let estado;
  try {
    estado = await estadoLicenca();
  } catch {
    // Aviso auxiliar não derruba o painel: sem empresa resolvível, some.
    return null;
  }

  const vencendo = estado.diasParaVencer !== null && estado.diasParaVencer <= 30;
  if (!estado.proximoDoLimite && !estado.noLimite && !vencendo) return null;

  const avisos: { icone: typeof AlertTriangle; texto: string; grave: boolean }[] = [];

  if (estado.noLimite) {
    avisos.push({
      icone: AlertTriangle,
      grave: true,
      texto:
        `Você atingiu o limite de ${estado.limite} unidades do plano ${estado.planoRotulo} ` +
        `(${estado.consumo} cadastradas). O que já existe segue funcionando; ` +
        `o cadastro de novas unidades está pausado até ampliar o plano.`,
    });
  } else if (estado.proximoDoLimite) {
    const restam = (estado.limite ?? 0) - estado.consumo;
    avisos.push({
      icone: AlertTriangle,
      grave: false,
      texto:
        `Restam ${restam} ${restam === 1 ? 'unidade' : 'unidades'} no plano ${estado.planoRotulo} ` +
        `(${estado.consumo} de ${estado.limite}). Vale ampliar antes de precisar.`,
    });
  }

  if (vencendo) {
    const d = estado.diasParaVencer as number;
    avisos.push({
      icone: CalendarClock,
      grave: d <= 7,
      texto:
        d < 0
          ? 'Sua licença está vencida. O acesso pode ser interrompido a qualquer momento.'
          : d === 0
            ? 'Sua licença vence hoje.'
            : `Sua licença vence em ${d} ${d === 1 ? 'dia' : 'dias'}.`,
    });
  }

  return (
    <div className="space-y-2">
      {avisos.map((a, idx) => (
        <div
          key={idx}
          className={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${
            a.grave
              ? 'border-red-500/25 bg-red-600/[0.06]'
              : 'border-amber-500/25 bg-amber-500/[0.06]'
          }`}
        >
          <a.icone
            size={16}
            className={`shrink-0 mt-0.5 ${a.grave ? 'text-red-400' : 'text-amber-400'}`}
          />
          <p className="text-xs text-slate-300 leading-relaxed">{a.texto}</p>
        </div>
      ))}
    </div>
  );
}
