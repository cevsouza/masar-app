import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { writeFile, readFile, unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  const start = Date.now();
  const report: any = {
    status: 'UP',
    timestamp: new Date().toISOString(),
    details: {}
  };

  let hasError = false;

  // 1. Validar Latência do PostgreSQL
  try {
    const dbStart = Date.now();
    await db.$queryRaw`SELECT 1`;
    const dbLatency = Date.now() - dbStart;
    report.details.database = {
      status: 'UP',
      latencyMs: dbLatency,
      pgBouncer: process.env.DATABASE_URL?.includes('pgbouncer=true') ? 'ACTIVE' : 'INACTIVE'
    };
  } catch (error: any) {
    hasError = true;
    report.status = 'DOWN';
    report.details.database = {
      status: 'DOWN',
      error: error.message || String(error)
    };
    logger.error('[Health Check] Falha de conexão com o banco de dados', error);
  }

  // 2. Volume persistente do cofre (GED)
  //
  // Este bloco diagnostica em vez de só falhar. O motivo: quando o volume não
  // está anexado ao serviço, as rotas de upload NÃO quebram — todas fazem
  // `mkdir(..., { recursive: true })` e acabam gravando no disco EFÊMERO do
  // container. O documento entra, o usuário vê "enviado", e some no próximo
  // deploy. Como documento faltando trava medição, o sintoma aparece longe da
  // causa, semanas depois.
  //
  // O Railway injeta RAILWAY_VOLUME_NAME e RAILWAY_VOLUME_MOUNT_PATH quando há
  // volume anexado. A AUSÊNCIA dessas variáveis é o sinal mais confiável de que
  // o volume não está ligado — mais que declarar em railway.json, que sozinho
  // não faz o vínculo.
  const volumeNome = process.env.RAILWAY_VOLUME_NAME || null;
  const volumeMontagem = process.env.RAILWAY_VOLUME_MOUNT_PATH || null;
  const uploadDir =
    process.env.NODE_ENV === 'production' ? '/app/uploads' : join(process.cwd(), 'uploads');

  const armazenamento: any = {
    caminhoUsadoPeloCodigo: uploadDir,
    volumeAnexado: Boolean(volumeNome || volumeMontagem),
    volumeNome,
    volumeMontagem,
  };

  // O volume pode estar anexado e montado no lugar ERRADO — falha silenciosa
  // igualmente traiçoeira, e que nenhum erro de escrita revelaria.
  if (volumeMontagem && volumeMontagem !== uploadDir) {
    armazenamento.avisoMontagem =
      `Volume montado em "${volumeMontagem}", mas o código grava em "${uploadDir}". ` +
      'Os arquivos não estão indo para o volume.';
  }

  try {
    const tempFilePath = join(uploadDir, `.health-${crypto.randomUUID()}.tmp`);
    const testContent = `health_test_${Date.now()}`;

    await writeFile(tempFilePath, testContent, 'utf8');
    const readContent = await readFile(tempFilePath, 'utf8');
    await unlink(tempFilePath);

    if (readContent !== testContent) {
      throw new Error('Conteúdo do arquivo lido difere do escrito');
    }

    armazenamento.escritaLeitura = 'OK';

    // Escrever funcionou — mas em QUE disco? Sem volume, é efêmero, e isso é
    // um problema mesmo com o teste passando.
    if (!armazenamento.volumeAnexado && process.env.NODE_ENV === 'production') {
      hasError = true;
      report.status = 'DOWN';
      armazenamento.status = 'EFEMERO';
      armazenamento.diagnostico =
        'A escrita funciona, mas NÃO há volume anexado a este serviço: os arquivos estão no disco ' +
        'descartável do container e serão perdidos no próximo deploy. Anexe um volume ao serviço ' +
        `com ponto de montagem em "${uploadDir}".`;
      logger.error('[Health Check] Cofre GED gravando em disco efêmero — volume não anexado');
    } else if (armazenamento.avisoMontagem) {
      hasError = true;
      report.status = 'DOWN';
      armazenamento.status = 'MONTAGEM_ERRADA';
      armazenamento.diagnostico = armazenamento.avisoMontagem;
      logger.error('[Health Check] Volume anexado em caminho diferente do usado pelo código');
    } else {
      armazenamento.status = 'UP';
    }
  } catch (error: any) {
    hasError = true;
    report.status = 'DOWN';
    armazenamento.status = 'DOWN';
    armazenamento.error = error.message || String(error);
    armazenamento.diagnostico = armazenamento.volumeAnexado
      ? 'O volume está anexado, mas a gravação falhou — verifique permissões e o ponto de montagem.'
      : `Nenhum volume anexado e o diretório "${uploadDir}" não existe. ` +
        'Anexe um volume ao serviço com este ponto de montagem.';
    logger.error('[Health Check] Falha no teste de escrita/leitura do volume', error);
  }

  report.details.storage = armazenamento;

  report.totalDurationMs = Date.now() - start;

  if (hasError) {
    return NextResponse.json(report, { status: 500 });
  }

  return NextResponse.json(report, { status: 200 });
}
