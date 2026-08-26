import type { AICardTemplate } from '@/types/ai';

// Real Magic cards only. This is an intentionally simplified gameplay model: the
// card names/Oracle summaries are real, while the AI only reasons about the effect
// categories it currently understands.
export const AI_CARDS: AICardTemplate[] = [
  { id:'llanowar-elves',name:'Llanowar Elves',manaCost:1,kind:'creature',typeLine:'Creature — Elf Druid',oracleText:'{T}: Add {G}.',power:1,toughness:1 },
  { id:'elvish-mystic',name:'Elvish Mystic',manaCost:1,kind:'creature',typeLine:'Creature — Elf Druid',oracleText:'{T}: Add {G}.',power:1,toughness:1 },
  { id:'grizzly-bears',name:'Grizzly Bears',manaCost:2,kind:'creature',typeLine:'Creature — Bear',power:2,toughness:2 },
  { id:'runeclaw-bear',name:'Runeclaw Bear',manaCost:2,kind:'creature',typeLine:'Creature — Bear',power:2,toughness:2 },
  { id:'watchwolf',name:'Watchwolf',manaCost:2,kind:'creature',typeLine:'Creature — Wolf',power:3,toughness:3 },
  { id:'centaur-courser',name:'Centaur Courser',manaCost:3,kind:'creature',typeLine:'Creature — Centaur Warrior',power:3,toughness:3 },
  { id:'hill-giant',name:'Hill Giant',manaCost:4,kind:'creature',typeLine:'Creature — Giant',power:3,toughness:3 },
  { id:'giant-spider',name:'Giant Spider',manaCost:4,kind:'creature',typeLine:'Creature — Spider',oracleText:'Reach',power:2,toughness:4 },
  { id:'air-elemental',name:'Air Elemental',manaCost:5,kind:'creature',typeLine:'Creature — Elemental',oracleText:'Flying',power:4,toughness:4,flying:true },
  { id:'serra-angel',name:'Serra Angel',manaCost:5,kind:'creature',typeLine:'Creature — Angel',oracleText:'Flying, vigilance',power:4,toughness:4,flying:true },
  { id:'shivan-dragon',name:'Shivan Dragon',manaCost:6,kind:'creature',typeLine:'Creature — Dragon',oracleText:'Flying. {R}: Shivan Dragon gets +1/+0 until end of turn.',power:5,toughness:5,flying:true },
  { id:'colossal-dreadmaw',name:'Colossal Dreadmaw',manaCost:6,kind:'creature',typeLine:'Creature — Dinosaur',oracleText:'Trample',power:6,toughness:6 },
  { id:'craw-wurm',name:'Craw Wurm',manaCost:6,kind:'creature',typeLine:'Creature — Wurm',power:6,toughness:4 },
  { id:'vampire-nighthawk',name:'Vampire Nighthawk',manaCost:3,kind:'creature',typeLine:'Creature — Vampire Shaman',oracleText:'Flying, deathtouch, lifelink',power:2,toughness:3,flying:true },
  { id:'aven-fisher',name:'Aven Fisher',manaCost:4,kind:'creature',typeLine:'Creature — Bird Soldier',oracleText:'Flying. When Aven Fisher dies, you may draw a card.',power:2,toughness:2,flying:true },
  { id:'cloudkin-seer',name:'Cloudkin Seer',manaCost:3,kind:'creature',typeLine:'Creature — Elemental Wizard',oracleText:'Flying. When Cloudkin Seer enters, draw a card.',power:2,toughness:1,flying:true },
  { id:'murder',name:'Murder',manaCost:3,kind:'removal',typeLine:'Instant',oracleText:'Destroy target creature.' },
  { id:'doom-blade',name:'Doom Blade',manaCost:2,kind:'removal',typeLine:'Instant',oracleText:'Destroy target nonblack creature.' },
  { id:'go-for-the-throat',name:'Go for the Throat',manaCost:2,kind:'removal',typeLine:'Instant',oracleText:'Destroy target nonartifact creature.' },
  { id:'naturalize',name:'Naturalize',manaCost:2,kind:'removal',typeLine:'Instant',oracleText:'Destroy target artifact or enchantment.' },
  { id:'disenchant',name:'Disenchant',manaCost:2,kind:'removal',typeLine:'Instant',oracleText:'Destroy target artifact or enchantment.' },
  { id:'pacifism',name:'Pacifism',manaCost:2,kind:'removal',typeLine:'Enchantment — Aura',oracleText:'Enchant creature. Enchanted creature can’t attack or block.' },
  { id:'divination',name:'Divination',manaCost:3,kind:'draw',typeLine:'Sorcery',oracleText:'Draw two cards.',amount:2 },
  { id:'inspiration',name:'Inspiration',manaCost:4,kind:'draw',typeLine:'Instant',oracleText:'Target player draws two cards.',amount:2 },
  { id:'sign-in-blood',name:'Sign in Blood',manaCost:2,kind:'draw',typeLine:'Sorcery',oracleText:'Target player draws two cards and loses 2 life.',amount:2 },
  { id:'mind-stone',name:'Mind Stone',manaCost:2,kind:'ramp',typeLine:'Artifact',oracleText:'{T}: Add {C}. {1}, {T}, Sacrifice Mind Stone: Draw a card.',amount:1 },
  { id:'arcane-signet',name:'Arcane Signet',manaCost:2,kind:'ramp',typeLine:'Artifact',oracleText:'{T}: Add one mana of any color in your commander’s color identity.',amount:1 },
  { id:'fellwar-stone',name:'Fellwar Stone',manaCost:2,kind:'ramp',typeLine:'Artifact',oracleText:'{T}: Add one mana of any color that a land an opponent controls could produce.',amount:1 },
  { id:'worn-powerstone',name:'Worn Powerstone',manaCost:3,kind:'ramp',typeLine:'Artifact',oracleText:'Worn Powerstone enters tapped. {T}: Add {C}{C}.',amount:2 },
];

const BASIC_LANDS: AICardTemplate[] = [
  { id:'plains',name:'Plains',manaCost:0,kind:'land',typeLine:'Basic Land — Plains' },
  { id:'island',name:'Island',manaCost:0,kind:'land',typeLine:'Basic Land — Island' },
  { id:'swamp',name:'Swamp',manaCost:0,kind:'land',typeLine:'Basic Land — Swamp' },
  { id:'mountain',name:'Mountain',manaCost:0,kind:'land',typeLine:'Basic Land — Mountain' },
  { id:'forest',name:'Forest',manaCost:0,kind:'land',typeLine:'Basic Land — Forest' },
];

function shuffle<T>(items: T[]): T[] {
  const result=[...items];
  for(let i=result.length-1;i>0;i-=1){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}
  return result;
}

export function buildRandomAIDeck(): AICardTemplate[] {
  // 38 lands + 62 randomly sampled real spells = exactly 100 cards.
  // Repeats are currently allowed in the AI practice deck so each game can vary
  // substantially; Commander-singleton deck construction can be layered on later.
  const lands=Array.from({length:38},()=>BASIC_LANDS[Math.floor(Math.random()*BASIC_LANDS.length)]);
  const spells=Array.from({length:62},()=>AI_CARDS[Math.floor(Math.random()*AI_CARDS.length)]);
  return shuffle([...lands,...spells]);
}
