import { NextResponse } from 'next/server';
import { disableAccessGate, readAccessGate, saveAccessPin } from '@/lib/remote-access/accessGate';

export const dynamic = 'force-dynamic';

export async function GET() {
  const config = await readAccessGate();
  return NextResponse.json({ configured: Boolean(config?.pinHash), enabled: Boolean(config?.enabled) });
}

export async function POST(request: Request) {
  const body = await request.json() as { pin?: string; enabled?: boolean };
  if (body.enabled === false) {
    await disableAccessGate();
    return NextResponse.json({ configured: true, enabled: false });
  }
  const pin = String(body.pin || '').trim();
  if (!/^\d{4,8}$/.test(pin)) return NextResponse.json({ error: 'Use a 4–8 digit access PIN.' }, { status: 400 });
  await saveAccessPin(pin);
  return NextResponse.json({ configured: true, enabled: true });
}
