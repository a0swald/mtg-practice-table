'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CardDefinition, CardInstance } from '@/types/card';
import type { GameState } from '@/types/game';
import { loadGame, saveGame } from '@/lib/storage/gameStorage';
import { createCardInstance, createToken, newGame } from '@/lib/game/utils';
import { reduceGame, type GameAction } from '@/lib/game/reducer';
import { Battlefield } from './Battlefield';
import { PlayerHeader } from './PlayerHeader';
import { CardActionSheet } from './CardActionSheet';
import { CardSearch } from './CardSearch';
import { TokenCreator } from './TokenCreator';
import { ManualCardCreator } from './ManualCardCreator';
import { GameLog } from './GameLog';
import { CombatPanel } from './CombatPanel';
import { TurnControls } from './TurnControls';

const fallbackSettings = { aiOpponents: 1 as const, startingLife: 20, difficulty: 'learning' as const, commanderDamageEnabled: true, tutorMode: true, simplifiedTurns: true };

export function GameClient() {
 const router=useRouter();
 const [game,setGame]=useState<GameState|null>(null); const [past,setPast]=useState<GameState[]>([]); const [future,setFuture]=useState<GameState[]>([]);
 const [selected,setSelected]=useState<CardInstance>(); const [searchOpen,setSearchOpen]=useState(false); const [tokenOpen,setTokenOpen]=useState(false); const [manualOpen,setManualOpen]=useState(false); const [attackMode,setAttackMode]=useState(false); const [attackers,setAttackers]=useState<string[]>([]);
 useEffect(()=>{setGame(loadGame()??newGame(fallbackSettings))},[]);
 useEffect(()=>{if(game)saveGame(game)},[game]);
 const dispatch=(action:GameAction)=>{setGame(current=>{if(!current)return current;setPast(h=>[...h.slice(-39),current]);setFuture([]);return reduceGame(current,action)});};
 const undo=()=>{if(!game||past.length===0)return;const prev=past[past.length-1];setFuture(f=>[game,...f]);setPast(p=>p.slice(0,-1));setGame(prev)};
 const redo=()=>{if(!game||future.length===0)return;const next=future[0];setPast(p=>[...p,game]);setFuture(f=>f.slice(1));setGame(next)};
 const human=game?.players.find(p=>p.id==='player'); const ai=game?.players.find(p=>p.isAI);
 const eligible=useMemo(()=>human?.battlefield.filter(c=>c.basePower!==undefined&&!c.tapped&&!c.summoningSick)??[],[human]);
 if(!game||!human||!ai)return <div className="flex min-h-screen items-center justify-center text-zinc-400">Loading game…</div>;
 const cardTap=(card:CardInstance)=>{if(attackMode&&eligible.some(c=>c.instanceId===card.instanceId)){setAttackers(a=>a.includes(card.instanceId)?a.filter(id=>id!==card.instanceId):[...a,card.instanceId]);return;}setSelected(card)};
 const addDefinition=(definition:CardDefinition)=>dispatch({type:'ADD_CARD',playerId:'player',card:createCardInstance(definition,'player','battlefield')});
 const addManual=(name:string,p?:number,t?:number)=>dispatch({type:'ADD_CARD',playerId:'player',card:createToken('player',name,p,t)});
 const resolvePlayerDamage=()=>{if(!game.pendingCombat||game.pendingCombat.source!=='player')return;dispatch({type:'LIFE',playerId:game.pendingCombat.defenderId,delta:-game.pendingCombat.totalPower});dispatch({type:'SET_COMBAT',combat:undefined});setAttackMode(false);setAttackers([])};
 const blockAI=()=>{dispatch({type:'LOG',actor:'You',message:'Declared blockers; combat damage handled manually.'});dispatch({type:'SET_COMBAT',combat:undefined});};
 return <main className="mx-auto min-h-screen w-[94vw] max-w-[1680px] pb-5 pt-3 sm:w-[92vw]">
  <header className="flex items-center justify-between py-2"><button onClick={()=>router.push('/')} className="rounded-xl px-2 py-2 text-sm font-bold text-zinc-400">← Home</button><div className="text-center"><div className="text-sm font-black">MTG Practice Table</div><div className="text-[10px] uppercase tracking-widest text-zinc-500">{game.settings.difficulty} AI</div></div><div className="flex gap-1"><button onClick={undo} disabled={!past.length} className="rounded-lg bg-white/5 px-2 py-2 text-xs disabled:opacity-30">Undo</button><button onClick={redo} disabled={!future.length} className="rounded-lg bg-white/5 px-2 py-2 text-xs disabled:opacity-30">Redo</button></div></header>

  <div className="grid gap-3 xl:grid-cols-[minmax(0,1.65fr)_minmax(360px,0.85fr)] xl:items-start xl:gap-4 2xl:grid-cols-[minmax(0,1.8fr)_minmax(400px,0.8fr)]">
   <div className="min-w-0 space-y-3">
    <section className="rounded-2xl border border-white/10 bg-white/[.035] p-3"><PlayerHeader name={ai.name} life={ai.life} onLife={d=>dispatch({type:'LIFE',playerId:ai.id,delta:d})} meta={`${ai.handCount} hand · ${ai.graveyard.length} grave · ${ai.exile.length} exile`}/><Battlefield cards={ai.battlefield}/></section>

    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2"><div><div className="text-xs font-black uppercase tracking-widest text-zinc-500">Turn {game.turnNumber}</div><div className="font-black">{game.activePlayerId==='player'?'Your turn':`${ai.name}'s turn`}</div></div><div className="text-right"><div className="text-xs text-zinc-500">Spells this turn</div><div className="text-xl font-black">{game.spellsCastThisTurn}</div></div></div>

    <section className="rounded-2xl border border-white/10 bg-white/[.05] p-3 shadow-2xl"><PlayerHeader name="My Battlefield" life={human.life} onLife={d=>dispatch({type:'LIFE',playerId:'player',delta:d})} meta={`${human.graveyard.length} grave · ${human.exile.length} exile`}/><Battlefield cards={human.battlefield} onCard={cardTap} selectedIds={attackers}/>
     {game.settings.tutorMode&&attackMode&&<p className="mb-3 rounded-xl bg-sky-400/10 p-3 text-xs leading-5 text-sky-100">Select untapped creatures without summoning sickness. The app totals visible power, but you still decide attacks and resolve card-specific effects.</p>}
     <div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><Action onClick={()=>setSearchOpen(true)}>＋ PLAY CARD</Action><Action onClick={()=>setTokenOpen(true)}>＋ TOKEN</Action><Action onClick={()=>setManualOpen(true)}>＋ MANUAL</Action><Action onClick={()=>{setAttackMode(v=>!v);setAttackers([])}}>{attackMode?'CANCEL ATTACK':'⚔ COMBAT'}</Action></div>
     {attackMode&&<button disabled={!attackers.length||Boolean(game.pendingCombat)} onClick={()=>dispatch({type:'PLAYER_ATTACK',attackerIds:attackers,defenderId:ai.id})} className="mt-2 w-full rounded-xl bg-red-500 py-3 font-black disabled:opacity-40">ATTACK WITH {attackers.length || 0}</button>}
    </section>

    <TurnControls turn={game.turnNumber} active={game.activePlayerId==='player'?'You':ai.name} onPass={()=>dispatch({type:'PASS_TURN'})}/>
   </div>

   <aside className="min-w-0 xl:sticky xl:top-3">
    <div className="space-y-3">
     <GameLog entries={game.log}/>
     <CombatPanel combat={game.pendingCombat} playerCards={human.battlefield} onTake={n=>dispatch({type:'RESOLVE_AI_DAMAGE',amount:n})} onBlock={blockAI} onResolvePlayer={resolvePlayerDamage} onCancel={()=>dispatch({type:'SET_COMBAT',combat:undefined})}/>
    </div>
   </aside>
  </div>

  <CardSearch open={searchOpen} onClose={()=>setSearchOpen(false)} onChoose={addDefinition}/><TokenCreator open={tokenOpen} onClose={()=>setTokenOpen(false)} onAdd={addManual}/><ManualCardCreator open={manualOpen} onClose={()=>setManualOpen(false)} onAdd={addManual}/>
  <CardActionSheet card={selected} onClose={()=>setSelected(undefined)} onUpdate={(patch,log)=>{if(selected)dispatch({type:'UPDATE_CARD',playerId:'player',instanceId:selected.instanceId,patch,log});setSelected(undefined)}} onMove={zone=>{if(selected)dispatch({type:'MOVE_CARD',playerId:'player',instanceId:selected.instanceId,zone});setSelected(undefined)}}/>
 </main>;
}
function Action({children,onClick}:{children:React.ReactNode;onClick:()=>void}){return <button onClick={onClick} className="min-h-12 rounded-xl border border-white/10 bg-white/10 px-3 py-3 text-xs font-black">{children}</button>}
