'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

type Gesture = {
  x: number;
  y: number;
  handle: HTMLElement;
};

function swipeMatchesHandle(handle: HTMLElement, dx: number, dy: number) {
  const isOpen = handle.getAttribute('aria-label')?.startsWith('Close') ?? false;
  const threshold = 30;

  if (handle.classList.contains('bottom-0')) return isOpen ? dy > threshold : dy < -threshold;
  if (handle.classList.contains('top-0')) return isOpen ? dy < -threshold : dy > threshold;
  if (handle.classList.contains('left-0')) return isOpen ? dx < -threshold : dx > threshold;
  if (handle.classList.contains('right-0')) return isOpen ? dx > threshold : dx < -threshold;
  return false;
}

function activateHandle(handle: HTMLElement) {
  handle.click();
}

export default function UtilitySwipeAssist() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname.startsWith('/utility')) return;

    let touchGesture: Gesture | null = null;
    let pointerGesture: (Gesture & { pointerId: number }) | null = null;
    let suppressTrustedClick: HTMLElement | null = null;

    const getHandle = (target: EventTarget | null) =>
      target instanceof HTMLElement ? target.closest<HTMLElement>('[data-drawer-handle]') : null;

    const suppressNextTrustedClick = (handle: HTMLElement) => {
      suppressTrustedClick = handle;
      window.setTimeout(() => {
        if (suppressTrustedClick === handle) suppressTrustedClick = null;
      }, 350);
    };

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;
      const handle = getHandle(event.target);
      if (!handle) return;
      const touch = event.touches[0];
      touchGesture = { x: touch.clientX, y: touch.clientY, handle };
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!touchGesture || event.touches.length !== 1) return;
      const touch = event.touches[0];
      const dx = touch.clientX - touchGesture.x;
      const dy = touch.clientY - touchGesture.y;
      if (Math.hypot(dx, dy) > 8) event.preventDefault();
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (!touchGesture || event.changedTouches.length < 1) return;
      const current = touchGesture;
      touchGesture = null;
      const touch = event.changedTouches[0];
      const dx = touch.clientX - current.x;
      const dy = touch.clientY - current.y;
      if (!swipeMatchesHandle(current.handle, dx, dy)) return;

      event.preventDefault();
      event.stopPropagation();
      suppressNextTrustedClick(current.handle);
      activateHandle(current.handle);
    };

    const onTouchCancel = () => {
      touchGesture = null;
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      const handle = getHandle(event.target);
      if (!handle) return;
      pointerGesture = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, handle };
    };

    const onPointerUp = (event: PointerEvent) => {
      if (!pointerGesture || pointerGesture.pointerId !== event.pointerId) return;
      const current = pointerGesture;
      pointerGesture = null;
      const dx = event.clientX - current.x;
      const dy = event.clientY - current.y;
      if (!swipeMatchesHandle(current.handle, dx, dy)) return;

      event.preventDefault();
      event.stopPropagation();
      suppressNextTrustedClick(current.handle);
      activateHandle(current.handle);
    };

    const onPointerCancel = (event: PointerEvent) => {
      if (pointerGesture?.pointerId === event.pointerId) pointerGesture = null;
    };

    const onClick = (event: MouseEvent) => {
      if (!event.isTrusted || !suppressTrustedClick) return;
      const target = event.target as HTMLElement | null;
      if (!target || !suppressTrustedClick.contains(target)) return;
      event.preventDefault();
      event.stopPropagation();
      suppressTrustedClick = null;
    };

    document.addEventListener('touchstart', onTouchStart, { capture: true, passive: true });
    document.addEventListener('touchmove', onTouchMove, { capture: true, passive: false });
    document.addEventListener('touchend', onTouchEnd, { capture: true, passive: false });
    document.addEventListener('touchcancel', onTouchCancel, true);
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('pointerup', onPointerUp, true);
    document.addEventListener('pointercancel', onPointerCancel, true);
    document.addEventListener('click', onClick, true);

    return () => {
      document.removeEventListener('touchstart', onTouchStart, true);
      document.removeEventListener('touchmove', onTouchMove, true);
      document.removeEventListener('touchend', onTouchEnd, true);
      document.removeEventListener('touchcancel', onTouchCancel, true);
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('pointerup', onPointerUp, true);
      document.removeEventListener('pointercancel', onPointerCancel, true);
      document.removeEventListener('click', onClick, true);
    };
  }, [pathname]);

  return null;
}
