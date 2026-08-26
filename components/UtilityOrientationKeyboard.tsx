'use client';

import { Delete, X } from 'lucide-react';
import { useEffect, useState } from 'react';

type EditableInput = HTMLInputElement | HTMLTextAreaElement;

const ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
];

function playerRotation(element: HTMLElement): number {
  let current: HTMLElement | null = element;
  while (current) {
    const match = current.style.transform.match(/rotate\((-?\d+(?:\.\d+)?)deg\)/);
    if (match) {
      const value = Number(match[1]);
      return ((value % 360) + 360) % 360;
    }
    current = current.parentElement;
  }
  return 0;
}

function setNativeValue(input: EditableInput, value: string) {
  const prototype = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

export default function UtilityOrientationKeyboard() {
  const [target, setTarget] = useState<EditableInput | null>(null);
  const [rotation, setRotation] = useState(0);
  const [displayValue, setDisplayValue] = useState('');

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!window.location.pathname.startsWith('/utility')) return;
      const element = event.target;
      if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) return;
      if (element instanceof HTMLInputElement && !['text', 'search'].includes(element.type)) return;

      event.preventDefault();
      element.blur();
      setTarget(element);
      setDisplayValue(element.value);
      setRotation(playerRotation(element));
    }

    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => document.removeEventListener('pointerdown', handlePointerDown, true);
  }, []);

  function write(value: string) {
    if (!target) return;
    setNativeValue(target, value);
    setDisplayValue(value);
  }

  function type(character: string) {
    write(`${displayValue}${character}`);
  }

  function backspace() {
    write(displayValue.slice(0, -1));
  }

  function close() {
    setTarget(null);
  }

  if (!target) return null;

  const sideways = rotation === 90 || rotation === 270;

  return (
    <div className="fixed inset-0 z-[1000] bg-black/45 backdrop-blur-[2px]" onPointerDown={event => {
      if (event.target === event.currentTarget) close();
    }}>
      <div
        style={{
          left: '50%',
          top: '50%',
          width: sideways ? 'min(86vh, 560px)' : 'min(96vw, 560px)',
          transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
        }}
        className="absolute rounded-[1.5rem] border border-white/15 bg-[#24252b] p-3 shadow-2xl"
      >
        <div className="mb-3 flex items-center gap-2">
          <div className="min-w-0 flex-1 truncate rounded-xl bg-black/30 px-4 py-3 text-base font-bold text-white">
            {displayValue || <span className="text-zinc-500">Type…</span>}
          </div>
          <button aria-label="Close keyboard" onClick={close} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/10">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-2">
          {ROWS.map((row, rowIndex) => (
            <div key={rowIndex} className="flex justify-center gap-1.5">
              {row.map(key => (
                <button
                  key={key}
                  onClick={() => type(key)}
                  className="h-11 min-w-0 flex-1 rounded-lg bg-white/10 text-sm font-black active:bg-white/25"
                >
                  {key}
                </button>
              ))}
            </div>
          ))}

          <div className="flex gap-2 pt-1">
            <button onClick={() => type(' ')} className="h-11 flex-1 rounded-xl bg-white/10 text-xs font-black uppercase tracking-wider active:bg-white/25">
              Space
            </button>
            <button aria-label="Backspace" onClick={backspace} className="grid h-11 w-16 place-items-center rounded-xl bg-white/10 active:bg-white/25">
              <Delete size={20} />
            </button>
            <button onClick={close} className="h-11 rounded-xl bg-cyan-300 px-5 text-xs font-black text-zinc-950 active:brightness-90">
              DONE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
