import type { AICardTemplate } from '@/types/ai';

export const AI_CARDS: AICardTemplate[] = [
  { id: 'c1', name: 'Llanowar Elves', manaCost: 1, kind: 'creature', typeLine: 'Creature — Elf Druid', oracleText: '{T}: Add {G}.', power: 1, toughness: 1 },
  { id: 'c2', name: 'Grizzly Bears', manaCost: 2, kind: 'creature', typeLine: 'Creature — Bear', power: 2, toughness: 2 },
  { id: 'c3', name: 'Centaur Courser', manaCost: 3, kind: 'creature', typeLine: 'Creature — Centaur Warrior', power: 3, toughness: 3 },
  { id: 'c4', name: 'Giant Spider', manaCost: 4, kind: 'creature', typeLine: 'Creature — Spider', oracleText: 'Reach', power: 2, toughness: 4 },
  { id: 'c5', name: 'Air Elemental', manaCost: 5, kind: 'creature', typeLine: 'Creature — Elemental', oracleText: 'Flying', power: 4, toughness: 4, flying: true },
  { id: 'r1', name: 'Mind Stone', manaCost: 2, kind: 'ramp', typeLine: 'Artifact', oracleText: '{T}: Add {C}.\n{1}, {T}, Sacrifice Mind Stone: Draw a card.', amount: 1 },
  { id: 'd1', name: 'Divination', manaCost: 3, kind: 'draw', typeLine: 'Sorcery', oracleText: 'Draw two cards.', amount: 2 },
  { id: 'x1', name: 'Murder', manaCost: 3, kind: 'removal', typeLine: 'Instant', oracleText: 'Destroy target creature.' },
];
