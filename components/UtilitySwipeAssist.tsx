'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

type Gesture = {
  x: number;
  y: number;
  handle: HTMLElement;
};

type CarouselGesture = {
  x: number;
  y: number;
  scrollLeft: number;
  carousel: HTMLElement;
  target: HTMLElement | null;
  horizontal: boolean;
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

function localDelta(element: HTMLElement, dx: number, dy: number) {
  const transform = window.getComputedStyle(element).transform;
  if (!transform || transform === 'none') return { x: dx, y: dy };

  try {
    const matrix = new DOMMatrixReadOnly(transform);
    const determinant = matrix.a * matrix.d - matrix.b * matrix.c;
    if (Math.abs(determinant) < 0.0001) return { x: dx, y: dy };
    return {
      x: (matrix.d * dx - matrix.c * dy) / determinant,
      y: (-matrix.b * dx + matrix.a * dy) / determinant,
    };
  } catch {
    return { x: dx, y: dy };
  }
}

function carouselRotationElement(carousel: HTMLElement) {
  return carousel.parentElement ?? carousel;
}

function snapCarousel(carousel: HTMLElement) {
  const sections = Array.from(carousel.children).filter((child): child is HTMLElement => child instanceof HTMLElement);
  if (!sections.length) return;

  const closest = sections.reduce((best, section) =>
    Math.abs(section.offsetLeft - carousel.scrollLeft) < Math.abs(best.offsetLeft - carousel.scrollLeft) ? section : best,
  );
  carousel.scrollTo({ left: closest.offsetLeft, behavior: 'smooth' });
}

export default function UtilitySwipeAssist() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname.startsWith('/utility')) return;

    let touchGesture: Gesture | null = null;
    let pointerGesture: (Gesture & { pointerId: number }) | null = null;
    let carouselGesture: CarouselGesture | null = null;
    let suppressTrustedClick: HTMLElement | null = null;
    let suppressCarouselClick = false;

    const getHandle = (target: EventTarget | null) =>
      target instanceof HTMLElement ? target.closest<HTMLElement>('[data-drawer-handle]') : null;

    const getCarousel = (target: EventTarget | null) =>
      target instanceof HTMLElement ? target.closest<HTMLElement>('.snap-x.snap-mandatory') : null;

    const suppressNextTrustedClick = (handle: HTMLElement) => {
      suppressTrustedClick = handle;
      window.setTimeout(() => {
        if (suppressTrustedClick === handle) suppressTrustedClick = null;
      }, 350);
    };

    const removeNameAutofocus = (root: ParentNode) => {
      const inputs = root instanceof HTMLInputElement && root.matches('input[autofocus]')
        ? [root]
        : Array.from(root.querySelectorAll?.('input[autofocus]') ?? []);
      for (const input of inputs) {
        input.removeAttribute('autofocus');
        if (document.activeElement === input) input.blur();
      }
    };

    // iOS focuses the Name input as soon as that settings panel mounts. Strip
    // autofocus at the DOM boundary so the keyboard only opens after a real tap.
    removeNameAutofocus(document);
    const observer = new MutationObserver(records => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node instanceof HTMLElement) removeNameAutofocus(node);
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;
      const touch = event.touches[0];
      const handle = getHandle(event.target);
      if (handle) touchGesture = { x: touch.clientX, y: touch.clientY, handle };

      const carousel = getCarousel(event.target);
      if (carousel) {
        carouselGesture = {
          x: touch.clientX,
          y: touch.clientY,
          scrollLeft: carousel.scrollLeft,
          carousel,
          target: event.target instanceof HTMLElement ? event.target : null,
          horizontal: false,
        };
      }
    };

    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;
      const touch = event.touches[0];

      if (carouselGesture) {
        const screenDx = touch.clientX - carouselGesture.x;
        const screenDy = touch.clientY - carouselGesture.y;
        const logical = localDelta(carouselRotationElement(carouselGesture.carousel), screenDx, screenDy);

        if (!carouselGesture.horizontal && Math.abs(logical.x) > 8 && Math.abs(logical.x) > Math.abs(logical.y) * 1.1) {
          carouselGesture.horizontal = true;
        }
        if (carouselGesture.horizontal) {
          event.preventDefault();
          carouselGesture.carousel.scrollLeft = carouselGesture.scrollLeft - logical.x;
          return;
        }
      }

      if (!touchGesture) return;
      const dx = touch.clientX - touchGesture.x;
      const dy = touch.clientY - touchGesture.y;
      if (Math.hypot(dx, dy) > 8) event.preventDefault();
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (carouselGesture) {
        const currentCarousel = carouselGesture;
        carouselGesture = null;
        if (currentCarousel.horizontal) {
          event.preventDefault();
          event.stopPropagation();
          suppressCarouselClick = true;
          window.setTimeout(() => { suppressCarouselClick = false; }, 350);
          snapCarousel(currentCarousel.carousel);
          touchGesture = null;
          return;
        }
      }

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
      carouselGesture = null;
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
      if (suppressCarouselClick && event.isTrusted) {
        event.preventDefault();
        event.stopPropagation();
        suppressCarouselClick = false;
        return;
      }
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
      observer.disconnect();
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
