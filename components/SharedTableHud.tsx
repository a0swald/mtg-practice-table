'use client';

import { Crown, Wifi, WifiOff } from 'lucide-react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

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
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const baseCardRectRef = useRef<DOMRect | null>(null);

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

  useLayoutEffect(() => {
    if (!isUtility || !you || others.length === 0) return;

    let settleTimer = 0;

    const measure = () => {
      const wrapper = wrapperRef.current;
      const inner = innerRef.current;
      const menuButton = document.querySelector<HTMLElement>('button[aria-label="Open table menu"]');
      const playerCard = document.querySelector<HTMLElement>('[data-drag]');
      if (!wrapper || !inner || !menuButton) return;

      const menuRect = menuButton.getBoundingClientRect();
      const viewportWidth = document.documentElement.clientWidth;
      const viewportHeight = document.documentElement.clientHeight;

      const availableLength = rotation === 0
        ? menuRect.left - MENU_GAP - EDGE_GAP
        : rotation === 90
          ? menuRect.top - MENU_GAP - EDGE_GAP
          : rotation === 180
            ? viewportWidth - menuRect.right - MENU_GAP - EDGE_GAP
            : viewportHeight - menuRect.bottom - MENU_GAP - EDGE_GAP;

      // Use deterministic content width rather than scrollWidth. On mobile,
      // measuring scrollWidth while also mutating max-width can create a feedback loop.
      const desiredLength = others.length * CHIP_WIDTH + CODE_WIDTH + 10;
      const innerWidth = Math.max(84, Math.min(desiredLength, availableLength));
      const innerHeight = menuRect.height;
      const sideways = rotation === 90 || rotation === 270;
      const visualWidth = sideways ? innerHeight : innerWidth;
      const visualHeight = sideways ? innerWidth : innerHeight;
      const menuCenterX = menuRect.left + menuRect.width / 2;
      const menuCenterY = menuRect.top + menuRect.height / 2;

      let left: number;
      let top: number;

      if (rotation === 0) {
        left = menuRect.left - MENU_GAP - visualWidth;
        top = menuCenterY - visualHeight / 2;
      } else if (rotation === 90) {
        left = menuCenterX - visualWidth / 2;
        top = menuRect.top - MENU_GAP - visualHeight;
      } else if (rotation === 180) {
        left = menuRect.right + MENU_GAP;
        top = menuCenterY - visualHeight / 2;
      } else {
        left = menuCenterX - visualWidth / 2;
        top = menuRect.bottom + MENU_GAP;
      }

      wrapper.style.left = `${Math.round(left)}px`;
      wrapper.style.top = `${Math.round(top)}px`;
      wrapper.style.width = `${Math.round(visualWidth)}px`;
      wrapper.style.height = `${Math.round(visualHeight)}px`;

      inner.style.width = `${Math.round(innerWidth)}px`;
      inner.style.height = `${Math.round(innerHeight)}px`;
      inner.style.left = '50%';
      inner.style.top = '50%';
      inner.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;

      if (playerCard) baseCardRectRef.current = playerCard.getBoundingClientRect();
    };

    // First frame catches the new menu/orientation position; the delayed pass
    // catches the end of the menu button's CSS transition without continuously measuring.
    const frame = window.requestAnimationFrame(measure);
    settleTimer = window.setTimeout(measure, 240);
    window.addEventListener('resize', measure);
    window.visualViewport?.addEventListener('resize', measure);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(settleTimer);
      window.removeEventListener('resize', measure);
      window.visualViewport?.removeEventListener('resize', measure);
    };
  }, [isUtility, others.length, rotation, you]);

  useEffect(() => {
    if (!isUtility || !you || others.length === 0) return;
    let frame = 0;

    const followCard = () => {
      const wrapper = wrapperRef.current;
      const playerCard = document.querySelector<HTMLElement>('[data-drag]');
      const baseRect = baseCardRectRef.current;

      if (wrapper && playerCard && baseRect) {
        const rect = playerCard.getBoundingClientRect();
        const dx = Math.round((rect.left - baseRect.left) * 10) / 10;
        const dy = Math.round((rect.top - baseRect.top) * 10) / 10;
        wrapper.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
      }

      frame = window.requestAnimationFrame(followCard);
    };

    frame = window.requestAnimationFrame(followCard);
    return () => window.cancelAnimationFrame(frame);
  }, [isUtility, others.length, rotation, you]);

  if (!isUtility || !hud || !you || others.length === 0) return null;

  return (
    <div ref={wrapperRef} className="pointer-events-none fixed z-30 will-change-transform">
      <div ref={innerRef} className="absolute flex h-14 items-stretch gap-1 overflow-x-auto rounded-2xl border border-white/15 bg-black/55 p-1 shadow-xl backdrop-blur-md scrollbar-none">
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
