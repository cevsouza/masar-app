import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { exigirAcesso } from '@/lib/apiAuth';

// GET: lista as NF-e de entrada importadas (mais recentes primeiro).
export async function GET(request: NextRequest) {
  const auth = await exigirAcesso(request, { modulo: 'fiscal' });
  if (!auth.ok) return auth.resposta;

  try {
    const notas = await db.notaFiscalEntrada.findMany({
      orderBy: { dataCriacao: 'desc' },
      include: {
        fornecedor: { select: { nome: true } },
        empreendimento: { select: { nome: true } },
      },
    });
    return NextResponse.json(notas);
  } catch (error) {
    console.error('[Fiscal] Erro ao listar NF-e:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
