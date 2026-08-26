'use client';

import type { CardInstance } from '@/types/card';
import { currentStats } from '@/lib/game/utils';

export function CardDetailModal({ card, onClose }: { card?: CardInstance; onClose: () => void }) {
  if (!card) return null;
  const stats = currentStats(card);
  const definition = card.definition;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-6" onClick={onClose} role="dialog" aria-modal="true">
      <section onClick={event => event.stopPropagation()} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-[#17191d] p-4 shadow-2xl sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Card details</div>
            <h2 className="mt-1 text-xl font-black text-zinc-50">{card.name}</h2>
            {definition?.typeLine && <div className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-400">{definition.typeLine}</div>}
          </div>
          <button onClick={onClose} className="rounded-xl bg-white/10 px-3 py-2 text-sm font-black text-zinc-200">✕</button>
        </div>

        <div className="mt-4 flex justify-center">
          {definition?.imageUrl ? (
            <img src={definition.imageUrl} alt={card.name} className="w-full max-w-[340px] rounded-2xl shadow-2xl" />
          ) : (
            <div className="card-ratio flex w-full max-w-[300px] items-center justify-center rounded-2xl border border-white/10 bg-zinc-800 p-6 text-center text-xl font-black">{card.name}</div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          {stats && <div className="rounded-xl bg-white/[.05] p-3"><div className="text-[10px] font-black uppercase tracking-wide text-zinc-500">Current P/T</div><div className="mt-1 text-lg font-black">{stats.power}/{stats.toughness}</div></div>}
          <div className="rounded-xl bg-white/[.05] p-3"><div className="text-[10px] font-black uppercase tracking-wide text-zinc-500">State</div><div className="mt-1 font-bold">{card.tapped ? 'Tapped' : 'Untapped'}{card.combatDisabled ? ' · Cannot attack/block' : ''}</div></div>
        </div>

        {definition?.oracleText && <div className="mt-3 whitespace-pre-line rounded-xl border border-white/10 bg-black/20 p-3 text-sm leading-6 text-zinc-300">{definition.oracleText}</div>}
        {card.combatDisabledBy && <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/[.06] p-3 text-sm text-amber-100">Combat disabled by <strong>{card.combatDisabledBy}</strong>.</div>}
      </section>
    </div>
  );
}
