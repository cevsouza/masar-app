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

  // 2. Validar Integridade do Volume Persistente (GED)
  try {
    const uploadDir = process.env.NODE_ENV === 'production' 
      ? '/app/uploads' 
      : join(process.cwd(), 'uploads');

    const tempFileName = `.health-${crypto.randomUUID()}.tmp`;
    const tempFilePath = join(uploadDir, tempFileName);
    const testContent = `health_test_${Date.now()}`;

    // Testar escrita
    await writeFile(tempFilePath, testContent, 'utf8');

    // Testar leitura
    const readContent = await readFile(tempFilePath, 'utf8');
    
    // Testar deleção
    await unlink(tempFilePath);

    if (readContent !== testContent) {
      throw new Error('Conteúdo do arquivo lido difere do escrito');
    }

    report.details.storage = {
      status: 'UP',
      path: uploadDir,
      writeReadVerify: 'OK'
    };
  } catch (error: any) {
    hasError = true;
    report.status = 'DOWN';
    report.details.storage = {
      status: 'DOWN',
      error: error.message || String(error)
    };
    logger.error('[Health Check] Falha no teste de escrita/leitura do Volume Persistente', error);
  }

  report.totalDurationMs = Date.now() - start;

  if (hasError) {
    return NextResponse.json(report, { status: 500 });
  }

  return NextResponse.json(report, { status: 200 });
}
