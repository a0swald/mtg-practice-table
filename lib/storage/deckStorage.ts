import type { SavedDeck } from '@/types/deck';

const KEY = 'mtg-practice-table.decks.v1';

export function loadDecks(): SavedDeck[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) as SavedDeck[] : [];
  } catch {
    return [];
  }
}

export function saveDecks(decks: SavedDeck[]) {
  if (typeof window !== 'undefined') localStorage.setItem(KEY, JSON.stringify(decks));
}

export function upsertDeck(deck: SavedDeck) {
  const decks = loadDecks();
  const index = decks.findIndex(entry => entry.id === deck.id);
  if (index >= 0) decks[index] = deck;
  else decks.push(deck);
  saveDecks(decks);
}

export function deleteDeck(id: string) {
  saveDecks(loadDecks().filter(deck => deck.id !== id));
}

export function getDeck(id: string): SavedDeck | undefined {
  return loadDecks().find(deck => deck.id === id);
}
