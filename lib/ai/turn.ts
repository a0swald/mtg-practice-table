import type { CardInstance } from '@/types/card';
import type { AICardTemplate } from '@/types/ai';
import type { GameState, PendingAIAction } from '@/types/game';
import { currentStats, uid } from '@/lib/game/utils';
import { parseSimpleOracleEffects } from '@/lib/game/oracleEffects';

function aiTurnNumber(globalTurn:number){return Math.max(1,Math.ceil(globalTurn/2));}
function oracleWeight(card:CardInstance){const text=card.definition?.oracleText?.toLowerCase()??'';let score=0;if(text.includes('draw'))score+=5;if(text.includes('whenever'))score+=4;if(text.includes('each opponent'))score+=5;if(text.includes('damage'))score+=4;if(text.includes('flying'))score+=2;if(text.includes('deathtouch'))score+=3;if(text.includes('lifelink'))score+=2;if(text.includes('create'))score+=3;if(text.includes("can't attack you unless"))score+=7;return score;}
function scoreCreature(card:CardInstance){const stats=currentStats(card);return stats?stats.power*2+stats.toughness+card.plusOneCounters*2+oracleWeight(card):oracleWeight(card);}
function deterministicRoll(seed:string){let hash=2166136261;for(let i=0;i<seed.length;i+=1){hash^=seed.charCodeAt(i);hash=Math.imul(hash,16777619);}return(hash>>>0)/4294967295;}
function attackTaxPerCreature(cards:CardInstance[]){let amount=0;const sources:string[]=[];cards.forEach(card=>{const oracle=card.definition?.oracleText?.toLowerCase()??'';if(!oracle.includes("can't attack you unless")||!oracle.includes('for each creature'))return;const match=oracle.match(/pays \{(\d+)\}/);const tax=match?Number.parseInt(match[1],10):0;if(tax>0){amount+=tax;sources.push(card.name);}});return{amount,sources};}
function shouldPayAttackTax(game:GameState,ai:GameState['players'][number],humanLife:number,power:number,sources:string[]){if(power>=humanLife||humanLife<=6)return true;const threshold=game.settings.difficulty==='learning'?.4:game.settings.difficulty==='casual'?.65:.85;return deterministicRoll(`${game.id}:${game.turnNumber}:${ai.id}:${ai.life}:${humanLife}:${ai.handCount}:${sources.join('|')}`)<threshold;}

function beginCombat(game:GameState,aiId:string):GameState{
 const ai=game.players.find(p=>p.id===aiId),human=game.players.find(p=>!p.isAI);if(!ai||!human)return game;
 const turn=aiTurnNumber(game.turnNumber),humanCreatures=human.battlefield.filter(c=>c.basePower!==undefined),attackers=ai.battlefield.filter(c=>!c.tapped&&!c.summoningSick&&!c.combatDisabled&&c.basePower!==undefined);let chosen:CardInstance[]=[];
 if(turn>1){if(game.settings.difficulty==='learning'){chosen=attackers.filter((_,i)=>i===0||human.life<=10);}else if(game.settings.difficulty==='casual'){const safe=attackers.filter(c=>(currentStats(c)?.power??0)>=2||humanCreatures.length===0);chosen=safe.slice(0,Math.max(1,Math.min(safe.length,Math.ceil(attackers.length*.7))));}else chosen=attackers.slice().sort((a,b)=>scoreCreature(b)-scoreCreature(a)).filter((_,i)=>human.life<=10||i<Math.max(1,attackers.length-1));}
 const tax=attackTaxPerCreature(human.battlefield);if(chosen.length&&tax.amount>0){const mana=ai.availableMana??0,max=Math.floor(mana/tax.amount),power=chosen.reduce((s,c)=>s+(currentStats(c)?.power??0),0);if(!shouldPayAttackTax(game,ai,human.life,power,tax.sources)||max<=0){game.log.push({id:uid(),turn:game.turnNumber,actor:ai.name,message:`${tax.sources.join(' + ')} requires ${tax.amount} mana per attacker. ${ai.name} chose not to pay and did not attack.`});chosen=[];}else{chosen=chosen.sort((a,b)=>scoreCreature(b)-scoreCreature(a)).slice(0,max);const paid=chosen.length*tax.amount;ai.availableMana=Math.max(0,mana-paid);game.log.push({id:uid(),turn:game.turnNumber,actor:ai.name,message:`${tax.sources.join(' + ')} taxes attacks. ${ai.name} paid ${paid} mana for ${chosen.length} attacker${chosen.length===1?'':'s'}.`});}}
 if(chosen.length){chosen.forEach(c=>{c.tapped=true;});const total=chosen.reduce((s,c)=>s+(currentStats(c)?.power??0),0);game.pendingCombat={attackerId:ai.id,defenderId:human.id,attackerInstanceIds:chosen.map(c=>c.instanceId),totalPower:total,source:'ai'};game.log.push({id:uid(),turn:game.turnNumber,actor:ai.name,message:`Attacks with ${chosen.map(c=>c.name).join(', ')} for ${total}.`});}else game.log.push({id:uid(),turn:game.turnNumber,actor:ai.name,message:'Passed combat.'});
 game.updatedAt=new Date().toISOString();return game;
}

function chooseFromHand(hand:AICardTemplate[],mana:number,kind:AICardTemplate['kind']){const legal=hand.filter(c=>c.kind===kind&&c.manaCost<=mana);if(!legal.length)return undefined;return legal.sort((a,b)=>b.manaCost-a.manaCost)[0];}
function removeFromHand(ai:GameState['players'][number],card:AICardTemplate){const index=ai.aiHand?.findIndex(c=>c.id===card.id)??-1;if(index>=0)ai.aiHand?.splice(index,1);ai.handCount=ai.aiHand?.length??Math.max(0,ai.handCount-1);}
function isBlack(card:CardInstance){return card.definition?.colors.includes('B')||card.definition?.colorIdentity.includes('B')||false;}
function legalRemovalTargets(card:AICardTemplate,cards:CardInstance[]):CardInstance[]{const effects=parseSimpleOracleEffects(card.oracleText);if(effects.disablesAttackAndBlock)return cards.filter(c=>c.basePower!==undefined&&!c.combatDisabled);if(effects.destroysArtifactOrEnchantment)return cards.filter(c=>{const type=c.definition?.typeLine.toLowerCase()??'';return type.includes('artifact')||type.includes('enchantment');});if(effects.destroysNonartifactCreature)return cards.filter(c=>c.basePower!==undefined&&!(c.definition?.typeLine.toLowerCase()??'').includes('artifact'));if(effects.destroysNonblackCreature)return cards.filter(c=>c.basePower!==undefined&&!isBlack(c));if(effects.destroysCreature)return cards.filter(c=>c.basePower!==undefined);return [];}

function chooseMainPhaseAction(game:GameState,aiId:string):GameState{
 const ai=game.players.find(p=>p.id===aiId),human=game.players.find(p=>!p.isAI);if(!ai||!human)return game;
 const mana=ai.availableMana??0,hand=ai.aiHand??[];
 const removalOptions=hand.filter(c=>c.kind==='removal'&&c.manaCost<=mana).map(card=>({card,targets:legalRemovalTargets(card,human.battlefield)})).filter(entry=>entry.targets.length>0);
 const removal=removalOptions.sort((a,b)=>b.card.manaCost-a.card.manaCost)[0];
 const ramp=chooseFromHand(hand,mana,'ramp'),draw=chooseFromHand(hand,mana,'draw'),creature=chooseFromHand(hand,mana,'creature');
 let card:AICardTemplate|undefined;const early=aiTurnNumber(game.turnNumber)<=4;
 if(removal&&(human.battlefield.some(c=>scoreCreature(c)>=10)||game.settings.difficulty==='challenging'))card=removal.card;else if(early&&ramp)card=ramp;else if(draw&&hand.length<=4)card=draw;else if(creature)card=creature;else card=removal?.card??ramp??draw;
 if(!card)return beginCombat(game,aiId);
 let pending:PendingAIAction;
 if(card.kind==='removal'){const targets=legalRemovalTargets(card,human.battlefield).sort((a,b)=>scoreCreature(b)-scoreCreature(a));const target=targets[0];if(!target)return beginCombat(game,aiId);pending={aiId,kind:'removal',cardName:card.name,manaCost:card.manaCost,typeLine:card.typeLine,oracleText:card.oracleText,targetInstanceId:target.instanceId,targetName:target.name};}
 else if(card.kind==='ramp')pending={aiId,kind:'ramp',cardName:card.name,manaCost:card.manaCost,typeLine:card.typeLine,oracleText:card.oracleText,amount:card.amount??1};else if(card.kind==='draw')pending={aiId,kind:'draw',cardName:card.name,manaCost:card.manaCost,typeLine:card.typeLine,oracleText:card.oracleText,amount:card.amount??2};else if(card.kind==='creature')pending={aiId,kind:'creature',cardName:card.name,manaCost:card.manaCost,typeLine:card.typeLine,oracleText:card.oracleText,power:card.power,toughness:card.toughness,flying:card.flying};else return beginCombat(game,aiId);
 ai.availableMana=Math.max(0,mana-card.manaCost);removeFromHand(ai,card);game.spellsCastThisTurn+=1;game.pendingAIAction=pending;game.log.push({id:uid(),turn:game.turnNumber,actor:ai.name,message:pending.kind==='removal'?`Cast ${pending.cardName}, targeting ${pending.targetName}. Waiting for your response.`:`Cast ${pending.cardName}. Waiting for your response.`});game.updatedAt=new Date().toISOString();return game;
}

export function continueAITurn(game:GameState,aiId:string){return chooseMainPhaseAction(structuredClone(game),aiId);}

export function runAITurn(input:GameState,aiId:string):GameState{
 const game=structuredClone(input),ai=game.players.find(p=>p.id===aiId);if(!ai)return game;
 ai.battlefield.forEach(card=>{card.tapped=false;if(card.summoningSick)card.summoningSick=false;});
 if(ai.aiLibrary?.length){const drawn=ai.aiLibrary.shift();if(drawn)ai.aiHand?.push(drawn);}
 ai.handCount=ai.aiHand?.length??ai.handCount+1;ai.libraryCount=ai.aiLibrary?.length??ai.libraryCount;
 const landIndex=ai.aiHand?.findIndex(c=>c.kind==='land')??-1;if(landIndex>=0){const [land]=ai.aiHand!.splice(landIndex,1);ai.aiLandsPlayed=(ai.aiLandsPlayed??0)+1;ai.handCount=ai.aiHand!.length;game.log.push({id:uid(),turn:game.turnNumber,actor:ai.name,message:`Played ${land.name}.`});}
 const rampCount=ai.battlefield.filter(c=>['Mind Stone','Arcane Signet','Fellwar Stone','Worn Powerstone'].includes(c.name)).reduce((sum,c)=>sum+(c.name==='Worn Powerstone'?2:1),0);ai.availableMana=(ai.aiLandsPlayed??0)+rampCount;
 game.log.push({id:uid(),turn:game.turnNumber,actor:ai.name,message:`Untap, draw, main phase — ${ai.availableMana} mana available.`});
 return chooseMainPhaseAction(game,aiId);
}
