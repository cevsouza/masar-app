import { Building2, Users, Home, Clock, AlertTriangle, Lock, Plus, ChevronRight, Receipt } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { adminPlataformaAtual, panoramaInstancias } from '@/lib/plataforma';

export const dynamic = 'force-dynamic';

const fmtData = (d: Date | null) =>
  d ? new Date(d).toLocaleDateString('pt-BR') : '—';

function diasDesde(d: Date | null): number | null {
  if (!d) return null;
  return Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000);
}

function diasAte(d: Date | null): number | null {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000);
}

/**
 * Consumo do plano. Cliente encostando no teto é sinal COMERCIAL, não alarme:
 * é a hora de propor o plano de cima, antes de o sistema recusar a unidade e a
 * conversa começar por uma recusa.
 */
function corDoConsumo(pct: number | null): string {
  if (pct === null) return 'text-stone-100';
  if (pct >= 100) return 'text-red-400';
  if (pct >= 80) return 'text-amber-400';
  return 'text-stone-100';
}

/** Sinal de abandono. Cliente que parou de mexer está a caminho do cancelamento. */
function sinalAtividade(ultima: Date | null) {
  const dias = diasDesde(ultima);
  if (dias === null) return { texto: 'nunca usou', cor: 'text-red-400', alerta: true };
  if (dias === 0) return { texto: 'hoje', cor: 'text-emerald-400', alerta: false };
  if (dias === 1) return { texto: 'ontem', cor: 'text-emerald-400', alerta: false };
  if (dias <= 7) return { texto: `há ${dias} dias`, cor: 'text-stone-300', alerta: false };
  if (dias <= 30) return { texto: `há ${dias} dias`, cor: 'text-amber-400', alerta: true };
  return { texto: `há ${dias} dias`, cor: 'text-red-400', alerta: true };
}

export default async function CockpitPage() {
  // O layout também redireciona, mas no Next layout e página renderizam em
  // PARALELO: sem esta checagem a página executa mesmo com o redirect em curso,
  // panoramaInstancias() lança, e o log enche de erro a cada acesso deslogado.
  if (!(await adminPlataformaAtual())) redirect('/plataforma/login');

  const instancias = await panoramaInstancias();

  const ativas = instancias.filter((i) => i.ativa).length;
  const unidades = instancias.reduce((s, i) => s + i.unidades, 0);
  const inativos = instancias.filter((i) => {
    const d = diasDesde(i.ultimaAtividade);
    return d === null || d > 7;
  }).length;
  const vencendo = instancias.filter((i) => {
    const d = diasAte(i.dataExpiracao);
    return d !== null && d <= 60;
  }).length;

  const cards = [
    { rot: 'Instâncias ativas', val: `${ativas}/${instancias.length}`, icone: Building2 },
    { rot: 'Unidades sob gestão', val: unidades, icone: Home },
    { rot: 'Sem uso há +7 dias', val: inativos, icone: Clock, alerta: inativos > 0 },
    { rot: 'Contratos vencendo', val: vencendo, icone: AlertTriangle, alerta: vencendo > 0 },
  ];

  return (
    <div className="space-y-8">
      <div className="flex justify-end gap-2">
        <Link
          href="/plataforma/cobrancas"
          className="inline-flex items-center gap-1.5 bg-stone-900 hover:bg-stone-800 text-stone-200 border border-stone-800 text-xs font-bold px-4 py-2 rounded-xl"
        >
          <Receipt size={14} /> Faturamento
        </Link>
        <Link
          href="/plataforma/empresas/nova"
          className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold px-4 py-2 rounded-xl"
        >
          <Plus size={14} /> Novo cliente
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div
            key={c.rot}
            className={`rounded-xl border p-4 ${
              c.alerta ? 'bg-amber-950/20 border-amber-900/40' : 'bg-stone-900/60 border-stone-800'
            }`}
          >
            <div className="flex items-center gap-2 text-stone-500">
              <c.icone size={13} />
              <span className="text-[11px] uppercase font-bold tracking-wider">{c.rot}</span>
            </div>
            <p
              className={`text-2xl font-extrabold mt-1.5 tabular-nums ${
                c.alerta ? 'text-amber-400' : 'text-white'
              }`}
            >
              {c.val}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-stone-800 bg-stone-900/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-stone-500 bg-stone-950/60">
                <th className="text-left font-bold px-4 py-3">Construtora</th>
                <th className="text-left font-bold px-4 py-3">Plano</th>
                <th className="text-right font-bold px-4 py-3">Obras</th>
                <th className="text-right font-bold px-4 py-3">Unidades</th>
                <th className="text-right font-bold px-4 py-3">Usuários</th>
                <th className="text-left font-bold px-4 py-3">Última atividade</th>
                <th className="text-left font-bold px-4 py-3">Contrato</th>
              </tr>
            </thead>
            <tbody>
              {instancias.map((i) => {
                const sinal = sinalAtividade(i.ultimaAtividade);
                const dias = diasAte(i.dataExpiracao);
                return (
                  <tr key={i.empresaId} className="border-t border-stone-800/70">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/plataforma/empresas/${i.empresaId}`}
                          className="font-semibold text-stone-100 hover:text-amber-400 inline-flex items-center gap-1"
                        >
                          {i.nome}
                          <ChevronRight size={13} className="text-stone-600" />
                        </Link>
                        {!i.ativa && (
                          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-red-950/40 text-red-400 border border-red-900/40">
                            inativa
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-stone-600 font-mono">{i.slug}</span>
                    </td>
                    <td className="px-4 py-3 text-stone-400">{i.plano}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-stone-300">{i.empreendimentos}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">
                      <span className={corDoConsumo(i.percentualLicenca)}>
                        {i.unidades}
                        {i.limiteUnidades !== null && (
                          <span className="text-stone-500 font-normal">/{i.limiteUnidades}</span>
                        )}
                      </span>
                      {i.percentualLicenca !== null && i.percentualLicenca >= 80 && (
                        <span className="text-[11px] block font-normal text-amber-500/70">
                          {i.percentualLicenca >= 100 ? 'no teto' : `${i.percentualLicenca}% do plano`}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-stone-300">{i.usuarios}</td>
                    <td className={`px-4 py-3 ${sinal.cor}`}>{sinal.texto}</td>
                    <td className="px-4 py-3">
                      <span className={dias !== null && dias <= 60 ? 'text-amber-400' : 'text-stone-400'}>
                        {fmtData(i.dataExpiracao)}
                        {dias !== null && dias <= 60 && (
                          <span className="text-[11px] block text-amber-500/70">
                            {dias < 0 ? 'vencido' : `em ${dias} dias`}
                          </span>
                        )}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {instancias.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-stone-500">
            Nenhuma instância cadastrada ainda.
          </p>
        )}
      </div>

      {/* A fronteira, escrita na própria tela para quem opera não precisar
          lembrar dela de cabeça. */}
      <div className="rounded-xl border border-stone-800 bg-stone-950/50 p-5 flex gap-3">
        <Lock size={16} className="text-stone-600 shrink-0 mt-0.5" />
        <div className="text-xs text-stone-500 leading-relaxed">
          <p className="text-stone-400 font-semibold mb-1">Até onde este painel enxerga</p>
          <p>
            Só <strong className="text-stone-400">metadado</strong>: contagens, plano, vigência e o
            horário da última atividade. Nada de financeiro, documento ou CPF —
            não existe caminho daqui para o conteúdo das obras.
          </p>
          <p className="mt-2">
            Para ver conteúdo de um cliente é preciso abrir um{' '}
            <strong className="text-stone-400">acesso assistido</strong>: com motivo escrito, prazo
            máximo de 8 horas, e registro no log de auditoria do próprio cliente — onde ele vê.
          </p>
        </div>
      </div>
    </div>
  );
}
