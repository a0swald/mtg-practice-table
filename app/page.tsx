'use client';

import { Bot, ChevronDown, ChevronRight, Gamepad2, Globe2, Layers3, Settings2, Smartphone, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SavedDeck } from '@/types/deck';
import type { Difficulty, GameSettings } from '@/types/game';
import { clearGame, loadGame, saveGame } from '@/lib/storage/gameStorage';
import { loadDecks } from '@/lib/storage/deckStorage';
import { newGame, newVirtualGame } from '@/lib/game/utils';
import { RemoteAccessPanel } from '@/components/RemoteAccessPanel';

const defaults: GameSettings = { aiOpponents: 1, startingLife: 20, difficulty: 'learning', commanderDamageEnabled: true, tutorMode: true, simplifiedTurns: true, mode: 'physical' };

export default function HomePage() {
  const router = useRouter();
  const [settings, setSettings] = useState(defaults);
  const [hasSave, setHasSave] = useState(false);
  const [decks, setDecks] = useState<SavedDeck[]>([]);
  const [deckId, setDeckId] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [remoteOpen, setRemoteOpen] = useState(false);
  useEffect(() => { setHasSave(Boolean(loadGame())); const saved = loadDecks(); setDecks(saved); if (saved[0]) setDeckId(saved[0].id); }, []);
  const startPhysical = () => { clearGame(); saveGame(newGame({ ...settings, mode: 'physical' })); router.push('/game'); };
  const startVirtual = () => { const deck = decks.find(entry => entry.id === deckId); if (!deck) return; clearGame(); saveGame(newVirtualGame(settings, deck)); router.push('/game'); };

  return <>
    <main className="min-h-[100dvh] bg-[#0d0f10] px-5 py-8 text-white md:hidden"><div className="mx-auto w-full max-w-sm"><Header compact />
      <MenuLabel icon={<Users size={13}/>} text="Live gameplay" />
      <button onClick={() => router.push('/utility')} className="w-full rounded-[1.75rem] border border-cyan-300/30 bg-cyan-300/[.08] px-5 py-6 text-left shadow-2xl active:scale-[.99]"><div className="flex items-center gap-3"><Smartphone className="text-cyan-200"/><div className="min-w-0 flex-1"><span className="block text-lg font-black text-cyan-100">TABLE COMPANION</span><span className="mt-1 block text-xs leading-5 text-zinc-400">Life · commander damage · poison · counters · dice · timer · shared tables</span></div><ChevronRight size={18} className="text-zinc-600"/></div></button>
      <MenuLabel icon={<Settings2 size={13}/>} text="Settings" />
      <button onClick={() => setRemoteOpen(v => !v)} className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[.035] px-4 py-4 text-left"><Globe2 size={18} className="text-zinc-400"/><div className="flex-1"><div className="text-sm font-black">Remote Access</div><div className="mt-0.5 text-[11px] text-zinc-500">DuckDNS · privacy · public connection</div></div><ChevronDown size={16} className={`text-zinc-600 transition-transform ${remoteOpen ? 'rotate-180' : ''}`}/></button>{remoteOpen && <div className="mt-3"><RemoteAccessPanel /></div>}
      <div className="mt-6 text-center text-[10px] leading-4 text-zinc-600">Practice modes are available on iPad/tablet and larger screens.</div>
    </div></main>

    <main className="mx-auto hidden min-h-screen max-w-xl flex-col px-5 py-10 md:flex"><Header />
      <MenuLabel icon={<Gamepad2 size={13}/>} text="Practice" />
      <div className="grid gap-3 sm:grid-cols-2">
        <button onClick={startPhysical} className="rounded-3xl border border-emerald-300/20 bg-emerald-300/[.055] p-5 text-left"><Bot size={22} className="mb-5 text-emerald-200"/><div className="text-base font-black">PHYSICAL PRACTICE</div><div className="mt-1 text-xs leading-5 text-zinc-400">Use your real deck while the app runs your AI opponent.</div></button>
        <section className="rounded-3xl border border-violet-400/20 bg-violet-400/[.05] p-5"><Layers3 size={22} className="mb-5 text-violet-200"/><div className="text-base font-black">VIRTUAL PRACTICE</div><div className="mt-1 text-xs leading-5 text-zinc-400">Play directly from an imported digital deck.</div>{decks.length > 0 ? <><select value={deckId} onChange={e => setDeckId(e.target.value)} className="field mt-4 w-full">{decks.map(deck => <option key={deck.id} value={deck.id}>{deck.name} — {deck.commander.name}</option>)}</select><button onClick={startVirtual} className="mt-2 w-full rounded-xl bg-violet-400 px-3 py-2.5 text-xs font-black text-zinc-950">START</button></> : <button onClick={() => router.push('/decks')} className="mt-4 w-full rounded-xl bg-white/10 px-3 py-2.5 text-xs font-black">IMPORT A DECK</button>}</section>
      </div>
      <div className="mt-3 flex gap-3">{hasSave && <button onClick={() => router.push('/game')} className="flex-1 rounded-2xl bg-emerald-400 px-4 py-3 text-xs font-black text-zinc-950">CONTINUE GAME</button>}<button onClick={() => router.push('/decks')} className="flex-1 rounded-2xl border border-white/10 bg-white/[.035] px-4 py-3 text-xs font-black">MY DECKS</button></div>

      <MenuLabel icon={<Users size={13}/>} text="Live gameplay companion" />
      <button onClick={() => router.push('/utility')} className="flex w-full items-center gap-4 rounded-3xl border border-cyan-300/25 bg-cyan-300/[.055] p-5 text-left"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-cyan-300/10 text-cyan-200"><Smartphone size={22}/></div><div className="min-w-0 flex-1"><div className="text-base font-black text-cyan-100">TABLE COMPANION</div><div className="mt-1 text-xs leading-5 text-zinc-400">Life counter · commander damage · poison · counters · dice · timer · shared tables</div></div><ChevronRight size={18} className="text-zinc-600"/></button>

      <MenuLabel icon={<Settings2 size={13}/>} text="Settings" />
      <button onClick={() => setSettingsOpen(v => !v)} className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[.035] px-4 py-4 text-left"><Settings2 size={18} className="text-zinc-400"/><div className="flex-1"><div className="text-sm font-black">Practice Settings</div><div className="mt-0.5 text-[11px] text-zinc-500">Opponents · life · difficulty · tutor mode</div></div><ChevronDown size={16} className={`text-zinc-600 transition-transform ${settingsOpen ? 'rotate-180' : ''}`}/></button>
      {settingsOpen && <section className="mt-2 space-y-4 rounded-2xl border border-white/10 bg-white/[.025] p-4"><Setting label="AI opponents"><select value={settings.aiOpponents} onChange={e => setSettings({ ...settings, aiOpponents: Number(e.target.value) as 1|2|3 })} className="field"><option value={1}>1</option><option value={2}>2</option><option value={3}>3</option></select></Setting><Setting label="Starting life"><select value={settings.startingLife} onChange={e => setSettings({ ...settings, startingLife: Number(e.target.value) })} className="field"><option value={20}>20</option><option value={40}>40</option></select></Setting><Setting label="AI difficulty"><select value={settings.difficulty} onChange={e => setSettings({ ...settings, difficulty: e.target.value as Difficulty })} className="field"><option value="learning">Learning</option><option value="casual">Casual</option><option value="challenging">Challenging</option></select></Setting><Toggle label="Commander damage" checked={settings.commanderDamageEnabled} onChange={v => setSettings({ ...settings, commanderDamageEnabled:v })}/><Toggle label="Tutor mode" checked={settings.tutorMode} onChange={v => setSettings({ ...settings, tutorMode:v })}/></section>}
      <button onClick={() => setRemoteOpen(v => !v)} className="mt-2 flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[.035] px-4 py-4 text-left"><Globe2 size={18} className="text-zinc-400"/><div className="flex-1"><div className="text-sm font-black">Remote Access</div><div className="mt-0.5 text-[11px] text-zinc-500">DuckDNS · privacy · public connection</div></div><ChevronDown size={16} className={`text-zinc-600 transition-transform ${remoteOpen ? 'rotate-180' : ''}`}/></button>{remoteOpen && <div className="mt-2"><RemoteAccessPanel /></div>}
      <style jsx>{`.field{min-width:8.5rem;border:1px solid rgba(255,255,255,.12);border-radius:.75rem;background:#191d20;padding:.65rem .8rem;color:#fff}`}</style>
    </main>
  </>;
}

function Header({ compact = false }: { compact?: boolean }) { return <div className={compact ? 'mb-8' : 'mb-9'}><p className="mb-2 text-[10px] font-black uppercase tracking-[.28em] text-cyan-300">Commander companion</p><h1 className={`${compact ? 'text-4xl' : 'text-4xl'} font-black tracking-tight`}>MTG Practice Table</h1><p className="mt-2 max-w-md text-sm leading-6 text-zinc-500">Practice solo or bring the companion to a live Commander table.</p></div>; }
function MenuLabel({ icon, text }: { icon:React.ReactNode; text:string }) { return <div className="mb-2 mt-7 flex items-center gap-2 px-1 text-[10px] font-black uppercase tracking-[.22em] text-zinc-500">{icon}{text}</div>; }
function Setting({ label, children }: { label:string; children:React.ReactNode }) { return <div className="flex items-center justify-between gap-4"><span className="text-sm font-semibold">{label}</span>{children}</div>; }
function Toggle({ label, checked, onChange }: { label:string; checked:boolean; onChange:(value:boolean)=>void }) { return <label className="flex items-center justify-between"><span className="text-sm font-semibold">{label}</span><input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="h-5 w-5 accent-emerald-400"/></label>; }
