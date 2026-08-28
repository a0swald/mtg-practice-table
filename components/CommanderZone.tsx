'use client';

import { useEffect, useState } from 'react';
import type { CardDefinition, CardInstance } from '@/types/card';
import { CardVisual } from './CardVisual';

function numericStat(value: string | undefined, fallback: number | undefined): number | undefined {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function CommanderZone({ commander, tax, damage, readOnly = false, onSelect, onCast, onReturn, onView }: { commander?: CardInstance; tax: number; damage: number; readOnly?: boolean; onSelect?: () => void; onCast?: () => void; onReturn?: () => void; onView?: (card: CardInstance) => void; }) {
  const [hydratedDefinition, setHydratedDefinition] = useState<CardDefinition>();

  useEffect(() => {
    if (!commander?.name || commander.definition?.imageUrl) { setHydratedDefinition(undefined); return; }
    let cancelled = false;
    fetch(`/api/cards/named?name=${encodeURIComponent(commander.name)}`)
      .then(async response => response.ok ? response.json() as Promise<CardDefinition> : undefined)
      .then(definition => { if (!cancelled) setHydratedDefinition(definition); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [commander?.name, commander?.definition?.imageUrl]);

  const displayCommander: CardInstance | undefined = commander && hydratedDefinition ? {
    ...commander,
    name: hydratedDefinition.name,
    definition: hydratedDefinition,
    basePower: numericStat(hydratedDefinition.power, commander.basePower),
    baseToughness: numericStat(hydratedDefinition.toughness, commander.baseToughness),
  } : commander;

  return <section className="h-full rounded-xl border border-amber-300/15 bg-amber-300/[.035] p-2.5">
    <div className="mb-2 flex items-center justify-between gap-2"><div><div className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-200/70">Commander</div><div className="text-[11px] text-zinc-500">Tax +{tax} · Damage {damage}/21</div></div>{!commander && !readOnly && <button onClick={onSelect} className="rounded-lg bg-amber-300/10 px-2.5 py-2 text-[11px] font-black text-amber-100">SELECT COMMANDER</button>}</div>
    {displayCommander ? <div className="flex items-center gap-2.5"><CardVisual card={displayCommander} onClick={() => onView?.(displayCommander)} /><div className="min-w-0 flex-1"><div className="text-xs font-black leading-tight">{displayCommander.name}</div><div className="mt-1 text-[11px] text-zinc-500">{displayCommander.zone === 'command' ? 'Command Zone' : 'On Battlefield'}</div>{!readOnly && displayCommander.zone === 'command' && <button onClick={onCast} className="mt-2 w-full rounded-lg bg-emerald-400 px-2 py-2 text-[10px] font-black text-zinc-950">CAST (+{tax})</button>}{!readOnly && displayCommander.zone === 'battlefield' && <button onClick={onReturn} className="mt-2 w-full rounded-lg bg-white/10 px-2 py-2 text-[10px] font-black">RETURN TO COMMAND</button>}</div></div> : <div className="text-xs text-zinc-600">No commander selected.</div>}
  </section>;
}
