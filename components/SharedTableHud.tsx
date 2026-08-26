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
const MENU_GAP = 4;
const EDGE_GAP = 8;

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
  const rotation = facingRotation(you);

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
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        const availableLength = rotation === 0
          ? menuRect.left - MENU_GAP - EDGE_GAP
          : rotation === 90
            ? menuRect.top - MENU_GAP - EDGE_GAP
            : rotation === 180
              ? viewportWidth - menuRect.right - MENU_GAP - EDGE_GAP
              : viewportHeight - menuRect.bottom - MENU_GAP - EDGE_GAP;

        inner.style.maxWidth = `${Math.max(84, availableLength)}px`;

        const innerWidth = Math.min(inner.scrollWidth, Math.max(84, availableLength));
        const innerHeight = menuRect.height;
        const sideways = rotation === 90 || rotation === 270;
        const visualWidth = sideways ? innerHeight : innerWidth;
        const visualHeight = sideways ? innerWidth : innerHeight;
        const menuCenterX = menuRect.left + menuRect.width / 2;
        const menuCenterY = menuRect.top + menuRect.height / 2;

        let left = 0;
        let top = 0;

        if (rotation === 0) {
          left = menuRect.left - MENU_GAP - visualWidth;
          top = menuCenterY - visualHeight / 2;
        } else if (rotation === 90) {
          // Player-left is physically above the menu.
          left = menuCenterX - visualWidth / 2;
          top = menuRect.top - MENU_GAP - visualHeight;
        } else if (rotation === 180) {
          // Player-left is physically right of the menu.
          left = menuRect.right + MENU_GAP;
          top = menuCenterY - visualHeight / 2;
        } else {
          // Player-left is physically below the menu.
          left = menuCenterX - visualWidth / 2;
          top = menuRect.bottom + MENU_GAP;
        }

        wrapper.style.left = `${left}px`;
        wrapper.style.top = `${top}px`;
        wrapper.style.width = `${visualWidth}px`;
        wrapper.style.height = `${visualHeight}px`;

        inner.style.width = `${innerWidth}px`;
        inner.style.height = `${innerHeight}px`;
        inner.style.left = '50%';
        inner.style.top = '50%';
        inner.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;

        const cardTransform = playerCard ? window.getComputedStyle(playerCard).transform : 'none';
        wrapper.style.transform = cardTransform === 'none' ? '' : cardTransform;
      }

      frame = window.requestAnimationFrame(placeHud);
    };

    frame = window.requestAnimationFrame(placeHud);
    return () => window.cancelAnimationFrame(frame);
  }, [isUtility, others.length, rotation, you]);

  if (!isUtility || !hud || !you || others.length === 0) return null;

  return (
    <div ref={wrapperRef} className="pointer-events-none fixed z-30 transition-transform duration-200">
      <div ref={innerRef} className="absolute flex h-14 w-max items-stretch gap-1 overflow-x-auto rounded-2xl border border-white/15 bg-black/55 p-1 shadow-xl backdrop-blur-md scrollbar-none">
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
