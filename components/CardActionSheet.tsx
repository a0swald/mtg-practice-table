'use client';
import type { CardInstance } from '@/types/card';

export function CardActionSheet({card,onUpdate,onMove,onClose}:{card?:CardInstance;onUpdate:(patch:Partial<CardInstance>,log:string)=>void;onMove:(zone:'hand'|'graveyard'|'exile')=>void;onClose:()=>void}){
 if(!card)return null;
 const actions=[
  [card.tapped?'Untap':'Tap',()=>onUpdate({tapped:!card.tapped},`${card.tapped?'Untapped':'Tapped'} ${card.name}.`)],
  ['+1/+1',()=>onUpdate({plusOneCounters:card.plusOneCounters+1},`Added +1/+1 counter to ${card.name}.`)],
  ['Remove +1/+1',()=>onUpdate({plusOneCounters:Math.max(0,card.plusOneCounters-1)},`Removed +1/+1 counter from ${card.name}.`)],
  ['+1/+0',()=>onUpdate({temporaryPowerModifier:card.temporaryPowerModifier+1},`${card.name} gets +1/+0 until end of turn.`)],
  ['-1/+0',()=>onUpdate({temporaryPowerModifier:card.temporaryPowerModifier-1},`${card.name} gets -1/+0 until end of turn.`)],
  ['Add Damage',()=>onUpdate({damageMarked:card.damageMarked+1},`Marked 1 damage on ${card.name}.`)],
  ['Remove Damage',()=>onUpdate({damageMarked:Math.max(0,card.damageMarked-1)},`Removed 1 damage from ${card.name}.`)],
 ] as const;
 return <div className="fixed inset-0 z-50 flex items-end bg-black/70 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6" onClick={onClose}><div onClick={event=>event.stopPropagation()} className="safe-bottom max-h-[94vh] w-full overflow-y-auto rounded-t-3xl border border-white/10 bg-[#181b1e] p-4 shadow-2xl sm:max-w-3xl sm:rounded-3xl sm:p-5"><div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-white/20 sm:hidden"/><div className="mb-4 text-center"><h3 className="text-lg font-black text-zinc-50">{card.name}</h3>{card.definition?.typeLine&&<div className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-500">{card.definition.typeLine}</div>}</div>{card.definition?.imageUrl&&<div className="mb-5 flex justify-center"><img src={card.definition.imageUrl} alt={card.name} className="max-h-[48vh] w-auto max-w-[72vw] rounded-[4.5%] object-contain shadow-2xl sm:max-h-[52vh] sm:max-w-[300px]"/></div>}<div className="grid grid-cols-2 gap-2">{actions.map(([label,fn])=><button key={label} onClick={fn} className="rounded-xl bg-white/10 px-3 py-3 text-sm font-bold">{label}</button>)}<button onClick={()=>onMove('hand')} className="rounded-xl bg-sky-500/15 px-3 py-3 text-sm font-bold text-sky-200">Return to Hand</button><button onClick={()=>onMove('graveyard')} className="rounded-xl bg-red-500/15 px-3 py-3 text-sm font-bold text-red-200">Move to Graveyard</button><button onClick={()=>onMove('exile')} className="rounded-xl bg-violet-500/15 px-3 py-3 text-sm font-bold text-violet-200">Exile</button></div><button onClick={onClose} className="mt-3 w-full rounded-xl border border-white/10 py-3 font-bold">Close</button></div></div>
}
