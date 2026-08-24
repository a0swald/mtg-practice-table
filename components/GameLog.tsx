import type { LogEntry } from '@/types/game';

export function GameLog({entries}:{entries:LogEntry[]}) {
  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-2xl border border-white/10 bg-black/20 p-3 lg:p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Game log</h3>
        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">Latest first</span>
      </div>
      <div className="max-h-40 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 text-sm xl:max-h-none">
        {entries.slice().reverse().map(e => (
          <div key={e.id} className="border-b border-white/[.05] pb-2 last:border-0">
            <span className="font-bold">T{e.turn} · {e.actor}</span>
            <span className="text-zinc-400"> — {e.message}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
