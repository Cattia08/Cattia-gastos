import { useState, useCallback, useRef, useEffect } from 'react';

interface PullToRefreshOptions {
  /** Function to call when pull threshold is reached */
  onRefresh: () => Promise<void>;
  /** Minimum pull distance to trigger refresh (px) */
  threshold?: number;
  /** Maximum pull distance (px) */
  maxPull?: number;
  /** Whether pull-to-refresh is disabled */
  disabled?: boolean;
}

interface PullToRefreshState {
  /** Whether user is currently pulling */
  isPulling: boolean;
  /** Current pull distance (0 to maxPull) */
  pullDistance: number;
  /** Progress 0-1 toward threshold */
  pullProgress: number;
  /** Whether refresh is in progress */
  isRefreshing: boolean;
  /** Whether threshold has been reached */
  thresholdReached: boolean;
}

/**
 * Hook for implementing pull-to-refresh functionality.
 * Only activates when at the top of the scrollable container.
 */
export function usePullToRefresh<T extends HTMLElement>(options: PullToRefreshOptions) {
  const {
    onRefresh,
    threshold = 80,
    maxPull = 120,
    disabled = false,
  } = options;

  const containerRef = useRef<T>(null);
  const startYRef = useRef<number>(0);
  const [state, setState] = useState<PullToRefreshState>({
    isPulling: false,
    pullDistance: 0,
    pullProgress: 0,
    isRefreshing: false,
    thresholdReached: false,
  });

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || state.isRefreshing) return;
    
    const container = containerRef.current;
    if (!container) return;

    // Only start if scrolled to top
    const isAtTop = container.scrollTop <= 0;
    if (!isAtTop) return;

    startYRef.current = e.touches[0].clientY;
    setState(prev => ({ ...prev, isPulling: true }));
  }, [disabled, state.isRefreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (disabled || !state.isPulling || state.isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const deltaY = currentY - startYRef.current;

    // Only respond to downward pulls
    if (deltaY <= 0) {
      setState(prev => ({
        ...prev,
        pullDistance: 0,
        pullProgress: 0,
        thresholdReached: false,
      }));
      return;
    }

    // Apply resistance for smoother feel (rubber band effect)
    const resistance = 0.5;
    const adjustedDelta = Math.min(deltaY * resistance, maxPull);
    const progress = Math.min(adjustedDelta / threshold, 1);

    // Prevent native scroll when pulling
    if (adjustedDelta > 10) {
      e.preventDefault();
    }

    setState(prev => ({
      ...prev,
      pullDistance: adjustedDelta,
      pullProgress: progress,
      thresholdReached: adjustedDelta >= threshold,
    }));
  }, [disabled, state.isPulling, state.isRefreshing, threshold, maxPull]);

  const handleTouchEnd = useCallback(async () => {
    if (disabled || !state.isPulling || state.isRefreshing) return;

    if (state.thresholdReached) {
      // Trigger refresh
      setState(prev => ({
        ...prev,
        isPulling: false,
        isRefreshing: true,
        pullDistance: threshold, // Keep at threshold during refresh
      }));

      try {
        await onRefresh();
      } finally {
        // Reset state after refresh completes
        setState({
          isPulling: false,
          pullDistance: 0,
          pullProgress: 0,
          isRefreshing: false,
          thresholdReached: false,
        });
      }
    } else {
      // Snap back without refresh
      setState({
        isPulling: false,
        pullDistance: 0,
        pullProgress: 0,
        isRefreshing: false,
        thresholdReached: false,
      });
    }
  }, [disabled, state.isPulling, state.isRefreshing, state.thresholdReached, threshold, onRefresh]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || disabled) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    container.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, disabled]);

  return {
    ref: containerRef,
    ...state,
  };
}

export default usePullToRefresh;
