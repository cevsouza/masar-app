import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { statusValidade } from '@/lib/sst';
import { exigirAcesso } from '@/lib/apiAuth';

// GET: cofre global — todos os documentos com status de validade computado
// (Vencido / A vencer <=30d / Em dia / Sem validade) + resumo de contadores.
export async function GET(request: NextRequest) {
  const auth = await exigirAcesso(request, { modulo: 'fiscal' });
  if (!auth.ok) return auth.resposta;

  try {
    const documentos = await db.documentoAnexo.findMany({
      orderBy: [{ dataVencimento: 'asc' }, { dataCriacao: 'desc' }],
      include: {
        casa: { select: { numero: true, quadra: true } },
        cliente: { select: { nome: true } },
        empreendimento: { select: { nome: true } },
      },
    });

    const itens = documentos.map((d) => ({
      id: d.id,
      nome: d.nome,
      tipo: d.tipo,
      dataVencimento: d.dataVencimento,
      dataCriacao: d.dataCriacao,
      casa: d.casa,
      cliente: d.cliente,
      empreendimento: d.empreendimento,
      // Sem data de vencimento => documento perene (SEM_VALIDADE).
      status: d.dataVencimento ? statusValidade(d.dataVencimento) : 'SEM_VALIDADE',
    }));

    const resumo = {
      total: itens.length,
      vencidos: itens.filter((i) => i.status === 'VENCIDO').length,
      aVencer: itens.filter((i) => i.status === 'A_VENCER').length,
      emDia: itens.filter((i) => i.status === 'OK').length,
      semValidade: itens.filter((i) => i.status === 'SEM_VALIDADE').length,
    };

    return NextResponse.json({ itens, resumo });
  } catch (error) {
    console.error('Erro ao carregar cofre GED:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
