import type { CardInstance } from '@/types/card';
import { CardVisual } from './CardVisual';

export function Battlefield({
  cards,
  onCard,
  selectedIds = [],
  combatMode = false,
  combatUnavailableIds = [],
}:{
  cards: CardInstance[];
  onCard?: (card: CardInstance) => void;
  selectedIds?: string[];
  combatMode?: boolean;
  combatUnavailableIds?: string[];
}) {
  return (
    <div className="scrollbar-none flex min-h-40 gap-3 overflow-x-auto px-1 py-4">
      {cards.length === 0 ? (
        <div className="flex w-full items-center justify-center rounded-2xl border border-dashed border-white/10 text-sm text-zinc-500">No permanents</div>
      ) : (
        cards.map(card => (
          <CardVisual
            key={card.instanceId}
            card={card}
            selected={selectedIds.includes(card.instanceId)}
            combatUnavailable={combatMode && combatUnavailableIds.includes(card.instanceId)}
            onClick={() => onCard?.(card)}
          />
        ))
      )}
    </div>
  );
}
