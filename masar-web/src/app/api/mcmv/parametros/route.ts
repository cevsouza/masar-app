import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/auth';
import { logMutation } from '@/lib/audit';

const FAIXAS = ['FAIXA_1', 'FAIXA_2', 'FAIXA_3', 'FAIXA_4'];

// Lista os parâmetros regulatórios por faixa (teto de valor, área mínima, % acessível).
export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('masar_session')?.value;
    const session = sessionToken ? await verifySession(sessionToken) : null;
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const rows = await db.parametroMCMV.findMany({ orderBy: { faixa: 'asc' } });
    const parametros = rows.map((p) => ({
      faixa: p.faixa,
      tetoValorImovel: Number(p.tetoValorImovel),
      areaUtilMinima: Number(p.areaUtilMinima),
      percentualUnidadesAcessiveis: p.percentualUnidadesAcessiveis,
      portariaReferencia: p.portariaReferencia,
      dataVigencia: p.dataVigencia ? p.dataVigencia.toISOString() : null,
      fonteUrl: p.fonteUrl,
      atualizadoPor: p.atualizadoPor,
      atualizadoEm: p.atualizadoEm.toISOString(),
    }));
    return NextResponse.json(parametros);
  } catch (error) {
    console.error('Erro ao listar parâmetros MCMV:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// Grava (upsert) um ou mais parâmetros de faixa. Usado tanto pela edição manual
// quanto ao APLICAR a sugestão da IA (revisão humana obrigatória). Auditado.
export async function PUT(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('masar_session')?.value;
    const session = sessionToken ? await verifySession(sessionToken) : null;
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado: apenas administradores podem alterar os parâmetros MCMV.' },
        { status: 403 },
      );
    }

    const body = await request.json();
    const lista = Array.isArray(body?.parametros) ? body.parametros : [body];
    const dataVigenciaGlobal = body?.dataVigencia ? new Date(body.dataVigencia) : null;

    const resultados = [];
    for (const p of lista) {
      if (!FAIXAS.includes(p?.faixa)) continue;
      const teto = Number(p.tetoValorImovel);
      const area = Number(p.areaUtilMinima);
      if (!isFinite(teto) || teto <= 0 || !isFinite(area) || area <= 0) continue;

      const dados = {
        tetoValorImovel: teto,
        areaUtilMinima: area,
        percentualUnidadesAcessiveis: Number(p.percentualUnidadesAcessiveis) || 3,
        portariaReferencia: p.portariaReferencia ?? body?.portariaReferencia ?? null,
        dataVigencia: p.dataVigencia ? new Date(p.dataVigencia) : dataVigenciaGlobal,
        fonteUrl: p.fonteUrl ?? body?.fonteUrl ?? null,
        atualizadoPor: session.nome,
      };

      const upserted = await db.parametroMCMV.upsert({
        where: { faixa: p.faixa },
        create: { faixa: p.faixa, ...dados },
        update: dados,
      });
      resultados.push(upserted);
    }

    if (resultados.length === 0) {
      return NextResponse.json({ error: 'Nenhum parâmetro válido para gravar.' }, { status: 400 });
    }

    await logMutation({
      usuarioId: session.userId,
      usuarioNome: session.nome,
      acao: 'UPDATE',
      tabela: 'ParametroMCMV',
      registroId: resultados.map((r) => r.faixa).join(','),
      valoresNovos: resultados,
    });

    return NextResponse.json({ ok: true, atualizados: resultados.length });
  } catch (error) {
    console.error('Erro ao gravar parâmetros MCMV:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
