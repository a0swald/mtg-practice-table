import type { GameState } from '@/types/game';
const KEY = 'mtg-practice-table.game.v1';
export function saveGame(game: GameState) { if (typeof window !== 'undefined') localStorage.setItem(KEY, JSON.stringify(game)); }
export function loadGame(): GameState | null { if (typeof window === 'undefined') return null; try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) as GameState : null; } catch { return null; } }
export function clearGame() { if (typeof window !== 'undefined') localStorage.removeItem(KEY); }
