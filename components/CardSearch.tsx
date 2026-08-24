'use client';
import { useEffect,useState } from 'react';
import type { CardDefinition } from '@/types/card';
export function CardSearch({open,onClose,onChoose}:{open:boolean;onClose:()=>void;onChoose:(card:CardDefinition)=>void}){
 const [q,setQ]=useState('');const [items,setItems]=useState<string[]>([]);const [loading,setLoading]=useState(false);const [error,setError]=useState('');
 useEffect(()=>{if(q.trim().length<2){setItems([]);return;}const t=setTimeout(async()=>{try{setError('');const r=await fetch(`/api/cards/autocomplete?q=${encodeURIComponent(q)}`);const j=await r.json() as {data?:string[]};setItems(j.data?.slice(0,8)??[]);}catch{setError('Could not reach Scryfall.');}},250);return()=>clearTimeout(t)},[q]);
 if(!open)return null;
 const choose=async(name:string)=>{setLoading(true);try{const r=await fetch(`/api/cards/named?name=${encodeURIComponent(name)}`);if(!r.ok)throw new Error();const card=await r.json() as CardDefinition;onChoose(card);onClose();setQ('');setItems([]);}catch{setError('Card lookup failed.');}finally{setLoading(false)}};
 return <div className="fixed inset-0 z-50 flex items-end bg-black/70"><div className="safe-bottom max-h-[82vh] w-full rounded-t-3xl bg-[#181b1e] p-4"><div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/20"/><h2 className="text-xl font-black">Play a real card</h2><input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Search Scryfall…" className="mt-4 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-4 outline-none focus:border-emerald-400"/>{error&&<p className="mt-2 text-sm text-red-300">{error}</p>}<div className="mt-3 divide-y divide-white/10 overflow-y-auto">{items.map(name=><button disabled={loading} onClick={()=>choose(name)} key={name} className="block w-full py-3 text-left font-semibold">{name}</button>)}</div><button onClick={onClose} className="mt-3 w-full rounded-xl bg-white/10 py-3 font-bold">Cancel</button></div></div>
}
