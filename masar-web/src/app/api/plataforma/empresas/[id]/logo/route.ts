import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { exigirAdminPlataforma } from '@/lib/plataforma';
import { runSemEscopoDeEmpresa } from '@/lib/tenant';
import { salvarLogoDaEmpresa } from '@/lib/storage';
import { logger } from '@/lib/logger';

/**
 * Upload do logo da empresa pelo console — alternativa ao campo de URL.
 *
 * Por que existe: exigir que o cliente já tenha o logo hospedado em algum
 * lugar (para colar uma URL) é um passo que um dono de construtora não sabe
 * dar. Arrastar o arquivo do computador é o fluxo que ele espera.
 *
 * O arquivo vai para a pasta `logos/` do volume (NÃO a do tenant), e o
 * `logoUrl` passa a apontar para a rota pública que o serve. Assim toda tela
 * que já renderiza `logoUrl` — login, cabeçalho, relatório, portal — funciona
 * sem mudança.
 */

const LIMITE_BYTES = 2 * 1024 * 1024; // 2 MB — logo não é foto de obra.

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await exigirAdminPlataforma();
    const { id } = await params;

    const empresa = await runSemEscopoDeEmpresa(() =>
      db.empresa.findUnique({ where: { id }, select: { id: true } })
    );
    if (!empresa) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });
    }

    // FormData grande estoura o parser do runtime ANTES do nosso check de tamanho,
    // com um 500 pouco claro. Envolver a leitura e devolver 413 explícito.
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return NextResponse.json(
        { error: 'Arquivo grande demais. O limite é 2 MB.' },
        { status: 413 }
      );
    }

    const arquivo = form.get('logo');
    if (!(arquivo instanceof File)) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }
    if (arquivo.size > LIMITE_BYTES) {
      return NextResponse.json({ error: 'Arquivo grande demais. O limite é 2 MB.' }, { status: 413 });
    }
    if (!arquivo.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Envie um arquivo de imagem (PNG, JPG ou WebP).' }, { status: 400 });
    }

    const ext = (arquivo.name.split('.').pop() || '').toLowerCase();
    const buffer = Buffer.from(await arquivo.arrayBuffer());

    let extGravada: string;
    try {
      extGravada = await salvarLogoDaEmpresa(id, buffer, ext);
    } catch (e: any) {
      return NextResponse.json({ error: e.message || 'Falha ao salvar a imagem.' }, { status: 400 });
    }

    // O ?v= força o navegador a recarregar quando o logo muda (o caminho não muda).
    const logoUrl = `/api/marca/logo/${id}?v=${Date.now()}`;
    await runSemEscopoDeEmpresa(() => db.empresa.update({ where: { id }, data: { logoUrl } }));

    logger.info(`[Plataforma] Logo (.${extGravada}) enviado para empresa ${id}`);
    return NextResponse.json({ success: true, logoUrl });
  } catch (error: any) {
    if (String(error?.message).includes('administrador da plataforma')) {
      return NextResponse.json({ error: 'Acesso restrito ao console.' }, { status: 403 });
    }
    logger.error('[Plataforma] Erro no upload de logo', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
