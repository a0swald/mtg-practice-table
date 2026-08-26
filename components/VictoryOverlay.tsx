'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clearGame, loadGame } from '@/lib/storage/gameStorage';

type GameResult = { kind: 'win' | 'loss'; reason: string };

export function VictoryOverlay() {
  const router = useRouter();
  const [result, setResult] = useState<GameResult>();

  useEffect(() => {
    const checkGame = () => {
      const game = loadGame();
      if (!game) return;
      const player = game.players.find(entry => !entry.isAI);
      const opponent = game.players.find(entry => entry.isAI);
      if (!player || !opponent) return;

      if (opponent.life <= 0) setResult({ kind:'win', reason:'The opponent reached 0 or less life.' });
      else if (game.settings.commanderDamageEnabled && (opponent.commanderDamage[player.id] ?? 0) >= 21) setResult({ kind:'win', reason:'Your commander dealt 21 or more combat damage to the opponent.' });
      else if (player.life <= 0) setResult({ kind:'loss', reason:'You reached 0 or less life.' });
      else if (game.settings.commanderDamageEnabled && (player.commanderDamage[opponent.id] ?? 0) >= 21) setResult({ kind:'loss', reason:"The opponent's commander dealt 21 or more combat damage to you." });
    };

    checkGame();
    const interval = window.setInterval(checkGame, 150);
    window.addEventListener('storage', checkGame);
    return () => { window.clearInterval(interval); window.removeEventListener('storage', checkGame); };
  }, []);

  if (!result) return null;
  const returnHome = () => { clearGame(); router.replace('/'); };
  const won = result.kind === 'win';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
      <div className={`w-full max-w-md rounded-3xl border bg-[#111517] p-6 text-center shadow-2xl sm:p-8 ${won ? 'border-emerald-400/30 shadow-emerald-950/40' : 'border-red-400/30 shadow-red-950/40'}`}>
        <div className={`text-[11px] font-black uppercase tracking-[0.28em] ${won ? 'text-emerald-300' : 'text-red-300'}`}>Game Over</div>
        <h2 className="mt-2 text-4xl font-black tracking-tight text-white sm:text-5xl">{won ? 'YOU WIN' : 'YOU LOSE'}</h2>
        <p className="mt-3 text-sm leading-6 text-zinc-400">{result.reason}</p>
        <button type="button" onClick={returnHome} className={`mt-6 w-full rounded-2xl px-4 py-4 text-base font-black text-zinc-950 ${won ? 'bg-emerald-400' : 'bg-red-400'}`}>RETURN TO MAIN MENU</button>
      </div>
    </div>
  );
}
