import { promises as fs } from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
const dataDir = process.env.MTG_DATA_DIR || '/app/data';
const file = path.join(dataDir, 'remote-access.json');
const caddyAdmin = process.env.CADDY_ADMIN_URL || 'http://127.0.0.1:2019';

type Config = { provider: 'duckdns'; domain: string; token: string; dnsUpdatedAt?: string; dnsOk?: boolean; caddyOk?: boolean };

async function readConfig(): Promise<Config | null> { try { return JSON.parse(await fs.readFile(file, 'utf8')) as Config; } catch { return null; } }
async function writeConfig(config: Config) { await fs.mkdir(dataDir, { recursive: true }); await fs.writeFile(file, JSON.stringify(config, null, 2), { mode: 0o600 }); }
async function updateDuckDns(config: Config) {
  const response = await fetch(`https://www.duckdns.org/update?domains=${encodeURIComponent(config.domain)}&token=${encodeURIComponent(config.token)}&ip=`, { cache: 'no-store' });
  const text = (await response.text()).trim();
  return response.ok && text === 'OK';
}

function requestHost(request: Request) {
  const forwarded = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const raw = forwarded || request.headers.get('host') || '';
  return raw.replace(/^\[/, '').replace(/\](:\d+)?$/, '').replace(/:\d+$/, '').toLowerCase();
}

function isLocalHost(host: string) {
  if (!host) return false;
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.endsWith('.local')) return true;
  if (/^10(?:\.\d{1,3}){3}$/.test(host)) return true;
  if (/^192\.168(?:\.\d{1,3}){2}$/.test(host)) return true;
  const match = host.match(/^172\.(\d{1,3})\./);
  return Boolean(match && Number(match[1]) >= 16 && Number(match[1]) <= 31);
}

async function configureCaddy(domain: string) {
  try {
    const caddyfile = `{\n  admin 127.0.0.1:2019\n}\n\n${domain}.duckdns.org {\n  reverse_proxy 127.0.0.1:3100\n}\n`;
    const adapted = await fetch(`${caddyAdmin}/adapt`, {
      method: 'POST',
      headers: { 'content-type': 'text/caddyfile' },
      body: caddyfile,
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    if (!adapted.ok) return false;
    const config = await adapted.json();
    const loaded = await fetch(`${caddyAdmin}/load`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(config),
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    return loaded.ok;
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const canManage = isLocalHost(requestHost(request));
  const config = await readConfig();
  if (!config) return NextResponse.json({ configured: false, domain: '', canManage });
  return NextResponse.json({ configured: true, domain: `${config.domain}.duckdns.org`, dnsUpdatedAt: config.dnsUpdatedAt, dnsOk: config.dnsOk, caddyOk: config.caddyOk, canManage });
}

export async function POST(request: Request) {
  if (!isLocalHost(requestHost(request))) {
    return NextResponse.json({ error: 'Remote Access settings can only be changed from this Umbrel on your local network.' }, { status: 403 });
  }

  const body = await request.json() as { provider?: string; domain?: string; token?: string };
  const domain = String(body.domain || '').toLowerCase().replace(/\.duckdns\.org$/i, '').replace(/[^a-z0-9-]/g, '');
  const existing = await readConfig();
  const token = String(body.token || existing?.token || '').trim();
  if (!domain || !token) return NextResponse.json({ error: 'DuckDNS subdomain and token are required.' }, { status: 400 });
  const config: Config = { provider: 'duckdns', domain, token };
  const [dnsOk, caddyOk] = await Promise.all([updateDuckDns(config), configureCaddy(domain)]);
  config.dnsOk = dnsOk;
  config.caddyOk = caddyOk;
  config.dnsUpdatedAt = new Date().toISOString();
  await writeConfig(config);
  const message = !dnsOk
    ? 'DuckDNS did not accept the update. Verify the subdomain and token.'
    : !caddyOk
      ? 'DuckDNS is configured, but the bundled HTTPS proxy could not be configured. Local MTG access remains available.'
      : 'DuckDNS and HTTPS proxy are configured. Forward router WAN 80 → Umbrel 18080 and WAN 443 → Umbrel 18443, then refresh the connection check.';
  return NextResponse.json({ configured: true, domain: `${domain}.duckdns.org`, dnsOk, caddyOk, dnsUpdatedAt: config.dnsUpdatedAt, canManage: true, message });
}
