import type { CardDefinition } from './card';

export interface SavedDeck {
  id: string;
  name: string;
  commander: CardDefinition;
  cards: CardDefinition[];
  createdAt: string;
  updatedAt: string;
}
