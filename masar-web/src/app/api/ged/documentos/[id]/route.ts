import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { caminhoAbsoluto } from '@/lib/storage';
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

    // O documento já vem escopado pela empresa (a extensão do Prisma injeta o
    // empresaId no where), então documento de outro cliente devolve 404 acima.
    // Aqui só resolvemos o caminho — relativo nos registros novos, absoluto nos
    // antigos —, com guarda contra sair do diretório base.
    const caminho = caminhoAbsoluto(documento.caminhoArquivo);

    if (!existsSync(caminho)) {
      return NextResponse.json({ error: 'Arquivo físico não encontrado no volume' }, { status: 404 });
    }

    const fileBuffer = await readFile(caminho);
    const fileExtension = caminho.split('.').pop() || 'pdf';

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
