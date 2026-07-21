import Link from 'next/link';
import {
  Rocket, Building2, Home, FileCheck2, ArrowRight, ShieldCheck, Info,
} from 'lucide-react';

/**
 * Primeiro acesso: o que a conta nova vê ANTES de existir qualquer dado.
 *
 * Sem isto, o cliente que acabou de assinar entra e encontra a tela cheia de
 * indicadores zerados — a leitura natural é "o sistema está quebrado" ou "não
 * serve para mim". O dia um é o momento de maior risco de uma licença.
 *
 * Isto NÃO é um segundo checklist: o assistente guiado já existe em
 * /gestao/onboarding e é a única fonte de verdade dos passos (lib/completude).
 * Esta tela é a porta — diz onde está o assistente e qual é a primeira ação.
 */

interface Props {
  /** Marca do tenant. Na conta nova, é a primeira vez que o cliente vê o produto. */
  marcaNome: string;
  /** Papel do usuário: só ADMIN/FINANCEIRO alcançam o assistente. */
  podeConfigurar: boolean;
  /** Nome do usuário, para o cumprimento. */
  nomeUsuario?: string;
}

const PASSOS = [
  {
    icone: Building2,
    titulo: 'Cadastre o empreendimento',
    texto: 'O terreno, o prazo e a faixa do MCMV. Todo o resto pendura nele.',
  },
  {
    icone: Home,
    titulo: 'Cadastre as unidades',
    texto: 'Cada casa do empreendimento. Sem unidades, nenhum indicador de obra tem do que falar.',
  },
  {
    icone: FileCheck2,
    titulo: 'Suba os documentos e o orçamento',
    texto: 'Alvará, matrícula, ASO da equipe. É daqui que sai o aviso de vencimento antes de a medição travar.',
  },
];

export default function PrimeiroAcesso({ marcaNome, podeConfigurar, nomeUsuario }: Props) {
  return (
    <div className="min-h-screen bg-[#060814] text-slate-100 p-6">
      <div className="max-w-3xl mx-auto pt-10 space-y-8">

        {/* Boas-vindas */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-indigo-600/15 border border-indigo-500/30 mb-4">
            <Rocket className="text-indigo-400" size={26} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {nomeUsuario ? `Bem-vindo, ${nomeUsuario.split(' ')[0]}.` : 'Bem-vindo.'}
          </h1>
          <p className="text-sm text-slate-400 mt-2 max-w-xl mx-auto">
            Esta é a conta da <strong className="text-slate-200">{marcaNome}</strong>. Ela está{' '}
            <strong className="text-slate-200">vazia de propósito</strong> — nenhum dado de exemplo,
            nenhum empreendimento de outra construtora. O que aparecer aqui a partir de agora é seu.
          </p>
        </div>

        {/* A primeira ação */}
        {podeConfigurar ? (
          <div className="glassmorphism rounded-2xl border border-indigo-500/25 bg-indigo-600/[0.04] p-6 text-center">
            <p className="text-sm text-slate-200 font-semibold mb-1">Comece pelo assistente</p>
            <p className="text-xs text-slate-400 mb-5 max-w-md mx-auto">
              Ele pede uma coisa de cada vez, na ordem certa, e abre a tela onde você preenche.
              Leva menos tempo do que parece.
            </p>
            <Link
              href="/gestao/onboarding"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold uppercase tracking-wider hover:bg-indigo-500 transition"
            >
              Abrir o assistente <ArrowRight size={14} />
            </Link>
            <p className="text-[11px] text-slate-500 mt-4">
              Prefere ir direto?{' '}
              <Link href="/empreendimentos" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2">
                Criar empreendimento
              </Link>
            </p>
          </div>
        ) : (
          <div className="glassmorphism rounded-2xl border border-slate-800/80 p-6 text-center">
            <Info className="text-slate-500 mx-auto mb-3" size={22} />
            <p className="text-sm text-slate-200 font-semibold mb-1">A conta ainda está sendo configurada</p>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              O administrador da {marcaNome} precisa cadastrar o primeiro empreendimento.
              Assim que isso acontecer, esta tela vira o seu painel.
            </p>
          </div>
        )}

        {/* O que vem pela frente */}
        <div>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-3 text-center">
            Os três primeiros passos
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {PASSOS.map((p, i) => (
              <div key={p.titulo} className="rounded-2xl border border-slate-800/80 bg-slate-950/20 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="h-5 w-5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <p.icone size={15} className="text-indigo-400 shrink-0" />
                </div>
                <p className="text-xs font-semibold text-slate-200 mb-1">{p.titulo}</p>
                <p className="text-[11px] text-slate-500 leading-relaxed">{p.texto}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Reforço do que o sistema faz — o motivo de ter comprado */}
        <div className="flex items-start gap-3 rounded-2xl border border-slate-800/80 bg-slate-950/20 px-5 py-4">
          <ShieldCheck size={16} className="text-emerald-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Depois que os documentos estiverem cadastrados, o sistema passa a{' '}
            <strong className="text-slate-300">avisar antes do vencimento</strong> e a{' '}
            <strong className="text-slate-300">bloquear a liberação de medição</strong> quando
            houver pendência que a Caixa cobraria. É esse aviso que evita a parcela travada —
            e ele só funciona com os dados dentro.
          </p>
        </div>

      </div>
    </div>
  );
}
