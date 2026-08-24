'use client';
import { useEffect, useState } from 'react';
import type { CardInstance } from '@/types/card';
import type { PendingCombat } from '@/types/game';

type DefenseMode = 'block' | 'respond' | null;

type CombatPanelProps = {
  combat?: PendingCombat;
  playerCards: CardInstance[];
  attackerCards: CardInstance[];
  onTake: (n: number) => void;
  onBeginBlock: () => void;
  onBeginRespond: () => void;
  onDamage: (card: CardInstance, delta: number) => void;
  onFinishDefense: (mode: Exclude<DefenseMode, null>) => void;
  onResolvePlayer: () => void;
  onCancel: () => void;
};

export function CombatPanel({
  combat,
  playerCards,
  attackerCards,
  onTake,
  onBeginBlock,
  onBeginRespond,
  onDamage,
  onFinishDefense,
  onResolvePlayer,
  onCancel,
}: CombatPanelProps) {
  const [mode, setMode] = useState<DefenseMode>(null);

  useEffect(() => {
    setMode(null);
  }, [combat?.attackerId, combat?.defenderId, combat?.attackerInstanceIds.join('|')]);

  if (!combat) return null;

  if (combat.source === 'ai') {
    const blockers = playerCards.filter(card => card.basePower !== undefined);

    return (
      <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4">
        <div className="text-xs font-black uppercase tracking-widest text-amber-200">Incoming combat</div>
        <div className="mt-1 text-2xl font-black">{combat.totalPower} damage</div>
        <p className="mt-1 text-sm text-zinc-300">
          Take the damage, block, or pause to resolve a response from your physical cards.
        </p>

        {!mode ? (
          <div className="mt-3 grid grid-cols-3 gap-2">
            <button onClick={() => onTake(combat.totalPower)} className="rounded-xl bg-red-500 px-3 py-3 font-black">
              TAKE {combat.totalPower}
            </button>
            <button
              disabled={blockers.length === 0}
              onClick={() => { setMode('block'); onBeginBlock(); }}
              className="rounded-xl bg-white/10 px-3 py-3 font-bold disabled:opacity-40"
            >
              BLOCK
            </button>
            <button
              onClick={() => { setMode('respond'); onBeginRespond(); }}
              className="rounded-xl bg-white/10 px-3 py-3 font-bold"
            >
              RESPOND
            </button>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="text-xs font-black uppercase tracking-widest text-zinc-300">
                {mode === 'block' ? 'Resolve blocks' : 'Resolve response'}
              </div>
              <p className="mt-1 text-xs leading-5 text-zinc-400">
                Mark damage on creatures as you resolve the physical cards. Damage is temporary and clears during cleanup.
              </p>
            </div>

            {attackerCards.length > 0 && (
              <DamageGroup title="Attacking creatures" cards={attackerCards} onDamage={onDamage} />
            )}

            {blockers.length > 0 && (
              <DamageGroup title="Your creatures" cards={blockers} onDamage={onDamage} />
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onFinishDefense(mode)}
                className="rounded-xl bg-emerald-400 px-3 py-3 font-black text-zinc-950"
              >
                FINISH {mode === 'block' ? 'BLOCK' : 'RESPONSE'}
              </button>
              <button onClick={() => setMode(null)} className="rounded-xl bg-white/10 px-3 py-3 font-bold">
                BACK
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4">
      <div className="font-black">Attack declared for {combat.totalPower}</div>
      <p className="mt-1 text-sm text-zinc-300">
        Confirm damage after handling physical blockers and responses at the table.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button onClick={onResolvePlayer} className="rounded-xl bg-emerald-400 py-3 font-black text-black">DEAL DAMAGE</button>
        <button onClick={onCancel} className="rounded-xl bg-white/10 py-3 font-bold">CANCEL</button>
      </div>
    </div>
  );
}

function DamageGroup({ title, cards, onDamage }: { title: string; cards: CardInstance[]; onDamage: (card: CardInstance, delta: number) => void }) {
  return (
    <div>
      <div className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">{title}</div>
      <div className="space-y-2">
        {cards.map(card => (
          <div key={card.instanceId} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 p-2.5">
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-zinc-100">{card.name}</div>
              <div className="text-xs text-zinc-400">Damage marked: {card.damageMarked}</div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                disabled={card.damageMarked <= 0}
                onClick={() => onDamage(card, -1)}
                className="h-9 w-9 rounded-lg bg-white/10 text-lg font-black disabled:opacity-30"
              >
                −
              </button>
              <span className="min-w-6 text-center text-sm font-black">{card.damageMarked}</span>
              <button onClick={() => onDamage(card, 1)} className="h-9 w-9 rounded-lg bg-red-500/80 text-lg font-black">
                +
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
