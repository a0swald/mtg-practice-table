'use client';

import { Radio, UsersRound, Wifi, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { SharedRoom, SharedSession } from '@/lib/shared-table/useSharedUtilityTable';

type RosterPlayer = SharedRoom['players'][number] & { connected: boolean; host: boolean; you: boolean };
type SetupMode = 'idle' | 'host' | 'join';

const COLORS = ['#526bd8', '#d83c5b', '#3985ed', '#f4a20d', '#1ec367', '#a54ee9', '#0db0c8', '#df3c86', '#7acb14', '#fb7215', '#718299'];

export function SharedTableSection({ session, roster, busy, error, previewColors, onHost, onJoin, onLeave, onPreview, onClearError }: {
  session: SharedSession | null;
  roster: RosterPlayer[];
  busy: boolean;
  error: string;
  previewColors: string[];
  onHost: (name: string, color: string) => Promise<void>;
  onJoin: (code: string, name: string, color: string) => Promise<void>;
  onLeave: () => void;
  onPreview: (code: string) => void;
  onClearError: () => void;
}) {
  const [mode, setMode] = useState<SetupMode>('idle');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [color, setColor] = useState('');

  useEffect(() => {
    if (mode !== 'join') return;
    if (code.length === 4) onPreview(code);
    else onPreview('');
  }, [code, mode, onPreview]);

  useEffect(() => {
    if (color && previewColors.includes(color.toLowerCase())) setColor('');
  }, [previewColors, color]);

  function resetSetup() {
    setMode('idle');
    setCode('');
    setName('');
    setColor('');
    onPreview('');
    onClearError();
  }

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
              <div className="min-w-0"><div className="flex min-w-0 items-center gap-2"><span style={{ backgroundColor: player.color }} className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-white/20" /><div className="truncate font-black">{player.name}</div></div>{player.you && <div className="ml-[18px] text-[9px] font-black uppercase tracking-wider text-cyan-300">You</div>}</div>
              <div className="text-center text-lg font-black tabular-nums">{player.life}</div>
              <div className={`flex items-center justify-end gap-1 text-[10px] font-black uppercase ${player.connected ? 'text-emerald-300' : 'text-zinc-500'}`}>{player.connected ? <Wifi size={13} /> : <WifiOff size={13} />}{player.host ? 'Host' : player.connected ? 'Live' : 'Offline'}</div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[10px] leading-4 text-zinc-500">Your phone controls your player card. Life, counters, name, color, and background sync to the table live.</p>
      </div>
    );
  }

  const colorTaken = color.length > 0 && previewColors.includes(color.toLowerCase());
  const ready = name.trim().length > 0 && color.length > 0 && !colorTaken && (mode !== 'join' || code.length === 4);

  return (
    <div className="mt-5 border-t border-white/10 pt-4">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.18em] text-cyan-300"><UsersRound size={14} /> Shared Table</div>
      <p className="mt-1 text-xs leading-5 text-zinc-500">Give everyone at the table a 4-digit code so each phone can control its own life counter.</p>

      {mode === 'idle' ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button disabled={busy} onClick={() => { onClearError(); setMode('host'); }} className="rounded-2xl bg-cyan-300 py-3 text-xs font-black text-zinc-950 disabled:opacity-50">HOST TABLE</button>
          <button disabled={busy} onClick={() => { onClearError(); setMode('join'); }} className="rounded-2xl bg-white/10 py-3 text-xs font-black disabled:opacity-50">JOIN TABLE</button>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          {mode === 'join' && <input value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" pattern="[0-9]*" placeholder="4-digit code" className="w-full rounded-xl bg-black/30 px-4 py-3 text-center text-xl font-black tracking-[.25em] outline-none" />}

          <input value={name} onChange={event => setName(event.target.value)} placeholder="Your name" autoComplete="off" style={{ fontSize: '16px' }} className="w-full rounded-xl bg-black/30 px-4 py-3 text-center font-bold outline-none" />

          <div>
            <div className="mb-2 flex items-center justify-between gap-3 text-[9px] font-black uppercase tracking-[.16em] text-zinc-500"><span>Choose player color</span>{mode === 'join' && code.length === 4 && <span>{previewColors.length} taken</span>}</div>
            <div className="grid grid-cols-6 gap-2">
              {COLORS.map(option => {
                const taken = mode === 'join' && previewColors.includes(option.toLowerCase());
                return (
                  <button key={option} disabled={taken} aria-label={taken ? `${option} is already taken` : `Choose ${option}`} onClick={() => setColor(option)} style={{ backgroundColor: option }} className={`relative h-9 rounded-xl border-2 transition-transform ${taken ? 'cursor-not-allowed border-white/5 opacity-20 saturate-0' : 'active:scale-95'} ${color === option ? 'border-white shadow-[0_0_0_2px_rgba(255,255,255,.2)]' : 'border-white/10'}`}>
                    {taken && <span className="absolute inset-0 grid place-items-center text-base font-black text-white/80">×</span>}
                  </button>
                );
              })}
            </div>
            <div className={`mt-2 flex items-center gap-2 rounded-xl bg-black/20 p-2 ${colorTaken ? 'ring-1 ring-red-300/50' : ''}`}>
              <input aria-label="Custom player color" type="color" value={color || '#526bd8'} onChange={event => setColor(event.target.value)} className="h-9 w-14 overflow-hidden rounded-lg border border-white/10 bg-transparent p-0" />
              <div className="text-[10px] font-bold text-zinc-500">Custom color</div>
              {color && <div className="ml-auto font-mono text-[10px] uppercase text-zinc-400">{color}</div>}
            </div>
            {colorTaken && <div className="mt-1 text-[10px] font-bold text-red-200">That color is already being used at this table.</div>}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={resetSetup} className="rounded-xl bg-white/5 py-3 text-xs font-black">BACK</button>
            {mode === 'host' ? (
              <button disabled={busy || !ready} onClick={() => void onHost(name, color)} className="rounded-xl bg-cyan-300 py-3 text-xs font-black text-zinc-950 disabled:opacity-40">{busy ? 'STARTING…' : 'START TABLE'}</button>
            ) : (
              <button disabled={busy || !ready} onClick={() => void onJoin(code, name, color)} className="rounded-xl bg-cyan-300 py-3 text-xs font-black text-zinc-950 disabled:opacity-40">{busy ? 'JOINING…' : 'JOIN'}</button>
            )}
          </div>
        </div>
      )}

      {error && <div className="mt-2 rounded-xl bg-red-400/10 px-3 py-2 text-xs font-bold text-red-200">{error}</div>}
    </div>
  );
}
