import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { consultarPortariaVigente } from '@/lib/mcmv/portariaIA';

// Roda a consulta assistida por IA (Gemini com busca web) da portaria vigente e
// retorna a SUGESTÃO de parâmetros. Não grava nada — o ADMIN revisa e aplica via
// PUT /api/mcmv/parametros.
export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('masar_session')?.value;
    const session = sessionToken ? await verifySession(sessionToken) : null;
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado: apenas administradores podem consultar a portaria por IA.' },
        { status: 403 },
      );
    }

    const sugestao = await consultarPortariaVigente();
    return NextResponse.json(sugestao);
  } catch (error) {
    console.error('Erro na consulta de portaria por IA:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
