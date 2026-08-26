import type { AICardTemplate } from '@/types/ai';

export const AI_CARDS: AICardTemplate[] = [
  { id: 'c1', name: 'Scout', manaCost: 1, kind: 'creature', power: 1, toughness: 1 },
  { id: 'c2', name: 'Veteran', manaCost: 2, kind: 'creature', power: 2, toughness: 2 },
  { id: 'c3', name: 'Guardian', manaCost: 3, kind: 'creature', power: 2, toughness: 3 },
  { id: 'c4', name: 'Raider', manaCost: 3, kind: 'creature', power: 3, toughness: 2 },
  { id: 'c5', name: 'Sky Drake', manaCost: 4, kind: 'creature', power: 3, toughness: 3, flying: true },
  { id: 'c6', name: 'Ancient Beast', manaCost: 5, kind: 'creature', power: 5, toughness: 5 },
  { id: 'r1', name: 'Mana Stone', manaCost: 2, kind: 'ramp', amount: 1 },
  { id: 'd1', name: 'Study the Field', manaCost: 3, kind: 'draw', amount: 2 },
  { id: 'x1', name: 'Clean Cut', manaCost: 3, kind: 'removal' },
];
