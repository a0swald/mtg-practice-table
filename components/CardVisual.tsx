'use client';
import type { CardInstance } from '@/types/card';
import { currentStats } from '@/lib/game/utils';

export function CardVisual({
  card,
  onClick,
  selected = false,
  combatUnavailable = false,
}:{
  card: CardInstance;
  onClick?: () => void;
  selected?: boolean;
  combatUnavailable?: boolean;
}) {
  const stats = currentStats(card);
  const qty = card.tokenQuantity ?? 1;
  const unavailableLabel = card.tapped ? 'TAPPED' : card.summoningSick ? 'SUMMONING SICK' : 'UNAVAILABLE';

  return (
    <button
      onClick={onClick}
      aria-disabled={combatUnavailable}
      className={`relative shrink-0 ${card.tapped ? 'mx-5 w-28 translate-y-4 rotate-90' : 'w-24'} transition-all ${selected ? 'rounded-xl ring-4 ring-emerald-400' : ''} ${combatUnavailable ? 'cursor-not-allowed opacity-40 grayscale-[.45]' : ''}`}
    >
      <div className="card-ratio overflow-hidden rounded-[8%] border border-white/20 bg-zinc-800 shadow-lg">
        {card.definition?.imageUrl ? (
          <img src={card.definition.imageUrl} alt={card.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center px-2 text-center">
            <div className="text-xs font-black">{card.name}</div>
            {stats && <div className="mt-2 text-lg font-black">{stats.power}/{stats.toughness}</div>}
          </div>
        )}
      </div>

      {combatUnavailable && (
        <div className="absolute inset-0 flex items-center justify-center rounded-[8%] bg-black/45">
          <span className="max-w-[90%] rounded-md border border-white/10 bg-black/90 px-2 py-1 text-center text-[9px] font-black uppercase tracking-wide text-zinc-100">
            {unavailableLabel}
          </span>
        </div>
      )}

      {stats && <div className="absolute bottom-1 right-1 rounded-md bg-black/90 px-1.5 py-0.5 text-[11px] font-black">{stats.power}/{stats.toughness}</div>}
      {card.plusOneCounters > 0 && <Badge className="left-1 top-1">+{card.plusOneCounters}</Badge>}
      {card.damageMarked > 0 && <Badge className="bottom-1 left-1">Dmg {card.damageMarked}</Badge>}
      {card.summoningSick && !combatUnavailable && <Badge className="right-1 top-1">S</Badge>}
      {qty > 1 && <Badge className="left-1/2 top-1 -translate-x-1/2">×{qty}</Badge>}
    </button>
  );
}

function Badge({children,className}:{children:React.ReactNode;className:string}) {
  return <span className={`absolute rounded bg-black/90 px-1.5 py-0.5 text-[10px] font-black ${className}`}>{children}</span>;
}
