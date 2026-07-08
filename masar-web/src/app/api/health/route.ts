import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // Test the database connection
    await db.$queryRaw`SELECT 1`;
    
    return NextResponse.json({
      status: 'healthy',
      database: 'connected',
      env: {
        NODE_ENV: process.env.NODE_ENV,
        DATABASE_URL_SET: !!process.env.DATABASE_URL,
        DATABASE_URL_PREFIX: process.env.DATABASE_URL ? process.env.DATABASE_URL.split('@')[1] || 'masked' : 'not_set',
      }
    });
  } catch (error: any) {
    console.error('Healthcheck failed:', error);
    return NextResponse.json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message || 'Erro desconhecido',
      errorName: error.name || 'PrismaError',
      env: {
        NODE_ENV: process.env.NODE_ENV,
        DATABASE_URL_SET: !!process.env.DATABASE_URL,
        DATABASE_URL_PREFIX: process.env.DATABASE_URL ? process.env.DATABASE_URL.split('@')[1] || 'masked' : 'not_set',
      }
    }, { status: 200 }); // Retorna 200 para que o navegador exiba o texto JSON diretamente sem bloquear a página.
  }
}
