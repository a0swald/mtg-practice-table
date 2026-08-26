export interface AICardTemplate {
  id: string;
  name: string;
  manaCost: number;
  kind: 'land' | 'creature' | 'removal' | 'draw' | 'ramp';
  power?: number;
  toughness?: number;
  flying?: boolean;
  amount?: number;
}
