import type { CardInstance } from '@/types/card';
import { CardVisual } from './CardVisual';

type BattlefieldGroup = {
  key: 'creatures' | 'artifacts' | 'enchantments' | 'lands' | 'other';
  label: string;
  cards: CardInstance[];
};

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
  if (cards.length === 0) {
    return (
      <div className="flex min-h-40 w-full items-center justify-center rounded-2xl border border-dashed border-white/10 px-1 py-4 text-sm text-zinc-500">
        No permanents
      </div>
    );
  }

  const groups = groupCards(cards);

  return (
    <div className="min-h-40 space-y-3 px-1 py-4">
      {groups.map(group => (
        <section
          key={group.key}
          className={`w-full min-w-0 rounded-xl border border-white/[.07] bg-black/[.08] p-2.5 ${group.cards.length === 0 ? 'hidden sm:block' : ''}`}
        >
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">{group.label}</span>
            <span className="text-[10px] font-bold text-zinc-600">{group.cards.length}</span>
          </div>
          {group.cards.length > 0 ? (
            <div className="scrollbar-none flex min-h-28 w-full gap-3 overflow-x-auto px-1 pb-1 pt-1">
              {group.cards.map(card => (
                <CardVisual
                  key={card.instanceId}
                  card={card}
                  selected={selectedIds.includes(card.instanceId)}
                  combatUnavailable={combatMode && combatUnavailableIds.includes(card.instanceId)}
                  onClick={() => onCard?.(card)}
                />
              ))}
            </div>
          ) : (
            <div className="flex min-h-20 items-center justify-center text-xs text-zinc-700">Empty</div>
          )}
        </section>
      ))}
    </div>
  );
}

function groupCards(cards: CardInstance[]): BattlefieldGroup[] {
  const creatures: CardInstance[] = [];
  const artifacts: CardInstance[] = [];
  const enchantments: CardInstance[] = [];
  const lands: CardInstance[] = [];
  const other: CardInstance[] = [];

  cards.forEach(card => {
    const typeLine = card.definition?.typeLine.toLowerCase() ?? '';

    if (typeLine.includes('creature') || (!card.definition && card.basePower !== undefined)) {
      creatures.push(card);
    } else if (typeLine.includes('artifact')) {
      artifacts.push(card);
    } else if (typeLine.includes('enchantment')) {
      enchantments.push(card);
    } else if (typeLine.includes('land')) {
      lands.push(card);
    } else {
      other.push(card);
    }
  });

  return [
    { key: 'creatures', label: 'Creatures', cards: creatures },
    { key: 'artifacts', label: 'Artifacts', cards: artifacts },
    { key: 'enchantments', label: 'Enchantments', cards: enchantments },
    { key: 'lands', label: 'Lands', cards: lands },
    { key: 'other', label: 'Other Permanents', cards: other },
  ].filter(group => group.cards.length > 0 || group.key === 'creatures' || group.key === 'artifacts');
}
