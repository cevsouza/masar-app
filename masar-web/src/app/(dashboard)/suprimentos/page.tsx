import { db } from '@/lib/db';
import SuprimentosInbox from '@/components/SuprimentosInbox';

export const revalidate = 0;

export default async function SuprimentosPage() {
  // Carregar todas as solicitações de compra e suas cotações
  const solicitacoes = await db.solicitacaoCompra.findMany({
    include: {
      insumo: true,
      casa: {
        include: { empreendimento: true }
      },
      empreendimento: true,
      cotacoes: true
    },
    orderBy: { dataCriacao: 'desc' }
  });

  // Carregar dados de apoio para o modal de criação de requisição
  const casas = await db.casa.findMany({
    include: { empreendimento: true },
    orderBy: { numero: 'asc' }
  });

  const insumos = await db.insumoPadrao.findMany({
    orderBy: { nome: 'asc' }
  });

  const empreendimentos = await db.empreendimento.findMany({
    orderBy: { nome: 'asc' }
  });

  // Serializar datas para componentes clientes com segurança
  const serializedSolicitacoes = solicitacoes.map(s => ({
    ...s,
    dataNecessidade: s.dataNecessidade.toISOString(),
    dataCriacao: s.dataCriacao.toISOString(),
    cotacoes: s.cotacoes.map(c => ({
      ...c,
      dataCriacao: c.dataCriacao.toISOString()
    }))
  }));

  const serializedCasas = casas.map(c => ({
    id: c.id,
    numero: c.numero,
    quadra: c.quadra,
    empreendimento: { nome: c.empreendimento.nome, id: c.empreendimento.id }
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl font-sans">Gestão de Suprimentos</h1>
        <p className="text-sm text-slate-400 mt-1">
          Inbox de requisições de canteiro, comparação de preços de lojistas e emissão de ordens de compra.
        </p>
      </div>

      <SuprimentosInbox 
        initialSolicitacoes={serializedSolicitacoes} 
        casas={serializedCasas}
        insumos={insumos}
        empreendimentos={empreendimentos}
      />
    </div>
  );
}
