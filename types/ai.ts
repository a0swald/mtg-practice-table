export interface AICardTemplate {
  id: string;
  name: string;
  manaCost: number;
  kind: 'land' | 'creature' | 'removal' | 'draw' | 'ramp';
  typeLine: string;
  oracleText?: string;
  power?: number;
  toughness?: number;
  flying?: boolean;
  amount?: number;
}
