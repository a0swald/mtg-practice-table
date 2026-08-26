'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SavedDeck } from '@/types/deck';
import type { Difficulty, GameSettings } from '@/types/game';
import { clearGame, loadGame, saveGame } from '@/lib/storage/gameStorage';
import { loadDecks } from '@/lib/storage/deckStorage';
import { newGame, newVirtualGame } from '@/lib/game/utils';

const defaults: GameSettings = { aiOpponents: 1, startingLife: 20, difficulty: 'learning', commanderDamageEnabled: true, tutorMode: true, simplifiedTurns: true, mode:'physical' };
export default function HomePage() {
  const router = useRouter();
  const [settings, setSettings] = useState(defaults);
  const [hasSave, setHasSave] = useState(false);
  const [decks,setDecks]=useState<SavedDeck[]>([]);
  const [deckId,setDeckId]=useState('');
  useEffect(() => { setHasSave(Boolean(loadGame())); const saved=loadDecks(); setDecks(saved); if(saved[0])setDeckId(saved[0].id); }, []);
  const startPhysical = () => { clearGame(); saveGame(newGame({...settings,mode:'physical'})); router.push('/game'); };
  const startVirtual = () => { const deck=decks.find(entry=>entry.id===deckId); if(!deck)return; clearGame(); saveGame(newVirtualGame(settings,deck)); router.push('/game'); };
  return <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-5 py-10">
    <div className="mb-8"><p className="mb-2 text-xs font-bold uppercase tracking-[.28em] text-emerald-300">Commander learning companion</p><h1 className="text-4xl font-black tracking-tight">MTG Practice Table</h1><p className="mt-3 text-sm leading-6 text-zinc-400">Play with your physical cards, play an imported deck virtually, or use the app as a shared table utility for real multiplayer games.</p></div>
    <section className="space-y-4 rounded-3xl border border-white/10 bg-white/[.04] p-4 shadow-2xl">
      <Setting label="AI opponents"><select value={settings.aiOpponents} onChange={e=>setSettings({...settings, aiOpponents:Number(e.target.value) as 1|2|3})} className="field"><option value={1}>1</option><option value={2}>2</option><option value={3}>3</option></select></Setting>
      <Setting label="Starting life"><select value={settings.startingLife} onChange={e=>setSettings({...settings,startingLife:Number(e.target.value)})} className="field"><option value={20}>20</option><option value={40}>40</option></select></Setting>
      <Setting label="AI difficulty"><select value={settings.difficulty} onChange={e=>setSettings({...settings,difficulty:e.target.value as Difficulty})} className="field"><option value="learning">Learning</option><option value="casual">Casual</option><option value="challenging">Challenging</option></select></Setting>
      <Toggle label="Commander damage" checked={settings.commanderDamageEnabled} onChange={v=>setSettings({...settings,commanderDamageEnabled:v})}/>
      <Toggle label="Tutor mode" checked={settings.tutorMode} onChange={v=>setSettings({...settings,tutorMode:v})}/>
    </section>

    <div className="mt-5 grid gap-3">
      {hasSave && <button onClick={()=>router.push('/game')} className="rounded-2xl bg-emerald-400 px-5 py-4 text-base font-black text-zinc-950">CONTINUE GAME</button>}
      <button onClick={startPhysical} className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4 text-left"><span className="block text-base font-black">NEW PHYSICAL GAME</span><span className="mt-1 block text-xs text-zinc-400">Use your real cards; the app mirrors and tracks the board.</span></button>
      <section className="rounded-2xl border border-violet-400/20 bg-violet-400/[.05] p-3">
        <div className="mb-2"><div className="font-black">NEW VIRTUAL GAME</div><div className="text-xs text-zinc-400">Shuffle, draw and play directly from an imported deck.</div></div>
        {decks.length>0?<><select value={deckId} onChange={event=>setDeckId(event.target.value)} className="field w-full">{decks.map(deck=><option key={deck.id} value={deck.id}>{deck.name} — {deck.commander.name}</option>)}</select><button onClick={startVirtual} className="mt-2 w-full rounded-xl bg-violet-400 px-4 py-3 font-black text-zinc-950">START VIRTUAL GAME</button></>:<div className="rounded-xl bg-black/20 p-3 text-sm text-zinc-400">Import a deck first to unlock Virtual Game.</div>}
      </section>
      <button onClick={()=>router.push('/utility')} className="rounded-2xl border border-cyan-300/25 bg-cyan-300/[.055] px-5 py-4 text-left"><span className="block text-base font-black text-cyan-100">TABLE UTILITY / LIFE COUNTER</span><span className="mt-1 block text-xs text-zinc-400">2–10 players · life · commander damage · poison · counters · dice · timer.</span></button>
      <button onClick={()=>router.push('/decks')} className="rounded-2xl border border-white/15 bg-white/[.04] px-5 py-4 text-base font-black">MY DECKS · IMPORT / MANAGE</button>
    </div>
    <style jsx>{`.field{min-width:8.5rem;border:1px solid rgba(255,255,255,.12);border-radius:.75rem;background:#191d20;padding:.65rem .8rem;color:#fff}`}</style>
  </main>;
}
function Setting({label,children}:{label:string;children:React.ReactNode}){return <div className="flex items-center justify-between gap-4"><span className="font-semibold">{label}</span>{children}</div>}
function Toggle({label,checked,onChange}:{label:string;checked:boolean;onChange:(v:boolean)=>void}){return <label className="flex items-center justify-between"><span className="font-semibold">{label}</span><input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)} className="h-6 w-6 accent-emerald-400"/></label>}
