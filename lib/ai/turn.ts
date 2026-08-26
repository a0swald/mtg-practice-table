import type { CardInstance } from '@/types/card';
import type { GameState, PendingAIAction } from '@/types/game';
import { AI_CARDS } from './deck';
import { currentStats, uid } from '@/lib/game/utils';

function aiTurnNumber(globalTurn: number): number {
  return Math.max(1, Math.ceil(globalTurn / 2));
}

function scoreCreature(card: CardInstance): number {
  const stats = currentStats(card);
  if (!stats) return 0;
  return stats.power * 2 + stats.toughness + card.plusOneCounters * 2;
}

function chooseCreature(turn: number, mana: number, battlefield: CardInstance[]) {
  const creatures = AI_CARDS.filter(card => card.kind === 'creature' && card.manaCost <= mana);
  if (!creatures.length) return undefined;
  const namesInPlay = new Set(battlefield.map(card => card.name));
  const freshChoices = creatures.filter(card => !namesInPlay.has(card.name));
  const pool = freshChoices.length ? freshChoices : creatures;
  return pool[(turn * 3 + battlefield.length) % pool.length];
}

function deterministicRoll(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function attackTaxPerCreature(humanBattlefield: CardInstance[]): { amount: number; sources: string[] } {
  let amount = 0;
  const sources: string[] = [];

  humanBattlefield.forEach(card => {
    const oracle = card.definition?.oracleText?.toLowerCase() ?? '';
    if (!oracle.includes("can't attack you unless") || !oracle.includes('for each creature')) return;

    const match = oracle.match(/pays \{(\d+)\}/);
    const tax = match ? Number.parseInt(match[1], 10) : 0;
    if (tax > 0) {
      amount += tax;
      sources.push(card.name);
    }
  });

  return { amount, sources };
}

function shouldPayAttackTax(game: GameState, ai: NonNullable<GameState['players'][number]>, humanLife: number, totalPotentialPower: number, sourceNames: string[]): boolean {
  if (totalPotentialPower >= humanLife) return true;
  if (humanLife <= 6) return true;

  const threshold = game.settings.difficulty === 'learning'
    ? 0.4
    : game.settings.difficulty === 'casual'
      ? 0.65
      : 0.85;

  const seed = `${game.id}:${game.turnNumber}:${ai.id}:${ai.life}:${humanLife}:${ai.handCount}:${sourceNames.join('|')}`;
  return deterministicRoll(seed) < threshold;
}

function beginCombat(game: GameState, aiId: string): GameState {
  const ai = game.players.find(player => player.id === aiId);
  const human = game.players.find(player => !player.isAI);
  if (!ai || !human) return game;

  const turn = aiTurnNumber(game.turnNumber);
  const humanCreatures = human.battlefield.filter(card => card.basePower !== undefined);
  const attackers = ai.battlefield.filter(card => !card.tapped && !card.summoningSick && card.basePower !== undefined);
  let chosen: CardInstance[] = [];

  if (turn > 1) {
    if (game.settings.difficulty === 'learning') {
      if (turn % 3 !== 0) chosen = attackers.slice(0, 1);
    } else if (game.settings.difficulty === 'casual') {
      const safeAttackers = attackers.filter(card => (currentStats(card)?.power ?? 0) >= 2 || humanCreatures.length === 0);
      chosen = safeAttackers.slice(0, Math.min(2, safeAttackers.length));
    } else {
      chosen = attackers
        .slice()
        .sort((a, b) => scoreCreature(b) - scoreCreature(a))
        .filter((card, index) => human.life <= 8 || index < Math.max(1, attackers.length - 1));
    }
  }

  const attackTax = attackTaxPerCreature(human.battlefield);
  if (chosen.length && attackTax.amount > 0) {
    const manaAvailable = ai.availableMana ?? 0;
    const maxTaxedAttackers = Math.floor(manaAvailable / attackTax.amount);
    const potentialPower = chosen.reduce((sum, card) => sum + (currentStats(card)?.power ?? 0), 0);
    const willingToPay = shouldPayAttackTax(game, ai, human.life, potentialPower, attackTax.sources);

    if (!willingToPay || maxTaxedAttackers <= 0) {
      game.log.push({
        id: uid(),
        turn: game.turnNumber,
        actor: ai.name,
        message: `${attackTax.sources.join(' + ')} requires ${attackTax.amount} mana per attacker. ${ai.name} chose not to pay and did not attack.`,
      });
      chosen = [];
    } else {
      chosen = chosen
        .slice()
        .sort((a, b) => scoreCreature(b) - scoreCreature(a))
        .slice(0, maxTaxedAttackers);

      const taxPaid = chosen.length * attackTax.amount;
      ai.availableMana = Math.max(0, manaAvailable - taxPaid);
      game.log.push({
        id: uid(),
        turn: game.turnNumber,
        actor: ai.name,
        message: `${attackTax.sources.join(' + ')} taxes attacks. ${ai.name} paid ${taxPaid} mana for ${chosen.length} attacker${chosen.length === 1 ? '' : 's'}.`,
      });
    }
  }

  if (chosen.length) {
    chosen.forEach(card => { card.tapped = true; });
    const totalPower = chosen.reduce((sum, card) => sum + (currentStats(card)?.power ?? 0), 0);
    game.pendingCombat = {
      attackerId: ai.id,
      defenderId: human.id,
      attackerInstanceIds: chosen.map(card => card.instanceId),
      totalPower,
      source: 'ai',
    };
    game.log.push({ id: uid(), turn: game.turnNumber, actor: ai.name, message: `Attacks for ${totalPower}.` });
  } else {
    game.log.push({ id: uid(), turn: game.turnNumber, actor: ai.name, message: 'Passed combat.' });
  }

  game.updatedAt = new Date().toISOString();
  return game;
}

export function continueAITurn(game: GameState, aiId: string): GameState {
  return beginCombat(structuredClone(game), aiId);
}

export function runAITurn(input: GameState, aiId: string): GameState {
  const game = structuredClone(input);
  const ai = game.players.find(player => player.id === aiId);
  const human = game.players.find(player => !player.isAI);
  if (!ai || !human) return game;

  const turn = aiTurnNumber(game.turnNumber);

  ai.battlefield.forEach(card => {
    card.tapped = false;
    if (card.summoningSick) card.summoningSick = false;
  });

  ai.handCount += 1;

  const rampCount = ai.battlefield.filter(card => card.name === 'Mana Stone').length;
  const landMana = Math.min(turn, 7);
  ai.availableMana = landMana + rampCount;

  let mana = ai.availableMana;
  const removal = AI_CARDS.find(card => card.kind === 'removal');
  const draw = AI_CARDS.find(card => card.kind === 'draw');
  const ramp = AI_CARDS.find(card => card.kind === 'ramp');
  const humanCreatures = human.battlefield.filter(card => card.basePower !== undefined);
  const biggestThreat = humanCreatures.slice().sort((a, b) => scoreCreature(b) - scoreCreature(a))[0];
  const pattern = (turn + ai.battlefield.length + ai.handCount) % 5;

  let pending: PendingAIAction | undefined;

  if (turn >= 3 && biggestThreat && removal && mana >= removal.manaCost && (pattern === 0 || game.settings.difficulty === 'challenging')) {
    pending = {
      aiId,
      kind: 'removal',
      cardName: removal.name,
      manaCost: removal.manaCost,
      targetInstanceId: biggestThreat.instanceId,
      targetName: biggestThreat.name,
    };
  } else if (turn >= 2 && ramp && mana >= ramp.manaCost && rampCount === 0 && pattern === 1) {
    pending = { aiId, kind: 'ramp', cardName: ramp.name, manaCost: ramp.manaCost, amount: ramp.amount ?? 1 };
  } else if (turn >= 3 && draw && mana >= draw.manaCost && pattern === 2) {
    pending = { aiId, kind: 'draw', cardName: draw.name, manaCost: draw.manaCost, amount: draw.amount ?? 2 };
  } else if (ai.handCount > 0 && ai.battlefield.filter(card => card.basePower !== undefined).length < 6) {
    const creature = chooseCreature(turn, mana, ai.battlefield);
    if (creature) {
      pending = {
        aiId,
        kind: 'creature',
        cardName: creature.name,
        manaCost: creature.manaCost,
        power: creature.power,
        toughness: creature.toughness,
        flying: creature.flying,
      };
    }
  }

  if (!pending) {
    ai.availableMana = mana;
    game.log.push({ id: uid(), turn: game.turnNumber, actor: ai.name, message: mana > 0 ? `Held ${mana} mana open.` : 'No main-phase play.' });
    return beginCombat(game, aiId);
  }

  mana -= pending.manaCost;
  ai.availableMana = mana;
  ai.handCount = Math.max(0, ai.handCount - 1);
  game.pendingAIAction = pending;
  game.log.push({
    id: uid(),
    turn: game.turnNumber,
    actor: ai.name,
    message: pending.kind === 'removal'
      ? `Cast ${pending.cardName}, targeting ${pending.targetName}. Waiting for your response.`
      : `Cast ${pending.cardName}. Waiting for your response.`,
  });
  game.updatedAt = new Date().toISOString();
  return game;
}
