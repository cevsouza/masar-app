import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/auth';
import { logMutation } from '@/lib/audit';

// POST: importa linhas de extrato bancário (manual ou colagem de CSV parseado no
// cliente). Cria TransacaoBancaria conciliado=false, origem=null (externo), prontas
// para conciliar. Dedup opcional por documentoIdentificador.
export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('masar_session')?.value;
    const session = sessionToken ? await verifySession(sessionToken) : null;
    if (!session || !['ADMIN', 'FINANCEIRO'].includes(session.role || '')) {
      return NextResponse.json({ error: 'Acesso negado: apenas ADMIN ou FINANCEIRO podem importar extrato.' }, { status: 403 });
    }

    const body = await request.json();
    const linhas = Array.isArray(body.linhas) ? body.linhas : [];
    if (linhas.length === 0) {
      return NextResponse.json({ error: 'Nenhuma linha para importar.' }, { status: 400 });
    }

    // Conta bancária alvo: a informada ou a primeira cadastrada.
    let contaBancariaId = body.contaBancariaId as string | undefined;
    if (!contaBancariaId) {
      const conta = await db.contaBancaria.findFirst();
      if (!conta) {
        return NextResponse.json({ error: 'Nenhuma conta bancária cadastrada para receber o extrato.' }, { status: 400 });
      }
      contaBancariaId = conta.id;
    }

    let criadas = 0;
    let ignoradas = 0;
    const erros: string[] = [];

    for (let i = 0; i < linhas.length; i++) {
      const l = linhas[i];
      const valor = parseFloat(l.valor);
      const tipo = String(l.tipo || '').toUpperCase();
      const descricao = String(l.descricao || '').trim();
      const data = l.data ? new Date(l.data) : null;

      if (!descricao || isNaN(valor) || valor <= 0 || !['CREDITO', 'DEBITO'].includes(tipo) || !data || isNaN(data.getTime())) {
        erros.push(`Linha ${i + 1} inválida (precisa de data, descrição, valor > 0 e tipo CREDITO/DEBITO).`);
        continue;
      }

      const doc = l.documentoIdentificador ? String(l.documentoIdentificador).trim() : null;
      if (doc) {
        const existe = await db.transacaoBancaria.findUnique({ where: { documentoIdentificador: doc } });
        if (existe) {
          ignoradas++;
          continue;
        }
      }

      await db.transacaoBancaria.create({
        data: {
          contaBancariaId,
          data,
          valor,
          descricao,
          tipo,
          conciliado: false,
          origem: null, // externo/importado
          documentoIdentificador: doc,
        },
      });
      criadas++;
    }

    await logMutation({
      usuarioId: session.userId,
      usuarioNome: session.nome,
      acao: 'IMPORTAR_EXTRATO',
      tabela: 'TransacaoBancaria',
      registroId: contaBancariaId,
      valoresNovos: { criadas, ignoradas, totalRecebido: linhas.length },
    });

    return NextResponse.json({ success: true, criadas, ignoradas, erros });
  } catch (error: any) {
    console.error('[Conciliação] Erro ao importar extrato:', error);
    return NextResponse.json({ error: 'Erro interno do servidor', message: error.message }, { status: 500 });
  }
}
