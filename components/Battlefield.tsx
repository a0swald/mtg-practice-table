import type { CardInstance } from '@/types/card';
import { CardVisual } from './CardVisual';
export function Battlefield({cards,onCard,selectedIds=[]}:{cards:CardInstance[];onCard?:(card:CardInstance)=>void;selectedIds?:string[]}){
 return <div className="scrollbar-none flex min-h-40 gap-3 overflow-x-auto px-1 py-4">{cards.length===0?<div className="flex w-full items-center justify-center rounded-2xl border border-dashed border-white/10 text-sm text-zinc-500">No permanents</div>:cards.map(c=><CardVisual key={c.instanceId} card={c} selected={selectedIds.includes(c.instanceId)} onClick={()=>onCard?.(c)}/>)}</div>
}
