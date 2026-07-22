import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/auth';
import { apurarRET } from '@/lib/ret';
import { exigirAcesso } from '@/lib/apiAuth';

// GET: apuração mensal do RET de um empreendimento.
export async function GET(request: NextRequest) {
  const auth = await exigirAcesso(request, { modulo: 'fiscal' });
  if (!auth.ok) return auth.resposta;

  try {
    const { searchParams } = new URL(request.url);
    const empreendimentoId = searchParams.get('empreendimentoId');
    if (!empreendimentoId) {
      return NextResponse.json({ error: 'empreendimentoId é obrigatório' }, { status: 400 });
    }
    const apuracao = await apurarRET(empreendimentoId);
    if (!apuracao) {
      return NextResponse.json({ error: 'Empreendimento não encontrado' }, { status: 404 });
    }
    return NextResponse.json(apuracao);
  } catch (error) {
    console.error('[Fiscal] Erro ao apurar RET:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// PATCH: ajusta a alíquota de RET do empreendimento.
export async function PATCH(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('masar_session')?.value;
    const session = sessionToken ? await verifySession(sessionToken) : null;
    if (!session || !['ADMIN', 'FINANCEIRO'].includes(session.role || '')) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }
    const { empreendimentoId, aliquotaRET } = await request.json();
    if (!empreendimentoId) {
      return NextResponse.json({ error: 'empreendimentoId é obrigatório' }, { status: 400 });
    }
    const aliq = parseFloat(aliquotaRET);
    if (Number.isNaN(aliq) || aliq < 0 || aliq > 100) {
      return NextResponse.json({ error: 'Alíquota inválida (0 a 100).' }, { status: 400 });
    }
    await db.empreendimento.update({ where: { id: empreendimentoId }, data: { aliquotaRET: aliq } });
    return NextResponse.json({ ok: true, aliquotaRET: aliq });
  } catch (error) {
    console.error('[Fiscal] Erro ao ajustar alíquota RET:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
