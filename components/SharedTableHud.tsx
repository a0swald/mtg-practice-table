'use client';

import { Crown, Wifi, WifiOff } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

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
  const [isUtility, setIsUtility] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);

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
  const rotation = rotationFor(you);

  useEffect(() => {
    if (!isUtility || !you || others.length === 0) return;
    let frame = 0;

    const placeHud = () => {
      const wrapper = wrapperRef.current;
      const inner = innerRef.current;
      const menuButton = document.querySelector<HTMLElement>('button[aria-label="Open table menu"]');
      const playerCard = document.querySelector<HTMLElement>('[data-drag]');

      if (wrapper && inner && menuButton) {
        const menuRect = menuButton.getBoundingClientRect();
        const width = inner.offsetWidth;
        const height = inner.offsetHeight;
        const sideways = rotation === 90 || rotation === 270;
        const visualWidth = sideways ? height : width;
        const offsetLeft = sideways ? (width - height) / 2 : 0;
        const offsetTop = sideways ? (height - width) / 2 : 0;

        wrapper.style.left = `${Math.max(4, menuRect.left - 4 - visualWidth - offsetLeft)}px`;
        wrapper.style.top = `${Math.max(4, menuRect.top - offsetTop)}px`;
        wrapper.style.transform = playerCard ? window.getComputedStyle(playerCard).transform.replace('none', '') : '';
      }

      frame = window.requestAnimationFrame(placeHud);
    };

    frame = window.requestAnimationFrame(placeHud);
    return () => window.cancelAnimationFrame(frame);
  }, [isUtility, others.length, rotation, you]);

  if (!isUtility || !hud || !you || others.length === 0) return null;

  return (
    <div ref={wrapperRef} className="pointer-events-none fixed z-30 origin-top-left transition-transform duration-200">
      <div ref={innerRef} style={{ transform: `rotate(${rotation}deg)` }} className="flex max-w-[min(72vw,360px)] items-center gap-1.5 overflow-x-auto rounded-2xl border border-white/15 bg-black/55 p-1.5 shadow-xl backdrop-blur-md scrollbar-none">
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
