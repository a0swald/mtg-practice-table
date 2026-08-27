'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

type Gesture = {
  pointerId: number;
  x: number;
  y: number;
  handle: HTMLElement;
};

function swipeMatchesHandle(handle: HTMLElement, dx: number, dy: number) {
  const isOpen = handle.getAttribute('aria-label')?.startsWith('Close') ?? false;
  const threshold = 36;

  if (handle.classList.contains('bottom-0')) return isOpen ? dy > threshold : dy < -threshold;
  if (handle.classList.contains('top-0')) return isOpen ? dy < -threshold : dy > threshold;
  if (handle.classList.contains('left-0')) return isOpen ? dx < -threshold : dx > threshold;
  if (handle.classList.contains('right-0')) return isOpen ? dx > threshold : dx < -threshold;
  return false;
}

export default function UtilitySwipeAssist() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname.startsWith('/utility')) return;

    let gesture: Gesture | null = null;
    let suppressTrustedClick: HTMLElement | null = null;

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
      if (!swipeMatchesHandle(current.handle, dx, dy)) return;

      event.preventDefault();
      event.stopPropagation();
      suppressTrustedClick = current.handle;
      current.handle.click();
      window.setTimeout(() => { suppressTrustedClick = null; }, 250);
    };

    const onClick = (event: MouseEvent) => {
      if (!event.isTrusted || !suppressTrustedClick) return;
      const target = event.target as HTMLElement | null;
      if (!target || !suppressTrustedClick.contains(target)) return;
      event.preventDefault();
      event.stopPropagation();
      suppressTrustedClick = null;
    };

    const cancel = (event: PointerEvent) => {
      if (gesture?.pointerId === event.pointerId) gesture = null;
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('pointerup', finish, true);
    document.addEventListener('pointercancel', cancel, true);
    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('pointerup', finish, true);
      document.removeEventListener('pointercancel', cancel, true);
      document.removeEventListener('click', onClick, true);
    };
  }, [pathname]);

  return null;
}
