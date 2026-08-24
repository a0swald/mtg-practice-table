import type { CardInstance, Zone } from '@/types/card';
import type { GameState, PendingCombat } from '@/types/game';
import { runAITurn } from '@/lib/ai/turn';
import { uid } from './utils';

export type GameAction =
  | { type: 'LIFE'; playerId: string; delta: number }
  | { type: 'ADD_CARD'; playerId: string; card: CardInstance }
  | { type: 'UPDATE_CARD'; playerId: string; instanceId: string; patch: Partial<CardInstance>; log?: string }
  | { type: 'MOVE_CARD'; playerId: string; instanceId: string; zone: Zone }
  | { type: 'PASS_TURN' }
  | { type: 'SET_COMBAT'; combat?: PendingCombat }
  | { type: 'RESOLVE_AI_DAMAGE'; amount: number }
  | { type: 'PLAYER_ATTACK'; attackerIds: string[]; defenderId: string }
  | { type: 'LOG'; actor: string; message: string };

function withLog(game: GameState, actor: string, message: string) { game.log.push({ id: uid(), turn: game.turnNumber, actor, message }); game.updatedAt = new Date().toISOString(); }

export function reduceGame(input: GameState, action: GameAction): GameState {
  let game = structuredClone(input);
  const getPlayer = (id: string) => game.players.find(p => p.id === id);
  if (action.type === 'LIFE') { const p = getPlayer(action.playerId); if (p) { const old = p.life; p.life += action.delta; withLog(game, p.name, `Life ${old} → ${p.life}.`); } }
  if (action.type === 'ADD_CARD') { const p = getPlayer(action.playerId); if (p) { if (action.card.zone === 'battlefield') p.battlefield.push(action.card); else if (action.card.zone === 'graveyard') p.graveyard.push(action.card); else if (action.card.zone === 'exile') p.exile.push(action.card); withLog(game, p.name, `Added ${action.card.name} to ${action.card.zone}.`); } }
  if (action.type === 'UPDATE_CARD') { const p = getPlayer(action.playerId); const c = p?.battlefield.find(x => x.instanceId === action.instanceId); if (p && c) { Object.assign(c, action.patch); withLog(game, p.name, action.log ?? `Updated ${c.name}.`); } }
  if (action.type === 'MOVE_CARD') { const p = getPlayer(action.playerId); if (p) { const index = p.battlefield.findIndex(x => x.instanceId === action.instanceId); if (index >= 0) { const [card] = p.battlefield.splice(index, 1); card.zone = action.zone; if (action.zone === 'graveyard') p.graveyard.push(card); else if (action.zone === 'exile') p.exile.push(card); withLog(game, p.name, `${card.name} → ${action.zone}.`); } } }
  if (action.type === 'PLAYER_ATTACK') { const p = getPlayer('player'); if (p) { const cards = p.battlefield.filter(c => action.attackerIds.includes(c.instanceId)); cards.forEach(c => c.tapped = true); const total = cards.reduce((s,c) => s + ((c.basePower ?? 0) + c.plusOneCounters - c.minusOneCounters + c.temporaryPowerModifier), 0); game.pendingCombat = { attackerId: p.id, defenderId: action.defenderId, attackerInstanceIds: action.attackerIds, totalPower: total, source: 'player' }; withLog(game, p.name, `Attacks for ${total}.`); } }
  if (action.type === 'SET_COMBAT') game.pendingCombat = action.combat;
  if (action.type === 'RESOLVE_AI_DAMAGE') { const human = getPlayer('player'); if (human) { const old = human.life; human.life -= action.amount; withLog(game, 'Combat', `You took ${action.amount} damage (${old} → ${human.life}).`); } game.pendingCombat = undefined; }
  if (action.type === 'LOG') withLog(game, action.actor, action.message);
  if (action.type === 'PASS_TURN') {
    game.players.forEach(p => p.battlefield.forEach(c => { c.damageMarked = 0; c.temporaryPowerModifier = 0; c.temporaryToughnessModifier = 0; c.customCounters = c.customCounters.filter(x => !x.temporary); }));
    if (game.activePlayerId === 'player') {
      const ai = game.players.find(p => p.isAI);
      if (ai) { game.activePlayerId = ai.id; game.turnNumber += 1; game.spellsCastThisTurn = 0; withLog(game, ai.name, 'Turn started.'); game = runAITurn(game, ai.id); }
    } else {
      game.activePlayerId = 'player'; game.turnNumber += 1; game.spellsCastThisTurn = 0;
      const human = getPlayer('player'); human?.battlefield.forEach(c => { c.tapped = false; c.summoningSick = false; });
      withLog(game, 'You', 'Turn started.');
    }
  }
  return game;
}
