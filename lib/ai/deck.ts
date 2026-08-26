import type { AICardTemplate, AICommanderTemplate } from '@/types/ai';

export const AI_CARDS: AICardTemplate[] = [
  { id:'llanowar-elves',name:'Llanowar Elves',manaCost:1,kind:'creature',typeLine:'Creature — Elf Druid',oracleText:'{T}: Add {G}.',power:1,toughness:1,colorIdentity:['G'] },
  { id:'elvish-mystic',name:'Elvish Mystic',manaCost:1,kind:'creature',typeLine:'Creature — Elf Druid',oracleText:'{T}: Add {G}.',power:1,toughness:1,colorIdentity:['G'] },
  { id:'grizzly-bears',name:'Grizzly Bears',manaCost:2,kind:'creature',typeLine:'Creature — Bear',power:2,toughness:2,colorIdentity:['G'] },
  { id:'runeclaw-bear',name:'Runeclaw Bear',manaCost:2,kind:'creature',typeLine:'Creature — Bear',power:2,toughness:2,colorIdentity:['G'] },
  { id:'centaur-courser',name:'Centaur Courser',manaCost:3,kind:'creature',typeLine:'Creature — Centaur Warrior',power:3,toughness:3,colorIdentity:['G'] },
  { id:'giant-spider',name:'Giant Spider',manaCost:4,kind:'creature',typeLine:'Creature — Spider',oracleText:'Reach',power:2,toughness:4,colorIdentity:['G'] },
  { id:'colossal-dreadmaw',name:'Colossal Dreadmaw',manaCost:6,kind:'creature',typeLine:'Creature — Dinosaur',oracleText:'Trample',power:6,toughness:6,colorIdentity:['G'] },
  { id:'craw-wurm',name:'Craw Wurm',manaCost:6,kind:'creature',typeLine:'Creature — Wurm',power:6,toughness:4,colorIdentity:['G'] },
  { id:'naturalize',name:'Naturalize',manaCost:2,kind:'removal',typeLine:'Instant',oracleText:'Destroy target artifact or enchantment.',colorIdentity:['G'] },

  { id:'air-elemental',name:'Air Elemental',manaCost:5,kind:'creature',typeLine:'Creature — Elemental',oracleText:'Flying',power:4,toughness:4,flying:true,colorIdentity:['U'] },
  { id:'aven-fisher',name:'Aven Fisher',manaCost:4,kind:'creature',typeLine:'Creature — Bird Soldier',oracleText:'Flying. When Aven Fisher dies, you may draw a card.',power:2,toughness:2,flying:true,colorIdentity:['U'] },
  { id:'cloudkin-seer',name:'Cloudkin Seer',manaCost:3,kind:'creature',typeLine:'Creature — Elemental Wizard',oracleText:'Flying. When Cloudkin Seer enters, draw a card.',power:2,toughness:1,flying:true,colorIdentity:['U'] },
  { id:'divination',name:'Divination',manaCost:3,kind:'draw',typeLine:'Sorcery',oracleText:'Draw two cards.',amount:2,colorIdentity:['U'] },
  { id:'inspiration',name:'Inspiration',manaCost:4,kind:'draw',typeLine:'Instant',oracleText:'Target player draws two cards.',amount:2,colorIdentity:['U'] },

  { id:'serra-angel',name:'Serra Angel',manaCost:5,kind:'creature',typeLine:'Creature — Angel',oracleText:'Flying, vigilance',power:4,toughness:4,flying:true,colorIdentity:['W'] },
  { id:'pacifism',name:'Pacifism',manaCost:2,kind:'removal',typeLine:'Enchantment — Aura',oracleText:'Enchant creature. Enchanted creature can’t attack or block.',colorIdentity:['W'] },
  { id:'disenchant',name:'Disenchant',manaCost:2,kind:'removal',typeLine:'Instant',oracleText:'Destroy target artifact or enchantment.',colorIdentity:['W'] },

  { id:'hill-giant',name:'Hill Giant',manaCost:4,kind:'creature',typeLine:'Creature — Giant',power:3,toughness:3,colorIdentity:['R'] },
  { id:'shivan-dragon',name:'Shivan Dragon',manaCost:6,kind:'creature',typeLine:'Creature — Dragon',oracleText:'Flying. {R}: Shivan Dragon gets +1/+0 until end of turn.',power:5,toughness:5,flying:true,colorIdentity:['R'] },

  { id:'vampire-nighthawk',name:'Vampire Nighthawk',manaCost:3,kind:'creature',typeLine:'Creature — Vampire Shaman',oracleText:'Flying, deathtouch, lifelink',power:2,toughness:3,flying:true,colorIdentity:['B'] },
  { id:'murder',name:'Murder',manaCost:3,kind:'removal',typeLine:'Instant',oracleText:'Destroy target creature.',colorIdentity:['B'] },
  { id:'doom-blade',name:'Doom Blade',manaCost:2,kind:'removal',typeLine:'Instant',oracleText:'Destroy target nonblack creature.',colorIdentity:['B'] },
  { id:'go-for-the-throat',name:'Go for the Throat',manaCost:2,kind:'removal',typeLine:'Instant',oracleText:'Destroy target nonartifact creature.',colorIdentity:['B'] },
  { id:'sign-in-blood',name:'Sign in Blood',manaCost:2,kind:'draw',typeLine:'Sorcery',oracleText:'Target player draws two cards and loses 2 life.',amount:2,colorIdentity:['B'] },

  { id:'mind-stone',name:'Mind Stone',manaCost:2,kind:'ramp',typeLine:'Artifact',oracleText:'{T}: Add {C}. {1}, {T}, Sacrifice Mind Stone: Draw a card.',amount:1,colorIdentity:[] },
  { id:'arcane-signet',name:'Arcane Signet',manaCost:2,kind:'ramp',typeLine:'Artifact',oracleText:'{T}: Add one mana of any color in your commander’s color identity.',amount:1,colorIdentity:[] },
  { id:'fellwar-stone',name:'Fellwar Stone',manaCost:2,kind:'ramp',typeLine:'Artifact',oracleText:'{T}: Add one mana of any color that a land an opponent controls could produce.',amount:1,colorIdentity:[] },
  { id:'worn-powerstone',name:'Worn Powerstone',manaCost:3,kind:'ramp',typeLine:'Artifact',oracleText:'Worn Powerstone enters tapped. {T}: Add {C}{C}.',amount:2,colorIdentity:[] },
];

export const AI_COMMANDERS: AICommanderTemplate[] = [
  { id:'talrand',name:'Talrand, Sky Summoner',manaCost:4,typeLine:'Legendary Creature — Merfolk Wizard',oracleText:'Whenever you cast an instant or sorcery spell, create a 2/2 blue Drake creature token with flying.',power:2,toughness:2,colorIdentity:['U'] },
  { id:'krenko',name:'Krenko, Mob Boss',manaCost:4,typeLine:'Legendary Creature — Goblin Warrior',oracleText:'{T}: Create X 1/1 red Goblin creature tokens, where X is the number of Goblins you control.',power:3,toughness:3,colorIdentity:['R'] },
  { id:'ayara',name:'Ayara, First of Locthwain',manaCost:3,typeLine:'Legendary Creature — Elf Noble',oracleText:'Whenever Ayara or another black creature enters under your control, each opponent loses 1 life and you gain 1 life.',power:2,toughness:3,colorIdentity:['B'] },
  { id:'odric',name:'Odric, Lunarch Marshal',manaCost:4,typeLine:'Legendary Creature — Human Soldier',oracleText:'At the beginning of each combat, creatures you control gain abilities based on abilities among creatures you control.',power:3,toughness:3,colorIdentity:['W'] },
  { id:'goreclaw',name:'Goreclaw, Terror of Qal Sisma',manaCost:4,typeLine:'Legendary Creature — Bear',oracleText:'Creature spells you cast with power 4 or greater cost {2} less to cast.',power:4,toughness:3,colorIdentity:['G'] },
];

const BASIC_LANDS: Record<string,AICardTemplate> = {
  W:{id:'plains',name:'Plains',manaCost:0,kind:'land',typeLine:'Basic Land — Plains',colorIdentity:['W']},
  U:{id:'island',name:'Island',manaCost:0,kind:'land',typeLine:'Basic Land — Island',colorIdentity:['U']},
  B:{id:'swamp',name:'Swamp',manaCost:0,kind:'land',typeLine:'Basic Land — Swamp',colorIdentity:['B']},
  R:{id:'mountain',name:'Mountain',manaCost:0,kind:'land',typeLine:'Basic Land — Mountain',colorIdentity:['R']},
  G:{id:'forest',name:'Forest',manaCost:0,kind:'land',typeLine:'Basic Land — Forest',colorIdentity:['G']},
};

function shuffle<T>(items:T[]):T[]{const r=[...items];for(let i=r.length-1;i>0;i-=1){const j=Math.floor(Math.random()*(i+1));[r[i],r[j]]=[r[j],r[i]];}return r;}
function legalFor(card:AICardTemplate,identity:string[]){return (card.colorIdentity??[]).every(color=>identity.includes(color));}

export function buildCommanderAIDeck(){
  const commander=AI_COMMANDERS[Math.floor(Math.random()*AI_COMMANDERS.length)];
  const legalSpells=shuffle(AI_CARDS.filter(card=>legalFor(card,commander.colorIdentity)));
  const uniqueSpells=legalSpells.filter((card,index,all)=>all.findIndex(other=>other.name===card.name)===index).slice(0,45);
  const land= BASIC_LANDS[commander.colorIdentity[0]];
  const basics=Array.from({length:99-uniqueSpells.length},(_,index)=>({...land,id:`${land.id}-${index}`}));
  return {commander,deck:shuffle([...uniqueSpells,...basics])};
}

export function buildRandomAIDeck():AICardTemplate[]{return buildCommanderAIDeck().deck;}
