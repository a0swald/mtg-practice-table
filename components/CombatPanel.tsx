'use client';
import { useEffect, useMemo, useState } from 'react';
import type { CardInstance } from '@/types/card';
import type { PendingCombat } from '@/types/game';
import type { BlockAssignment } from '@/lib/game/reducer';
import { currentStats } from '@/lib/game/utils';

type CombatPanelProps = {
  combat?: PendingCombat;
  playerCards: CardInstance[];
  attackerCards: CardInstance[];
  onTake: (n: number) => void;
  onBeginBlock: () => void;
  onResolveBlocks: (assignments: BlockAssignment[]) => void;
  onResolvePlayer: () => void;
  onCancel: () => void;
};

export function CombatPanel({
  combat,
  playerCards,
  attackerCards,
  onTake,
  onBeginBlock,
  onResolveBlocks,
  onResolvePlayer,
  onCancel,
}: CombatPanelProps) {
  const [blocking, setBlocking] = useState(false);
  const [assignments, setAssignments] = useState<Record<string, string>>({});

  useEffect(() => {
    setBlocking(false);
    setAssignments({});
  }, [combat?.attackerId, combat?.defenderId, combat?.attackerInstanceIds.join('|')]);

  const blockers = useMemo(
    () => playerCards.filter(card => card.basePower !== undefined && !card.tapped),
    [playerCards],
  );

  if (!combat) return null;

  if (combat.source === 'ai') {
    const assignedBlockerIds = new Set(Object.values(assignments));
    const unblockedDamage = attackerCards.reduce((sum, attacker) => {
      return assignments[attacker.instanceId] ? sum : sum + cardPower(attacker);
    }, 0);

    return (
      <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4">
        <div className="text-xs font-black uppercase tracking-widest text-amber-200">Incoming combat</div>
        <div className="mt-1 text-2xl font-black">{combat.totalPower} damage</div>
        <p className="mt-1 text-sm text-zinc-300">
          Take the damage or assign blockers. Basic combat damage is resolved automatically from visible power and toughness.
        </p>

        {!blocking ? (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={() => onTake(combat.totalPower)} className="rounded-xl bg-red-500 px-3 py-3 font-black">
              TAKE {combat.totalPower}
            </button>
            <button
              disabled={blockers.length === 0}
              onClick={() => { setBlocking(true); onBeginBlock(); }}
              className="rounded-xl bg-white/10 px-3 py-3 font-bold disabled:opacity-40"
            >
              BLOCK
            </button>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="text-xs font-black uppercase tracking-widest text-zinc-300">Assign blockers</div>
              <p className="mt-1 text-xs leading-5 text-zinc-400">
                Choose one blocker for each attacker. Damage is dealt simultaneously. Creatures with lethal damage are moved to the graveyard automatically.
              </p>
            </div>

            <div className="space-y-3">
              {attackerCards.map(attacker => {
                const blockerId = assignments[attacker.instanceId];
                const blocker = blockers.find(card => card.instanceId === blockerId);
                const attackerStats = currentStats(attacker);
                const blockerStats = blocker ? currentStats(blocker) : undefined;
                const attackerDies = Boolean(attackerStats && blockerStats && blockerStats.power + attacker.damageMarked >= attackerStats.toughness);
                const blockerDies = Boolean(attackerStats && blockerStats && attackerStats.power + (blocker?.damageMarked ?? 0) >= blockerStats.toughness);

                return (
                  <div key={attacker.instanceId} className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-black text-zinc-100">{attacker.name}</div>
                        <div className="text-xs text-zinc-400">Attacker · {attackerStats ? `${attackerStats.power}/${attackerStats.toughness}` : '—'}</div>
                      </div>
                      <div className="text-xs font-bold text-amber-200">{blocker ? 'BLOCKED' : `${cardPower(attacker)} to you`}</div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      <button
                        onClick={() => setAssignments(current => {
                          const next = { ...current };
                          delete next[attacker.instanceId];
                          return next;
                        })}
                        className={`rounded-lg px-2 py-2 text-xs font-bold ${!blockerId ? 'bg-amber-400 text-zinc-950' : 'bg-white/10'}`}
                      >
                        NO BLOCK
                      </button>
                      {blockers.map(candidate => {
                        const usedElsewhere = assignedBlockerIds.has(candidate.instanceId) && blockerId !== candidate.instanceId;
                        const stats = currentStats(candidate);
                        return (
                          <button
                            key={candidate.instanceId}
                            disabled={usedElsewhere}
                            onClick={() => setAssignments(current => ({ ...current, [attacker.instanceId]: candidate.instanceId }))}
                            className={`rounded-lg px-2 py-2 text-left text-xs font-bold disabled:opacity-30 ${blockerId === candidate.instanceId ? 'bg-emerald-400 text-zinc-950' : 'bg-white/10'}`}
                          >
                            <span className="block truncate">{candidate.name}</span>
                            <span className="text-[10px] opacity-75">{stats ? `${stats.power}/${stats.toughness}` : '—'}</span>
                          </button>
                        );
                      })}
                    </div>

                    {blocker && attackerStats && blockerStats && (
                      <div className="mt-3 rounded-lg bg-white/[.05] px-3 py-2 text-xs text-zinc-300">
                        {blocker.name} deals <strong>{blockerStats.power}</strong> to {attacker.name}; {attacker.name} deals <strong>{attackerStats.power}</strong> to {blocker.name}.
                        <div className="mt-1 font-bold">
                          {attackerDies ? `${attacker.name} will be destroyed. ` : `${attacker.name} survives. `}
                          {blockerDies ? `${blocker.name} will be destroyed.` : `${blocker.name} survives.`}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm">
              Unblocked damage to you: <strong>{unblockedDamage}</strong>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onResolveBlocks(Object.entries(assignments).map(([attackerId, blockerId]) => ({ attackerId, blockerId })))}
                className="rounded-xl bg-emerald-400 px-3 py-3 font-black text-zinc-950"
              >
                RESOLVE COMBAT
              </button>
              <button onClick={() => { setBlocking(false); setAssignments({}); }} className="rounded-xl bg-white/10 px-3 py-3 font-bold">
                BACK
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  const aiBlocks = combat.aiBlocks ?? [];
  return (
    <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4">
      <div className="text-xs font-black uppercase tracking-widest text-emerald-200">Opponent blocks</div>
      <div className="mt-1 text-xl font-black">
        {aiBlocks.length ? `${aiBlocks.length} block${aiBlocks.length === 1 ? '' : 's'} declared` : 'No blocks'}
      </div>

      {aiBlocks.length ? (
        <div className="mt-3 space-y-2">
          {aiBlocks.map(block => {
            const attackerDies = block.blockerPower >= block.attackerToughness;
            const blockerDies = block.attackerPower >= block.blockerToughness;
            return (
              <div key={`${block.attackerId}:${block.blockerId}`} className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-sm font-black text-zinc-100">
                  {block.blockerName} blocks {block.attackerName}
                </div>
                <div className="mt-1 text-xs text-zinc-400">
                  {block.attackerName} {block.attackerPower}/{block.attackerToughness} ↔ {block.blockerName} {block.blockerPower}/{block.blockerToughness}
                </div>
                <div className="mt-2 text-xs leading-5 text-zinc-300">
                  {block.blockerName} deals <strong>{block.blockerPower}</strong> damage; {block.attackerName} deals <strong>{block.attackerPower}</strong> damage.
                </div>
                <div className="mt-1 text-xs font-bold text-zinc-200">
                  {attackerDies ? `${block.attackerName} will be destroyed. ` : `${block.attackerName} survives. `}
                  {blockerDies ? `${block.blockerName} will be destroyed.` : `${block.blockerName} survives.`}
                </div>
                <div className="mt-2 rounded-lg bg-white/[.04] px-2 py-1.5 text-[11px] leading-4 text-zinc-400">
                  Why: {block.reason}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-2 text-sm text-zinc-300">The opponent chose not to block this attack.</p>
      )}

      <div className="mt-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-zinc-200">
        Damage getting through to opponent: <strong>{combat.totalPower}</strong>
      </div>
      <p className="mt-2 text-xs leading-5 text-zinc-400">Review the opponent's blocks before resolving. Basic simultaneous combat damage is calculated automatically.</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button onClick={onResolvePlayer} className="rounded-xl bg-emerald-400 py-3 font-black text-black">RESOLVE COMBAT</button>
        <button onClick={onCancel} className="rounded-xl bg-white/10 py-3 font-bold">CANCEL ATTACK</button>
      </div>
    </div>
  );
}

function cardPower(card: CardInstance): number {
  return currentStats(card)?.power ?? 0;
}
