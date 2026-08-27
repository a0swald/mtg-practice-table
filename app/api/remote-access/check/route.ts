import { promises as fs } from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
const file = path.join(process.env.MTG_DATA_DIR || '/app/data', 'remote-access.json');

type Config = { domain: string; token: string; dnsUpdatedAt?: string; dnsOk?: boolean; caddyOk?: boolean };
async function config(): Promise<Config | null> { try { return JSON.parse(await fs.readFile(file, 'utf8')) as Config; } catch { return null; } }
async function reachable(url: string) { try { const response = await fetch(url, { redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(5000) }); return response.status > 0 && response.status < 500; } catch { return false; } }

export async function POST(request: Request) {
  const saved = await config();
  if (!saved) return NextResponse.json({ configured: false, domain: '', message: 'Remote access is not configured.' }, { status: 400 });

  const domain = `${saved.domain}.duckdns.org`;
  const forwardedHost = (request.headers.get('x-forwarded-host') || request.headers.get('host') || '').split(':')[0].toLowerCase();
  const forwardedProto = (request.headers.get('x-forwarded-proto') || new URL(request.url).protocol.replace(':', '')).toLowerCase();
  const arrivedThroughPublicHost = forwardedHost === domain.toLowerCase();
  const arrivedThroughPublicHttps = arrivedThroughPublicHost && forwardedProto === 'https';

  const probedPublic = await reachable(`http://${domain}`);
  const probedHttps = await reachable(`https://${domain}`);
  const publicOk = arrivedThroughPublicHost || probedPublic || probedHttps;
  const httpsOk = arrivedThroughPublicHttps || probedHttps;
  const socketProbeOk = httpsOk && await reachable(`https://${domain}/socket.io/?EIO=4&transport=polling`);
  // When this request itself arrived through the configured HTTPS hostname, the
  // reverse proxy has already proven that public HTTPS routing reaches this app.
  // Caddy carries Socket.IO/WebSocket traffic through the same route, so avoid
  // reporting a false negative on home networks without NAT loopback.
  const socketOk = socketProbeOk || arrivedThroughPublicHttps;

  const message = httpsOk && socketOk
    ? 'Remote HTTPS and Shared Table connectivity are reachable.'
    : saved.dnsOk && saved.caddyOk
      ? 'DuckDNS and the bundled HTTPS proxy are ready. If Public is still offline, verify your router or existing reverse-proxy route.'
      : saved.dnsOk
        ? 'DNS is configured, but the bundled HTTPS proxy is not ready.'
        : 'Check the DuckDNS configuration first.';

  return NextResponse.json({ configured: true, domain, dnsOk: saved.dnsOk, caddyOk: saved.caddyOk, dnsUpdatedAt: saved.dnsUpdatedAt, publicOk, httpsOk, socketOk, message });
}
