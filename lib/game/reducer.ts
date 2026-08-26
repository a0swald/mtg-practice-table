import type { CardInstance, Zone } from '@/types/card';
import type { CombatBlock, GameState, PendingCombat } from '@/types/game';
import { continueAITurn, runAITurn } from '@/lib/ai/turn';
import { createToken, uid } from './utils';

export type BlockAssignment = {
  attackerId: string;
  blockerId: string;
};

export type GameAction =
  | { type: 'LIFE'; playerId: string; delta: number }
  | { type: 'ADD_CARD'; playerId: string; card: CardInstance }
  | { type: 'CAST_PLAYER_SPELL'; card: CardInstance }
  | { type: 'UPDATE_CARD'; playerId: string; instanceId: string; patch: Partial<CardInstance>; log?: string }
  | { type: 'MOVE_CARD'; playerId: string; instanceId: string; zone: Zone }
  | { type: 'PASS_TURN' }
  | { type: 'SET_COMBAT'; combat?: PendingCombat }
  | { type: 'RESOLVE_AI_ACTION' }
  | { type: 'COUNTER_AI_ACTION' }
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
  game.pendingAIAction = undefined;
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

function finishAIContinuation(game: GameState, aiId: string): GameState {
  const continued = continueAITurn(game, aiId);
  return continued.pendingCombat ? continued : startPlayerTurn(continued);
}

function cardPower(card: CardInstance): number {
  return (card.basePower ?? 0) + card.plusOneCounters - card.minusOneCounters + card.temporaryPowerModifier;
}

function cardToughness(card: CardInstance): number {
  return (card.baseToughness ?? 0) + card.plusOneCounters - card.minusOneCounters + card.temporaryToughnessModifier;
}

function creatureValue(card: CardInstance): number {
  return cardPower(card) * 2 + cardToughness(card) + card.plusOneCounters * 2;
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
      } else survivors.push(card);
    });
    player.battlefield = survivors;
  });
}

function chooseAIBlocks(game: GameState, attackers: CardInstance[], defenderId: string): CombatBlock[] {
  const defender = game.players.find(player => player.id === defenderId);
  if (!defender?.isAI) return [];

  const available = defender.battlefield.filter(card => card.basePower !== undefined && !card.tapped);
  if (!available.length) return [];

  const used = new Set<string>();
  const assignments: CombatBlock[] = [];
  const incomingPower = attackers.reduce((sum, card) => sum + cardPower(card), 0);
  const lifePressure = defender.life <= incomingPower + 4;

  const orderedAttackers = attackers.slice().sort((a, b) => creatureValue(b) - creatureValue(a));

  for (const attacker of orderedAttackers) {
    const candidates = available.filter(blocker => !used.has(blocker.instanceId));
    if (!candidates.length) break;

    const aPower = cardPower(attacker);
    const aToughness = cardToughness(attacker);

    const ranked = candidates.map(blocker => {
      const bPower = cardPower(blocker);
      const bToughness = cardToughness(blocker);
      const attackerDies = bPower + attacker.damageMarked >= aToughness;
      const blockerDies = aPower + blocker.damageMarked >= bToughness;
      const profitable = attackerDies && !blockerDies;
      const trade = attackerDies && blockerDies;
      const badBlock = !attackerDies && blockerDies;
      const valueSwing = creatureValue(attacker) - creatureValue(blocker);

      let score = 0;
      if (profitable) score += 100 + valueSwing;
      else if (trade) score += 45 + valueSwing;
      else if (!blockerDies) score += lifePressure ? 35 : 12;
      else if (lifePressure) score += 10;
      else score -= 80;

      if (game.settings.difficulty === 'learning' && badBlock && !lifePressure) score -= 30;
      if (game.settings.difficulty === 'challenging' && attackerDies) score += 15;

      return { blocker, score, attackerDies, blockerDies, profitable, trade };
    }).sort((a, b) => b.score - a.score);

    const best = ranked[0];
    const shouldBlock = best && (best.score > 0 || lifePressure);
    if (!best || !shouldBlock) continue;

    const blocker = best.blocker;
    used.add(blocker.instanceId);

    let reason = 'Blocks to reduce incoming damage.';
    if (best.profitable) reason = `${blocker.name} can defeat ${attacker.name} and survive.`;
    else if (best.trade) reason = `Trading ${blocker.name} for ${attacker.name} is worthwhile.`;
    else if (lifePressure) reason = 'Life total is under pressure, so the AI is willing to block defensively.';
    else if (!best.blockerDies) reason = `${blocker.name} can absorb the attack and survive.`;

    assignments.push({
      attackerId: attacker.instanceId,
      blockerId: blocker.instanceId,
      attackerName: attacker.name,
      blockerName: blocker.name,
      attackerPower: aPower,
      attackerToughness: aToughness,
      blockerPower: cardPower(blocker),
      blockerToughness: cardToughness(blocker),
      reason,
    });
  }

  return assignments;
}

function resolvePlayerBlocks(game: GameState, combat: PendingCombat) {
  if (combat.source !== 'player' || !combat.aiBlocks?.length) return;
  const attackerPlayer = game.players.find(player => player.id === combat.attackerId);
  const defender = game.players.find(player => player.id === combat.defenderId);
  if (!attackerPlayer || !defender) return;

  combat.aiBlocks.forEach(block => {
    const attacker = attackerPlayer.battlefield.find(card => card.instanceId === block.attackerId);
    const blocker = defender.battlefield.find(card => card.instanceId === block.blockerId);
    if (!attacker || !blocker) return;

    const damageToAttacker = cardPower(blocker);
    const damageToBlocker = cardPower(attacker);
    attacker.damageMarked += damageToAttacker;
    blocker.damageMarked += damageToBlocker;
    withLog(game, 'Combat', `${block.blockerName} blocked ${block.attackerName}: ${damageToAttacker} damage to attacker, ${damageToBlocker} damage to blocker.`);
  });

  moveLethalCreatures(game);
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

  if (action.type === 'CAST_PLAYER_SPELL') {
    const player = getPlayer('player');
    if (player) {
      action.card.zone = 'graveyard';
      player.graveyard.push(action.card);
      game.spellsCastThisTurn += 1;
      withLog(game, 'You', `Cast and resolved ${action.card.name}; moved it to graveyard.`);
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
      const aiBlocks = chooseAIBlocks(game, cards, action.defenderId);
      const blockedIds = new Set(aiBlocks.map(block => block.attackerId));
      const unblockedTotal = cards
        .filter(card => !blockedIds.has(card.instanceId))
        .reduce((sum, card) => sum + cardPower(card), 0);

      game.pendingCombat = {
        attackerId: player.id,
        defenderId: action.defenderId,
        attackerInstanceIds: action.attackerIds,
        totalPower: unblockedTotal,
        source: 'player',
        aiBlocks,
      };

      withLog(game, player.name, `Declared ${cards.length} attacker${cards.length === 1 ? '' : 's'}.`);
      if (aiBlocks.length) {
        aiBlocks.forEach(block => withLog(game, 'Opponent', `${block.blockerName} blocks ${block.attackerName}.`));
      } else {
        withLog(game, 'Opponent', 'No blocks declared.');
      }
    }
  }

  if (action.type === 'RESOLVE_AI_ACTION' && game.pendingAIAction) {
    const pending = game.pendingAIAction;
    const ai = getPlayer(pending.aiId);
    const human = getPlayer('player');
    game.pendingAIAction = undefined;

    if (ai) {
      if (pending.kind === 'creature') {
        const card = createToken(ai.id, pending.cardName, pending.power, pending.toughness);
        card.summoningSick = true;
        ai.battlefield.push(card);
        withLog(game, ai.name, `${pending.cardName} resolved and entered the battlefield.`);
      } else if (pending.kind === 'ramp') {
        const stone = createToken(ai.id, pending.cardName);
        stone.summoningSick = false;
        ai.battlefield.push(stone);
        withLog(game, ai.name, `${pending.cardName} resolved.`);
      } else if (pending.kind === 'draw') {
        ai.handCount += pending.amount ?? 2;
        withLog(game, ai.name, `${pending.cardName} resolved; drew ${pending.amount ?? 2} cards.`);
      } else if (pending.kind === 'removal' && human && pending.targetInstanceId) {
        const index = human.battlefield.findIndex(card => card.instanceId === pending.targetInstanceId);
        if (index >= 0) {
          const [destroyed] = human.battlefield.splice(index, 1);
          destroyed.zone = 'graveyard';
          human.graveyard.push(destroyed);
          withLog(game, ai.name, `${pending.cardName} resolved; destroyed ${destroyed.name}.`);
        } else {
          withLog(game, ai.name, `${pending.cardName} resolved, but its target was no longer available.`);
        }
      }
      return finishAIContinuation(game, ai.id);
    }
  }

  if (action.type === 'COUNTER_AI_ACTION' && game.pendingAIAction) {
    const pending = game.pendingAIAction;
    const ai = getPlayer(pending.aiId);
    game.pendingAIAction = undefined;
    withLog(game, 'You', `Countered ${pending.cardName}.`);
    if (ai) return finishAIContinuation(game, ai.id);
  }

  if (action.type === 'SET_COMBAT') {
    const previousCombat = game.pendingCombat;
    if (!action.combat && previousCombat?.source === 'player') resolvePlayerBlocks(game, previousCombat);
    game.pendingCombat = action.combat;
    if (!action.combat && game.activePlayerId !== 'player' && !game.pendingAIAction) return startPlayerTurn(game);
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
      if (!game.pendingCombat && !game.pendingAIAction) return startPlayerTurn(game);
    }
  }

  return game;
}
