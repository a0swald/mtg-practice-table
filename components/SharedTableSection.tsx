'use client';

import { Radio, UsersRound, Wifi, WifiOff } from 'lucide-react';
import { useState } from 'react';
import type { SharedRoom, SharedSession } from '@/lib/shared-table/useSharedUtilityTable';

type RosterPlayer = SharedRoom['players'][number] & { connected: boolean; host: boolean; you: boolean };

export function SharedTableSection({ session, roster, busy, error, onHost, onJoin, onLeave, onClearError }: {
  session: SharedSession | null;
  roster: RosterPlayer[];
  busy: boolean;
  error: string;
  onHost: (name?: string) => Promise<void>;
  onJoin: (code: string, name: string) => Promise<void>;
  onLeave: () => void;
  onClearError: () => void;
}) {
  const [mode, setMode] = useState<'idle' | 'join'>('idle');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');

  if (session) {
    return (
      <div className="mt-5 border-t border-white/10 pt-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.18em] text-cyan-300"><Radio size={14} /> Shared Table</div>
            <div className="mt-1 text-2xl font-black tracking-[.18em]">{session.code}</div>
          </div>
          <button onClick={onLeave} className="rounded-xl border border-red-400/20 bg-red-400/5 px-3 py-2 text-xs font-black text-red-200">LEAVE</button>
        </div>
        <div className="mt-3 overflow-hidden rounded-2xl border border-white/10">
          <div className="grid grid-cols-[1fr_64px_92px] bg-white/5 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-zinc-500"><span>Player</span><span className="text-center">Life</span><span className="text-right">Status</span></div>
          {roster.map(player => (
            <div key={player.id} className="grid grid-cols-[1fr_64px_92px] items-center border-t border-white/5 px-3 py-2.5 text-sm">
              <div className="min-w-0"><div className="truncate font-black">{player.name}</div>{player.you && <div className="text-[9px] font-black uppercase tracking-wider text-cyan-300">You</div>}</div>
              <div className="text-center text-lg font-black tabular-nums">{player.life}</div>
              <div className={`flex items-center justify-end gap-1 text-[10px] font-black uppercase ${player.connected ? 'text-emerald-300' : 'text-zinc-500'}`}>{player.connected ? <Wifi size={13} /> : <WifiOff size={13} />}{player.host ? 'Host' : player.connected ? 'Live' : 'Offline'}</div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[10px] leading-4 text-zinc-500">Your phone controls your player card. Life, counters, name, color, and background sync to the table live.</p>
      </div>
    );
  }

  return (
    <div className="mt-5 border-t border-white/10 pt-4">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.18em] text-cyan-300"><UsersRound size={14} /> Shared Table</div>
      <p className="mt-1 text-xs leading-5 text-zinc-500">Give everyone at the table a 4-digit code so each phone can control its own life counter.</p>
      {mode === 'idle' ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button disabled={busy} onClick={() => void onHost()} className="rounded-2xl bg-cyan-300 py-3 text-xs font-black text-zinc-950 disabled:opacity-50">HOST TABLE</button>
          <button disabled={busy} onClick={() => { onClearError(); setMode('join'); }} className="rounded-2xl bg-white/10 py-3 text-xs font-black disabled:opacity-50">JOIN TABLE</button>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <input value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" pattern="[0-9]*" placeholder="4-digit code" className="w-full rounded-xl bg-black/30 px-4 py-3 text-center text-xl font-black tracking-[.25em] outline-none" />
          <input value={name} onChange={event => setName(event.target.value)} placeholder="Your name" style={{ fontSize: '16px' }} className="w-full rounded-xl bg-black/30 px-4 py-3 text-center font-bold outline-none" />
          <div className="grid grid-cols-2 gap-2"><button onClick={() => { onClearError(); setMode('idle'); }} className="rounded-xl bg-white/5 py-3 text-xs font-black">BACK</button><button disabled={busy || code.length !== 4} onClick={() => void onJoin(code, name)} className="rounded-xl bg-cyan-300 py-3 text-xs font-black text-zinc-950 disabled:opacity-40">{busy ? 'JOINING…' : 'JOIN'}</button></div>
        </div>
      )}
      {error && <div className="mt-2 rounded-xl bg-red-400/10 px-3 py-2 text-xs font-bold text-red-200">{error}</div>}
    </div>
  );
}
