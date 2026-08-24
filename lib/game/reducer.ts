import type { CardInstance, Zone } from '@/types/card';
import type { GameState, PendingCombat } from '@/types/game';
import { runAITurn } from '@/lib/ai/turn';
import { uid } from './utils';

export type BlockAssignment = {
  attackerId: string;
  blockerId: string;
};

export type GameAction =
  | { type: 'LIFE'; playerId: string; delta: number }
  | { type: 'ADD_CARD'; playerId: string; card: CardInstance }
  | { type: 'UPDATE_CARD'; playerId: string; instanceId: string; patch: Partial<CardInstance>; log?: string }
  | { type: 'MOVE_CARD'; playerId: string; instanceId: string; zone: Zone }
  | { type: 'PASS_TURN' }
  | { type: 'SET_COMBAT'; combat?: PendingCombat }
  | { type: 'RESOLVE_AI_DAMAGE'; amount: number }
  | { type: 'RESOLVE_BLOCKS'; assignments: BlockAssignment[] }
  | { type: 'PLAYER_ATTACK'; attackerIds: string[]; defenderId: string }
  | { type: 'LOG'; actor: string; message: string };

function withLog(game: GameState, actor: string, message: string) {
  game.log.push({ id: uid(), turn: game.turnNumber, actor, message });
  game.updatedAt = new Date().toISOString();
}

function cleanupTurn(game: GameState) {
  game.players.forEach(player => player.battlefield.forEach(card => {
    card.damageMarked = 0;
    card.temporaryPowerModifier = 0;
    card.temporaryToughnessModifier = 0;
    card.customCounters = card.customCounters.filter(counter => !counter.temporary);
  }));
}

function startPlayerTurn(game: GameState): GameState {
  cleanupTurn(game);
  game.pendingCombat = undefined;
  game.activePlayerId = 'player';
  game.turnNumber += 1;
  game.spellsCastThisTurn = 0;
  const human = game.players.find(player => player.id === 'player');
  human?.battlefield.forEach(card => {
    card.tapped = false;
    card.summoningSick = false;
  });
  withLog(game, 'You', 'Turn started.');
  return game;
}

function cardPower(card: CardInstance): number {
  return (card.basePower ?? 0)
    + card.plusOneCounters
    - card.minusOneCounters
    + card.temporaryPowerModifier;
}

function cardToughness(card: CardInstance): number {
  return (card.baseToughness ?? 0)
    + card.plusOneCounters
    - card.minusOneCounters
    + card.temporaryToughnessModifier;
}

function moveLethalCreatures(game: GameState) {
  game.players.forEach(player => {
    const survivors: CardInstance[] = [];
    player.battlefield.forEach(card => {
      const isCreature = card.baseToughness !== undefined;
      const lethal = isCreature && card.damageMarked >= cardToughness(card);
      if (lethal) {
        card.zone = 'graveyard';
        player.graveyard.push(card);
        withLog(game, 'Combat', `${card.name} was destroyed by lethal damage.`);
      } else {
        survivors.push(card);
      }
    });
    player.battlefield = survivors;
  });
}

export function reduceGame(input: GameState, action: GameAction): GameState {
  let game = structuredClone(input);
  const getPlayer = (id: string) => game.players.find(player => player.id === id);

  if (action.type === 'LIFE') {
    const player = getPlayer(action.playerId);
    if (player) {
      const old = player.life;
      player.life += action.delta;
      withLog(game, player.name, `Life ${old} → ${player.life}.`);
    }
  }

  if (action.type === 'ADD_CARD') {
    const player = getPlayer(action.playerId);
    if (player) {
      if (action.card.zone === 'battlefield') player.battlefield.push(action.card);
      else if (action.card.zone === 'graveyard') player.graveyard.push(action.card);
      else if (action.card.zone === 'exile') player.exile.push(action.card);
      withLog(game, player.name, `Added ${action.card.name} to ${action.card.zone}.`);
    }
  }

  if (action.type === 'UPDATE_CARD') {
    const player = getPlayer(action.playerId);
    const card = player?.battlefield.find(entry => entry.instanceId === action.instanceId);
    if (player && card) {
      Object.assign(card, action.patch);
      withLog(game, player.name, action.log ?? `Updated ${card.name}.`);
    }
  }

  if (action.type === 'MOVE_CARD') {
    const player = getPlayer(action.playerId);
    if (player) {
      const index = player.battlefield.findIndex(entry => entry.instanceId === action.instanceId);
      if (index >= 0) {
        const [card] = player.battlefield.splice(index, 1);
        card.zone = action.zone;
        if (action.zone === 'graveyard') player.graveyard.push(card);
        else if (action.zone === 'exile') player.exile.push(card);
        withLog(game, player.name, `${card.name} → ${action.zone}.`);
      }
    }
  }

  if (action.type === 'PLAYER_ATTACK') {
    const player = getPlayer('player');
    if (player) {
      const cards = player.battlefield.filter(card => action.attackerIds.includes(card.instanceId));
      cards.forEach(card => { card.tapped = true; });
      const total = cards.reduce((sum, card) => sum + cardPower(card), 0);
      game.pendingCombat = {
        attackerId: player.id,
        defenderId: action.defenderId,
        attackerInstanceIds: action.attackerIds,
        totalPower: total,
        source: 'player',
      };
      withLog(game, player.name, `Attacks for ${total}.`);
    }
  }

  if (action.type === 'SET_COMBAT') {
    game.pendingCombat = action.combat;
    if (!action.combat && game.activePlayerId !== 'player') return startPlayerTurn(game);
  }

  if (action.type === 'RESOLVE_AI_DAMAGE') {
    const human = getPlayer('player');
    if (human) {
      const old = human.life;
      human.life -= action.amount;
      withLog(game, 'Combat', `You took ${action.amount} damage (${old} → ${human.life}).`);
    }
    game.pendingCombat = undefined;
    if (game.activePlayerId !== 'player') return startPlayerTurn(game);
  }

  if (action.type === 'RESOLVE_BLOCKS') {
    const combat = game.pendingCombat;
    const human = getPlayer('player');
    const attackerPlayer = combat ? getPlayer(combat.attackerId) : undefined;

    if (combat?.source === 'ai' && human && attackerPlayer) {
      const assignmentByAttacker = new Map(action.assignments.map(entry => [entry.attackerId, entry.blockerId]));
      let unblockedDamage = 0;

      combat.attackerInstanceIds.forEach(attackerId => {
        const attacker = attackerPlayer.battlefield.find(card => card.instanceId === attackerId);
        if (!attacker) return;

        const blockerId = assignmentByAttacker.get(attackerId);
        const blocker = blockerId ? human.battlefield.find(card => card.instanceId === blockerId) : undefined;

        if (!blocker) {
          unblockedDamage += cardPower(attacker);
          withLog(game, 'Combat', `${attacker.name} was unblocked for ${cardPower(attacker)} damage.`);
          return;
        }

        const attackerDamage = cardPower(blocker);
        const blockerDamage = cardPower(attacker);
        attacker.damageMarked += attackerDamage;
        blocker.damageMarked += blockerDamage;
        withLog(game, 'Combat', `${blocker.name} blocked ${attacker.name}: ${attackerDamage} damage to attacker, ${blockerDamage} damage to blocker.`);
      });

      if (unblockedDamage > 0) {
        const old = human.life;
        human.life -= unblockedDamage;
        withLog(game, 'Combat', `You took ${unblockedDamage} unblocked damage (${old} → ${human.life}).`);
      }

      moveLethalCreatures(game);
      game.pendingCombat = undefined;
      return startPlayerTurn(game);
    }
  }

  if (action.type === 'LOG') withLog(game, action.actor, action.message);

  if (action.type === 'PASS_TURN') {
    if (game.activePlayerId !== 'player') return game;

    cleanupTurn(game);
    const ai = game.players.find(player => player.isAI);
    if (ai) {
      game.activePlayerId = ai.id;
      game.turnNumber += 1;
      game.spellsCastThisTurn = 0;
      withLog(game, ai.name, 'Turn started.');
      game = runAITurn(game, ai.id);

      if (!game.pendingCombat) return startPlayerTurn(game);
    }
  }

  return game;
}
