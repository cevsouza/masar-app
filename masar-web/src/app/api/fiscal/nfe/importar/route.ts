import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/auth';
import { logMutation } from '@/lib/audit';
import { registrarMovimentacaoEstoque } from '@/lib/estoque';
import { parseNfeXml, soDigitos } from '@/lib/nfe';

// POST: importa uma NF-e de entrada (XML) -> NotaFiscalEntrada + conta a pagar
// (+ entrada de estoque best-effort para itens que casam com o catálogo por nome).
export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('masar_session')?.value;
    const session = sessionToken ? await verifySession(sessionToken) : null;
    if (!session || !['ADMIN', 'FINANCEIRO'].includes(session.role || '')) {
      return NextResponse.json({ error: 'Acesso negado: apenas ADMIN ou FINANCEIRO importam NF-e.' }, { status: 403 });
    }

    const body = await request.json();
    const { xml, empreendimentoId, gerarEstoque = true } = body;

    if (!xml || typeof xml !== 'string' || !xml.includes('<')) {
      return NextResponse.json({ error: 'XML da NF-e é obrigatório.' }, { status: 400 });
    }
    if (!empreendimentoId) {
      return NextResponse.json({ error: 'Selecione o empreendimento para lançar a conta a pagar.' }, { status: 400 });
    }

    const nfe = parseNfeXml(xml);
    if (!nfe.valorTotal || nfe.valorTotal <= 0) {
      return NextResponse.json({ error: 'Não foi possível ler o valor total da NF-e no XML.' }, { status: 400 });
    }

    // Dedup por chave de acesso.
    if (nfe.chave) {
      const existe = await db.notaFiscalEntrada.findFirst({ where: { chave: nfe.chave } });
      if (existe) {
        return NextResponse.json({ error: 'Esta NF-e já foi importada (chave de acesso duplicada).' }, { status: 409 });
      }
    }

    // Casa o fornecedor pelo CNPJ do emitente (comparando só dígitos).
    const cnpjNfe = soDigitos(nfe.emitenteCnpj);
    let fornecedor: { id: string; prazoPagamentoDias: number | null } | null = null;
    if (cnpjNfe) {
      const fornecedores = await db.fornecedor.findMany({ select: { id: true, cnpj: true, prazoPagamentoDias: true } });
      const match = fornecedores.find((f) => soDigitos(f.cnpj) === cnpjNfe);
      if (match) fornecedor = { id: match.id, prazoPagamentoDias: match.prazoPagamentoDias };
    }

    // Vencimento: emissão (ou hoje) + prazo do fornecedor (0 = à vista).
    const base = nfe.dataEmissao ?? new Date();
    const dataVencimento = new Date(base);
    dataVencimento.setDate(dataVencimento.getDate() + (fornecedor?.prazoPagamentoDias ?? 0));

    const descricao = `NF-e ${nfe.numero || 's/nº'} — ${nfe.emitenteNome || 'Fornecedor'}`;

    const resultado = await db.$transaction(async (tx) => {
      // 1. Conta a pagar (despesa pendente)
      const contaPagar = await tx.transacaoFinanceira.create({
        data: {
          descricao,
          valor: nfe.valorTotal,
          dataVencimento,
          natureza: 'DESPESA',
          status: 'PENDENTE',
          categoria: 'MATERIAL',
          empreendimentoId,
          quantidade: 1,
        },
      });

      // 2. Estoque best-effort: itens que casam com um InsumoPadrao por nome exato.
      let itensGeraramEstoque = 0;
      if (gerarEstoque) {
        for (const item of nfe.itens) {
          if (!item.quantidade || item.quantidade <= 0) continue;
          const insumo = await tx.insumoPadrao.findFirst({
            where: { nome: { equals: item.descricao, mode: 'insensitive' } },
            select: { id: true },
          });
          if (!insumo) continue;
          await registrarMovimentacaoEstoque(tx, {
            insumoId: insumo.id,
            quantidade: item.quantidade,
            tipo: 'ENTRADA',
          });
          itensGeraramEstoque += 1;
        }
      }

      // 3. Registro da NF-e
      const nota = await tx.notaFiscalEntrada.create({
        data: {
          chave: nfe.chave,
          numero: nfe.numero,
          serie: nfe.serie,
          emitenteCnpj: nfe.emitenteCnpj,
          emitenteNome: nfe.emitenteNome,
          valorTotal: nfe.valorTotal,
          dataEmissao: nfe.dataEmissao,
          fornecedorId: fornecedor?.id ?? null,
          empreendimentoId,
          contaPagarId: contaPagar.id,
          itensGeraramEstoque,
          itens: nfe.itens as any,
        },
      });

      await logMutation({
        usuarioId: session.userId,
        usuarioNome: session.nome,
        acao: 'IMPORTAR_NFE_ENTRADA',
        tabela: 'NotaFiscalEntrada',
        registroId: nota.id,
        valoresNovos: { chave: nfe.chave, valorTotal: nfe.valorTotal, contaPagarId: contaPagar.id, itensGeraramEstoque },
      });

      return { nota, contaPagarId: contaPagar.id, itensGeraramEstoque };
    });

    return NextResponse.json({
      success: true,
      notaId: resultado.nota.id,
      fornecedorVinculado: !!fornecedor,
      contaPagarId: resultado.contaPagarId,
      itens: nfe.itens.length,
      itensGeraramEstoque: resultado.itensGeraramEstoque,
      valorTotal: nfe.valorTotal,
    });
  } catch (error: any) {
    console.error('[Fiscal] Erro ao importar NF-e:', error);
    return NextResponse.json({ error: 'Erro interno do servidor', message: error.message }, { status: 500 });
  }
}
