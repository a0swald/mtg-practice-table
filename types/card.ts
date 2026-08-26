export interface CardDefinition {
  id: string;
  name: string;
  manaCost?: string;
  typeLine: string;
  oracleText?: string;
  colors: string[];
  colorIdentity: string[];
  power?: string;
  toughness?: string;
  imageUrl?: string;
  set?: string;
  rarity?: string;
}

export type Zone = 'command' | 'battlefield' | 'hand' | 'graveyard' | 'exile' | 'library';

export interface CustomCounter {
  id: string;
  label: string;
  amount: number;
  temporary?: boolean;
}

export interface CardInstance {
  instanceId: string;
  cardId?: string;
  definition?: CardDefinition;
  name: string;
  zone: Zone;
  tapped: boolean;
  basePower?: number;
  baseToughness?: number;
  plusOneCounters: number;
  minusOneCounters: number;
  damageMarked: number;
  temporaryPowerModifier: number;
  temporaryToughnessModifier: number;
  customCounters: CustomCounter[];
  summoningSick?: boolean;
  combatDisabled?: boolean;
  combatDisabledBy?: string;
  isCommander?: boolean;
  token?: boolean;
  tokenQuantity?: number;
  ownerId: string;
  controllerId: string;
}
