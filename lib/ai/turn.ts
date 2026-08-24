import type { GameState } from '@/types/game';
import { AI_CARDS } from './deck';
import { createToken, uid } from '@/lib/game/utils';

export function runAITurn(input: GameState, aiId: string): GameState {
  const game = structuredClone(input);
  const ai = game.players.find(p => p.id === aiId);
  const human = game.players.find(p => !p.isAI);
  if (!ai || !human) return game;
  const landCount = Math.min(game.turnNumber, 7);
  ai.availableMana = landCount;
  const affordable = AI_CARDS.filter(c => c.kind === 'creature' && c.manaCost <= landCount);
  const template = affordable[(game.turnNumber + aiId.length) % Math.max(1, affordable.length)] ?? AI_CARDS[0];
  if (template && ai.battlefield.length < 7) {
    const card = createToken(ai.id, template.name, template.power, template.toughness);
    card.summoningSick = true;
    ai.battlefield.push(card);
    ai.handCount = Math.max(0, ai.handCount - 1);
    game.log.push({ id: uid(), turn: game.turnNumber, actor: ai.name, message: `Cast ${template.name} (${template.power}/${template.toughness}${template.flying ? ' Flying' : ''}).` });
  }
  ai.battlefield.forEach(c => { if (c.summoningSick) c.summoningSick = false; });
  const attackers = ai.battlefield.filter(c => !c.tapped && !c.summoningSick && c.basePower !== undefined);
  const chosen = game.settings.difficulty === 'learning' ? attackers.slice(0, 1) : game.settings.difficulty === 'casual' ? attackers.slice(0, 2) : attackers;
  if (chosen.length) {
    chosen.forEach(c => { c.tapped = true; });
    const totalPower = chosen.reduce((sum, c) => sum + (c.basePower ?? 0) + c.plusOneCounters - c.minusOneCounters, 0);
    game.pendingCombat = { attackerId: ai.id, defenderId: human.id, attackerInstanceIds: chosen.map(c => c.instanceId), totalPower, source: 'ai' };
    game.log.push({ id: uid(), turn: game.turnNumber, actor: ai.name, message: `Attacks for ${totalPower}.` });
  } else game.log.push({ id: uid(), turn: game.turnNumber, actor: ai.name, message: 'Passed combat.' });
  game.updatedAt = new Date().toISOString();
  return game;
}
