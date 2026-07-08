import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import { ArrowLeft, Building2, Calculator, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import DreWaterfallChart from '@/components/DreWaterfallChart';

export const revalidate = 0; // Real-time calculation of project DRE margins

export default async function FinanceiroDrePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: empreendimentoId } = await params;

  const emp = await db.empreendimento.findUnique({
    where: { id: empreendimentoId },
    include: { casas: { include: { contrato: true } } }
  });

  if (!emp) {
    notFound();
  }

  // 1. Calcular VGV (Valor de Venda fechado)
  const contratos = await db.contratoVenda.findMany({
    where: {
      casa: { empreendimentoId }
    }
  });

  const totalVGV = contratos.reduce((acc, c) => acc + c.valorVenda, 0);
  const totalComissao = contratos.reduce((acc, c) => acc + c.comissaoValor, 0);

  // 2. Calcular rateio proporcional de custos globais (Terreno, Projetos, Mkt)
  const totalHouses = await db.casa.count();
  const projectHouses = emp.casas.length;

  const custosGlobais = await db.custoGlobal.groupBy({
    by: ['tipo'],
    _sum: { valor: true }
  });

  const getCustoGlobalProporcional = (tipo: 'TERRENO' | 'PROJETOS' | 'MARKETING' | 'OUTRO') => {
    const item = custosGlobais.find(c => c.tipo === tipo);
    const totalValor = item?._sum.valor || 0;
    if (totalHouses === 0) return 0;
    return (totalValor / totalHouses) * projectHouses;
  };

  const rateioTerreno = getCustoGlobalProporcional('TERRENO');
  const rateioProjetos = getCustoGlobalProporcional('PROJETOS');
  const rateioMarketing = getCustoGlobalProporcional('MARKETING');
  const rateioOutros = getCustoGlobalProporcional('OUTRO');

  const totalRateio = rateioTerreno + rateioProjetos + rateioMarketing + rateioOutros;

  // 3. Calcular Impostos (RET - Regime Especial de Tributação, padrão 4%)
  const impostoRET = await db.imposto.findUnique({ where: { nome: 'RET' } });
  const retPercent = impostoRET ? impostoRET.percentual : 4.0;
  const totalImposto = (retPercent / 100) * totalVGV;

  // 4. Custos Diretos de Construção (apropriados e aprovados)
  const apropriacoesSum = await db.apropriacaoCusto.aggregate({
    where: {
      aprovado: true,
      casa: { empreendimentoId }
    },
    _sum: { custoTotal: true }
  });
  const totalConstrucao = apropriacoesSum._sum.custoTotal || 0;

  // 5. Lucro Líquido
  const lucroLiquido = totalVGV - totalComissao - totalRateio - totalImposto - totalConstrucao;
  const margemLucro = totalVGV > 0 ? (lucroLiquido / totalVGV) * 100 : 0;

  // Formatar valores para exibição no servidor
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(val);
  };

  // Preparar os dados de barra flutuante para o gráfico Waterfall
  const chartData: { name: string; valor: [number, number]; display: number; color: string; }[] = [
    { name: 'VGV Bruto', valor: [0, totalVGV], display: totalVGV, color: '#6366f1' },
    { name: 'Comissão Corretagem', valor: [Math.max(0, totalVGV - totalComissao), totalVGV], display: totalComissao, color: '#f59e0b' },
    { name: 'Rateios Terreno/Mkt', valor: [Math.max(0, totalVGV - totalComissao - totalRateio), Math.max(0, totalVGV - totalComissao)], display: totalRateio, color: '#3b82f6' },
    { name: 'Tributação RET', valor: [Math.max(0, totalVGV - totalComissao - totalRateio - totalImposto), Math.max(0, totalVGV - totalComissao - totalRateio)], display: totalImposto, color: '#ef4444' },
    { name: 'Obra Direto', valor: [Math.max(0, lucroLiquido), Math.max(0, totalVGV - totalComissao - totalRateio - totalImposto)], display: totalConstrucao, color: '#ec4899' },
    { name: 'Lucro Líquido', valor: [0, Math.max(0, lucroLiquido)], display: lucroLiquido, color: '#10b981' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/empreendimentos" className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition border border-slate-700/60 cursor-pointer">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <div className="flex items-center gap-1.5 text-xs text-blue-400 font-semibold uppercase tracking-wider">
            <Building2 size={12} /> Controladoria Contábil
          </div>
          <h1 className="text-xl font-bold text-white mt-1">DRE do {emp.nome}</h1>
        </div>
      </div>

      {/* KPIs DRE */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="glassmorphism p-5 rounded-2xl border border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">VGV Vendido</span>
          <h3 className="text-xl font-bold text-white font-mono mt-1.5">{formatCurrency(totalVGV)}</h3>
          <p className="text-[10px] text-slate-500 mt-1">Soma das vendas fechadas</p>
        </div>

        <div className="glassmorphism p-5 rounded-2xl border border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Custos Totais (Obra + Rateio)</span>
          <h3 className="text-xl font-bold text-red-400 font-mono mt-1.5">{formatCurrency(totalConstrucao + totalRateio)}</h3>
          <p className="text-[10px] text-slate-500 mt-1">Gastos diretos e indiretos</p>
        </div>

        <div className="glassmorphism p-5 rounded-2xl border border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Impostos & Corretagem</span>
          <h3 className="text-xl font-bold text-amber-500 font-mono mt-1.5">{formatCurrency(totalImposto + totalComissao)}</h3>
          <p className="text-[10px] text-slate-500 mt-1">RET {retPercent}% e intermediação</p>
        </div>

        <div className="glassmorphism p-5 rounded-2xl border border-emerald-500/20">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Lucro Líquido Real</span>
          <h3 className="text-xl font-bold text-emerald-400 font-mono mt-1.5">{formatCurrency(lucroLiquido)}</h3>
          <p className="text-[10px] text-slate-500 mt-1">Margem: <span className="font-bold text-emerald-400">{margemLucro.toFixed(1)}%</span></p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Waterfall Recharts Graph */}
        <div className="lg:col-span-8 glassmorphism p-6 rounded-2xl border border-slate-800/80">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Calculator size={18} className="text-indigo-400" /> Gráfico de Cascata DRE (Waterfall)
          </h3>
          <p className="text-xs text-slate-400 mt-1">Demonstração visual do faturamento bruto deduzindo despesas globais e diretas</p>
          
          <div className="mt-6 h-80 w-full">
            <DreWaterfallChart data={chartData} />
          </div>
        </div>

        {/* Detalhamento DRE Card */}
        <div className="lg:col-span-4 glassmorphism p-5 rounded-2xl border border-slate-800/80">
          <h3 className="text-sm font-bold text-white mb-4">Relatório do Regime de Competência</h3>
          
          <div className="space-y-3.5 text-xs text-slate-200">
            <div className="flex justify-between border-b border-slate-850 pb-2">
              <span className="text-slate-400 font-semibold font-sans">VGV Acumulado:</span>
              <span className="font-mono font-bold text-slate-100">{formatCurrency(totalVGV)}</span>
            </div>
            
            <div className="flex justify-between border-b border-slate-850 pb-2 text-red-400">
              <span className="text-slate-400">(-) Comissão Corretagem:</span>
              <span className="font-mono font-bold">({formatCurrency(totalComissao)})</span>
            </div>

            <div className="flex justify-between border-b border-slate-850 pb-2 text-red-400">
              <span className="text-slate-400">(-) Tributos RET ({retPercent}%):</span>
              <span className="font-mono font-bold">({formatCurrency(totalImposto)})</span>
            </div>

            <div className="flex justify-between border-b border-slate-850 pb-2 text-red-400">
              <span className="text-slate-400">(-) Rateio Terreno/Lote:</span>
              <span className="font-mono font-bold">({formatCurrency(rateioTerreno)})</span>
            </div>

            <div className="flex justify-between border-b border-slate-850 pb-2 text-red-400">
              <span className="text-slate-400">(-) Outros Rateios (Mkt/Eng):</span>
              <span className="font-mono font-bold">({formatCurrency(rateioProjetos + rateioMarketing + rateioOutros)})</span>
            </div>

            <div className="flex justify-between border-b border-slate-850 pb-2 text-red-400">
              <span className="text-slate-400">(-) Obras/Custos Diretos:</span>
              <span className="font-mono font-bold">({formatCurrency(totalConstrucao)})</span>
            </div>

            <div className="flex justify-between pt-1 text-emerald-400">
              <span className="text-slate-400 font-extrabold flex items-center gap-1">
                <TrendingUp size={14} className="text-emerald-400" /> Lucro Líquido Final:
              </span>
              <span className="font-mono font-extrabold text-base">{formatCurrency(lucroLiquido)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
