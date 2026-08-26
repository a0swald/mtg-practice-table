import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const dataDir = process.env.MTG_DATA_DIR || '/app/data';
const file = path.join(dataDir, 'access-gate.json');

export type AccessGateConfig = { enabled: boolean; salt: string; pinHash: string };

export async function readAccessGate(): Promise<AccessGateConfig | null> {
  try { return JSON.parse(await fs.readFile(file, 'utf8')) as AccessGateConfig; } catch { return null; }
}

export async function saveAccessPin(pin: string) {
  const salt = randomBytes(24).toString('hex');
  const pinHash = hash(pin, salt);
  const config: AccessGateConfig = { enabled: true, salt, pinHash };
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(file, JSON.stringify(config), { mode: 0o600 });
}

export async function disableAccessGate() {
  const current = await readAccessGate();
  if (!current) return;
  await fs.writeFile(file, JSON.stringify({ ...current, enabled: false }), { mode: 0o600 });
}

export function verifyPin(pin: string, config: AccessGateConfig) {
  const expected = Buffer.from(config.pinHash, 'hex');
  const actual = Buffer.from(hash(pin, config.salt), 'hex');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function sessionToken(config: AccessGateConfig) {
  return createHash('sha256').update(`mtg-access:${config.salt}:${config.pinHash}`).digest('hex');
}

function hash(pin: string, salt: string) {
  return createHash('sha256').update(`${salt}:${pin}`).digest('hex');
}
