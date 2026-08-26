import type { CardInstance } from '@/types/card';
import type { GameState } from '@/types/game';
import { AI_CARDS } from './deck';
import { createToken, currentStats, uid } from '@/lib/game/utils';

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

export function runAITurn(input: GameState, aiId: string): GameState {
  const game = structuredClone(input);
  const ai = game.players.find(player => player.id === aiId);
  const human = game.players.find(player => !player.isAI);
  if (!ai || !human) return game;

  const turn = aiTurnNumber(game.turnNumber);

  // Beginning of turn: untap permanents that were already in play and remove
  // summoning sickness before the AI casts anything new this turn.
  ai.battlefield.forEach(card => {
    card.tapped = false;
    if (card.summoningSick) card.summoningSick = false;
  });

  // Draw for turn. The first AI turn still receives a normal draw for the MVP.
  ai.handCount += 1;

  const rampCount = ai.battlefield.filter(card => card.name === 'Mana Stone').length;
  const landMana = Math.min(turn, 7);
  ai.availableMana = landMana + rampCount;

  let mana = ai.availableMana;
  let acted = false;

  const removal = AI_CARDS.find(card => card.kind === 'removal');
  const draw = AI_CARDS.find(card => card.kind === 'draw');
  const ramp = AI_CARDS.find(card => card.kind === 'ramp');

  const humanCreatures = human.battlefield.filter(card => card.basePower !== undefined);
  const biggestThreat = humanCreatures.slice().sort((a, b) => scoreCreature(b) - scoreCreature(a))[0];

  // Deterministic variation: the AI follows different priorities on different
  // turns instead of always casting the largest creature it can afford.
  const pattern = (turn + ai.battlefield.length + ai.handCount) % 5;

  if (turn >= 3 && biggestThreat && removal && mana >= removal.manaCost && (pattern === 0 || game.settings.difficulty === 'challenging')) {
    const index = human.battlefield.findIndex(card => card.instanceId === biggestThreat.instanceId);
    if (index >= 0) {
      const [destroyed] = human.battlefield.splice(index, 1);
      destroyed.zone = 'graveyard';
      human.graveyard.push(destroyed);
      mana -= removal.manaCost;
      ai.handCount = Math.max(0, ai.handCount - 1);
      acted = true;
      game.log.push({ id: uid(), turn: game.turnNumber, actor: ai.name, message: `Cast ${removal.name}; destroyed ${destroyed.name}.` });
    }
  } else if (turn >= 2 && ramp && mana >= ramp.manaCost && rampCount === 0 && pattern === 1) {
    const stone = createToken(ai.id, ramp.name);
    stone.summoningSick = false;
    ai.battlefield.push(stone);
    mana -= ramp.manaCost;
    ai.handCount = Math.max(0, ai.handCount - 1);
    acted = true;
    game.log.push({ id: uid(), turn: game.turnNumber, actor: ai.name, message: `Cast ${ramp.name}.` });
  } else if (turn >= 3 && draw && mana >= draw.manaCost && pattern === 2) {
    mana -= draw.manaCost;
    ai.handCount = Math.max(0, ai.handCount - 1) + (draw.amount ?? 2);
    acted = true;
    game.log.push({ id: uid(), turn: game.turnNumber, actor: ai.name, message: `Cast ${draw.name}; drew ${draw.amount ?? 2} cards.` });
  } else if (ai.handCount > 0 && ai.battlefield.filter(card => card.basePower !== undefined).length < 6) {
    const creature = chooseCreature(turn, mana, ai.battlefield);
    if (creature) {
      const card = createToken(ai.id, creature.name, creature.power, creature.toughness);
      card.summoningSick = true;
      ai.battlefield.push(card);
      mana -= creature.manaCost;
      ai.handCount = Math.max(0, ai.handCount - 1);
      acted = true;
      game.log.push({ id: uid(), turn: game.turnNumber, actor: ai.name, message: `Cast ${creature.name} (${creature.power}/${creature.toughness}${creature.flying ? ' Flying' : ''}).` });
    }
  }

  if (!acted) {
    game.log.push({ id: uid(), turn: game.turnNumber, actor: ai.name, message: mana > 0 ? `Held ${mana} mana open.` : 'No main-phase play.' });
  }

  ai.availableMana = mana;

  const attackers = ai.battlefield.filter(card => !card.tapped && !card.summoningSick && card.basePower !== undefined);
  let chosen: CardInstance[] = [];

  if (turn > 1) {
    if (game.settings.difficulty === 'learning') {
      // Learning AI is deliberately conservative and sometimes declines to attack.
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
