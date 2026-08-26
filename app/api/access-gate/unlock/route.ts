import { NextResponse } from 'next/server';
import { readAccessGate, sessionToken, verifyPin } from '@/lib/remote-access/accessGate';

export async function POST(request: Request) {
  const config = await readAccessGate();
  if (!config?.enabled) return NextResponse.json({ ok: true, gate: false });
  const body = await request.json() as { pin?: string };
  if (!verifyPin(String(body.pin || ''), config)) return NextResponse.json({ error: 'Incorrect access PIN.' }, { status: 401 });
  const response = NextResponse.json({ ok: true, gate: true });
  response.cookies.set('mtg_public_access', sessionToken(config), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 30 });
  return response;
}
