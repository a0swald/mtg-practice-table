import type { CardDefinition, CardInstance } from '@/types/card';
import type { GameSettings, GameState, PlayerState } from '@/types/game';

export const uid = () => typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

export function numericStat(value?: string): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function entersTapped(definition: CardDefinition): boolean {
  const oracle = definition.oracleText?.toLowerCase() ?? '';
  if (!oracle) return false;

  const name = definition.name.toLowerCase();
  const normalized = oracle.replaceAll('~', name);

  return (
    normalized.includes('enters the battlefield tapped') ||
    normalized.includes('enters tapped') ||
    normalized.includes(`${name} enters the battlefield tapped`) ||
    normalized.includes(`${name} enters tapped`)
  );
}

export function createCardInstance(definition: CardDefinition, ownerId: string, zone: CardInstance['zone'] = 'battlefield'): CardInstance {
  const creature = definition.typeLine.toLowerCase().includes('creature');
  const tappedOnEntry = zone === 'battlefield' && entersTapped(definition);
  return {
    instanceId: uid(), cardId: definition.id, definition, name: definition.name, zone, tapped: tappedOnEntry,
    basePower: numericStat(definition.power), baseToughness: numericStat(definition.toughness),
    plusOneCounters: 0, minusOneCounters: 0, damageMarked: 0,
    temporaryPowerModifier: 0, temporaryToughnessModifier: 0, customCounters: [],
    summoningSick: zone === 'battlefield' && creature, token: false, ownerId, controllerId: ownerId,
  };
}

export function createToken(ownerId: string, name: string, power?: number, toughness?: number, quantity = 1): CardInstance {
  return {
    instanceId: uid(), name, zone: 'battlefield', tapped: false, basePower: power, baseToughness: toughness,
    plusOneCounters: 0, minusOneCounters: 0, damageMarked: 0, temporaryPowerModifier: 0, temporaryToughnessModifier: 0,
    customCounters: [], summoningSick: power !== undefined, token: true, tokenQuantity: quantity, ownerId, controllerId: ownerId,
  };
}

export function currentStats(card: CardInstance) {
  if (card.basePower === undefined || card.baseToughness === undefined) return undefined;
  const delta = card.plusOneCounters - card.minusOneCounters;
  return {
    power: card.basePower + delta + card.temporaryPowerModifier,
    toughness: card.baseToughness + delta + card.temporaryToughnessModifier,
  };
}

function player(id: string, name: string, life: number, isAI: boolean): PlayerState {
  return { id, name, isAI, life, handCount: isAI ? 7 : 0, libraryCount: isAI ? 92 : undefined, graveyard: [], exile: [], battlefield: [], commanderTax: 0, commanderDamage: {}, availableMana: 0 };
}

export function newGame(settings: GameSettings): GameState {
  const human = player('player', 'You', settings.startingLife, false);
  const opponents = Array.from({ length: settings.aiOpponents }, (_, i) => player(`ai-${i + 1}`, settings.aiOpponents === 1 ? 'Opponent' : `Opponent ${i + 1}`, settings.startingLife, true));
  const now = new Date().toISOString();
  return { id: uid(), settings, players: [human, ...opponents], turnNumber: 1, activePlayerId: 'player', phase: 'Main 1', spellsCastThisTurn: 0, log: [{ id: uid(), turn: 1, actor: 'Game', message: 'Game started.' }], startedAt: now, updatedAt: now };
}
