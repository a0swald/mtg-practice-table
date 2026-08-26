'use client';

import {
  ChevronLeft,
  Coins,
  Crown,
  Dices,
  Image as ImageIcon,
  LogOut,
  Menu,
  RotateCcw,
  Skull,
  Timer,
  UserRound,
  X,
  Zap,
} from 'lucide-react';
import { useEffect, useMemo, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { SharedTableSection } from '@/components/SharedTableSection';
import { useSharedUtilityTable } from '@/lib/shared-table/useSharedUtilityTable';

type CounterKey = 'poison' | 'energy' | 'experience' | 'storm' | 'commanderTax';
type Facing = 'auto' | 0 | 90 | 180 | 270;
type BackgroundMode = 'preset' | 'card' | 'custom';
type LifeFeedback = 'minus' | 'plus' | null;
type CardLookup = { name: string; imageUrl?: string };

type UtilityPlayer = {
  id: string;
  name: string;
  color: string;
  backgroundImageUrl?: string;
  backgroundCardName?: string;
  life: number;
  poison: number;
  energy: number;
  experience: number;
  storm: number;
  commanderTax: number;
  sick: boolean;
  orientation?: Facing;
  commanderDamage: Record<string, number>;
};

type UtilityState = {
  players: UtilityPlayer[];
  startingLife: number;
  activePlayerId?: string;
  monarchId?: string;
  initiativeId?: string;
  seconds: number;
  running: boolean;
  turn: number;
  started: boolean;
};

const STORAGE_KEY = 'mtg-practice-utility-v3';
const COLORS = ['#526bd8', '#d83c5b', '#3985ed', '#f4a20d', '#1ec367', '#a54ee9', '#0db0c8', '#df3c86', '#7acb14', '#fb7215', '#718299'];
const uid = () => typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

function makePlayer(index: number, life: number): UtilityPlayer {
  return {
    id: uid(), name: `Player ${index + 1}`, color: COLORS[index % COLORS.length], life,
    poison: 0, energy: 0, experience: 0, storm: 0, commanderTax: 0,
    sick: false, orientation: 'auto', commanderDamage: {},
  };
}

function freshState(count: number, life: number): UtilityState {
  return { players: Array.from({ length: count }, (_, index) => makePlayer(index, life)), startingLife: life, seconds: 0, running: false, turn: 1, started: true };
}

function formatTime(total: number) {
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function rotationFor(index: number, count: number) {
  if (count === 1) return 0;
  if (count === 2) return index === 0 ? 180 : 0;
  if (count === 3) return index === 0 ? 180 : index === 1 ? 90 : 270;
  if (count === 4) return index < 2 ? 180 : 0;
  return index % 2 === 0 ? 90 : 270;
}

function logicalRotation(player: UtilityPlayer, index: number, count: number) {
  return player.orientation === undefined || player.orientation === 'auto' ? rotationFor(index, count) : player.orientation;
}

function rotateDelta(dx: number, dy: number, rotation: number) {
  const radians = rotation * Math.PI / 180;
  return { x: dx * Math.cos(radians) + dy * Math.sin(radians), y: -dx * Math.sin(radians) + dy * Math.cos(radians) };
}

export default function UtilityPage() {
  const router = useRouter();
  const [setupPlayers, setSetupPlayers] = useState(4);
  const [setupLife, setSetupLife] = useState(40);
  const [customLife, setCustomLife] = useState(40);
  const [state, setState] = useState<UtilityState>();
  const [menuOpen, setMenuOpen] = useState(false);
  const [diceResult, setDiceResult] = useState<string>();
  const shared = useSharedUtilityTable(state, setState);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setState(JSON.parse(raw) as UtilityState);
    } catch {
      // Ignore malformed local saves.
    }
  }, []);

  useEffect(() => { if (state) localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [state]);

  useEffect(() => {
    if (!state?.running) return;
    const timer = window.setInterval(() => setState(current => current ? { ...current, seconds: current.seconds + 1 } : current), 1000);
    return () => window.clearInterval(timer);
  }, [state?.running]);

  const defeated = useMemo(() => new Set(
    state?.players.filter(player => player.life <= 0 || player.poison >= 10 || Object.values(player.commanderDamage).some(value => value >= 21)).map(player => player.id) ?? [],
  ), [state]);

  function patchPlayer(id: string, fn: (player: UtilityPlayer) => UtilityPlayer) {
    setState(current => current ? { ...current, players: current.players.map(player => player.id === id ? fn(player) : player) } : current);
  }

  function life(id: string, delta: number) { patchPlayer(id, player => ({ ...player, life: player.life + delta })); }
  function counter(id: string, key: CounterKey, delta: number) { patchPlayer(id, player => ({ ...player, [key]: Math.max(0, player[key] + delta) })); }

  function commanderDamage(targetId: string, sourceId: string, delta: number) {
    patchPlayer(targetId, player => {
      const current = player.commanderDamage[sourceId] ?? 0;
      const next = Math.max(0, current + delta);
      const appliedDelta = next - current;
      return { ...player, life: player.life - appliedDelta, commanderDamage: { ...player.commanderDamage, [sourceId]: next } };
    });
  }

  function quit() { localStorage.removeItem(STORAGE_KEY); router.push('/'); }
  function reset() { if (state) setState(freshState(state.players.length, state.startingLife)); setMenuOpen(false); }

  function nextTurn() {
    setState(current => {
      if (!current) return current;
      const alive = current.players.filter(player => !defeated.has(player.id));
      if (!alive.length) return current;
      const currentIndex = Math.max(-1, alive.findIndex(player => player.id === current.activePlayerId));
      const next = alive[(currentIndex + 1) % alive.length];
      return { ...current, activePlayerId: next.id, turn: current.turn + 1, players: current.players.map(player => ({ ...player, storm: 0 })) };
    });
  }

  if (!state?.started) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-[#090b0d] px-5 py-8 text-white">
        <section className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[.04] p-5">
          <button onClick={() => router.push('/')} className="mb-5 rounded-xl bg-white/5 px-3 py-2 text-sm font-bold text-zinc-300">← Main Menu</button>
          <div className="text-[11px] font-black uppercase tracking-[.24em] text-cyan-300">Table Utility</div>
          <h1 className="mt-1 text-3xl font-black">Start Table</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-400">Designed for an iPhone or iPad lying flat between players.</p>
          <div className="mt-6 space-y-4">
            <label className="flex items-center justify-between font-bold">Players<select value={setupPlayers} onChange={event => setSetupPlayers(Number(event.target.value))} className="rounded-xl bg-zinc-900 px-3 py-2">{Array.from({ length: 10 }, (_, index) => index + 1).map(value => <option key={value}>{value}</option>)}</select></label>
            <label className="flex items-center justify-between font-bold">Starting life<select value={setupLife} onChange={event => setSetupLife(Number(event.target.value))} className="rounded-xl bg-zinc-900 px-3 py-2"><option value={20}>20</option><option value={30}>30</option><option value={40}>40</option><option value={0}>Custom</option></select></label>
            {setupLife === 0 && <input type="number" value={customLife} onChange={event => setCustomLife(Number(event.target.value) || 1)} className="w-full rounded-xl bg-black/25 px-3 py-3 text-base" />}
            <button onClick={() => setState(freshState(setupPlayers, setupLife === 0 ? customLife : setupLife))} className="w-full rounded-2xl bg-cyan-300 py-4 font-black text-zinc-950">START COUNTER</button>
          </div>
        </section>
      </main>
    );
  }

  const sharedPlayer = shared.session ? state.players.find(player => player.id === shared.session?.playerId) : undefined;
  const displayPlayers = sharedPlayer ? [sharedPlayer] : state.players;
  const count = displayPlayers.length;
  const singleRotation = count === 1 ? logicalRotation(displayPlayers[0], 0, 1) : 0;

  return (
    <main className="relative h-[100dvh] w-screen overflow-hidden bg-black text-white [touch-action:none] [user-select:none]">
      <section className={layoutClass(count)}>
        {displayPlayers.map((player, index) => (
          <PlayerZone key={player.id} player={player} index={index} count={count} players={state.players} defeated={defeated.has(player.id)} active={state.activePlayerId === player.id} monarch={state.monarchId === player.id} initiative={state.initiativeId === player.id} onLife={delta => life(player.id, delta)} onPatch={fn => patchPlayer(player.id, fn)} onCounter={(key, delta) => counter(player.id, key, delta)} onCommanderDamage={(sourceId, delta) => commanderDamage(player.id, sourceId, delta)} onMonarch={() => setState(current => current ? { ...current, monarchId: current.monarchId === player.id ? undefined : player.id } : current)} onInitiative={() => setState(current => current ? { ...current, initiativeId: current.initiativeId === player.id ? undefined : player.id } : current)} />
        ))}
      </section>

      <TableMenuButton rotation={singleRotation} single={count === 1} onClick={() => setMenuOpen(true)} />

      {menuOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setMenuOpen(false)}>
          <section onClick={event => event.stopPropagation()} style={{ transform: `rotate(${singleRotation}deg)` }} className="max-h-[88dvh] w-[min(86vw,440px)] overflow-y-auto rounded-[2rem] border border-white/10 bg-[#15181b] p-4 shadow-2xl transition-transform [touch-action:pan-y]">
            <div className="flex items-center justify-between gap-4"><div><div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-300">Table Menu</div><div className="mt-1 text-xl font-black">Turn {state.turn} · {formatTime(state.seconds)}</div></div><button aria-label="Close table menu" onClick={() => setMenuOpen(false)} className="grid h-12 w-12 place-items-center rounded-xl bg-white/5"><X size={24} /></button></div>
            <div className="mt-4 grid grid-cols-2 gap-2"><MenuAction icon={<Timer size={24} />} label={state.running ? 'PAUSE TIMER' : 'START TIMER'} onClick={() => setState(current => current ? { ...current, running: !current.running } : current)} /><MenuAction label="NEXT TURN" accent onClick={nextTurn} /><MenuAction icon={<Dices size={24} />} label="ROLL D20" onClick={() => setDiceResult(`D20: ${1 + Math.floor(Math.random() * 20)}`)} /><MenuAction icon={<Coins size={24} />} label="FLIP COIN" onClick={() => setDiceResult(Math.random() < .5 ? 'HEADS' : 'TAILS')} /></div>
            {diceResult && <div className="mt-3 rounded-2xl bg-black/25 p-4 text-center text-3xl font-black">{diceResult}</div>}
            <SharedTableSection session={shared.session} roster={shared.roster} busy={shared.busy} error={shared.error} onHost={shared.host} onJoin={shared.join} onLeave={shared.leave} onClearError={shared.clearError} />
            <div className="mt-4 grid grid-cols-2 gap-2"><MenuAction icon={<RotateCcw size={20} />} label="RESET" onClick={reset} outlined /><MenuAction icon={<LogOut size={20} />} label="QUIT" onClick={quit} danger outlined /></div>
          </section>
        </div>
      )}
    </main>
  );
}

function TableMenuButton({ rotation, single, onClick }: { rotation: number; single: boolean; onClick: () => void }) {
  const position = !single ? 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2' : rotation === 0 ? 'right-[calc(env(safe-area-inset-right)+1rem)] top-[calc(env(safe-area-inset-top)+1rem)]' : rotation === 90 ? 'right-[calc(env(safe-area-inset-right)+1rem)] bottom-[calc(env(safe-area-inset-bottom)+1rem)]' : rotation === 180 ? 'left-[calc(env(safe-area-inset-left)+1rem)] bottom-[calc(env(safe-area-inset-bottom)+1rem)]' : 'left-[calc(env(safe-area-inset-left)+1rem)] top-[calc(env(safe-area-inset-top)+1rem)]';
  return <button aria-label="Open table menu" onClick={onClick} className={`absolute z-40 grid h-14 w-14 place-items-center rounded-2xl border border-white/20 bg-[#121416]/95 shadow-2xl backdrop-blur active:scale-95 ${position}`}><span style={{ transform: `rotate(${rotation}deg)` }}><Menu size={28} /></span></button>;
}

function MenuAction({ icon, label, onClick, accent, danger, outlined }: { icon?: ReactNode; label: string; onClick: () => void; accent?: boolean; danger?: boolean; outlined?: boolean }) {
  return <button onClick={onClick} className={`flex min-h-14 items-center justify-center gap-2 rounded-2xl px-3 text-sm font-black ${accent ? 'bg-cyan-300 text-zinc-950' : danger ? 'border border-red-400/30 bg-red-400/[.05] text-red-200' : outlined ? 'border border-white/10 bg-transparent' : 'bg-white/10'}`}>{icon}{label}</button>;
}

function PlayerZone({ player, index, count, players, defeated, active, monarch, initiative, onLife, onPatch, onCounter, onCommanderDamage, onMonarch, onInitiative }: {
  player: UtilityPlayer; index: number; count: number; players: UtilityPlayer[]; defeated: boolean; active: boolean; monarch: boolean; initiative: boolean;
  onLife: (delta: number) => void; onPatch: (fn: (player: UtilityPlayer) => UtilityPlayer) => void; onCounter: (key: CounterKey, delta: number) => void; onCommanderDamage: (sourceId: string, delta: number) => void; onMonarch: () => void; onInitiative: () => void;
}) {
  const rotation = logicalRotation(player, index, count);
  const radians = rotation * Math.PI / 180;
  const [open, setOpen] = useState(false);
  const [drag, setDrag] = useState(0);
  const [gesture, setGesture] = useState<{ x: number; y: number }>();
  const [settingsSession, setSettingsSession] = useState(0);
  const [lifeFeedback, setLifeFeedback] = useState<LifeFeedback>(null);
  const drawer = 88;
  const offset = open ? -drawer : 0;

  function closeSettings() { setOpen(false); setSettingsSession(value => value + 1); }
  function toggleSettings() { if (open) closeSettings(); else setOpen(true); }
  function triggerLifeFeedback(side: Exclude<LifeFeedback, null>) {
    setLifeFeedback(side);
    window.setTimeout(() => setLifeFeedback(current => current === side ? null : current), 150);
  }

  function pointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest('[data-drawer-handle]')) return;
    setGesture({ x: event.clientX, y: event.clientY });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function pointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!gesture) return;
    const logical = rotateDelta(event.clientX - gesture.x, event.clientY - gesture.y, rotation);
    const size = rotation === 90 || rotation === 270 ? event.currentTarget.clientWidth : event.currentTarget.clientHeight;
    setDrag(Math.max(-drawer, Math.min(drawer, logical.y / Math.max(1, size) * 100)));
  }

  function pointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (!gesture) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    const logical = rotateDelta(dx, dy, rotation);
    const moved = Math.hypot(dx, dy) > 12;

    if (moved) {
      const effective = offset + drag;
      if (effective < -24 || logical.y < -42) setOpen(true);
      else if (effective > -64 || logical.y > 42) closeSettings();
    } else if (!open) {
      const rect = event.currentTarget.getBoundingClientRect();
      const center = rotateDelta(event.clientX - (rect.left + rect.width / 2), event.clientY - (rect.top + rect.height / 2), rotation);
      const minus = center.x < 0;
      onLife(minus ? -1 : 1);
      triggerLifeFeedback(minus ? 'minus' : 'plus');
    }

    setGesture(undefined);
    setDrag(0);
  }

  const translate = Math.max(-drawer, Math.min(0, offset + drag));
  const reveal = Math.max(0, Math.min(1, -translate / drawer));
  const tx = -translate * Math.sin(radians);
  const ty = translate * Math.cos(radians);
  const cardBackground = player.backgroundImageUrl ? `linear-gradient(rgba(0,0,0,.26),rgba(0,0,0,.48)),url("${player.backgroundImageUrl}")` : `linear-gradient(145deg,${player.color}f2,${player.color}b8)`;

  return (
    <article style={{ background: `linear-gradient(145deg,${player.color}55,#090b0d)` }} className={`relative overflow-hidden ${active ? 'ring-4 ring-inset ring-white/80' : ''} ${defeated ? 'brightness-50' : ''}`}>
      <div className="absolute inset-0">
        <div style={{ opacity: reveal, pointerEvents: reveal > .9 ? 'auto' : 'none' }} className="absolute inset-0 z-10 transition-opacity"><PlayerSettings key={settingsSession} player={player} players={players} rotation={rotation} monarch={monarch} initiative={initiative} onPatch={onPatch} onCounter={onCounter} onCommanderDamage={onCommanderDamage} onMonarch={onMonarch} onInitiative={onInitiative} /></div>

        <div onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={() => { setGesture(undefined); setDrag(0); }} style={{ transform: `translate(${tx}%,${ty}%)`, backgroundImage: cardBackground, backgroundSize: 'cover', backgroundPosition: 'center' }} className="absolute inset-0 z-20 overflow-hidden shadow-2xl transition-transform duration-200 data-[drag=true]:transition-none" data-drag={gesture !== undefined}>
          <div style={{ transform: `rotate(${rotation}deg)` }} className="pointer-events-none absolute inset-0 transition-transform duration-200">
            <div className={`absolute inset-y-2 left-2 w-[calc(50%-0.5rem)] rounded-2xl border-2 transition-all duration-150 ${lifeFeedback === 'minus' ? 'border-white/90 bg-black/10 opacity-100 shadow-[inset_0_0_24px_rgba(255,255,255,.12)]' : 'border-transparent opacity-0'}`} />
            <div className={`absolute inset-y-2 right-2 w-[calc(50%-0.5rem)] rounded-2xl border-2 transition-all duration-150 ${lifeFeedback === 'plus' ? 'border-white/90 bg-white/[.08] opacity-100 shadow-[inset_0_0_24px_rgba(255,255,255,.12)]' : 'border-transparent opacity-0'}`} />
            <div className="absolute inset-0 flex items-center justify-center"><div className="text-center"><div className="mb-1 flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-[.14em] text-white/80">{monarch && <Crown size={14} />}{initiative && <Zap size={14} />}{player.sick && <span>●</span>}{player.name}</div><div className="text-[clamp(4.5rem,18vw,10rem)] font-black leading-none tabular-nums tracking-[-.06em] [text-shadow:0_3px_18px_rgba(0,0,0,.65)]">{player.life}</div><div className="mt-1 flex justify-center gap-3 text-xs font-black text-white/80"><span>−</span><span>tap sides</span><span>+</span></div>{(player.poison > 0 || player.commanderTax > 0) && <div className="mt-2 flex justify-center gap-1 text-[10px] font-black">{player.poison > 0 && <span className="rounded-full bg-black/40 px-2 py-1">☠ {player.poison}</span>}{player.commanderTax > 0 && <span className="rounded-full bg-black/40 px-2 py-1">Tax +{player.commanderTax}</span>}</div>}{defeated && <div className="mt-2 rounded-full bg-black/50 px-3 py-1 text-xs font-black uppercase">Defeated</div>}</div></div>
          </div>
          <DrawerHandle rotation={rotation} open={open} onClick={toggleSettings} />
        </div>
      </div>
    </article>
  );
}

function DrawerHandle({ rotation, open, onClick }: { rotation: number; open: boolean; onClick: () => void }) {
  const position = rotation === 0 ? 'bottom-0 left-1/2 -translate-x-1/2 items-end pb-3' : rotation === 180 ? 'top-0 left-1/2 -translate-x-1/2 items-start pt-3' : rotation === 90 ? 'left-0 top-1/2 -translate-y-1/2 items-center justify-start pl-3' : 'right-0 top-1/2 -translate-y-1/2 items-center justify-end pr-3';
  const bar = rotation === 90 || rotation === 270 ? 'h-10 w-1' : 'h-1 w-10';
  return <button data-drawer-handle aria-label={open ? 'Close player settings' : 'Open player settings'} onClick={event => { event.stopPropagation(); onClick(); }} className={`absolute z-30 flex h-20 w-20 justify-center ${position}`}><span className={`${bar} rounded-full bg-white/85 shadow`} /></button>;
}

function PlayerSettings({ player, players, rotation, monarch, initiative, onPatch, onCounter, onCommanderDamage, onMonarch, onInitiative }: {
  player: UtilityPlayer; players: UtilityPlayer[]; rotation: number; monarch: boolean; initiative: boolean;
  onPatch: (fn: (player: UtilityPlayer) => UtilityPlayer) => void; onCounter: (key: CounterKey, delta: number) => void; onCommanderDamage: (sourceId: string, delta: number) => void; onMonarch: () => void; onInitiative: () => void;
}) {
  const [panel, setPanel] = useState<'home' | 'background' | 'name'>('home');
  const [backgroundMode, setBackgroundMode] = useState<BackgroundMode>(player.backgroundImageUrl ? 'card' : 'preset');
  const [cardQuery, setCardQuery] = useState(player.backgroundCardName ?? '');
  const [cardBusy, setCardBusy] = useState(false);
  const [cardStatus, setCardStatus] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestBusy, setSuggestBusy] = useState(false);
  const facing: Facing = player.orientation ?? 'auto';

  useEffect(() => {
    const query = cardQuery.trim();
    if (panel !== 'background' || backgroundMode !== 'card' || query.length < 2) { setSuggestions([]); return; }
    const timer = window.setTimeout(async () => {
      setSuggestBusy(true);
      try {
        const response = await fetch(`/api/cards/autocomplete?q=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error();
        const data = await response.json() as string[] | { data?: string[]; suggestions?: string[] };
        setSuggestions((Array.isArray(data) ? data : (data.data ?? data.suggestions ?? [])).slice(0, 8));
      } catch { setSuggestions([]); } finally { setSuggestBusy(false); }
    }, 220);
    return () => window.clearTimeout(timer);
  }, [cardQuery, panel, backgroundMode]);

  async function useCardBackground(name?: string) {
    const query = (name ?? cardQuery).trim();
    if (!query) return;
    setCardBusy(true); setCardStatus('');
    try {
      const response = await fetch(`/api/cards/named?name=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('Card not found.');
      const card = await response.json() as CardLookup;
      if (!card.imageUrl) throw new Error('No image available.');
      onPatch(current => ({ ...current, backgroundImageUrl: card.imageUrl, backgroundCardName: card.name }));
      setCardQuery(card.name); setSuggestions([]); setCardStatus(`Using ${card.name}`);
    } catch (error) { setCardStatus(error instanceof Error ? error.message : 'Could not load card.'); } finally { setCardBusy(false); }
  }

  if (panel === 'background') {
    return (
      <SettingsShell rotation={rotation}>
        <BackButton onClick={() => setPanel('home')} />
        <div className="w-full max-w-md px-2">
          <h2 className="text-center text-sm font-black uppercase tracking-[.2em] text-zinc-300">Background</h2>
          <div className="mt-5 grid grid-cols-3 rounded-2xl bg-black/30 p-1">{(['preset', 'card', 'custom'] as BackgroundMode[]).map(mode => <button key={mode} onClick={() => setBackgroundMode(mode)} className={`rounded-xl py-3 text-xs font-black uppercase ${backgroundMode === mode ? 'bg-white text-zinc-950' : 'text-zinc-400'}`}>{mode === 'preset' ? 'Colors' : mode === 'card' ? 'MTG Card' : 'Custom'}</button>)}</div>
          {backgroundMode === 'preset' && <div className="mt-5 grid grid-cols-5 gap-2 sm:grid-cols-6">{COLORS.map(color => <button key={color} aria-label={`Use ${color}`} onClick={() => onPatch(current => ({ ...current, color, backgroundImageUrl: undefined, backgroundCardName: undefined }))} style={{ backgroundColor: color }} className={`h-10 w-full rounded-xl border-2 transition-transform active:scale-95 ${player.color === color && !player.backgroundImageUrl ? 'border-white shadow-[0_0_0_2px_rgba(255,255,255,.2)]' : 'border-white/10'}`} />)}</div>}
          {backgroundMode === 'custom' && <div className="mt-6 flex items-center justify-center gap-4"><input type="color" value={player.color} onChange={event => onPatch(current => ({ ...current, color: event.target.value, backgroundImageUrl: undefined, backgroundCardName: undefined }))} className="h-14 w-28 overflow-hidden rounded-xl border border-white/15 bg-transparent p-0" /><span className="font-mono text-sm uppercase text-zinc-400">{player.color}</span></div>}
          {backgroundMode === 'card' && <div className="relative mt-6"><div className="flex gap-2"><input value={cardQuery} onChange={event => setCardQuery(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !cardBusy) void useCardBackground(); }} placeholder="Search MTG card…" autoComplete="off" autoCorrect="off" spellCheck={false} inputMode="search" style={{ fontSize: '16px' }} className="min-w-0 flex-1 rounded-xl bg-black/30 px-4 py-3 outline-none" /><button onClick={() => void useCardBackground()} disabled={cardBusy} className="rounded-xl bg-blue-500 px-5 text-xs font-black disabled:opacity-50">{cardBusy ? '…' : 'USE'}</button></div>{(suggestions.length > 0 || suggestBusy) && <div className="absolute left-0 right-0 top-[3.4rem] z-50 max-h-56 overflow-y-auto rounded-xl border border-white/10 bg-[#20202a] shadow-2xl [touch-action:pan-y]">{suggestBusy && suggestions.length === 0 ? <div className="px-4 py-3 text-sm text-zinc-400">Searching…</div> : suggestions.map(name => <button key={name} onPointerDown={event => event.preventDefault()} onClick={() => void useCardBackground(name)} className="block w-full border-b border-white/5 px-4 py-3 text-left text-base font-semibold last:border-0">{name}</button>)}</div>}{player.backgroundImageUrl && <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/15 p-3"><img src={player.backgroundImageUrl} alt="Selected card" className="h-24 w-20 rounded-xl object-cover" /><div className="min-w-0"><div className="truncate font-black">{player.backgroundCardName}</div><button onClick={() => onPatch(current => ({ ...current, backgroundImageUrl: undefined, backgroundCardName: undefined }))} className="mt-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-black">REMOVE</button></div></div>}{cardStatus && <div className="mt-3 text-xs text-zinc-400">{cardStatus}</div>}</div>}
        </div>
      </SettingsShell>
    );
  }

  if (panel === 'name') {
    return <SettingsShell rotation={rotation}><BackButton onClick={() => setPanel('home')} /><div className="w-full max-w-sm px-2 text-center"><UserRound className="mx-auto" size={42} strokeWidth={1.6} /><div className="mt-3 text-xs font-black uppercase tracking-[.2em] text-zinc-400">Name</div><input autoFocus value={player.name} onChange={event => onPatch(current => ({ ...current, name: event.target.value }))} style={{ fontSize: '16px' }} className="mt-4 w-full rounded-2xl bg-black/30 px-4 py-4 text-center font-black outline-none" /><div className="mt-5 text-xs font-black uppercase tracking-[.2em] text-zinc-500">Facing</div><div className="mt-3 grid grid-cols-5 gap-2">{([['auto', 'A'], [0, '↑'], [90, '→'], [180, '↓'], [270, '←']] as [Facing, string][]).map(([value, label]) => <button key={String(value)} onClick={() => onPatch(current => ({ ...current, orientation: value }))} className={`h-12 rounded-xl font-black ${facing === value ? 'bg-blue-500' : 'bg-white/10'}`}>{label}</button>)}</div></div></SettingsShell>;
  }

  return (
    <div className="absolute inset-0 bg-[#373641] text-white">
      <div className="absolute inset-0 overflow-hidden">
        <div style={{ transform: `rotate(${rotation}deg)` }} className="absolute inset-0 transition-transform duration-200">
          <div className="flex h-full w-full snap-x snap-mandatory items-stretch gap-4 overflow-x-auto overflow-y-hidden overscroll-x-contain px-4 py-4 [touch-action:pan-x] scrollbar-none sm:px-6">
            <SettingsStripSection title="Player" className="min-w-[calc(100%-2rem)] sm:min-w-[calc(100%-3rem)]"><Dashboard player={player} onBackground={() => setPanel('background')} onKill={() => onPatch(current => ({ ...current, life: 0 }))} onName={() => setPanel('name')} onTax={delta => onCounter('commanderTax', delta)} onPoison={delta => onCounter('poison', delta)} /></SettingsStripSection>
            <SettingsStripSection title="Counters" className="min-w-[calc(100%-2rem)] sm:min-w-[calc(100%-3rem)]"><div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4"><TinyCounter label="Poison" value={player.poison} onMinus={() => onCounter('poison', -1)} onPlus={() => onCounter('poison', 1)} /><TinyCounter label="Energy" value={player.energy} onMinus={() => onCounter('energy', -1)} onPlus={() => onCounter('energy', 1)} /><TinyCounter label="Experience" value={player.experience} onMinus={() => onCounter('experience', -1)} onPlus={() => onCounter('experience', 1)} /><TinyCounter label="Storm" value={player.storm} onMinus={() => onCounter('storm', -1)} onPlus={() => onCounter('storm', 1)} /></div><div className="mt-4 grid w-full grid-cols-2 gap-2"><button onClick={onMonarch} className={`rounded-2xl py-3 text-xs font-black ${monarch ? 'bg-amber-300 text-zinc-950' : 'bg-white/10'}`}><span className="inline-flex items-center gap-2"><Crown size={17} />MONARCH</span></button><button onClick={onInitiative} className={`rounded-2xl py-3 text-xs font-black ${initiative ? 'bg-violet-300 text-zinc-950' : 'bg-white/10'}`}><span className="inline-flex items-center gap-2"><Zap size={17} />INITIATIVE</span></button></div></SettingsStripSection>
            <SettingsStripSection title="Commander Damage" className="min-w-[calc(100%-2rem)] sm:min-w-[calc(100%-3rem)]">{players.length > 1 ? <div className="w-full space-y-2">{players.filter(source => source.id !== player.id).map(source => <div key={source.id} className="grid grid-cols-[1fr_44px_52px_44px] items-center gap-2 rounded-2xl bg-black/20 p-3"><span className="truncate text-xs font-bold">{source.name}</span><button onClick={() => onCommanderDamage(source.id, -1)} className="h-11 rounded-xl bg-white/10 font-black">−</button><span className="text-center text-lg font-black">{player.commanderDamage[source.id] ?? 0}</span><button onClick={() => onCommanderDamage(source.id, 1)} className="h-11 rounded-xl bg-red-400/15 font-black text-red-200">+</button></div>)}</div> : <div className="rounded-2xl bg-black/15 p-4 text-sm text-zinc-400">Commander damage appears here in multiplayer.</div>}</SettingsStripSection>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsStripSection({ title, className, children }: { title: string; className?: string; children: ReactNode }) {
  return <section className={`flex h-full shrink-0 snap-start flex-col items-center justify-center rounded-3xl bg-black/10 p-4 sm:p-5 ${className ?? ''}`}><div className="mb-4 w-full text-xs font-black uppercase tracking-[.18em] text-zinc-400">{title}</div><div className="flex w-full flex-1 flex-col items-center justify-center overflow-y-auto [touch-action:pan-y]">{children}</div></section>;
}

function Dashboard({ player, onBackground, onKill, onName, onTax, onPoison }: { player: UtilityPlayer; onBackground: () => void; onKill: () => void; onName: () => void; onTax: (delta: number) => void; onPoison: (delta: number) => void }) {
  return <div className="flex w-full flex-col items-center justify-center gap-5"><div className="flex w-full items-center justify-center gap-3 sm:gap-5"><MiniCounter value={player.commanderTax} onMinus={() => onTax(-2)} onPlus={() => onTax(2)} label="Tax" /><MiniCounter value={player.poison} onMinus={() => onPoison(-1)} onPlus={() => onPoison(1)} label="Poison" /></div><div className="h-px w-full bg-white/10" /><div className="flex w-full items-start justify-evenly gap-3"><Action icon={<ImageIcon size={42} strokeWidth={1.5} />} label="BACKGROUND" onClick={onBackground} /><Action icon={<Skull size={42} strokeWidth={1.5} />} label="KILL PLAYER" onClick={onKill} danger /><Action icon={<UserRound size={42} strokeWidth={1.5} />} label="NAME" onClick={onName} /></div></div>;
}

function Action({ icon, label, onClick, danger }: { icon: ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return <button onClick={onClick} className={`flex min-w-[78px] flex-1 flex-col items-center justify-center gap-2 text-center ${danger ? 'text-red-200' : 'text-white'}`}>{icon}<span className="text-[9px] font-black tracking-[.08em]">{label}</span></button>;
}

function MiniCounter({ value, onMinus, onPlus, label }: { value: number; onMinus: () => void; onPlus: () => void; label: string }) {
  return <div className="min-w-0 flex-1 rounded-2xl bg-black/15 px-2 py-2"><div className="mb-1 text-center text-[8px] font-black uppercase tracking-wider text-white/50">{label}</div><div className="grid grid-cols-[34px_1fr_34px] items-center gap-1"><button onClick={onMinus} className="h-9 rounded-xl bg-white/5 text-xl">−</button><div className="text-center text-lg font-black">{value}</div><button onClick={onPlus} className="h-9 rounded-xl bg-white/5 text-xl">+</button></div></div>;
}

function SettingsShell({ rotation, children }: { rotation: number; children: ReactNode }) {
  return <div className="absolute inset-0 overflow-hidden bg-[#373641] text-white"><div className="absolute inset-0 flex items-center justify-center"><div style={{ transform: `rotate(${rotation}deg)` }} className="relative flex aspect-square w-[min(90%,560px)] max-h-[90%] items-center justify-center overflow-visible p-5 transition-transform duration-200">{children}</div></div></div>;
}

function BackButton({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick} className="absolute bottom-2 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/20 bg-black/70 px-6 py-3 text-sm font-black shadow-2xl backdrop-blur"><ChevronLeft size={19} /> BACK</button>;
}

function TinyCounter({ label, value, onMinus, onPlus }: { label: string; value: number; onMinus: () => void; onPlus: () => void }) {
  return <div className="rounded-2xl bg-black/20 p-3"><div className="text-center text-[8px] font-black uppercase tracking-wider text-zinc-500">{label}</div><div className="mt-2 grid grid-cols-[36px_1fr_36px] items-center gap-1"><button onClick={onMinus} className="h-9 rounded-xl bg-white/10 font-black">−</button><div className="text-center text-lg font-black">{value}</div><button onClick={onPlus} className="h-9 rounded-xl bg-white/10 font-black">+</button></div></div>;
}

function layoutClass(count: number) {
  if (count === 1) return 'grid h-full w-full grid-cols-1 grid-rows-1 bg-black';
  if (count === 2) return 'grid h-full w-full grid-rows-2 gap-[2px] bg-black';
  if (count === 3) return 'grid h-full w-full grid-cols-2 grid-rows-2 gap-[2px] bg-black [&>*:first-child]:col-span-2';
  if (count === 4) return 'grid h-full w-full grid-cols-2 grid-rows-2 gap-[2px] bg-black';
  return `grid h-full w-full gap-[2px] bg-black ${count <= 6 ? 'grid-cols-2 grid-rows-3' : count <= 8 ? 'grid-cols-2 grid-rows-4' : 'grid-cols-2 grid-rows-5'}`;
}
