'use client';

import { LockKeyhole } from 'lucide-react';
import { useState } from 'react';

export function PublicAccessGate() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function unlock() {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/access-gate/unlock', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ pin }) });
      const body = await response.json() as { error?: string };
      if (!response.ok) { setError(body.error || 'Incorrect access PIN.'); return; }
      window.location.replace('/');
    } finally { setBusy(false); }
  }

  return <main className="grid min-h-[100dvh] place-items-center bg-[#0d0f10] px-5 text-white"><div className="w-full max-w-sm text-center"><div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-cyan-300/10 text-cyan-200"><LockKeyhole size={28}/></div><p className="mt-6 text-[10px] font-black uppercase tracking-[.28em] text-cyan-300">Private table</p><h1 className="mt-2 text-3xl font-black">MTG Practice Table</h1><p className="mt-2 text-sm leading-6 text-zinc-500">Enter the access PIN provided by the table host.</p><input autoFocus value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))} onKeyDown={e => { if (e.key === 'Enter' && pin.length >= 4) void unlock(); }} inputMode="numeric" pattern="[0-9]*" type="password" placeholder="Access PIN" style={{ fontSize: '20px' }} className="mt-6 w-full rounded-2xl border border-white/10 bg-white/[.05] px-4 py-4 text-center font-black tracking-[.35em] outline-none focus:border-cyan-300/40"/><button disabled={busy || pin.length < 4} onClick={() => void unlock()} className="mt-3 w-full rounded-2xl bg-cyan-300 py-4 text-sm font-black text-zinc-950 disabled:opacity-40">{busy ? 'CHECKING…' : 'ENTER TABLE'}</button>{error && <div className="mt-3 text-xs font-bold text-red-200">{error}</div>}<div className="mt-5 text-[10px] leading-4 text-zinc-600">No Umbrel account is required.</div></div></main>;
}
