import type { CardInstance } from './card';

export type Difficulty = 'learning' | 'casual' | 'challenging';
export type Phase = 'Untap' | 'Upkeep' | 'Draw' | 'Main 1' | 'Combat' | 'Main 2' | 'End' | 'Cleanup';

export interface PlayerState {
  id: string;
  name: string;
  isAI: boolean;
  life: number;
  handCount: number;
  libraryCount?: number;
  graveyard: CardInstance[];
  exile: CardInstance[];
  battlefield: CardInstance[];
  commander?: CardInstance;
  commanderTax: number;
  commanderDamage: Record<string, number>;
  availableMana?: number;
}

export interface LogEntry { id: string; turn: number; actor: string; message: string; }

export interface CombatBlock {
  attackerId: string;
  blockerId: string;
  attackerName: string;
  blockerName: string;
  attackerPower: number;
  attackerToughness: number;
  blockerPower: number;
  blockerToughness: number;
  reason: string;
}

export interface PendingCombat {
  attackerId: string;
  defenderId: string;
  attackerInstanceIds: string[];
  totalPower: number;
  source: 'player' | 'ai';
  aiBlocks?: CombatBlock[];
}

export interface PendingAIAction {
  aiId: string;
  kind: 'creature' | 'ramp' | 'draw' | 'removal';
  cardName: string;
  manaCost: number;
  typeLine: string;
  oracleText?: string;
  power?: number;
  toughness?: number;
  flying?: boolean;
  amount?: number;
  targetInstanceId?: string;
  targetName?: string;
}

export interface GameSettings {
  aiOpponents: 1 | 2 | 3;
  startingLife: number;
  difficulty: Difficulty;
  commanderDamageEnabled: boolean;
  tutorMode: boolean;
  simplifiedTurns: boolean;
}

export interface GameState {
  id: string;
  settings: GameSettings;
  players: PlayerState[];
  turnNumber: number;
  activePlayerId: string;
  phase: Phase;
  spellsCastThisTurn: number;
  log: LogEntry[];
  pendingCombat?: PendingCombat;
  pendingAIAction?: PendingAIAction;
  startedAt: string;
  updatedAt: string;
}
