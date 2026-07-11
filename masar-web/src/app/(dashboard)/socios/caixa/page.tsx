import { db } from '@/lib/db';
import SocioCaixaForm from '@/components/SocioCaixaForm';
import { calcularCaixaLivre } from '@/lib/socioGuardrail';

export const revalidate = 0; // Real-time calculation of liquidity metrics

export default async function SociosCaixaPage() {
  const today = new Date();

  // 1. Load basic assets
  const socios = await db.socio.findMany({
    orderBy: { nome: 'asc' }
  });

  const contas = await db.contaBancaria.findMany({
    orderBy: { nome: 'asc' }
  });

  const projects = await db.empreendimento.findMany({
    orderBy: { nome: 'asc' }
  });

  const movimentacoes = await db.movimentacaoSocio.findMany({
    include: {
      socio: true,
      empreendimento: true
    },
    orderBy: { data: 'desc' }
  });

  // 2-5. Custo a incorrer, recebíveis, saldo bancário e caixa livre
  const { caixaLivre, saldoBancario, custoAIncorrer, recebiveisCurtoPrazo } = await calcularCaixaLivre();

  const activeHouses = await db.casa.findMany({
    where: { statusObra: { notIn: ['CONCLUIDA'] } }
  });

  // 6. Projeção de fluxo de caixa simplificada para os próximos 6 meses (para o gráfico Recharts)
  // Receita projetada: parcelas a receber no mês + medições estimadas
  // Despesas projetadas: custos a incorrer rateados
  const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const chartTimeline: { mes: string; receitas: number; despesas: number }[] = [];

  for (let i = 0; i < 6; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() + i);
    const mesNome = mesesNomes[d.getMonth()];
    const ano = d.getFullYear();

    // Sum client receivables in this month
    const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
    const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

    const recMes = await db.transacaoFinanceira.aggregate({
      where: {
        natureza: 'RECEITA',
        status: 'PENDENTE',
        categoria: 'ENTRADA_CLIENTE',
        dataVencimento: { gte: startOfMonth, lte: endOfMonth }
      },
      _sum: { valor: true }
    });

    const medMes = await db.medicaoCaixa.aggregate({
      where: {
        status: 'AGUARDANDO',
        dataMedicao: { gte: startOfMonth, lte: endOfMonth }
      },
      _sum: { valorLiberado: true }
    });

    const receitasProjetadas = (recMes._sum.valor || 0) + (medMes._sum.valorLiberado || 0);
    // Simple distribution: remaining cost distributed over 6 months
    const despesasProjetadas = activeHouses.length > 0 ? (custoAIncorrer / 6) : 0;

    chartTimeline.push({
      mes: `${mesNome}/${ano.toString().slice(-2)}`,
      receitas: receitasProjetadas,
      despesas: despesasProjetadas
    });
  }

  // Serialização de datas das movimentações para props simples
  const serializedMovs = movimentacoes.map(m => ({
    id: m.id,
    socioId: m.socioId,
    socioNome: m.socio.nome,
    empreendimentoId: m.empreendimentoId,
    empNome: m.empreendimento?.nome || 'Geral/Institucional',
    tipo: m.tipo,
    valor: m.valor,
    data: m.data.toISOString()
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl font-sans">Tesouraria Societária</h1>
        <p className="text-sm text-slate-400 mt-1">
          Visão de Liquidez Real (Regime de Caixa) e Blindagem do Custo a Incorrer de Obras.
        </p>
      </div>

      <SocioCaixaForm 
        socios={socios} 
        contas={contas} 
        projects={projects}
        initialMovimentacoes={serializedMovs}
        saldoBancario={saldoBancario}
        custoAIncorrer={custoAIncorrer}
        recebiveisCurtoPrazo={recebiveisCurtoPrazo}
        caixaLivre={caixaLivre}
        chartTimeline={chartTimeline}
      />
    </div>
  );
}
