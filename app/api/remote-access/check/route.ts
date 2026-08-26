import { promises as fs } from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
const file = path.join(process.env.MTG_DATA_DIR || '/app/data', 'remote-access.json');

type Config = { domain: string; token: string; dnsUpdatedAt?: string; dnsOk?: boolean };
async function config(): Promise<Config | null> { try { return JSON.parse(await fs.readFile(file, 'utf8')) as Config; } catch { return null; } }
async function reachable(url: string) { try { const response = await fetch(url, { redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(5000) }); return response.status > 0 && response.status < 500; } catch { return false; } }

export async function POST() {
  const saved = await config();
  if (!saved) return NextResponse.json({ configured: false, domain: '', message: 'Remote access is not configured.' }, { status: 400 });
  const domain = `${saved.domain}.duckdns.org`;
  const publicOk = await reachable(`http://${domain}`);
  const httpsOk = await reachable(`https://${domain}`);
  // Socket.IO begins with an HTTP polling handshake and upgrades to WebSocket, so a successful Engine.IO handshake proves the public proxy reaches Socket.IO.
  const socketOk = httpsOk && await reachable(`https://${domain}/socket.io/?EIO=4&transport=polling`);
  return NextResponse.json({ configured: true, domain, dnsOk: saved.dnsOk, dnsUpdatedAt: saved.dnsUpdatedAt, publicOk, httpsOk, socketOk, message: httpsOk && socketOk ? 'Remote HTTPS and Shared Table connectivity are reachable.' : saved.dnsOk ? 'DNS is configured. Public HTTPS still needs router forwarding or a tunnel/reverse proxy.' : 'Check the DuckDNS configuration first.' });
}
