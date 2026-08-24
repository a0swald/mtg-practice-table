import type { CardDefinition } from '@/types/card';
interface ScryfallImageUris { normal?: string; large?: string; }
interface ScryfallFace { image_uris?: ScryfallImageUris; }
export interface ScryfallCard {
  id: string; name: string; mana_cost?: string; type_line: string; oracle_text?: string; colors?: string[]; color_identity?: string[];
  power?: string; toughness?: string; image_uris?: ScryfallImageUris; card_faces?: ScryfallFace[]; set_name?: string; rarity?: string;
}
export function mapScryfallCard(card: ScryfallCard): CardDefinition {
  return { id: card.id, name: card.name, manaCost: card.mana_cost, typeLine: card.type_line, oracleText: card.oracle_text,
    colors: card.colors ?? [], colorIdentity: card.color_identity ?? [], power: card.power, toughness: card.toughness,
    imageUrl: card.image_uris?.normal ?? card.card_faces?.[0]?.image_uris?.normal, set: card.set_name, rarity: card.rarity };
}
