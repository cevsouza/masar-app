import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { salvarArquivoDaEmpresa } from '@/lib/storage';
import { join } from 'path';
import { existsSync } from 'fs';
import { logMutation } from '@/lib/audit';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const traceId = crypto.randomUUID();
    const formData = await request.formData();
    
    const solicitacaoId = formData.get('solicitacaoId') as string;
    let fornecedorNome = formData.get('fornecedorNome') as string;
    const fornecedorId = (formData.get('fornecedorId') as string) || null;
    const valorUnitarioStr = formData.get('valorUnitario') as string;
    const prazoEntregaDiasStr = formData.get('prazoEntregaDias') as string;
    const file = formData.get('file') as File;

    if (!solicitacaoId || !fornecedorNome || !valorUnitarioStr || !prazoEntregaDiasStr) {
      return NextResponse.json({ error: 'Todos os campos obrigatórios (solicitacaoId, fornecedorNome, valorUnitario, prazoEntregaDias) devem ser preenchidos.' }, { status: 400 });
    }

    const valorUnitario = parseFloat(valorUnitarioStr);
    const prazoEntregaDias = parseInt(prazoEntregaDiasStr, 10);

    if (isNaN(valorUnitario) || valorUnitario <= 0 || isNaN(prazoEntregaDias) || prazoEntregaDias < 0) {
      return NextResponse.json({ error: 'Valores numéricos inválidos.' }, { status: 400 });
    }

    // Se veio um fornecedor cadastrado, o nome autoritativo vem do cadastro.
    if (fornecedorId) {
      const fornecedor = await db.fornecedor.findUnique({ where: { id: fornecedorId } });
      if (!fornecedor) {
        return NextResponse.json({ error: 'Fornecedor cadastrado não encontrado.' }, { status: 400 });
      }
      fornecedorNome = fornecedor.nome;
    }

    logger.info(`[Portal Fornecedor] Recebendo cotação de ${fornecedorNome} para solicitação ${solicitacaoId}`, { traceId });

    let comprovanteUrl: string | null = null;

    // 1. Gravar PDF fisicamente se fornecido
    if (file && file.size > 0) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      comprovanteUrl = await salvarArquivoDaEmpresa(buffer, file.name);
    }

    // 2. Gravar cotação no banco
    const cotacao = await db.$transaction(async (tx) => {
      const c = await tx.cotacaoFornecedor.create({
        data: {
          solicitacaoId,
          fornecedorNome,
          fornecedorId,
          valorUnitario,
          prazoEntregaDias,
          comprovanteUrl
        }
      });

      // Atualizar status da solicitação para EM_COTACAO
      await tx.solicitacaoCompra.update({
        where: { id: solicitacaoId },
        data: { status: 'EM_COTACAO' }
      });

      // Gravar na auditoria
      await logMutation({
        usuarioId: 'SUPPLIER_PORTAL',
        usuarioNome: `Fornecedor: ${fornecedorNome}`,
        acao: 'SUPPLIER_QUOTE_SUBMITTED',
        tabela: 'CotacaoFornecedor',
        registroId: c.id,
        valoresNovos: {
          solicitacaoId,
          valorUnitario,
          prazoEntregaDias
        }
      });

      return c;
    });

    logger.info(`[Portal Fornecedor] Cotação cadastrada com sucesso: ID ${cotacao.id}`, { traceId });

    return NextResponse.json({ success: true, message: 'Cotação enviada com sucesso!' });
  } catch (error: any) {
    logger.error('[Portal Fornecedor] Erro ao submeter cotação', error);
    return NextResponse.json({ error: 'Erro interno do servidor', message: error.message }, { status: 500 });
  }
}
