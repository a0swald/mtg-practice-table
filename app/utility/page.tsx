'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type CounterKey='poison'|'energy'|'experience'|'storm'|'commanderTax';
type UtilityPlayer={id:string;name:string;life:number;poison:number;energy:number;experience:number;storm:number;commanderTax:number;commanderDamage:Record<string,number>};
type UtilityState={players:UtilityPlayer[];startingLife:number;activePlayerId?:string;monarchId?:string;initiativeId?:string;seconds:number;running:boolean;turn:number;started:boolean};

const STORAGE_KEY='mtg-practice-utility-v1';
const uid=()=>typeof crypto!=='undefined'&&'randomUUID' in crypto?crypto.randomUUID():`${Date.now()}-${Math.random()}`;
function player(name:string,life:number):UtilityPlayer{return{id:uid(),name,life,poison:0,energy:0,experience:0,storm:0,commanderTax:0,commanderDamage:{}}}
function freshState(count:number,life:number):UtilityState{return{players:Array.from({length:count},(_,index)=>player(`Player ${index+1}`,life)),startingLife:life,seconds:0,running:false,turn:1,started:true}}
function formatTime(total:number){const hours=Math.floor(total/3600),minutes=Math.floor((total%3600)/60),seconds=total%60;return hours>0?`${hours}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`:`${minutes}:${String(seconds).padStart(2,'0')}`}

export default function UtilityPage(){
 const router=useRouter();
 const [setupPlayers,setSetupPlayers]=useState(4),[setupLife,setSetupLife]=useState(40),[customLife,setCustomLife]=useState(40);
 const [state,setState]=useState<UtilityState>();
 const [detailId,setDetailId]=useState<string>(),[diceOpen,setDiceOpen]=useState(false),[die,setDie]=useState(20),[diceResult,setDiceResult]=useState<number>(),[coin,setCoin]=useState<'Heads'|'Tails'>();

 useEffect(()=>{try{const raw=localStorage.getItem(STORAGE_KEY);if(raw)setState(JSON.parse(raw) as UtilityState)}catch{/* ignore stale local data */}},[]);
 useEffect(()=>{if(state) localStorage.setItem(STORAGE_KEY,JSON.stringify(state))},[state]);
 useEffect(()=>{if(!state?.running)return;const timer=window.setInterval(()=>setState(current=>current?{...current,seconds:current.seconds+1}:current),1000);return()=>window.clearInterval(timer)},[state?.running]);
 const detailed=state?.players.find(entry=>entry.id===detailId);
 const defeated=useMemo(()=>new Set(state?.players.filter(entry=>entry.life<=0||entry.poison>=10||Object.values(entry.commanderDamage).some(value=>value>=21)).map(entry=>entry.id)??[]),[state]);

 function start(){const life=setupLife===0?Math.max(1,customLife):setupLife;setState(freshState(setupPlayers,life))}
 function patchPlayer(id:string,patch:(entry:UtilityPlayer)=>UtilityPlayer){setState(current=>current?{...current,players:current.players.map(entry=>entry.id===id?patch(entry):entry)}:current)}
 function life(id:string,delta:number){patchPlayer(id,entry=>({...entry,life:entry.life+delta}))}
 function counter(id:string,key:CounterKey,delta:number){patchPlayer(id,entry=>({...entry,[key]:Math.max(0,entry[key]+delta)}))}
 function commanderDamage(targetId:string,sourceId:string,delta:number){patchPlayer(targetId,entry=>({...entry,commanderDamage:{...entry.commanderDamage,[sourceId]:Math.max(0,(entry.commanderDamage[sourceId]??0)+delta)},life:entry.life+delta}))}
 function nextTurn(){setState(current=>{if(!current)return current;const alive=current.players.filter(entry=>!defeated.has(entry.id));if(!alive.length)return current;const currentIndex=Math.max(0,alive.findIndex(entry=>entry.id===current.activePlayerId));const next=alive[(currentIndex+1)%alive.length];return{...current,activePlayerId:next.id,turn:current.turn+1,players:current.players.map(entry=>({...entry,storm:0}))}})}
 function reset(){if(!state)return;setState(freshState(state.players.length,state.startingLife));setDetailId(undefined)}
 function quit(){localStorage.removeItem(STORAGE_KEY);router.push('/')}

 if(!state?.started)return <main className="mx-auto flex min-h-screen w-[94vw] max-w-lg flex-col justify-center py-8">
  <button onClick={()=>router.push('/')} className="mb-5 w-fit rounded-xl bg-white/5 px-3 py-2 text-sm font-bold text-zinc-300">← Main Menu</button>
  <div className="mb-6"><div className="text-xs font-black uppercase tracking-[.24em] text-cyan-300">Table Utility</div><h1 className="mt-1 text-4xl font-black">MTG Table Counter</h1><p className="mt-2 text-sm leading-6 text-zinc-400">A fast, shared-table life counter and Commander utility. No deck, AI, or game-state setup required.</p></div>
  <section className="space-y-4 rounded-3xl border border-white/10 bg-white/[.04] p-5">
   <label className="flex items-center justify-between gap-3 font-bold">Players<select value={setupPlayers} onChange={event=>setSetupPlayers(Number(event.target.value))} className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-2">{Array.from({length:9},(_,index)=>index+2).map(value=><option key={value}>{value}</option>)}</select></label>
   <label className="flex items-center justify-between gap-3 font-bold">Starting life<select value={setupLife} onChange={event=>setSetupLife(Number(event.target.value))} className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-2"><option value={20}>20</option><option value={30}>30</option><option value={40}>40</option><option value={0}>Custom</option></select></label>
   {setupLife===0&&<input type="number" min={1} value={customLife} onChange={event=>setCustomLife(Number(event.target.value)||1)} className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-3"/>}
   <button onClick={start} className="w-full rounded-2xl bg-cyan-300 px-4 py-4 text-base font-black text-zinc-950">START COUNTER</button>
  </section>
 </main>;

 return <main className="min-h-screen bg-[#0b0e10] p-2 sm:p-4">
  <header className="mx-auto mb-2 flex max-w-[1600px] items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/[.035] p-2 sm:p-3">
   <div className="flex items-center gap-2"><button onClick={quit} className="rounded-xl bg-white/5 px-3 py-2 text-xs font-black text-zinc-300">QUIT</button><button onClick={reset} className="rounded-xl bg-white/5 px-3 py-2 text-xs font-black text-zinc-300">RESET</button></div>
   <div className="text-center"><div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-300">Table Utility</div><div className="text-sm font-black">Turn {state.turn} · {formatTime(state.seconds)}</div></div>
   <div className="flex items-center gap-2"><button onClick={()=>setState(current=>current?{...current,running:!current.running}:current)} className="rounded-xl bg-white/5 px-3 py-2 text-xs font-black">{state.running?'PAUSE':'TIMER'}</button><button onClick={()=>setDiceOpen(true)} className="rounded-xl bg-cyan-300 px-3 py-2 text-xs font-black text-zinc-950">DICE</button></div>
  </header>

  <section className="mx-auto grid min-h-[calc(100vh-90px)] max-w-[1600px] gap-2 sm:gap-3" style={{gridTemplateColumns:`repeat(${state.players.length===2?2:state.players.length<=4?2:state.players.length<=6?3:state.players.length<=8?4:5},minmax(0,1fr))`}}>
   {state.players.map(entry=>{const active=state.activePlayerId===entry.id,dead=defeated.has(entry.id);return <article key={entry.id} className={`relative flex min-h-[220px] flex-col overflow-hidden rounded-2xl border p-3 sm:min-h-[270px] sm:p-4 ${dead?'border-red-400/30 bg-red-950/20 opacity-65':active?'border-cyan-300/50 bg-cyan-300/[.06]':'border-white/10 bg-white/[.035]'}`}>
    <div className="flex items-start justify-between gap-2"><input value={entry.name} onChange={event=>patchPlayer(entry.id,current=>({...current,name:event.target.value}))} className="min-w-0 flex-1 bg-transparent text-sm font-black outline-none sm:text-lg"/><button onClick={()=>setDetailId(entry.id)} className="rounded-lg bg-white/5 px-2 py-1 text-xs font-black">•••</button></div>
    <div className="mt-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-wide text-zinc-500">{state.monarchId===entry.id&&<span className="text-amber-300">♛ Monarch</span>}{state.initiativeId===entry.id&&<span className="text-violet-300">◆ Initiative</span>}{dead&&<span className="text-red-300">Defeated</span>}</div>
    <div className="flex flex-1 items-center justify-center py-3"><button onClick={()=>life(entry.id,-1)} className="h-full min-h-24 flex-1 rounded-2xl bg-black/20 text-3xl font-light text-zinc-500">−</button><button onClick={()=>{const value=window.prompt('Set life total',String(entry.life));if(value!==null&&!Number.isNaN(Number(value)))patchPlayer(entry.id,current=>({...current,life:Number(value)}))}} className="min-w-[42%] px-2 text-center text-6xl font-black tabular-nums sm:text-7xl">{entry.life}</button><button onClick={()=>life(entry.id,1)} className="h-full min-h-24 flex-1 rounded-2xl bg-black/20 text-3xl font-light text-zinc-500">+</button></div>
    <div className="grid grid-cols-4 gap-1 text-center text-[10px] font-black sm:gap-2 sm:text-xs"><Mini label="POISON" value={entry.poison} danger={entry.poison>=7}/><Mini label="ENERGY" value={entry.energy}/><Mini label="EXP" value={entry.experience}/><Mini label="TAX" value={entry.commanderTax}/></div>
    <div className="mt-2 grid grid-cols-2 gap-2"><button onClick={()=>life(entry.id,-5)} className="rounded-xl bg-white/5 py-2 text-xs font-black">−5</button><button onClick={()=>life(entry.id,5)} className="rounded-xl bg-white/5 py-2 text-xs font-black">+5</button></div>
   </article>})}
  </section>

  <div className="fixed bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-2 rounded-2xl border border-white/10 bg-[#15191c]/95 p-2 shadow-2xl backdrop-blur"><button onClick={()=>setState(current=>current?{...current,activePlayerId:current.players[0]?.id}:current)} className="rounded-xl bg-white/5 px-3 py-2 text-xs font-black">START TURN</button><button onClick={nextTurn} className="rounded-xl bg-cyan-300 px-4 py-2 text-xs font-black text-zinc-950">NEXT TURN</button></div>

  {detailed&&<div className="fixed inset-0 z-40 flex items-end bg-black/70 sm:items-center sm:justify-center sm:p-5" onClick={()=>setDetailId(undefined)}><section onClick={event=>event.stopPropagation()} className="max-h-[90vh] w-full overflow-y-auto rounded-t-3xl border border-white/10 bg-[#181c1f] p-4 sm:max-w-2xl sm:rounded-3xl sm:p-5"><div className="flex items-center justify-between"><div><div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-300">Player Utility</div><h2 className="text-2xl font-black">{detailed.name}</h2></div><button onClick={()=>setDetailId(undefined)} className="rounded-xl bg-white/5 px-3 py-2 font-black">✕</button></div>
   <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3"><CounterControl label="Poison" value={detailed.poison} onMinus={()=>counter(detailed.id,'poison',-1)} onPlus={()=>counter(detailed.id,'poison',1)}/><CounterControl label="Energy" value={detailed.energy} onMinus={()=>counter(detailed.id,'energy',-1)} onPlus={()=>counter(detailed.id,'energy',1)}/><CounterControl label="Experience" value={detailed.experience} onMinus={()=>counter(detailed.id,'experience',-1)} onPlus={()=>counter(detailed.id,'experience',1)}/><CounterControl label="Storm" value={detailed.storm} onMinus={()=>counter(detailed.id,'storm',-1)} onPlus={()=>counter(detailed.id,'storm',1)}/><CounterControl label="Commander Tax" value={detailed.commanderTax} onMinus={()=>counter(detailed.id,'commanderTax',-2)} onPlus={()=>counter(detailed.id,'commanderTax',2)}/></div>
   <div className="mt-4"><div className="mb-2 text-xs font-black uppercase tracking-[.16em] text-zinc-500">Commander damage received</div><div className="space-y-2">{state.players.filter(source=>source.id!==detailed.id).map(source=><div key={source.id} className="flex items-center justify-between rounded-xl bg-black/20 p-3"><span className="font-bold">{source.name}</span><div className="flex items-center gap-2"><button onClick={()=>commanderDamage(detailed.id,source.id,1)} className="rounded-lg bg-red-400/15 px-3 py-2 text-xs font-black text-red-200">+1 DMG</button><button onClick={()=>commanderDamage(detailed.id,source.id,-1)} className="rounded-lg bg-white/5 px-3 py-2 text-xs font-black">UNDO</button><span className="w-12 text-right text-lg font-black">{detailed.commanderDamage[source.id]??0}/21</span></div></div>)}</div></div>
   <div className="mt-4 grid grid-cols-2 gap-2"><button onClick={()=>setState(current=>current?{...current,monarchId:current.monarchId===detailed.id?undefined:detailed.id}:current)} className={`rounded-xl px-3 py-3 text-sm font-black ${state.monarchId===detailed.id?'bg-amber-300 text-zinc-950':'bg-white/5'}`}>♛ MONARCH</button><button onClick={()=>setState(current=>current?{...current,initiativeId:current.initiativeId===detailed.id?undefined:detailed.id}:current)} className={`rounded-xl px-3 py-3 text-sm font-black ${state.initiativeId===detailed.id?'bg-violet-300 text-zinc-950':'bg-white/5'}`}>◆ INITIATIVE</button></div>
  </section></div>}

  {diceOpen&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" onClick={()=>setDiceOpen(false)}><section onClick={event=>event.stopPropagation()} className="w-full max-w-md rounded-3xl border border-white/10 bg-[#181c1f] p-5"><div className="flex items-center justify-between"><h2 className="text-xl font-black">Dice & Coin</h2><button onClick={()=>setDiceOpen(false)} className="rounded-xl bg-white/5 px-3 py-2 font-black">✕</button></div><div className="mt-4 flex gap-2">{[4,6,8,10,12,20].map(value=><button key={value} onClick={()=>setDie(value)} className={`flex-1 rounded-lg py-2 text-xs font-black ${die===value?'bg-cyan-300 text-zinc-950':'bg-white/5'}`}>D{value}</button>)}</div><button onClick={()=>{setDiceResult(1+Math.floor(Math.random()*die));setCoin(undefined)}} className="mt-3 w-full rounded-2xl bg-cyan-300 py-4 text-lg font-black text-zinc-950">ROLL D{die}</button>{diceResult!==undefined&&<div className="py-5 text-center text-7xl font-black">{diceResult}</div>}<button onClick={()=>{setCoin(Math.random()<.5?'Heads':'Tails');setDiceResult(undefined)}} className="w-full rounded-2xl bg-white/10 py-4 font-black">FLIP COIN</button>{coin&&<div className="py-5 text-center text-4xl font-black">{coin}</div>}</section></div>}
 </main>
}

function Mini({label,value,danger=false}:{label:string;value:number;danger?:boolean}){return <div className={`rounded-lg bg-black/20 p-1.5 ${danger?'text-red-300':'text-zinc-400'}`}><div>{label}</div><div className="mt-0.5 text-sm font-black text-zinc-100">{value}</div></div>}
function CounterControl({label,value,onMinus,onPlus}:{label:string;value:number;onMinus:()=>void;onPlus:()=>void}){return <div className="rounded-xl bg-black/20 p-3"><div className="text-center text-xs font-black uppercase tracking-wide text-zinc-500">{label}</div><div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2"><button onClick={onMinus} className="rounded-lg bg-white/5 py-2 font-black">−</button><span className="min-w-8 text-center text-xl font-black">{value}</span><button onClick={onPlus} className="rounded-lg bg-white/5 py-2 font-black">+</button></div></div>}
