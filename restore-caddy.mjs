import { promises as fs } from 'node:fs';
import path from 'node:path';

const dataDir = process.env.MTG_DATA_DIR || '/app/data';
const file = path.join(dataDir, 'remote-access.json');
const admin = process.env.CADDY_ADMIN_URL || 'http://127.0.0.1:2019';

async function waitForCaddy() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      const response = await fetch(`${admin}/config/`, { signal: AbortSignal.timeout(1000) });
      if (response.ok) return true;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  return false;
}

async function main() {
  let saved;
  try { saved = JSON.parse(await fs.readFile(file, 'utf8')); } catch { return; }
  const domain = String(saved?.domain || '').toLowerCase().replace(/[^a-z0-9-]/g, '');
  if (!domain) return;
  if (!(await waitForCaddy())) return;

  const caddyfile = `{\n  admin 127.0.0.1:2019\n}\n\n${domain}.duckdns.org {\n  reverse_proxy 127.0.0.1:3100\n}\n`;
  const adapted = await fetch(`${admin}/adapt`, {
    method: 'POST',
    headers: { 'content-type': 'text/caddyfile' },
    body: caddyfile,
  });
  if (!adapted.ok) return;
  const config = await adapted.json();
  await fetch(`${admin}/load`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(config),
  });
}

main().catch(() => {});
