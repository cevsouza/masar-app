import { db } from '@/lib/db';
import ReportGenerator from '@/components/ReportGenerator';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const revalidate = 0;

export default async function RelatoriosPage() {
  // Verificar permissões
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('masar_session')?.value;
  const session = sessionToken ? await verifySession(sessionToken) : null;
  
  if (!session || !['ADMIN', 'FINANCEIRO', 'ENGENHARIA'].includes(session.role)) {
    redirect('/');
  }

  // Carregar todos os Empreendimentos com seus respectivos Marcos
  const empreendimentos = await db.empreendimento.findMany({
    include: {
      marcos: {
        orderBy: { dataProtocolo: 'asc' }
      }
    },
    orderBy: { nome: 'asc' }
  });

  // Carregar todas as Casas com Orçamentos, Apropriações de custos e Diários
  const casas = await db.casa.findMany({
    include: {
      empreendimento: true,
      cliente: true,
      infraestrutura: true,
      orcamento: {
        include: {
          itens: {
            include: { insumo: true }
          }
        }
      },
      transacoes: {
        include: { insumo: true },
        orderBy: { dataVencimento: 'desc' }
      },
      diarios: {
        orderBy: { data: 'desc' },
        take: 10
      }
    },
    orderBy: [
      { quadra: 'asc' },
      { numero: 'asc' }
    ]
  });

  // Serializar datas para evitar incompatibilidades de props em Server Components
  const serializedEmpreendimentos = empreendimentos.map(e => ({
    ...e,
    dataCriacao: e.dataCriacao.toISOString(),
    dataInicio: e.dataInicio ? e.dataInicio.toISOString() : null,
    dataFim: e.dataFim ? e.dataFim.toISOString() : null,
    marcos: e.marcos.map(m => {
      const dataLimiteVirtual = new Date(m.dataProtocolo);
      dataLimiteVirtual.setDate(dataLimiteVirtual.getDate() + m.prazoEsperadoDias);

      return {
        ...m,
        dataProtocolo: m.dataProtocolo.toISOString(),
        dataAprovacaoReal: m.dataAprovacaoReal ? m.dataAprovacaoReal.toISOString() : null,
        dataLimite: dataLimiteVirtual.toISOString(),
        dataConclusao: m.dataAprovacaoReal ? m.dataAprovacaoReal.toISOString() : null
      };
    })
  }));

  const serializedCasas = casas.map(c => ({
    ...c,
    dataCriacao: c.dataCriacao.toISOString(),
    dataAtualizacao: c.dataAtualizacao.toISOString(),
    prazoFisico: c.prazoFisico ? c.prazoFisico.toISOString() : null,
    prazoFinanceiro: c.prazoFinanceiro ? c.prazoFinanceiro.toISOString() : null,
    transacoes: c.transacoes.map(t => ({
      ...t,
      dataVencimento: t.dataVencimento.toISOString(),
      dataPagamento: t.dataPagamento ? t.dataPagamento.toISOString() : null,
    })),
    diarios: c.diarios.map(d => ({
      ...d,
      data: d.data.toISOString(),
    }))
  }));

  return (
    <div className="space-y-6">
      <div className="no-print">
        <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl font-sans">
          Relatórios Gerenciais
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Geração SaaS de relatórios customizáveis de obras, cronograma legal de projetos e apropriação financeira.
        </p>
      </div>

      <ReportGenerator 
        empreendimentos={serializedEmpreendimentos}
        casas={serializedCasas}
      />
    </div>
  );
}
