'use client';

import type { CardInstance } from '@/types/card';

export function VirtualHand({
  cards,
  libraryCount,
  landPlayed,
  onPlay,
  onView,
}: {
  cards: CardInstance[];
  libraryCount: number;
  landPlayed: boolean;
  onPlay: (card: CardInstance) => void;
  onView: (card: CardInstance) => void;
}) {
  return <section className="rounded-2xl border border-violet-400/20 bg-violet-400/[.045] p-3">
    <div className="mb-3 flex items-center justify-between gap-3">
      <div><div className="text-[10px] font-black uppercase tracking-[.18em] text-violet-300">Virtual Hand</div><div className="text-sm font-black">{cards.length} cards · {libraryCount} library</div></div>
      <div className={`rounded-lg px-2 py-1 text-[10px] font-black uppercase ${landPlayed?'bg-amber-400/10 text-amber-200':'bg-emerald-400/10 text-emerald-200'}`}>{landPlayed?'Land played':'Land available'}</div>
    </div>
    {cards.length===0?<div className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-zinc-500">Your hand is empty.</div>:<div className="scrollbar-none flex gap-3 overflow-x-auto pb-2">
      {cards.map(card=>{
        const type=card.definition?.typeLine.toLowerCase()??'';
        const isLand=type.includes('land');
        const disabled=isLand&&landPlayed;
        return <article key={card.instanceId} className="w-28 shrink-0">
          <button onClick={()=>onView(card)} className="block w-full">{card.definition?.imageUrl?<img src={card.definition.imageUrl} alt={card.name} className="card-ratio w-full rounded-xl border border-white/15 object-cover shadow-lg"/>:<div className="card-ratio flex w-full items-center justify-center rounded-xl bg-zinc-800 p-2 text-center text-xs font-black">{card.name}</div>}</button>
          <button disabled={disabled} onClick={()=>onPlay(card)} className="mt-2 w-full rounded-lg bg-violet-400 px-2 py-2 text-[10px] font-black text-zinc-950 disabled:bg-white/5 disabled:text-zinc-600">{isLand?(disabled?'LAND USED':'PLAY LAND'):'CAST'}</button>
        </article>;
      })}
    </div>}
  </section>;
}

export function VirtualResponsePicker({
  open,
  cards,
  onChoose,
  onClose,
}: {
  open: boolean;
  cards: CardInstance[];
  onChoose: (card: CardInstance) => void;
  onClose: () => void;
}) {
  if(!open)return null;
  const responses=cards.filter(card=>{const type=card.definition?.typeLine.toLowerCase()??'';return type.includes('instant')||type.includes('sorcery');});
  return <div className="fixed inset-0 z-[79] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm" role="dialog" aria-modal="true">
    <section className="max-h-[86vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-violet-400/30 bg-[#17181d] p-4">
      <div className="flex items-center justify-between"><div><div className="text-[10px] font-black uppercase tracking-[.18em] text-violet-300">Cast response</div><h2 className="text-xl font-black">Choose from your hand</h2></div><button onClick={onClose} className="rounded-xl bg-white/10 px-3 py-2 font-black">✕</button></div>
      {responses.length===0?<div className="mt-4 rounded-xl bg-black/20 p-5 text-center text-sm text-zinc-400">No instant/sorcery responses are currently in your hand.</div>:<div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{responses.map(card=><button key={card.instanceId} onClick={()=>onChoose(card)} className="text-left">{card.definition?.imageUrl&&<img src={card.definition.imageUrl} alt={card.name} className="w-full rounded-xl"/>}<div className="mt-1 truncate text-xs font-black">{card.name}</div></button>)}</div>}
    </section>
  </div>;
}
