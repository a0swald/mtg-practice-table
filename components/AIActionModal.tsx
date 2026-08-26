'use client';

import { useEffect, useState } from 'react';
import type { CardDefinition } from '@/types/card';
import type { PendingAIAction } from '@/types/game';

export function AIActionModal({
  action,
  onResolve,
  onCounter,
}: {
  action?: PendingAIAction;
  onResolve: (definition?: CardDefinition) => void;
  onCounter: () => void;
}) {
  const [definition, setDefinition] = useState<CardDefinition>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!action) {
      setDefinition(undefined);
      return;
    }

    let cancelled = false;
    setLoading(true);
    fetch(`/api/cards/named?name=${encodeURIComponent(action.cardName)}`)
      .then(async response => response.ok ? response.json() as Promise<CardDefinition> : undefined)
      .then(card => { if (!cancelled) setDefinition(card); })
      .catch(() => undefined)
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [action?.cardName]);

  if (!action) return null;

  const oracleText = definition?.oracleText ?? action.oracleText;
  const typeLine = definition?.typeLine ?? action.typeLine;
  const imageUrl = definition?.imageUrl;

  const result = action.kind === 'creature'
    ? `If it resolves, ${action.cardName} enters the opponent's battlefield${action.power !== undefined ? ` as a ${action.power}/${action.toughness}` : ''}. It will have summoning sickness this turn.`
    : action.kind === 'removal'
      ? `If it resolves, ${action.targetName ?? 'the targeted creature'} is destroyed and moved to your graveyard.`
      : action.kind === 'draw'
        ? `If it resolves, the opponent draws ${action.amount ?? 2} cards.`
        : `If it resolves, ${action.cardName} enters the battlefield and can provide additional mana on future turns.`;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-sky-400/30 bg-[#15191d] p-4 shadow-2xl sm:p-5">
        <div className="flex gap-4">
          {imageUrl && <img src={imageUrl} alt={action.cardName} className="hidden w-36 self-start rounded-xl sm:block" />}
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-300">Opponent cast a real Magic card</div>
            <h2 className="mt-1 text-2xl font-black text-zinc-50">{action.cardName}</h2>
            <div className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-400">{typeLine}</div>
            {loading && <div className="mt-2 text-xs text-zinc-500">Loading Scryfall card data…</div>}
            {oracleText && <div className="mt-3 whitespace-pre-line rounded-xl border border-white/10 bg-black/25 p-3 text-sm leading-6 text-zinc-200">{oracleText}</div>}
          </div>
        </div>

        {action.kind === 'removal' && (
          <div className="mt-4 rounded-xl border border-red-400/25 bg-red-400/[.06] p-3 text-sm text-red-100">
            <span className="font-black">Target:</span> {action.targetName ?? 'your creature'}
          </div>
        )}

        <div className="mt-4 rounded-xl border border-white/10 bg-white/[.04] p-3">
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">What happens if this resolves</div>
          <p className="mt-1 text-sm leading-6 text-zinc-200">{result}</p>
        </div>

        <p className="mt-3 text-xs leading-5 text-zinc-500">The opponent has already cast the spell and paid its cost. The game is paused here so you can acknowledge it or counter it before anything happens.</p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button onClick={() => onResolve(definition)} className="rounded-xl bg-emerald-400 px-4 py-3 font-black text-zinc-950">RESOLVE</button>
          <button onClick={onCounter} className="rounded-xl border border-sky-300/25 bg-white/10 px-4 py-3 font-black text-zinc-100">COUNTER</button>
        </div>
      </div>
    </div>
  );
}
