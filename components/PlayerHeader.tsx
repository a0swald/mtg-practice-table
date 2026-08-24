import { LifeCounter } from './LifeCounter';
export function PlayerHeader({name,life,onLife,meta}:{name:string;life:number;onLife:(d:number)=>void;meta?:string}){return <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-black">{name}</h2>{meta&&<p className="text-xs text-zinc-500">{meta}</p>}</div><LifeCounter life={life} onChange={onLife} compact/></div>}
