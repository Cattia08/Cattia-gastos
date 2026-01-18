import { useState, useEffect, useCallback, useRef } from 'react';

export type ScrollDirection = 'up' | 'down' | 'none';

interface ScrollState {
  /** Current scroll direction */
  direction: ScrollDirection;
  /** Whether user is at the top of the page (within threshold) */
  isAtTop: boolean;
  /** Current scroll Y position */
  scrollY: number;
}

interface UseScrollDirectionOptions {
  /** Minimum scroll delta before direction change is registered (prevents jitter) */
  threshold?: number;
  /** Distance from top considered "at top" */
  topThreshold?: number;
  /** Throttle interval in ms */
  throttleMs?: number;
}

/**
 * Custom hook to detect scroll direction and position.
 * Used primarily for hiding/showing the bottom navigation bar.
 * 
 * @param options - Configuration options
 * @returns ScrollState with direction, isAtTop, and scrollY
 */
export function useScrollDirection(options: UseScrollDirectionOptions = {}): ScrollState {
  const { 
    threshold = 10, 
    topThreshold = 50,
    throttleMs = 100 
  } = options;

  const [state, setState] = useState<ScrollState>({
    direction: 'none',
    isAtTop: true,
    scrollY: 0,
  });

  // Track last scroll position and timestamp for throttling
  const lastScrollY = useRef(0);
  const lastUpdateTime = useRef(0);
  const ticking = useRef(false);

  const updateScrollState = useCallback(() => {
    const currentScrollY = window.scrollY;
    const diff = currentScrollY - lastScrollY.current;
    const isAtTop = currentScrollY <= topThreshold;

    // Only update direction if scroll delta exceeds threshold
    let newDirection: ScrollDirection = state.direction;
    if (Math.abs(diff) >= threshold) {
      newDirection = diff > 0 ? 'down' : 'up';
    }

    // Reset direction to 'none' when at top
    if (isAtTop) {
      newDirection = 'none';
    }

    setState({
      direction: newDirection,
      isAtTop,
      scrollY: currentScrollY,
    });

    lastScrollY.current = currentScrollY;
    ticking.current = false;
  }, [threshold, topThreshold, state.direction]);

  useEffect(() => {
    const handleScroll = () => {
      const now = Date.now();
      
      // Throttle updates
      if (now - lastUpdateTime.current < throttleMs) {
        if (!ticking.current) {
          ticking.current = true;
          requestAnimationFrame(updateScrollState);
        }
        return;
      }

      lastUpdateTime.current = now;
      
      if (!ticking.current) {
        ticking.current = true;
        requestAnimationFrame(updateScrollState);
      }
    };

    // Set initial state
    lastScrollY.current = window.scrollY;
    setState(prev => ({
      ...prev,
      isAtTop: window.scrollY <= topThreshold,
      scrollY: window.scrollY,
    }));

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [updateScrollState, topThreshold, throttleMs]);

  return state;
}

export default useScrollDirection;
