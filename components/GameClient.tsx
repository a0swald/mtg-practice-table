'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CardDefinition, CardInstance } from '@/types/card';
import type { GameState, PendingAIAction } from '@/types/game';
import { loadGame, saveGame } from '@/lib/storage/gameStorage';
import { createCardInstance, createToken, currentStats, newGame } from '@/lib/game/utils';
import { reduceGame, type BlockAssignment, type GameAction } from '@/lib/game/reducer';
import { Battlefield } from './Battlefield';
import { PlayerHeader } from './PlayerHeader';
import { CardActionSheet } from './CardActionSheet';
import { CardSearch } from './CardSearch';
import { TokenCreator } from './TokenCreator';
import { ManualCardCreator } from './ManualCardCreator';
import { GameLog } from './GameLog';
import { CombatPanel } from './CombatPanel';
import { TurnControls } from './TurnControls';
import { SpellResolver } from './SpellResolver';

const fallbackSettings = { aiOpponents: 1 as const, startingLife: 20, difficulty: 'learning' as const, commanderDamageEnabled: true, tutorMode: true, simplifiedTurns: true };

export function GameClient() {
 const router=useRouter();
 const [game,setGame]=useState<GameState|null>(null); const [past,setPast]=useState<GameState[]>([]); const [future,setFuture]=useState<GameState[]>([]);
 const [selected,setSelected]=useState<CardInstance>(); const [searchOpen,setSearchOpen]=useState(false); const [tokenOpen,setTokenOpen]=useState(false); const [manualOpen,setManualOpen]=useState(false); const [attackMode,setAttackMode]=useState(false); const [attackers,setAttackers]=useState<string[]>([]); const [resolvingSpell,setResolvingSpell]=useState<CardDefinition>();
 useEffect(()=>{setGame(loadGame()??newGame(fallbackSettings))},[]);
 useEffect(()=>{if(game)saveGame(game)},[game]);
 const dispatch=(action:GameAction)=>{setGame(current=>{if(!current)return current;setPast(h=>[...h.slice(-39),current]);setFuture([]);return reduceGame(current,action)});};
 const undo=()=>{if(!game||past.length===0)return;const prev=past[past.length-1];setFuture(f=>[game,...f]);setPast(p=>p.slice(0,-1));setGame(prev)};
 const redo=()=>{if(!game||future.length===0)return;const next=future[0];setPast(p=>[...p,game]);setFuture(f=>f.slice(1));setGame(next)};
 const human=game?.players.find(p=>p.id==='player'); const ai=game?.players.find(p=>p.isAI);
 const eligible=useMemo(()=>human?.battlefield.filter(c=>c.basePower!==undefined&&!c.tapped&&!c.summoningSick)??[],[human]);
 const combatUnavailableIds=useMemo(()=>human?.battlefield.filter(c=>c.basePower!==undefined&&(c.tapped||c.summoningSick)).map(c=>c.instanceId)??[],[human]);
 if(!game||!human||!ai)return <div className="flex min-h-screen items-center justify-center text-zinc-400">Loading game…</div>;
 const isPlayerTurn=game.activePlayerId==='player';
 const incomingAttackers=game.pendingCombat?.source==='ai'
  ? ai.battlefield.filter(card=>game.pendingCombat?.attackerInstanceIds.includes(card.instanceId))
  : [];
 const cardTap=(card:CardInstance)=>{if(attackMode){if(eligible.some(c=>c.instanceId===card.instanceId)){setAttackers(a=>a.includes(card.instanceId)?a.filter(id=>id!==card.instanceId):[...a,card.instanceId]);}return;}setSelected(card)};
 const addDefinition=(definition:CardDefinition)=>{
  const type=definition.typeLine.toLowerCase();
  if(type.includes('instant')||type.includes('sorcery')){setResolvingSpell(definition);return;}
  dispatch({type:'ADD_CARD',playerId:'player',card:createCardInstance(definition,'player','battlefield')});
 };
 const addManual=(name:string,p?:number,t?:number)=>dispatch({type:'ADD_CARD',playerId:'player',card:createToken('player',name,p,t)});
 const resolvePlayerDamage=()=>{if(!game.pendingCombat||game.pendingCombat.source!=='player')return;dispatch({type:'LIFE',playerId:game.pendingCombat.defenderId,delta:-game.pendingCombat.totalPower});dispatch({type:'SET_COMBAT',combat:undefined});setAttackMode(false);setAttackers([])};
 const beginBlock=()=>dispatch({type:'LOG',actor:'You',message:'Assigning blockers for incoming combat.'});
 const resolveBlocks=(assignments:BlockAssignment[])=>dispatch({type:'RESOLVE_BLOCKS',assignments});
 const damageOpponentCard=(card:CardInstance,amount:number)=>{
  const next=card.damageMarked+amount;
  dispatch({type:'UPDATE_CARD',playerId:ai.id,instanceId:card.instanceId,patch:{damageMarked:next},log:`${resolvingSpell?.name ?? 'Spell'} dealt ${amount} damage to ${card.name}.`});
  const stats=currentStats(card);
  if(stats&&next>=stats.toughness)dispatch({type:'MOVE_CARD',playerId:ai.id,instanceId:card.instanceId,zone:'graveyard'});
 };
 const finishSpell=()=>{
  if(!resolvingSpell)return;
  dispatch({type:'CAST_PLAYER_SPELL',card:createCardInstance(resolvingSpell,'player','graveyard')});
  setResolvingSpell(undefined);
 };
 return <main className="mx-auto min-h-screen w-[94vw] max-w-[1680px] pb-5 pt-3 sm:w-[92vw]">
  <header className="flex items-center justify-between py-2"><button onClick={()=>router.push('/')} className="rounded-xl px-2 py-2 text-sm font-bold text-zinc-400">← Home</button><div className="text-center"><div className="text-sm font-black">MTG Practice Table</div><div className="text-[10px] uppercase tracking-widest text-zinc-500">{game.settings.difficulty} AI</div></div><div className="flex gap-1"><button onClick={undo} disabled={!past.length} className="rounded-lg bg-white/5 px-2 py-2 text-xs disabled:opacity-30">Undo</button><button onClick={redo} disabled={!future.length} className="rounded-lg bg-white/5 px-2 py-2 text-xs disabled:opacity-30">Redo</button></div></header>

  <div className="grid gap-3 xl:grid-cols-[minmax(0,1.65fr)_minmax(360px,0.85fr)] xl:items-stretch xl:gap-4 2xl:grid-cols-[minmax(0,1.8fr)_minmax(400px,0.8fr)]">
   <div className="min-w-0 space-y-3">
    <section className="rounded-2xl border border-white/10 bg-white/[.035] p-3"><PlayerHeader name={ai.name} life={ai.life} onLife={d=>dispatch({type:'LIFE',playerId:ai.id,delta:d})} meta={`${ai.handCount} hand · ${ai.graveyard.length} grave · ${ai.exile.length} exile`}/><Battlefield cards={ai.battlefield}/></section>

    <div className={`grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border px-3 py-2.5 transition sm:px-4 ${isPlayerTurn?'border-emerald-400/30 bg-emerald-400/[.06]':'border-amber-400/30 bg-amber-400/[.05]'}`}>
      <div><div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Turn</div><div className="text-lg font-black leading-none text-zinc-100">{game.turnNumber}</div></div>
      <div className="flex items-center justify-center gap-2 text-center"><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${isPlayerTurn?'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.65)]':'bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,.55)]'}`}/><span className="text-sm font-black uppercase tracking-wide sm:text-base">{isPlayerTurn?'Your Turn':`${ai.name}'s Turn`}</span></div>
      <div className="text-right"><div className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500">Spells</div><div className="text-lg font-black leading-none text-zinc-100">{game.spellsCastThisTurn}</div></div>
    </div>

    <section className="rounded-2xl border border-white/10 bg-white/[.05] p-3 shadow-2xl"><PlayerHeader name="My Battlefield" life={human.life} onLife={d=>dispatch({type:'LIFE',playerId:'player',delta:d})} meta={`${human.graveyard.length} grave · ${human.exile.length} exile`}/><Battlefield cards={human.battlefield} onCard={cardTap} selectedIds={attackers} combatMode={attackMode} combatUnavailableIds={combatUnavailableIds}/>
     {game.settings.tutorMode&&attackMode&&<p className="mb-3 rounded-xl bg-sky-400/10 p-3 text-xs leading-5 text-sky-100">Select untapped creatures without summoning sickness. Creatures that cannot attack this turn are dimmed and unavailable.</p>}
     <div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><Action onClick={()=>setSearchOpen(true)}>＋ PLAY CARD</Action><Action onClick={()=>setTokenOpen(true)}>＋ TOKEN</Action><Action onClick={()=>setManualOpen(true)}>＋ MANUAL</Action><Action onClick={()=>{if(!isPlayerTurn)return;setAttackMode(v=>!v);setAttackers([])}} disabled={!isPlayerTurn}>{attackMode?'CANCEL ATTACK':'⚔ COMBAT'}</Action></div>
     {attackMode&&<button disabled={!attackers.length||Boolean(game.pendingCombat)} onClick={()=>dispatch({type:'PLAYER_ATTACK',attackerIds:attackers,defenderId:ai.id})} className="mt-2 w-full rounded-xl bg-red-500 py-3 font-black disabled:opacity-40">ATTACK WITH {attackers.length || 0}</button>}
    </section>

    {isPlayerTurn ? <TurnControls onPass={()=>dispatch({type:'PASS_TURN'})}/> : <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[.04] px-4 py-3 text-center text-sm font-bold text-amber-100/80">{game.pendingAIAction?'Opponent cast a spell. Resolve or counter it to continue.':game.pendingCombat?'Opponent is attacking. Resolve combat to continue.':'Opponent is taking their turn.'}</div>}
    <QuickReference active={isPlayerTurn}/>
   </div>

   <aside className="min-w-0 xl:h-full xl:self-stretch"><div className="flex h-full min-h-0 flex-col gap-3 xl:sticky xl:top-3">
     <SpellResolver
      spell={resolvingSpell}
      opponentName={ai.name}
      opponentLife={ai.life}
      opponentCards={ai.battlefield}
      onDamageOpponent={amount=>dispatch({type:'LIFE',playerId:ai.id,delta:-amount})}
      onDamageCard={damageOpponentCard}
      onDestroyCard={card=>dispatch({type:'MOVE_CARD',playerId:ai.id,instanceId:card.instanceId,zone:'graveyard'})}
      onExileCard={card=>dispatch({type:'MOVE_CARD',playerId:ai.id,instanceId:card.instanceId,zone:'exile'})}
      onFinish={finishSpell}
      onCancel={()=>setResolvingSpell(undefined)}
     />
     {game.pendingAIAction&&<AIActionPanel action={game.pendingAIAction} onResolve={()=>dispatch({type:'RESOLVE_AI_ACTION'})} onCounter={()=>dispatch({type:'COUNTER_AI_ACTION'})}/>} 
     <div className="shrink-0">
      <CombatPanel combat={game.pendingCombat} playerCards={human.battlefield} attackerCards={incomingAttackers} onTake={n=>dispatch({type:'RESOLVE_AI_DAMAGE',amount:n})} onBeginBlock={beginBlock} onResolveBlocks={resolveBlocks} onResolvePlayer={resolvePlayerDamage} onCancel={()=>dispatch({type:'SET_COMBAT',combat:undefined})}/>
     </div>
     <GameLog entries={game.log}/>
   </div></aside>
  </div>

  <CardSearch open={searchOpen} onClose={()=>setSearchOpen(false)} onChoose={addDefinition}/><TokenCreator open={tokenOpen} onClose={()=>setTokenOpen(false)} onAdd={addManual}/><ManualCardCreator open={manualOpen} onClose={()=>setManualOpen(false)} onAdd={addManual}/>
  <CardActionSheet card={selected} onClose={()=>setSelected(undefined)} onUpdate={(patch,log)=>{if(selected)dispatch({type:'UPDATE_CARD',playerId:'player',instanceId:selected.instanceId,patch,log});setSelected(undefined)}} onMove={zone=>{if(selected)dispatch({type:'MOVE_CARD',playerId:'player',instanceId:selected.instanceId,zone});setSelected(undefined)}}/>
 </main>;
}

function AIActionPanel({action,onResolve,onCounter}:{action:PendingAIAction;onResolve:()=>void;onCounter:()=>void}){
 const detail=action.kind==='creature'
  ? `${action.power ?? 0}/${action.toughness ?? 0}${action.flying?' · Flying':''}`
  : action.kind==='removal'
   ? `Target: ${action.targetName ?? 'your creature'}`
   : action.kind==='draw'
    ? `Draw ${action.amount ?? 2} cards`
    : `Mana artifact · +${action.amount ?? 1} mana`;

 const explanation=action.kind==='creature'
  ? `${action.cardName} is a generic AI creature. If it resolves, it enters the opponent's battlefield as a ${action.power ?? 0}/${action.toughness ?? 0}${action.flying?' creature with Flying':''}. It cannot attack this turn because it has summoning sickness.`
  : action.kind==='removal'
   ? `${action.cardName} is a generic AI removal spell. If it resolves, ${action.targetName ?? 'the targeted creature'} is destroyed and moved from your battlefield to your graveyard.`
   : action.kind==='draw'
    ? `${action.cardName} is a generic AI card-draw spell. If it resolves, the opponent draws ${action.amount ?? 2} cards, increasing the number of options in its hidden hand.`
    : `${action.cardName} is a generic AI ramp artifact. If it resolves, it stays on the opponent's battlefield and gives the AI ${action.amount ?? 1} additional mana on future turns.`;

 return <section className="shrink-0 rounded-2xl border border-sky-400/35 bg-sky-400/[.08] p-4 shadow-lg shadow-sky-950/20">
  <div className="flex items-start justify-between gap-3">
   <div>
    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-300">Opponent action — response required</div>
    <div className="mt-1 text-xl font-black text-zinc-50">{action.cardName}</div>
    <div className="mt-1 text-sm font-bold text-zinc-300">{detail}</div>
   </div>
   <span className="shrink-0 rounded-full border border-sky-300/20 bg-sky-300/10 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-sky-200">Generic AI card</span>
  </div>

  <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
   <div className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">What this means</div>
   <p className="mt-1 text-sm leading-5 text-zinc-200">{explanation}</p>
  </div>

  <div className="mt-3 grid gap-2 text-xs leading-5 text-zinc-400 sm:grid-cols-2">
   <div className="rounded-lg bg-emerald-400/[.07] px-3 py-2"><span className="font-black text-emerald-300">Resolve:</span> let the spell happen as described above.</div>
   <div className="rounded-lg bg-sky-400/[.07] px-3 py-2"><span className="font-black text-sky-300">Counter:</span> the spell does not resolve and its effect does not happen.</div>
  </div>

  <p className="mt-3 text-xs leading-5 text-zinc-500">The opponent has already cast the spell and paid its cost. The game is paused here so you can decide whether to respond.</p>
  <div className="mt-3 grid grid-cols-2 gap-2">
   <button onClick={onResolve} className="rounded-xl bg-emerald-400 px-3 py-3 font-black text-zinc-950">RESOLVE</button>
   <button onClick={onCounter} className="rounded-xl border border-sky-300/30 bg-white/10 px-3 py-3 font-black text-zinc-100">COUNTER</button>
  </div>
 </section>
}

function QuickReference({active}:{active:boolean}){
 return <section className={`rounded-2xl border p-4 ${active?'border-emerald-400/25 bg-emerald-400/[.05]':'border-white/10 bg-black/20 opacity-70'}`}>
  <div className="mb-3 flex items-center justify-between"><div><div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Quick Reference</div><h3 className="text-sm font-black uppercase tracking-wide text-zinc-100">On Your Turn</h3></div><span className={`h-2.5 w-2.5 rounded-full ${active?'bg-emerald-400':'bg-zinc-600'}`}/></div>
  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs leading-5 text-zinc-300 sm:grid-cols-5"><div><span className="font-black text-zinc-100">1. Begin</span><br/>Untap, upkeep, draw.</div><div><span className="font-black text-zinc-100">2. Main</span><br/>Play a land; cast spells.</div><div><span className="font-black text-zinc-100">3. Combat</span><br/>Declare attacks and resolve blocks.</div><div><span className="font-black text-zinc-100">4. Main 2</span><br/>Play a land if unused; cast spells.</div><div><span className="font-black text-zinc-100">5. End</span><br/>Cleanup, then pass turn.</div></div>
 </section>
}

function Action({children,onClick,disabled=false}:{children:React.ReactNode;onClick:()=>void;disabled?:boolean}){return <button onClick={onClick} disabled={disabled} className="min-h-12 rounded-xl border border-white/10 bg-white/10 px-3 py-3 text-xs font-black disabled:cursor-not-allowed disabled:opacity-35">{children}</button>}
