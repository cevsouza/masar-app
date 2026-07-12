import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/auth';

// Agenda única de prazos: agrega Milestone + MarcoBurocratico + AtividadeCronograma
// (3 sistemas de prazo distintos) num formato comum de "o que vence".
// Os modelos continuam separados no banco; esta é a superfície unificada de leitura.

export interface ItemAgenda {
  id: string;
  origem: 'MILESTONE' | 'MARCO' | 'CRONOGRAMA';
  titulo: string;
  categoria: string;
  local: string;
  dataLimite: string;
  diasRestantes: number; // negativo = atrasado
  situacao: 'ATRASADO' | 'PROXIMO' | 'FUTURO';
  link: string;
}

const MARCO_LABELS: Record<string, string> = {
  ALVARA_PREFEITURA: 'Alvará da Prefeitura',
  PROJETO_CAIXA: 'Aprovação do Projeto na Caixa',
  HABITESE: 'Habite-se',
  CND_RECEITA: 'CND da Receita'
};

export async function GET(request: NextRequest) {
  const sessionToken = request.cookies.get('masar_session')?.value;
  const session = sessionToken ? await verifySession(sessionToken) : null;
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const diffDias = (limite: Date) => {
    const d = new Date(limite);
    d.setHours(0, 0, 0, 0);
    return Math.round((d.getTime() - hoje.getTime()) / 86400000);
  };

  const situacaoDe = (dias: number): ItemAgenda['situacao'] =>
    dias < 0 ? 'ATRASADO' : dias <= 30 ? 'PROXIMO' : 'FUTURO';

  const localDe = (casa: { numero: string; quadra: string } | null, emp: { nome: string } | null) =>
    casa ? `Qd ${casa.quadra} · Casa ${casa.numero}` : emp ? emp.nome : 'Geral';

  const [milestones, marcos, atividades] = await Promise.all([
    db.milestone.findMany({
      where: { concluido: false },
      include: {
        empreendimento: { select: { nome: true } },
        casa: { select: { numero: true, quadra: true, id: true } }
      }
    }),
    db.marcoBurocratico.findMany({
      where: { dataAprovacaoReal: null },
      include: { empreendimento: { select: { nome: true, id: true } } }
    }),
    db.atividadeCronograma.findMany({
      where: { status: { not: 'CONCLUIDA' } },
      include: {
        empreendimento: { select: { nome: true, id: true } },
        casa: { select: { numero: true, quadra: true, id: true } }
      }
    })
  ]);

  const itens: ItemAgenda[] = [];

  for (const m of milestones) {
    const dias = diffDias(m.dataLimite);
    itens.push({
      id: m.id,
      origem: 'MILESTONE',
      titulo: m.titulo,
      categoria: m.categoria,
      local: localDe(m.casa, m.empreendimento),
      dataLimite: m.dataLimite.toISOString(),
      diasRestantes: dias,
      situacao: situacaoDe(dias),
      link: m.casa ? `/casas/${m.casa.id}` : '/'
    });
  }

  for (const m of marcos) {
    const limite = new Date(m.dataProtocolo);
    limite.setDate(limite.getDate() + m.prazoEsperadoDias);
    const dias = diffDias(limite);
    itens.push({
      id: m.id,
      origem: 'MARCO',
      titulo: MARCO_LABELS[m.tipo] || m.tipo.replace(/_/g, ' '),
      categoria: 'Burocracia / Licenças',
      local: m.empreendimento.nome,
      dataLimite: limite.toISOString(),
      diasRestantes: dias,
      situacao: situacaoDe(dias),
      link: `/empreendimentos/${m.empreendimento.id}/ficha-tecnica`
    });
  }

  for (const a of atividades) {
    const dias = diffDias(a.dataFimPrevista);
    itens.push({
      id: a.id,
      origem: 'CRONOGRAMA',
      titulo: a.titulo,
      categoria: 'Cronograma de Obra',
      local: localDe(a.casa, a.empreendimento),
      dataLimite: a.dataFimPrevista.toISOString(),
      diasRestantes: dias,
      situacao: situacaoDe(dias),
      link: a.casa ? `/casas/${a.casa.id}` : `/empreendimentos/${a.empreendimento.id}/ficha-tecnica`
    });
  }

  // Atrasados primeiro (mais atrasado no topo), depois por proximidade do vencimento
  itens.sort((x, y) => x.diasRestantes - y.diasRestantes);

  return NextResponse.json({
    itens,
    resumo: {
      total: itens.length,
      atrasados: itens.filter(i => i.situacao === 'ATRASADO').length,
      proximos: itens.filter(i => i.situacao === 'PROXIMO').length,
      futuros: itens.filter(i => i.situacao === 'FUTURO').length
    }
  });
}
