import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    message: 'Debug environment variables',
    env: {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL_EXISTS: !!process.env.DATABASE_URL,
      DATABASE_URL_LENGTH: process.env.DATABASE_URL ? process.env.DATABASE_URL.length : 0,
      PORT: process.env.PORT || 'not_set',
      RAILWAY_STATIC_URL: process.env.RAILWAY_STATIC_URL || 'not_set',
    }
  });
}
