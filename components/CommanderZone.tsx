'use client';

import type { CardInstance } from '@/types/card';
import { CardVisual } from './CardVisual';

export function CommanderZone({
  commander,
  tax,
  damage,
  readOnly = false,
  onSelect,
  onCast,
  onReturn,
  onView,
}:{
  commander?: CardInstance;
  tax: number;
  damage: number;
  readOnly?: boolean;
  onSelect?: () => void;
  onCast?: () => void;
  onReturn?: () => void;
  onView?: (card: CardInstance) => void;
}) {
  return (
    <section className="rounded-xl border border-amber-300/15 bg-amber-300/[.035] p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-200/70">Commander</div>
          <div className="text-xs text-zinc-500">Tax +{tax} · Damage {damage}/21</div>
        </div>
        {!commander && !readOnly && <button onClick={onSelect} className="rounded-lg bg-amber-300/10 px-3 py-2 text-xs font-black text-amber-100">SELECT COMMANDER</button>}
      </div>

      {commander ? (
        <div className="flex items-center gap-3">
          <CardVisual card={commander} onClick={() => onView?.(commander)} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-black">{commander.name}</div>
            <div className="mt-1 text-xs text-zinc-500">{commander.zone === 'command' ? 'Command Zone' : 'On Battlefield'}</div>
            {!readOnly && commander.zone === 'command' && <button onClick={onCast} className="mt-2 w-full rounded-lg bg-emerald-400 px-3 py-2 text-xs font-black text-zinc-950">CAST COMMANDER (+{tax})</button>}
            {!readOnly && commander.zone === 'battlefield' && <button onClick={onReturn} className="mt-2 w-full rounded-lg bg-white/10 px-3 py-2 text-xs font-black">RETURN TO COMMAND ZONE</button>}
          </div>
        </div>
      ) : <div className="text-xs text-zinc-600">No commander selected.</div>}
    </section>
  );
}
