import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { salvarArquivoDaEmpresa } from '@/lib/storage';
import { verifySession } from '@/lib/auth';
import { join } from 'path';
import { existsSync } from 'fs';
import { logMutation } from '@/lib/audit';
import { logger } from '@/lib/logger';
import { sendEmail } from '@/lib/resend';

export async function POST(request: NextRequest) {
  try {
    const traceId = crypto.randomUUID();
    
    // 1. Validar login do cliente no portal
    const clientToken = request.cookies.get('masar_client_session')?.value;
    if (!clientToken) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const session = await verifySession(clientToken);
    if (!session || session.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 });
    }

    const clienteId = session.clienteId;

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const tipoDoc = formData.get('tipo') as string; // "rg" ou "contracheque"

    if (!file || !tipoDoc) {
      return NextResponse.json({ error: 'Arquivo e tipo do documento são obrigatórios' }, { status: 400 });
    }

    // 2. Gravar o arquivo no volume persistente
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filePath = await salvarArquivoDaEmpresa(buffer, file.name);

    logger.info(`[Portal Cliente] Arquivo ${file.name} gravado com sucesso em ${filePath}`, { traceId, clienteId });

    // 3. Cadastrar o documento na tabela e atualizar a etapa da jornada
    const docNome = tipoDoc.toUpperCase() === 'CONTRACHEQUE' ? 'Comprovante de Renda (Contracheque)' : 'Documento de Identificação (RG)';

    await db.$transaction(async (tx) => {
      // Cadastrar o documento anexo
      await tx.documentoAnexo.create({
        data: {
          nome: docNome,
          caminhoArquivo: filePath,
          status: 'ATIVO',
          clienteId: clienteId
        }
      });

      const updatePayload: any = {
        etapaAtual: 'APROVACAO_BANCARIA'
      };

      if (tipoDoc.toLowerCase() === 'contracheque') {
        updatePayload.contrachequeUrl = filePath;
      } else {
        updatePayload.rg = filePath;
      }

      // Atualizar a etapa de jornada do cliente para APROVACAO_BANCARIA
      const clienteAtualizado = await tx.cliente.update({
        where: { id: clienteId },
        data: updatePayload,
        include: {
          contratos: {
            include: { corretor: true }
          }
        }
      });

      // 4. Criar Notificação In-App para administradores/corretores
      const corretoresUsers = await tx.user.findMany({
        where: { role: 'ADMIN' }
      });

      for (const adminUser of corretoresUsers) {
        await tx.notificacao.create({
          data: {
            usuarioId: adminUser.id,
            mensagem: `Jornada do Cliente: ${clienteAtualizado.nome} enviou o ${docNome} e avançou para a etapa de ANÁLISE/APROVAÇÃO BANCÁRIA.`,
            lida: false
          }
        });

        // Enviar e-mail de alerta via Resend
        await sendEmail({
          to: adminUser.email,
          subject: `Documento Enviado: ${clienteAtualizado.nome}`,
          html: `<p>Olá, ${adminUser.nome},</p>
                 <p>O cliente <strong>${clienteAtualizado.nome}</strong> enviou o documento <strong>${docNome}</strong> no Portal do Cliente.</p>
                 <p>A etapa dele foi alterada automaticamente para <strong>APROVAÇÃO BANCÁRIA</strong> no CRM.</p>
                 <p>Acesse o painel para verificar.</p>`
        });
      }

      // 5. Registrar log de auditoria
      await logMutation({
        usuarioId: 'CLIENT_PORTAL',
        usuarioNome: `Cliente: ${clienteAtualizado.nome}`,
        acao: 'CLIENT_DOCUMENT_UPLOAD_JORNADA_ADVANCE',
        tabela: 'Cliente',
        registroId: clienteId,
        valoresNovos: {
          docNome,
          etapaAtual: 'APROVACAO_BANCARIA'
        }
      });
    });

    return NextResponse.json({ success: true, message: 'Documento recebido e etapa avançada com sucesso!' });
  } catch (error: any) {
    logger.error('[Portal Cliente] Erro no upload do documento', error);
    return NextResponse.json({ error: 'Erro interno do servidor', message: error.message }, { status: 500 });
  }
}
