'use client';

import { useState } from 'react';
import type { CardDefinition, CardInstance } from '@/types/card';
import { currentStats } from '@/lib/game/utils';

type SpellResolverProps = {
  spell?: CardDefinition;
  opponentName: string;
  opponentLife: number;
  opponentCards: CardInstance[];
  onDamageOpponent: (amount: number) => void;
  onDamageCard: (card: CardInstance, amount: number) => void;
  onDestroyCard: (card: CardInstance) => void;
  onExileCard: (card: CardInstance) => void;
  onFinish: () => void;
  onCancel: () => void;
};

export function SpellResolver({ spell, opponentName, opponentLife, opponentCards, onDamageOpponent, onDamageCard, onDestroyCard, onExileCard, onFinish, onCancel }: SpellResolverProps) {
  const [amount, setAmount] = useState(1);
  const [applied, setApplied] = useState(0);
  if (!spell) return null;

  const apply = (action: () => void) => {
    action();
    setApplied(count => count + 1);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true">
      <section className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-violet-400/35 bg-[#17181d] p-4 shadow-2xl sm:p-5">
        <div className="flex gap-4">
          {spell.imageUrl && <img src={spell.imageUrl} alt={spell.name} className="hidden w-40 self-start rounded-xl sm:block" />}
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-300">Resolve your spell</div>
            <div className="mt-1 text-2xl font-black text-zinc-50">{spell.name}</div>
            <div className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-400">{spell.typeLine}</div>
            {spell.oracleText && <p className="mt-3 whitespace-pre-line rounded-xl bg-black/20 p-3 text-sm leading-6 text-zinc-300">{spell.oracleText}</p>}
          </div>
        </div>

        <div className="mt-4 flex items-end gap-2">
          <label className="flex-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Amount</span>
            <input type="number" min={0} value={amount} onChange={event => setAmount(Math.max(0, Number(event.target.value) || 0))} className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm font-bold outline-none focus:border-violet-400" />
          </label>
          <button onClick={() => apply(() => onDamageOpponent(amount))} disabled={amount <= 0} className="min-h-11 rounded-xl bg-red-500 px-4 py-2 text-xs font-black disabled:opacity-40">{opponentName.toUpperCase()} −{amount}</button>
        </div>
        <div className="mt-1 text-xs text-zinc-500">Current life: {opponentLife}</div>

        {opponentCards.length > 0 && (
          <div className="mt-4">
            <div className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">Opponent permanents</div>
            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {opponentCards.map(card => {
                const stats = currentStats(card);
                return (
                  <div key={card.instanceId} className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <div className="truncate text-sm font-black text-zinc-100">{card.name}</div>
                    <div className="text-xs text-zinc-400">{stats ? `${stats.power}/${stats.toughness} · Damage ${card.damageMarked}` : card.definition?.typeLine ?? 'Permanent'}</div>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <button disabled={!stats || amount <= 0} onClick={() => apply(() => onDamageCard(card, amount))} className="rounded-lg bg-red-500/80 px-2 py-2 text-[11px] font-black disabled:opacity-30">DAMAGE {amount}</button>
                      <button onClick={() => apply(() => onDestroyCard(card))} className="rounded-lg bg-white/10 px-2 py-2 text-[11px] font-black">DESTROY</button>
                      <button onClick={() => apply(() => onExileCard(card))} className="rounded-lg bg-white/10 px-2 py-2 text-[11px] font-black">EXILE</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <p className="mt-3 text-xs leading-5 text-zinc-500">Apply only the parts of the Oracle text that actually happen. The app tracks the result without pretending to resolve every Magic rule automatically.</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button onClick={onFinish} className="rounded-xl bg-emerald-400 px-3 py-3 font-black text-zinc-950">FINISH → GRAVEYARD</button>
          <button disabled={applied > 0} onClick={onCancel} className="rounded-xl bg-white/10 px-3 py-3 font-bold disabled:opacity-30">CANCEL CAST</button>
        </div>
      </section>
    </div>
  );
}
