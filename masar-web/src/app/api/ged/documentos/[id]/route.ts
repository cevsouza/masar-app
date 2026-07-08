import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/auth';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionToken = request.cookies.get('masar_session')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const session = await verifySession(sessionToken);
    if (!session) {
      return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 });
    }

    const { id: documentoId } = await params;
    const documento = await db.documentoAnexo.findUnique({
      where: { id: documentoId }
    });

    if (!documento) {
      return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 });
    }

    // Verificar se o arquivo físico existe no volume
    if (!existsSync(documento.caminhoArquivo)) {
      return NextResponse.json({ error: 'Arquivo físico não encontrado no volume' }, { status: 404 });
    }

    // Ler arquivo
    const fileBuffer = await readFile(documento.caminhoArquivo);
    const fileExtension = documento.caminhoArquivo.split('.').pop() || 'pdf';

    const contentType = fileExtension === 'pdf' 
      ? 'application/pdf' 
      : 'application/octet-stream';

    return new Response(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(documento.nome)}.${fileExtension}"`
      }
    });
  } catch (error) {
    console.error('Erro ao baixar documento:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
