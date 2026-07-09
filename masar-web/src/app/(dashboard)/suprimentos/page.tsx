import { db } from '@/lib/db';
import SuprimentosInbox from '@/components/SuprimentosInbox';

export const revalidate = 0;

export default async function SuprimentosPage() {
  // Carregar todas as solicitações de compra e suas cotações
  const solicitacoes = await db.solicitacaoCompra.findMany({
    include: {
      insumo: true,
      casa: {
        include: { 
          empreendimento: true,
          orcamento: {
            include: { itens: true }
          },
          transacoes: {
            where: {
              natureza: 'DESPESA',
              status: 'PAGO'
            }
          }
        }
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
  const serializedSolicitacoes = solicitacoes.map(s => {
    let orcadoQtd = null;
    let consumoQtd = null;
    let saldoQtd = null;

    if (s.casa) {
      const itemOrcado = s.casa.orcamento?.itens.find((item: any) => item.insumoId === s.insumoId);
      orcadoQtd = itemOrcado ? itemOrcado.quantidadePlanejada : 0;

      const apropriado = s.casa.transacoes
        .filter((t: any) => t.insumoId === s.insumoId)
        .reduce((sum: number, t: any) => sum + t.quantidade, 0);
      consumoQtd = apropriado;
      saldoQtd = orcadoQtd - consumoQtd;
    }

    return {
      ...s,
      dataNecessidade: s.dataNecessidade.toISOString(),
      dataCriacao: s.dataCriacao.toISOString(),
      cotacoes: s.cotacoes.map(c => ({
        ...c,
        dataCriacao: c.dataCriacao.toISOString()
      })),
      orcadoQtd,
      consumoQtd,
      saldoQtd
    };
  });

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
