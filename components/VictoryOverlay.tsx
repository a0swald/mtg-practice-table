'use client';

import { useEffect, useState } from 'react';
import { clearGame, loadGame } from '@/lib/storage/gameStorage';

export function VictoryOverlay() {
  const [won, setWon] = useState(false);

  useEffect(() => {
    const checkGame = () => {
      const game = loadGame();
      const opponent = game?.players.find(player => player.isAI);
      if (opponent && opponent.life <= 0) setWon(true);
    };

    checkGame();
    const interval = window.setInterval(checkGame, 150);
    window.addEventListener('storage', checkGame);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('storage', checkGame);
    };
  }, []);

  if (!won) return null;

  const restart = () => {
    clearGame();
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-emerald-400/30 bg-[#111517] p-6 text-center shadow-2xl shadow-emerald-950/40 sm:p-8">
        <div className="text-[11px] font-black uppercase tracking-[0.28em] text-emerald-300">Game Over</div>
        <h2 className="mt-2 text-4xl font-black tracking-tight text-white sm:text-5xl">YOU WIN</h2>
        <p className="mt-3 text-sm leading-6 text-zinc-400">The opponent reached 0 or less life.</p>
        <button
          type="button"
          onClick={restart}
          className="mt-6 w-full rounded-2xl bg-emerald-400 px-4 py-4 text-base font-black text-zinc-950"
        >
          RESTART GAME
        </button>
      </div>
    </div>
  );
}
