'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Rocket, ArrowRight, X } from 'lucide-react';

/**
 * Faixa de "configuração inicial incompleta" no topo do dashboard.
 *
 * Cobre a fase entre o primeiro empreendimento e a conta realmente utilizável:
 * o cliente já criou algo, então PrimeiroAcesso sai de cena, mas ainda faltam
 * dados que os motores consomem (unidades, prazos, orçamento). Sem esses dados
 * os indicadores aparecem vazios e a conclusão do cliente é sobre o produto,
 * não sobre o cadastro.
 *
 * Busca DEPOIS da pintura, de propósito: o motor de completude (lib/completude)
 * é uma leitura de custo real e o dashboard é a tela mais movimentada do
 * sistema. Uma faixa auxiliar não pode atrasar o primeiro paint.
 *
 * Some sozinha quando não falta nada obrigatório; some por sessão se o usuário
 * fechar — volta na próxima entrada, porque o cadastro continua incompleto.
 */

const CHAVE_DISPENSA = 'masar_faixa_config_inicial_dispensada';

export default function FaixaConfiguracaoInicial() {
  const [faltam, setFaltam] = useState(0);
  const [dispensada, setDispensada] = useState(true); // fecha por padrão até saber

  useEffect(() => {
    if (sessionStorage.getItem(CHAVE_DISPENSA) === '1') return;
    setDispensada(false);

    let vivo = true;
    fetch('/api/gestao/completude')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        // 403 para papéis sem acesso ao assistente: a faixa simplesmente não aparece.
        if (vivo && d?.resumo) setFaltam(d.resumo.faltamObrigatorios ?? 0);
      })
      .catch(() => {});
    return () => { vivo = false; };
  }, []);

  if (dispensada || faltam === 0) return null;

  const fechar = () => {
    sessionStorage.setItem(CHAVE_DISPENSA, '1');
    setDispensada(true);
  };

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-indigo-500/25 bg-indigo-600/[0.06] px-4 py-3">
      <Rocket size={16} className="text-indigo-400 shrink-0" />
      <p className="text-xs text-slate-300 flex-1 min-w-0">
        <strong className="text-slate-100">Configuração inicial incompleta.</strong>{' '}
        {faltam === 1
          ? 'Falta 1 item essencial'
          : `Faltam ${faltam} itens essenciais`}{' '}
        para os indicadores fecharem.
      </p>
      <Link
        href="/gestao/onboarding"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold uppercase tracking-wider hover:bg-indigo-600/30 transition shrink-0"
      >
        Continuar <ArrowRight size={12} />
      </Link>
      <button
        onClick={fechar}
        aria-label="Dispensar até a próxima entrada"
        className="text-slate-500 hover:text-slate-300 transition shrink-0"
      >
        <X size={14} />
      </button>
    </div>
  );
}
