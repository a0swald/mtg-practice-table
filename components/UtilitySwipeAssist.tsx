'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

type Gesture = {
  pointerId: number;
  x: number;
  y: number;
  handle: HTMLElement;
};

function opensForSwipe(handle: HTMLElement, dx: number, dy: number) {
  if (handle.classList.contains('bottom-0')) return dy < -36;
  if (handle.classList.contains('top-0')) return dy > 36;
  if (handle.classList.contains('left-0')) return dx > 36;
  if (handle.classList.contains('right-0')) return dx < -36;
  return false;
}

export default function UtilitySwipeAssist() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname.startsWith('/utility')) return;

    let gesture: Gesture | null = null;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      const handle = target?.closest<HTMLElement>('[data-drawer-handle]');
      if (!handle) return;
      gesture = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, handle };
    };

    const finish = (event: PointerEvent) => {
      if (!gesture || gesture.pointerId !== event.pointerId) return;
      const current = gesture;
      gesture = null;

      const dx = event.clientX - current.x;
      const dy = event.clientY - current.y;
      if (!opensForSwipe(current.handle, dx, dy)) return;

      event.preventDefault();
      event.stopPropagation();
      window.setTimeout(() => current.handle.click(), 0);
    };

    const cancel = (event: PointerEvent) => {
      if (gesture?.pointerId === event.pointerId) gesture = null;
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('pointerup', finish, true);
    document.addEventListener('pointercancel', cancel, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('pointerup', finish, true);
      document.removeEventListener('pointercancel', cancel, true);
    };
  }, [pathname]);

  return null;
}
