export function TurnControls({onPass}:{onPass:()=>void}) {
  return <div className="practice-pass-turn sticky bottom-0 z-20 -mx-4 border-t border-white/10 bg-[#111315]/95 px-4 py-3 backdrop-blur lg:static lg:mx-0 lg:rounded-xl lg:border lg:bg-black/20 lg:p-2">
    <button onClick={onPass} className="w-full rounded-xl bg-emerald-400 py-3 text-sm font-black text-zinc-950 transition hover:bg-emerald-300 active:scale-[0.99]">PASS TURN</button>
  </div>;
}
