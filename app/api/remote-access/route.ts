import { promises as fs } from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
const dataDir = process.env.MTG_DATA_DIR || '/app/data';
const file = path.join(dataDir, 'remote-access.json');

type Config = { provider: 'duckdns'; domain: string; token: string; dnsUpdatedAt?: string; dnsOk?: boolean };

async function readConfig(): Promise<Config | null> { try { return JSON.parse(await fs.readFile(file, 'utf8')) as Config; } catch { return null; } }
async function writeConfig(config: Config) { await fs.mkdir(dataDir, { recursive: true }); await fs.writeFile(file, JSON.stringify(config, null, 2), { mode: 0o600 }); }
async function updateDuckDns(config: Config) {
  const response = await fetch(`https://www.duckdns.org/update?domains=${encodeURIComponent(config.domain)}&token=${encodeURIComponent(config.token)}&ip=`, { cache: 'no-store' });
  const text = (await response.text()).trim();
  return response.ok && text === 'OK';
}

export async function GET() {
  const config = await readConfig();
  if (!config) return NextResponse.json({ configured: false, domain: '' });
  return NextResponse.json({ configured: true, domain: `${config.domain}.duckdns.org`, dnsUpdatedAt: config.dnsUpdatedAt, dnsOk: config.dnsOk });
}

export async function POST(request: Request) {
  const body = await request.json() as { provider?: string; domain?: string; token?: string };
  const domain = String(body.domain || '').toLowerCase().replace(/\.duckdns\.org$/i, '').replace(/[^a-z0-9-]/g, '');
  const existing = await readConfig();
  const token = String(body.token || existing?.token || '').trim();
  if (!domain || !token) return NextResponse.json({ error: 'DuckDNS subdomain and token are required.' }, { status: 400 });
  const config: Config = { provider: 'duckdns', domain, token };
  const dnsOk = await updateDuckDns(config);
  config.dnsOk = dnsOk; config.dnsUpdatedAt = new Date().toISOString();
  await writeConfig(config);
  return NextResponse.json({ configured: true, domain: `${domain}.duckdns.org`, dnsOk, dnsUpdatedAt: config.dnsUpdatedAt, message: dnsOk ? 'DuckDNS accepted the update. Now check public HTTPS routing.' : 'DuckDNS did not accept the update. Verify the subdomain and token.' });
}
