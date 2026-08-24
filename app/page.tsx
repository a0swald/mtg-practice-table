'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Difficulty, GameSettings } from '@/types/game';
import { clearGame, loadGame, saveGame } from '@/lib/storage/gameStorage';
import { newGame } from '@/lib/game/utils';

const defaults: GameSettings = { aiOpponents: 1, startingLife: 20, difficulty: 'learning', commanderDamageEnabled: true, tutorMode: true, simplifiedTurns: true };
export default function HomePage() {
  const router = useRouter(); const [settings, setSettings] = useState(defaults); const [hasSave, setHasSave] = useState(false);
  useEffect(() => setHasSave(Boolean(loadGame())), []);
  const start = () => { clearGame(); saveGame(newGame(settings)); router.push('/game'); };
  return <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
    <div className="mb-8"><p className="mb-2 text-xs font-bold uppercase tracking-[.28em] text-emerald-300">Commander learning companion</p><h1 className="text-4xl font-black tracking-tight">MTG Practice Table</h1><p className="mt-3 text-sm leading-6 text-zinc-400">Your physical deck stays on the table. This app mirrors the board, tracks state, and gives you a simple opponent to practice against.</p></div>
    <section className="space-y-4 rounded-3xl border border-white/10 bg-white/[.04] p-4 shadow-2xl">
      <Setting label="AI opponents"><select value={settings.aiOpponents} onChange={e=>setSettings({...settings, aiOpponents:Number(e.target.value) as 1|2|3})} className="field"><option value={1}>1</option><option value={2}>2</option><option value={3}>3</option></select></Setting>
      <Setting label="Starting life"><select value={settings.startingLife} onChange={e=>setSettings({...settings,startingLife:Number(e.target.value)})} className="field"><option value={20}>20</option><option value={40}>40</option></select></Setting>
      <Setting label="AI difficulty"><select value={settings.difficulty} onChange={e=>setSettings({...settings,difficulty:e.target.value as Difficulty})} className="field"><option value="learning">Learning</option><option value="casual">Casual</option><option value="challenging">Challenging</option></select></Setting>
      <Toggle label="Commander damage" checked={settings.commanderDamageEnabled} onChange={v=>setSettings({...settings,commanderDamageEnabled:v})}/>
      <Toggle label="Tutor mode" checked={settings.tutorMode} onChange={v=>setSettings({...settings,tutorMode:v})}/>
    </section>
    <div className="mt-5 grid gap-3">{hasSave && <button onClick={()=>router.push('/game')} className="rounded-2xl bg-emerald-400 px-5 py-4 text-base font-black text-zinc-950">CONTINUE GAME</button>}<button onClick={start} className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4 text-base font-black">START NEW GAME</button></div>
    <style jsx>{`.field{min-width:8.5rem;border:1px solid rgba(255,255,255,.12);border-radius:.75rem;background:#191d20;padding:.65rem .8rem;color:#fff}`}</style>
  </main>;
}
function Setting({label,children}:{label:string;children:React.ReactNode}){return <div className="flex items-center justify-between gap-4"><span className="font-semibold">{label}</span>{children}</div>}
function Toggle({label,checked,onChange}:{label:string;checked:boolean;onChange:(v:boolean)=>void}){return <label className="flex items-center justify-between"><span className="font-semibold">{label}</span><input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)} className="h-6 w-6 accent-emerald-400"/></label>}
