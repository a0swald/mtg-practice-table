'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CardDefinition } from '@/types/card';
import type { SavedDeck } from '@/types/deck';
import { deleteDeck, loadDecks, upsertDeck } from '@/lib/storage/deckStorage';

function uid() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

function parseDeckList(text: string): { quantity: number; name: string }[] {
  const entries: { quantity: number; name: string }[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || /^(commander|deck|sideboard|maybeboard|companion)$/i.test(line)) continue;
    const match = line.match(/^(\d+)\s+(.+?)(?:\s+\([A-Z0-9]+\)\s+\S+.*)?$/i);
    if (!match) continue;
    const quantity = Number.parseInt(match[1], 10);
    const name = match[2].replace(/\s+\*F\*$/i, '').trim();
    if (quantity > 0 && name) entries.push({ quantity, name });
  }
  return entries;
}

async function lookup(name: string): Promise<CardDefinition> {
  const response = await fetch(`/api/cards/named?name=${encodeURIComponent(name)}`);
  if (!response.ok) throw new Error(`Could not find ${name}`);
  return response.json() as Promise<CardDefinition>;
}

export default function DecksPage() {
  const router = useRouter();
  const [decks, setDecks] = useState<SavedDeck[]>([]);
  const [name, setName] = useState('');
  const [commanderName, setCommanderName] = useState('');
  const [list, setList] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => setDecks(loadDecks()), []);
  const parsedCount = useMemo(() => parseDeckList(list).reduce((sum, entry) => sum + entry.quantity, 0), [list]);

  async function importDeck() {
    const deckName = name.trim();
    const commanderText = commanderName.trim();
    if (!deckName || !commanderText) { setStatus('Deck name and commander are required.'); return; }
    const parsed = parseDeckList(list);
    if (!parsed.length) { setStatus('Paste a decklist with lines like “1 Sol Ring”.'); return; }

    setBusy(true);
    setStatus('Looking up commander…');
    try {
      const commander = await lookup(commanderText);
      const commanderType = commander.typeLine.toLowerCase();
      if (!commanderType.includes('legendary') || (!commanderType.includes('creature') && !commander.oracleText?.toLowerCase().includes('can be your commander'))) {
        throw new Error(`${commander.name} is not recognized as a commander.`);
      }

      const quantities = new Map<string, number>();
      parsed.forEach(entry => quantities.set(entry.name, (quantities.get(entry.name) ?? 0) + entry.quantity));
      const commanderKey = [...quantities.keys()].find(cardName => cardName.toLowerCase() === commander.name.toLowerCase());
      if (commanderKey) {
        const remaining = (quantities.get(commanderKey) ?? 0) - 1;
        if (remaining > 0) quantities.set(commanderKey, remaining); else quantities.delete(commanderKey);
      }

      const unique = [...quantities.entries()];
      const definitions = new Map<string, CardDefinition>();
      for (let index = 0; index < unique.length; index += 1) {
        const [cardName] = unique[index];
        setStatus(`Importing ${index + 1}/${unique.length}: ${cardName}`);
        definitions.set(cardName, await lookup(cardName));
        await new Promise(resolve => window.setTimeout(resolve, 115));
      }

      const cards: CardDefinition[] = [];
      unique.forEach(([cardName, quantity]) => {
        const definition = definitions.get(cardName);
        if (definition) for (let copy = 0; copy < quantity; copy += 1) cards.push(definition);
      });

      if (cards.length !== 99) throw new Error(`This import has ${cards.length} non-commander cards. Commander decks should normally have 99.`);
      const now = new Date().toISOString();
      const deck: SavedDeck = { id: uid(), name: deckName, commander, cards, createdAt: now, updatedAt: now };
      upsertDeck(deck);
      const next = loadDecks();
      setDecks(next);
      setName(''); setCommanderName(''); setList('');
      setStatus(`${deck.name} imported: ${deck.commander.name} + 99 cards.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Deck import failed.');
    } finally {
      setBusy(false);
    }
  }

  return <main className="mx-auto min-h-screen w-[94vw] max-w-4xl py-6 sm:w-[90vw]">
    <header className="mb-5 flex items-center justify-between"><button onClick={()=>router.push('/')} className="rounded-xl bg-white/5 px-3 py-2 text-sm font-bold text-zinc-300">← Main Menu</button><div className="text-right"><div className="text-xs font-black uppercase tracking-[.2em] text-emerald-300">Deck Library</div><h1 className="text-2xl font-black">My Commander Decks</h1></div></header>

    <div className="grid gap-5 lg:grid-cols-[1fr_.85fr]">
      <section className="rounded-3xl border border-white/10 bg-white/[.04] p-4 sm:p-5">
        <h2 className="text-lg font-black">Import a deck</h2>
        <p className="mt-1 text-sm leading-6 text-zinc-400">Paste a ManaBox/Moxfield-style list. The importer resolves real card data through Scryfall and stores the deck locally on this device.</p>
        <label className="mt-4 block text-xs font-black uppercase tracking-wider text-zinc-500">Deck name<input value={name} onChange={event=>setName(event.target.value)} placeholder="Jeskai Spells" className="mt-1 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-3 text-sm normal-case text-white outline-none focus:border-emerald-400"/></label>
        <label className="mt-3 block text-xs font-black uppercase tracking-wider text-zinc-500">Commander<input value={commanderName} onChange={event=>setCommanderName(event.target.value)} placeholder="Shiko and Narset, Unified" className="mt-1 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-3 text-sm normal-case text-white outline-none focus:border-emerald-400"/></label>
        <label className="mt-3 block text-xs font-black uppercase tracking-wider text-zinc-500">Decklist · {parsedCount} cards parsed<textarea value={list} onChange={event=>setList(event.target.value)} rows={14} placeholder={'1 Sol Ring\n1 Arcane Signet\n1 Guttersnipe\n...'} className="mt-1 w-full resize-y rounded-xl border border-white/10 bg-black/25 px-3 py-3 font-mono text-xs normal-case text-white outline-none focus:border-emerald-400"/></label>
        {status && <div className="mt-3 rounded-xl bg-black/20 p-3 text-sm text-zinc-300">{status}</div>}
        <button disabled={busy} onClick={importDeck} className="mt-4 w-full rounded-2xl bg-emerald-400 px-4 py-4 font-black text-zinc-950 disabled:opacity-40">{busy ? 'IMPORTING…' : 'IMPORT DECK'}</button>
      </section>

      <section className="space-y-3">
        <div><div className="text-xs font-black uppercase tracking-[.16em] text-zinc-500">Saved locally</div><h2 className="text-xl font-black">{decks.length} deck{decks.length === 1 ? '' : 's'}</h2></div>
        {decks.length === 0 && <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-zinc-500">No imported decks yet.</div>}
        {decks.map(deck => <article key={deck.id} className="rounded-2xl border border-white/10 bg-white/[.035] p-4">
          <div className="flex gap-3">{deck.commander.imageUrl && <img src={deck.commander.imageUrl} alt={deck.commander.name} className="w-20 rounded-lg"/>}<div className="min-w-0 flex-1"><h3 className="truncate text-lg font-black">{deck.name}</h3><div className="mt-1 text-sm font-bold text-emerald-200">{deck.commander.name}</div><div className="mt-1 text-xs text-zinc-500">99-card library · {deck.commander.colorIdentity.join('/') || 'Colorless'}</div></div></div>
          <button onClick={()=>{deleteDeck(deck.id);setDecks(loadDecks())}} className="mt-3 w-full rounded-xl border border-red-400/15 bg-red-400/[.05] py-2 text-xs font-black text-red-200">DELETE</button>
        </article>)}
      </section>
    </div>
  </main>;
}
