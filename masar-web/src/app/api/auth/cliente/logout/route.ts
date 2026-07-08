import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set('masar_client_session', '', { maxAge: 0 });
  return response;
}

export async function GET() {
  return POST();
}
