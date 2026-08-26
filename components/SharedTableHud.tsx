'use client';

import { Crown, Wifi, WifiOff } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type Facing = 'auto' | 0 | 90 | 180 | 270;
type HudPlayer = {
  id: string;
  name: string;
  life: number;
  color: string;
  connected: boolean;
  host: boolean;
  you: boolean;
  orientation: Facing;
};
type HudPayload = { code: string; playerId: string; players: HudPlayer[] };

const HUD_KEY = 'mtg-practice-shared-table-hud-v1';
const HUD_EVENT = 'mtg-practice:shared-table-hud';

function readHud(): HudPayload | null {
  try {
    const raw = localStorage.getItem(HUD_KEY);
    return raw ? JSON.parse(raw) as HudPayload : null;
  } catch {
    return null;
  }
}

function rotationFor(player: HudPlayer | undefined) {
  if (!player || player.orientation === 'auto') return 0;
  return player.orientation;
}

export default function SharedTableHud() {
  const [hud, setHud] = useState<HudPayload | null>(null);

  useEffect(() => {
    setHud(readHud());
    const onHud = (event: Event) => setHud((event as CustomEvent<HudPayload | null>).detail ?? readHud());
    const onStorage = (event: StorageEvent) => { if (event.key === HUD_KEY) setHud(readHud()); };
    window.addEventListener(HUD_EVENT, onHud);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(HUD_EVENT, onHud);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const you = useMemo(() => hud?.players.find(player => player.you), [hud]);
  const others = useMemo(() => hud?.players.filter(player => !player.you) ?? [], [hud]);
  if (!hud || !you || others.length === 0 || !window.location.pathname.startsWith('/utility')) return null;

  const rotation = rotationFor(you);
  const position = rotation === 0
    ? 'top-[max(env(safe-area-inset-top),.75rem)] left-1/2 -translate-x-1/2'
    : rotation === 180
      ? 'bottom-[max(env(safe-area-inset-bottom),.75rem)] left-1/2 -translate-x-1/2'
      : rotation === 90
        ? 'left-[max(env(safe-area-inset-left),.75rem)] top-1/2 -translate-y-1/2'
        : 'right-[max(env(safe-area-inset-right),.75rem)] top-1/2 -translate-y-1/2';

  return (
    <div className={`pointer-events-none fixed z-30 ${position}`}>
      <div style={{ transform: `rotate(${rotation}deg)` }} className="flex max-w-[78vw] items-center gap-1.5 overflow-x-auto rounded-2xl border border-white/15 bg-black/55 p-1.5 shadow-xl backdrop-blur-md scrollbar-none">
        {others.map(player => (
          <div key={player.id} className="flex min-w-[76px] shrink-0 items-center gap-2 rounded-xl bg-white/[.08] px-2.5 py-2">
            <span style={{ backgroundColor: player.color }} className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-white/30" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wide text-white/70">
                <span className="max-w-[58px] truncate">{player.name}</span>
                {player.host && <Crown size={10} />}
              </div>
              <div className="flex items-center gap-1 text-xl font-black leading-none tabular-nums text-white">
                {player.life}
                {player.connected ? <Wifi size={11} className="text-emerald-300" /> : <WifiOff size={11} className="text-red-300" />}
              </div>
            </div>
          </div>
        ))}
        <div className="shrink-0 px-1.5 text-[8px] font-black tracking-[.16em] text-white/35">{hud.code}</div>
      </div>
    </div>
  );
}
