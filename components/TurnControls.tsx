export function TurnControls({onPass}:{onPass:()=>void}) {
  return (
    <div className="sticky bottom-0 z-20 -mx-4 border-t border-white/10 bg-[#111315]/95 px-4 py-3 backdrop-blur lg:static lg:mx-0 lg:rounded-2xl lg:border lg:bg-black/20 lg:p-3">
      <button
        onClick={onPass}
        className="w-full rounded-2xl bg-emerald-400 py-4 text-base font-black text-zinc-950 transition hover:bg-emerald-300 active:scale-[0.99]"
      >
        PASS TURN
      </button>
    </div>
  );
}
