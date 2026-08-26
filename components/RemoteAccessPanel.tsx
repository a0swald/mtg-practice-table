'use client';

import { ExternalLink, Globe2, KeyRound, RefreshCw, ShieldCheck, Wifi } from 'lucide-react';
import { useEffect, useState } from 'react';

type Status = {
  configured: boolean;
  domain: string;
  dnsUpdatedAt?: string;
  dnsOk?: boolean;
  publicOk?: boolean;
  httpsOk?: boolean;
  socketOk?: boolean;
  message?: string;
};

export function RemoteAccessPanel() {
  const [domain, setDomain] = useState('');
  const [token, setToken] = useState('');
  const [status, setStatus] = useState<Status>({ configured: false, domain: '' });
  const [busy, setBusy] = useState(false);

  async function load() {
    const response = await fetch('/api/remote-access', { cache: 'no-store' });
    if (response.ok) {
      const next = await response.json() as Status;
      setStatus(next);
      if (next.domain) setDomain(next.domain.replace(/\.duckdns\.org$/i, ''));
    }
  }

  useEffect(() => { void load(); }, []);

  async function save() {
    setBusy(true);
    try {
      const response = await fetch('/api/remote-access', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ provider: 'duckdns', domain, token }),
      });
      const next = await response.json() as Status & { error?: string };
      if (!response.ok) throw new Error(next.error || 'Could not configure remote access.');
      setToken(''); setStatus(next);
    } catch (error) {
      setStatus(current => ({ ...current, message: error instanceof Error ? error.message : 'Could not configure remote access.' }));
    } finally { setBusy(false); }
  }

  async function check() {
    setBusy(true);
    try {
      const response = await fetch('/api/remote-access/check', { method: 'POST' });
      const next = await response.json() as Status;
      setStatus(next);
    } finally { setBusy(false); }
  }

  return (
    <section className="rounded-3xl border border-cyan-300/20 bg-cyan-300/[.045] p-4 shadow-2xl">
      <div className="flex items-start gap-3"><div className="rounded-2xl bg-cyan-300/10 p-3 text-cyan-200"><Globe2 size={22} /></div><div><div className="font-black">REMOTE ACCESS</div><div className="mt-1 text-xs leading-5 text-zinc-400">Connect a DuckDNS address to this self-hosted MTG table. Credentials stay on the server and are never returned to the browser.</div></div></div>
      <div className="mt-4 space-y-3">
        <label className="block"><span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-zinc-500">DuckDNS subdomain</span><div className="flex overflow-hidden rounded-xl border border-white/10 bg-black/25"><input value={domain} onChange={e => setDomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="mtgtable" className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm outline-none" /><span className="flex items-center border-l border-white/10 px-3 text-xs text-zinc-500">.duckdns.org</span></div></label>
        <label className="block"><span className="mb-1 flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-zinc-500"><KeyRound size={11}/> DuckDNS token</span><input type="password" value={token} onChange={e => setToken(e.target.value.trim())} placeholder={status.configured ? 'Saved — enter only to replace' : 'Paste DuckDNS token'} className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-3 text-sm outline-none" /></label>
        <button disabled={busy || !domain || (!token && !status.configured)} onClick={() => void save()} className="w-full rounded-xl bg-cyan-300 py-3 text-xs font-black text-zinc-950 disabled:opacity-40">{busy ? 'WORKING…' : status.configured ? 'UPDATE REMOTE ACCESS' : 'ENABLE REMOTE ACCESS'}</button>
      </div>
      {status.configured && <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3"><div className="flex items-center justify-between gap-2"><div className="truncate text-sm font-black">{status.domain}</div><button onClick={() => void check()} disabled={busy} className="rounded-lg bg-white/10 p-2 text-zinc-300"><RefreshCw size={14} className={busy ? 'animate-spin' : ''}/></button></div><div className="mt-3 grid grid-cols-2 gap-2 text-[10px] font-black uppercase"><Badge icon={<Globe2 size={12}/>} label="DNS" ok={status.dnsOk}/><Badge icon={<Wifi size={12}/>} label="Public" ok={status.publicOk}/><Badge icon={<ShieldCheck size={12}/>} label="HTTPS" ok={status.httpsOk}/><Badge icon={<Wifi size={12}/>} label="Socket.IO" ok={status.socketOk}/></div>{status.httpsOk && status.domain && <a href={`https://${status.domain}`} target="_blank" rel="noreferrer" className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-white/10 py-2.5 text-xs font-black">OPEN REMOTE TABLE <ExternalLink size={13}/></a>}</div>}
      {status.message && <div className="mt-3 text-[11px] leading-5 text-zinc-400">{status.message}</div>}
      <p className="mt-3 text-[10px] leading-4 text-zinc-600">DuckDNS can point the domain at your home automatically. Public HTTPS still requires inbound routing or a tunnel; this screen checks those separately instead of reporting a false connection.</p>
    </section>
  );
}

function Badge({ icon, label, ok }: { icon: React.ReactNode; label: string; ok?: boolean }) { return <div className={`flex items-center gap-2 rounded-xl px-3 py-2 ${ok ? 'bg-emerald-400/10 text-emerald-200' : 'bg-white/5 text-zinc-500'}`}>{icon}{label}<span className="ml-auto">{ok ? '✓' : '—'}</span></div>; }
