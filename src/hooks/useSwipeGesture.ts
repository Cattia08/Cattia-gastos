import { useRef, useCallback, useEffect } from 'react';

export type SwipeDirection = 'left' | 'right' | 'up' | 'down' | null;

interface SwipeState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  deltaX: number;
  deltaY: number;
  isSwiping: boolean;
}

interface SwipeCallbacks {
  onSwipeStart?: (e: TouchEvent) => void;
  onSwipeMove?: (delta: { x: number; y: number }, e: TouchEvent) => void;
  onSwipeEnd?: (direction: SwipeDirection, velocity: number, delta: { x: number; y: number }) => void;
  onSwipeLeft?: (velocity: number) => void;
  onSwipeRight?: (velocity: number) => void;
  onSwipeUp?: (velocity: number) => void;
  onSwipeDown?: (velocity: number) => void;
}

interface SwipeOptions {
  /** Minimum distance (px) to trigger a swipe */
  threshold?: number;
  /** Minimum velocity (px/ms) to trigger a swipe */
  velocityThreshold?: number;
  /** Prevent default touch behavior */
  preventDefault?: boolean;
  /** Only detect horizontal swipes */
  horizontalOnly?: boolean;
  /** Only detect vertical swipes */
  verticalOnly?: boolean;
  /** Disable the gesture detection */
  disabled?: boolean;
}

/**
 * Hook for detecting swipe gestures on touch devices.
 * Returns a ref to attach to the swipeable element.
 */
export function useSwipeGesture<T extends HTMLElement>(
  callbacks: SwipeCallbacks,
  options: SwipeOptions = {}
) {
  const {
    threshold = 50,
    velocityThreshold = 0.3,
    preventDefault = false,
    horizontalOnly = false,
    verticalOnly = false,
    disabled = false,
  } = options;

  const elementRef = useRef<T>(null);
  const stateRef = useRef<SwipeState>({
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    deltaX: 0,
    deltaY: 0,
    isSwiping: false,
  });
  const startTimeRef = useRef<number>(0);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled) return;
    
    const touch = e.touches[0];
    stateRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      currentY: touch.clientY,
      deltaX: 0,
      deltaY: 0,
      isSwiping: true,
    };
    startTimeRef.current = Date.now();

    callbacks.onSwipeStart?.(e);
  }, [callbacks, disabled]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (disabled || !stateRef.current.isSwiping) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - stateRef.current.startX;
    const deltaY = touch.clientY - stateRef.current.startY;

    stateRef.current.currentX = touch.clientX;
    stateRef.current.currentY = touch.clientY;
    stateRef.current.deltaX = deltaX;
    stateRef.current.deltaY = deltaY;

    // Determine if we should prevent default based on direction lock
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);
    
    if (horizontalOnly && absDeltaX > absDeltaY && preventDefault) {
      e.preventDefault();
    } else if (verticalOnly && absDeltaY > absDeltaX && preventDefault) {
      e.preventDefault();
    } else if (!horizontalOnly && !verticalOnly && preventDefault) {
      e.preventDefault();
    }

    callbacks.onSwipeMove?.({ x: deltaX, y: deltaY }, e);
  }, [callbacks, disabled, horizontalOnly, verticalOnly, preventDefault]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (disabled || !stateRef.current.isSwiping) return;

    const { deltaX, deltaY } = stateRef.current;
    const duration = Date.now() - startTimeRef.current;
    const velocity = Math.sqrt(deltaX ** 2 + deltaY ** 2) / duration;

    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    let direction: SwipeDirection = null;

    // Determine swipe direction based on constraints
    if (!verticalOnly && absDeltaX > absDeltaY && absDeltaX >= threshold) {
      direction = deltaX > 0 ? 'right' : 'left';
    } else if (!horizontalOnly && absDeltaY > absDeltaX && absDeltaY >= threshold) {
      direction = deltaY > 0 ? 'down' : 'up';
    }

    // Only trigger if velocity threshold is met
    if (direction && velocity >= velocityThreshold) {
      callbacks.onSwipeEnd?.(direction, velocity, { x: deltaX, y: deltaY });

      switch (direction) {
        case 'left':
          callbacks.onSwipeLeft?.(velocity);
          break;
        case 'right':
          callbacks.onSwipeRight?.(velocity);
          break;
        case 'up':
          callbacks.onSwipeUp?.(velocity);
          break;
        case 'down':
          callbacks.onSwipeDown?.(velocity);
          break;
      }
    } else {
      callbacks.onSwipeEnd?.(null, velocity, { x: deltaX, y: deltaY });
    }

    stateRef.current.isSwiping = false;
  }, [callbacks, disabled, threshold, velocityThreshold, horizontalOnly, verticalOnly]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || disabled) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: !preventDefault });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });
    element.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, disabled, preventDefault]);

  return {
    ref: elementRef,
    /** Get current swipe state */
    getState: () => stateRef.current,
  };
}

export default useSwipeGesture;
