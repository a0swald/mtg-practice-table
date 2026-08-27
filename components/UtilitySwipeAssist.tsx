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
  startIndex: number;
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

function carouselSections(carousel: HTMLElement) {
  return Array.from(carousel.children).filter((child): child is HTMLElement => child instanceof HTMLElement);
}

function closestSectionIndex(carousel: HTMLElement) {
  const sections = carouselSections(carousel);
  if (!sections.length) return 0;
  let bestIndex = 0;
  for (let index = 1; index < sections.length; index += 1) {
    if (Math.abs(sections[index].offsetLeft - carousel.scrollLeft) < Math.abs(sections[bestIndex].offsetLeft - carousel.scrollLeft)) bestIndex = index;
  }
  return bestIndex;
}

function goToSection(carousel: HTMLElement, index: number) {
  const sections = carouselSections(carousel);
  if (!sections.length) return;
  const target = sections[Math.max(0, Math.min(sections.length - 1, index))];
  carousel.scrollTo({ left: target.offsetLeft, behavior: 'smooth' });
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
          startIndex: closestSectionIndex(carousel),
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

        if (!carouselGesture.horizontal && Math.abs(logical.x) > 6 && Math.abs(logical.x) > Math.abs(logical.y) * 0.8) {
          carouselGesture.horizontal = true;
        }
        if (carouselGesture.horizontal) {
          event.preventDefault();
          event.stopPropagation();
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
      if (carouselGesture && event.changedTouches.length > 0) {
        const currentCarousel = carouselGesture;
        carouselGesture = null;
        const touch = event.changedTouches[0];
        const logical = localDelta(
          carouselRotationElement(currentCarousel.carousel),
          touch.clientX - currentCarousel.x,
          touch.clientY - currentCarousel.y,
        );

        if (currentCarousel.horizontal) {
          event.preventDefault();
          event.stopPropagation();
          suppressCarouselClick = true;
          window.setTimeout(() => { suppressCarouselClick = false; }, 350);

          // A deliberate swipe advances exactly one page. This avoids iOS
          // snapping a short drag back to Player even though the gesture was valid.
          const threshold = 28;
          const direction = logical.x < -threshold ? 1 : logical.x > threshold ? -1 : 0;
          goToSection(currentCarousel.carousel, direction === 0 ? closestSectionIndex(currentCarousel.carousel) : currentCarousel.startIndex + direction);
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
