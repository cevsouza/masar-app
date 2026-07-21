import { NextRequest, NextResponse } from 'next/server';
import {
  cobrancasDaCompetencia,
  pendentesEmAberto,
  gerarCobrancasDoMes,
  competenciaAtual,
} from '@/lib/cobranca';

export const dynamic = 'force-dynamic';

/**
 * Faturamento dos clientes. Control plane: o guarda de admin de plataforma está
 * dentro de cada função de lib/cobranca, não aqui — assim nenhuma chamada nova
 * escapa por esquecimento de repetir a checagem na rota.
 */

// GET ?competencia=AAAA-MM  → cobranças do mês
// GET ?pendentes=1          → tudo em aberto, de qualquer mês
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    if (searchParams.get('pendentes') === '1') {
      return NextResponse.json({ linhas: await pendentesEmAberto() });
    }

    const competencia = searchParams.get('competencia') || competenciaAtual();
    return NextResponse.json({
      competencia,
      linhas: await cobrancasDaCompetencia(competencia),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Falha ao listar cobranças' },
      { status: 403 },
    );
  }
}

// POST { competencia } → gera as cobranças do mês. Repetível: rodar duas vezes
// no mesmo mês não cobra duas vezes (unique empresaId+competencia).
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const competencia = body?.competencia || competenciaAtual();
    return NextResponse.json(await gerarCobrancasDoMes(competencia));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Falha ao gerar cobranças' },
      { status: 400 },
    );
  }
}
