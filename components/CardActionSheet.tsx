'use client';
import type { CardInstance } from '@/types/card';
export function CardActionSheet({card,onUpdate,onMove,onClose}:{card?:CardInstance;onUpdate:(patch:Partial<CardInstance>,log:string)=>void;onMove:(zone:'graveyard'|'exile')=>void;onClose:()=>void}){
 if(!card)return null;
 const actions=[
  [card.tapped?'Untap':'Tap',()=>onUpdate({tapped:!card.tapped},`${card.tapped?'Untapped':'Tapped'} ${card.name}.`)],
  ['+1/+1',()=>onUpdate({plusOneCounters:card.plusOneCounters+1},`Added +1/+1 counter to ${card.name}.`)],
  ['Remove +1/+1',()=>onUpdate({plusOneCounters:Math.max(0,card.plusOneCounters-1)},`Removed +1/+1 counter from ${card.name}.`)],
  ['Add Damage',()=>onUpdate({damageMarked:card.damageMarked+1},`Marked 1 damage on ${card.name}.`)],
  ['Remove Damage',()=>onUpdate({damageMarked:Math.max(0,card.damageMarked-1)},`Removed 1 damage from ${card.name}.`)],
 ] as const;
 return <div className="fixed inset-0 z-50 flex items-end bg-black/60" onClick={onClose}><div onClick={e=>e.stopPropagation()} className="safe-bottom w-full rounded-t-3xl border-t border-white/10 bg-[#181b1e] p-4"><div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-white/20"/><h3 className="mb-3 text-lg font-black">{card.name}</h3><div className="grid grid-cols-2 gap-2">{actions.map(([label,fn])=><button key={label} onClick={fn} className="rounded-xl bg-white/10 px-3 py-3 text-sm font-bold">{label}</button>)}<button onClick={()=>onMove('graveyard')} className="rounded-xl bg-red-500/15 px-3 py-3 text-sm font-bold text-red-200">Move to Graveyard</button><button onClick={()=>onMove('exile')} className="rounded-xl bg-violet-500/15 px-3 py-3 text-sm font-bold text-violet-200">Exile</button></div><button onClick={onClose} className="mt-3 w-full rounded-xl border border-white/10 py-3 font-bold">Close</button></div></div>
}
