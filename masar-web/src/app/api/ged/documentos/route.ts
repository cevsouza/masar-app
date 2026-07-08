import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { logMutation } from '@/lib/audit';

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('masar_session')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const session = await verifySession(sessionToken);
    if (!session) {
      return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const casaId = searchParams.get('casaId');
    const clienteId = searchParams.get('clienteId');
    const empreendimentoId = searchParams.get('empreendimentoId');

    const filter: any = {};
    if (casaId) filter.casaId = casaId;
    if (clienteId) filter.clienteId = clienteId;
    if (empreendimentoId) filter.empreendimentoId = empreendimentoId;

    const documentos = await db.documentoAnexo.findMany({
      where: filter,
      orderBy: { dataCriacao: 'desc' }
    });

    return NextResponse.json(documentos);
  } catch (error) {
    console.error('Erro ao buscar documentos:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('masar_session')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const session = await verifySession(sessionToken);
    if (!session) {
      return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const nome = formData.get('nome') as string;
    const dataVencimentoStr = formData.get('dataVencimento') as string;
    const casaId = formData.get('casaId') as string;
    const clienteId = formData.get('clienteId') as string;
    const empreendimentoId = formData.get('empreendimentoId') as string;

    if (!file || !nome) {
      return NextResponse.json({ error: 'Arquivo e nome do documento são obrigatórios' }, { status: 400 });
    }

    // 1. Resolver o diretório do volume persistente (Produção vs Local Dev)
    const uploadDir = process.env.NODE_ENV === 'production' 
      ? '/app/uploads' 
      : join(process.cwd(), 'uploads');

    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // 2. Gravar o arquivo fisicamente no volume
    const uniqueId = crypto.randomUUID();
    const extension = file.name.split('.').pop() || 'pdf';
    const fileName = `${uniqueId}.${extension}`;
    const filePath = join(uploadDir, fileName);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // 3. Cadastrar o documento na tabela DocumentoAnexo
    const documento = await db.documentoAnexo.create({
      data: {
        nome,
        caminhoArquivo: filePath,
        dataVencimento: dataVencimentoStr ? new Date(dataVencimentoStr) : null,
        status: 'ATIVO',
        casaId: casaId || null,
        clienteId: clienteId || null,
        empreendimentoId: empreendimentoId || null
      }
    });

    // 4. Gravar na Auditoria Imutável
    await logMutation({
      usuarioId: session.userId,
      usuarioNome: session.nome,
      acao: 'UPLOAD_DOCUMENTO_GED',
      tabela: 'DocumentoAnexo',
      registroId: documento.id,
      valoresNovos: { id: documento.id, nome: documento.nome, caminhoArquivo: documento.caminhoArquivo }
    });

    return NextResponse.json(documento, { status: 201 });
  } catch (error) {
    console.error('Erro ao fazer upload de documento:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
