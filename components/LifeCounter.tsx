export function LifeCounter({life,onChange,compact=false}:{life:number;onChange:(delta:number)=>void;compact?:boolean}) {
  return <div className="flex items-center gap-2"><button aria-label="Lose 1 life" onClick={()=>onChange(-1)} className="h-10 w-10 rounded-xl bg-white/10 font-black">−</button><div className={compact?'min-w-12 text-center text-2xl font-black':'min-w-16 text-center text-4xl font-black'}>{life}</div><button aria-label="Gain 1 life" onClick={()=>onChange(1)} className="h-10 w-10 rounded-xl bg-white/10 font-black">+</button></div>;
}
