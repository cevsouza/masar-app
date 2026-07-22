import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/auth';
import { lerCSV, normalizarChave } from '@/lib/importacao/csv';
import { analisarCasas, modeloCSV, STATUS_VALIDOS, type CasaImportada } from '@/lib/importacao/casas';
import { bloqueioNovasUnidades } from '@/lib/licenca';
import { logMutation } from '@/lib/audit';
import { exigirAcesso } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

const TAMANHO_MAXIMO = 2 * 1024 * 1024; // 2 MB — planilha de 300 unidades tem alguns KB.

async function exigirPermissao(request: NextRequest) {
  const token = request.cookies.get('masar_session')?.value;
  const session = token ? await verifySession(token) : null;
  if (!session || !['ADMIN', 'ENGENHARIA', 'FINANCEIRO'].includes(session.role)) return null;
  return session;
}

// GET ?modelo=1 → baixa o CSV de exemplo para o cliente preencher.
export async function GET(request: NextRequest) {
  const auth = await exigirAcesso(request, { modulo: 'obras' });
  if (!auth.ok) return auth.resposta;

  const { searchParams } = new URL(request.url);
  if (searchParams.get('modelo') !== '1') {
    return NextResponse.json({ error: 'Parâmetro ausente.' }, { status: 400 });
  }
  return new NextResponse(modeloCSV(), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="modelo-unidades.csv"',
    },
  });
}

/**
 * POST (multipart) → CONFERE a planilha e devolve o diagnóstico. Não grava nada.
 *
 * A conferência é um passo separado de propósito: importação que grava direto
 * obriga o cliente a desfazer quando algo sai errado — e desfazer 200 unidades
 * é pior do que não ter importado. Aqui ele vê antes o que vai entrar.
 */
export async function POST(request: NextRequest) {
  const session = await exigirPermissao(request);
  if (!session) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });

  try {
    const form = await request.formData();
    const arquivo = form.get('arquivo');
    const empreendimentoId = String(form.get('empreendimentoId') ?? '');

    if (!(arquivo instanceof File)) {
      return NextResponse.json({ error: 'Envie o arquivo CSV.' }, { status: 400 });
    }
    if (arquivo.size > TAMANHO_MAXIMO) {
      return NextResponse.json(
        { error: 'Arquivo acima de 2 MB. Se for planilha do Excel, salve como CSV antes.' },
        { status: 400 },
      );
    }
    if (!empreendimentoId) {
      return NextResponse.json({ error: 'Escolha o empreendimento.' }, { status: 400 });
    }

    const emp = await db.empreendimento.findUnique({
      where: { id: empreendimentoId },
      select: { id: true, nome: true },
    });
    if (!emp) return NextResponse.json({ error: 'Empreendimento não encontrado.' }, { status: 404 });

    const { linhas, cabecalho, separador, encodingLatino } = lerCSV(await arquivo.arrayBuffer());
    if (linhas.length === 0) {
      return NextResponse.json(
        { error: 'A planilha não tem nenhuma linha além do cabeçalho.' },
        { status: 400 },
      );
    }

    const jaExistentes = await db.casa.findMany({
      where: { empreendimentoId },
      select: { numero: true, quadra: true },
    });

    const analise = analisarCasas(linhas, cabecalho.map(normalizarChave), jaExistentes);

    // O teto da licença é informado JÁ na conferência: descobrir que não cabe
    // só depois de revisar 200 linhas é desperdiçar o trabalho do cliente.
    const licenca = await bloqueioNovasUnidades(analise.prontas);

    return NextResponse.json({
      empreendimento: emp.nome,
      separador,
      encodingLatino,
      ...analise,
      licenca: licenca.bloqueado ? { bloqueado: true, mensagem: licenca.mensagem } : { bloqueado: false },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Não foi possível ler a planilha.' },
      { status: 400 },
    );
  }
}

/**
 * PUT (JSON) → GRAVA as unidades já revisadas na tela.
 *
 * Recebe as linhas corrigidas, não o arquivo: é isso que permite consertar sem
 * recomeçar. E revalida tudo do zero — a tela é conveniência, não autoridade.
 */
export async function PUT(request: NextRequest) {
  const session = await exigirPermissao(request);
  if (!session) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });

  try {
    const body = await request.json();
    const empreendimentoId = String(body?.empreendimentoId ?? '');
    const casas: CasaImportada[] = Array.isArray(body?.casas) ? body.casas : [];

    if (!empreendimentoId) return NextResponse.json({ error: 'Empreendimento ausente.' }, { status: 400 });
    if (casas.length === 0) return NextResponse.json({ error: 'Nenhuma unidade para importar.' }, { status: 400 });

    const emp = await db.empreendimento.findUnique({
      where: { id: empreendimentoId },
      select: { id: true, nome: true },
    });
    if (!emp) return NextResponse.json({ error: 'Empreendimento não encontrado.' }, { status: 404 });

    // Teto da licença: a importação é o QUARTO caminho que cria unidade, e o
    // mais volumoso de todos. Sem esta guarda, uma planilha passaria por cima
    // de um limite que as outras três respeitam.
    const licenca = await bloqueioNovasUnidades(casas.length);
    if (licenca.bloqueado) {
      return NextResponse.json(
        { error: 'LIMITE_LICENCA_EXCEDIDO', message: licenca.mensagem },
        { status: 402 },
      );
    }

    const existentes = new Set(
      (await db.casa.findMany({ where: { empreendimentoId }, select: { numero: true, quadra: true } }))
        .map((c) => `${c.numero.trim().toUpperCase()}|${c.quadra.trim().toUpperCase()}`),
    );

    const vistas = new Set<string>();
    const aCriar = casas.filter((c) => {
      const numero = String(c.numero ?? '').trim();
      const quadra = String(c.quadra ?? '').trim();
      if (!numero || !quadra) return false;
      const chave = `${numero.toUpperCase()}|${quadra.toUpperCase()}`;
      if (existentes.has(chave) || vistas.has(chave)) return false;
      vistas.add(chave);
      return true;
    });

    if (aCriar.length === 0) {
      return NextResponse.json(
        { error: 'Nenhuma unidade nova para importar — todas já existem ou estão sem identificação.' },
        { status: 400 },
      );
    }

    const criadas = await db.casa.createMany({
      data: aCriar.map((c) => ({
        empreendimentoId,
        numero: String(c.numero).trim(),
        quadra: String(c.quadra).trim(),
        areaConstruida: c.areaConstruida ?? null,
        areaLote: c.areaLote ?? null,
        quantidadeQuartos: c.quantidadeQuartos ?? 0,
        quantidadeSuites: c.quantidadeSuites ?? 0,
        quantidadeBanheiros: c.quantidadeBanheiros ?? 0,
        vagasGaragem: c.vagasGaragem ?? 0,
        valorVendaProjetado: c.valorVendaProjetado ?? null,
        unidadeAdaptavelMCMV: !!c.unidadeAdaptavelMCMV,
        statusObra: (STATUS_VALIDOS as readonly string[]).includes(c.statusObra)
          ? (c.statusObra as never)
          : ('BACKLOG' as never),
        percentualObra: Math.min(100, Math.max(0, Number(c.percentualObra) || 0)),
      })),
      skipDuplicates: true,
    });

    await logMutation({
      usuarioId: session.userId,
      usuarioNome: session.nome,
      acao: 'UNIDADES_IMPORTADAS',
      tabela: 'Casa',
      registroId: empreendimentoId,
      valoresNovos: { empreendimento: emp.nome, quantidade: criadas.count },
    });

    return NextResponse.json({ importadas: criadas.count, empreendimento: emp.nome });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Não foi possível importar.' },
      { status: 400 },
    );
  }
}
