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
const MENU_SIZE = 56;
const MENU_GAP = 4;
const EDGE_INSET = 16;
const CHIP_WIDTH = 88;
const CODE_WIDTH = 42;

function readHud(): HudPayload | null {
  try {
    const raw = localStorage.getItem(HUD_KEY);
    return raw ? JSON.parse(raw) as HudPayload : null;
  } catch {
    return null;
  }
}

function facingRotation(player: HudPlayer | undefined) {
  return !player || player.orientation === 'auto' ? 0 : player.orientation;
}

export default function SharedTableHud() {
  const [hud, setHud] = useState<HudPayload | null>(null);
  const [isUtility, setIsUtility] = useState(false);

  useEffect(() => {
    setIsUtility(window.location.pathname.startsWith('/utility'));
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

  if (!isUtility || !hud || !you || others.length === 0) return null;

  const rotation = facingRotation(you);
  const hudLength = Math.min(360, Math.max(130, others.length * CHIP_WIDTH + CODE_WIDTH + 10));
  const offset = MENU_SIZE + MENU_GAP;

  const outerStyle: React.CSSProperties = rotation === 0
    ? {
        width: hudLength,
        height: MENU_SIZE,
        top: `calc(env(safe-area-inset-top) + ${EDGE_INSET}px)`,
        right: `calc(env(safe-area-inset-right) + ${EDGE_INSET + offset}px)`,
      }
    : rotation === 90
      ? {
          width: MENU_SIZE,
          height: hudLength,
          right: `calc(env(safe-area-inset-right) + ${EDGE_INSET}px)`,
          bottom: `calc(env(safe-area-inset-bottom) + ${EDGE_INSET + offset}px)`,
        }
      : rotation === 180
        ? {
            width: hudLength,
            height: MENU_SIZE,
            left: `calc(env(safe-area-inset-left) + ${EDGE_INSET + offset}px)`,
            bottom: `calc(env(safe-area-inset-bottom) + ${EDGE_INSET}px)`,
          }
        : {
            width: MENU_SIZE,
            height: hudLength,
            left: `calc(env(safe-area-inset-left) + ${EDGE_INSET}px)`,
            top: `calc(env(safe-area-inset-top) + ${EDGE_INSET + offset}px)`,
          };

  return (
    <div style={outerStyle} className="pointer-events-none fixed z-30">
      <div
        style={{
          width: hudLength,
          height: MENU_SIZE,
          left: '50%',
          top: '50%',
          transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
        }}
        className="absolute flex items-stretch gap-1 overflow-x-auto rounded-2xl border border-white/15 bg-black/55 p-1 shadow-xl backdrop-blur-md scrollbar-none"
      >
        {others.map(player => (
          <div key={player.id} className="flex h-full min-w-[84px] shrink-0 items-center gap-2 rounded-xl bg-white/[.08] px-2.5">
            <div className="flex h-full w-4 shrink-0 flex-col items-center justify-center gap-1">
              <span style={{ backgroundColor: player.color }} className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-white/30" />
              {player.connected ? <Wifi size={11} className="text-emerald-300" /> : <WifiOff size={11} className="text-red-300" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wide text-white/70">
                <span className="max-w-[64px] truncate">{player.name}</span>
                {player.host && <Crown size={10} />}
              </div>
              <div className="text-xl font-black leading-none tabular-nums text-white">{player.life}</div>
            </div>
          </div>
        ))}
        <div className="flex h-full shrink-0 items-center px-1.5 text-[8px] font-black tracking-[.16em] text-white/35">{hud.code}</div>
      </div>
    </div>
  );
}
