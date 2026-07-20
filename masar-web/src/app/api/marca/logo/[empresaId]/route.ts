import { NextRequest, NextResponse } from 'next/server';
import { caminhoLogo } from '@/lib/storage';
import { readFile } from 'fs/promises';

/**
 * Serve o logo de uma empresa — rota PÚBLICA, sem sessão.
 *
 * É pública de propósito: o logo aparece na tela de login (antes de existir
 * sessão), no portal do comprador e na página de cotação que o fornecedor
 * abre. Um logo não é dado sensível — ele já é exibido publicamente.
 *
 * A superfície é deliberadamente mínima: recebe um empresaId, e só sabe ler de
 * `logos/<empresaId>.<ext>`. Não toca no diretório de documentos de tenant
 * nenhum, não aceita caminho, não faz travessia. caminhoLogo() valida o
 * formato do id e só devolve caminho dentro da pasta de logos.
 */

const TIPOS: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ empresaId: string }> }) {
  const { empresaId } = await params;
  const logo = caminhoLogo(empresaId);
  if (!logo) {
    return NextResponse.json({ error: 'Logo não encontrado' }, { status: 404 });
  }

  try {
    const buffer = await readFile(logo.caminho);
    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': TIPOS[logo.ext] || 'application/octet-stream',
        // Content-Disposition inline com o tipo travado: o navegador trata como
        // imagem, nunca como documento navegável.
        'Content-Disposition': 'inline',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Logo não encontrado' }, { status: 404 });
  }
}
