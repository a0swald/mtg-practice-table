import type { CardInstance } from '@/types/card';
import type { GameState } from '@/types/game';

const KEY = 'mtg-practice-table.game.v1';

function numericStat(value?: string): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function repairCard(card: CardInstance): CardInstance {
  const typeLine = card.definition?.typeLine.toLowerCase() ?? '';
  if (typeLine.includes('creature')) {
    if (card.basePower === undefined) card.basePower = numericStat(card.definition?.power) ?? 0;
    if (card.baseToughness === undefined) card.baseToughness = numericStat(card.definition?.toughness) ?? 0;
  }
  card.plusOneCounters ??= 0;
  card.minusOneCounters ??= 0;
  card.damageMarked ??= 0;
  card.temporaryPowerModifier ??= 0;
  card.temporaryToughnessModifier ??= 0;
  card.customCounters ??= [];
  return card;
}

function repairGame(game: GameState): GameState {
  game.players.forEach(player => {
    player.battlefield = player.battlefield.map(repairCard);
    player.graveyard = player.graveyard.map(repairCard);
    player.exile = player.exile.map(repairCard);
    if (player.commander) player.commander = repairCard(player.commander);
    if (player.virtualHand) player.virtualHand = player.virtualHand.map(repairCard);
    if (player.virtualLibrary) player.virtualLibrary = player.virtualLibrary.map(repairCard);
  });
  return game;
}

export function saveGame(game: GameState) {
  if (typeof window !== 'undefined') localStorage.setItem(KEY, JSON.stringify(game));
}

export function loadGame(): GameState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? repairGame(JSON.parse(raw) as GameState) : null;
  } catch {
    return null;
  }
}

export function clearGame() {
  if (typeof window !== 'undefined') localStorage.removeItem(KEY);
}
