import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PullToRefreshIndicatorProps {
  /** Pull progress 0-1 */
  progress: number;
  /** Whether refresh is happening */
  isRefreshing: boolean;
  /** Whether threshold has been reached */
  thresholdReached: boolean;
  /** Current pull distance in px */
  pullDistance: number;
}

/**
 * Visual indicator for pull-to-refresh action.
 * Shows a spinner that fills/rotates based on pull progress.
 */
export function PullToRefreshIndicator({
  progress,
  isRefreshing,
  thresholdReached,
  pullDistance,
}: PullToRefreshIndicatorProps) {
  if (pullDistance <= 0 && !isRefreshing) return null;

  return (
    <div
      className={cn(
        'absolute left-1/2 -translate-x-1/2 z-20',
        'flex items-center justify-center',
        'transition-all duration-200 ease-out'
      )}
      style={{
        top: Math.max(0, pullDistance - 40),
        opacity: Math.min(progress * 1.5, 1),
      }}
    >
      <div
        className={cn(
          'w-10 h-10 rounded-full',
          'bg-white dark:bg-card',
          'shadow-lg shadow-black/10',
          'flex items-center justify-center',
          'border-2',
          thresholdReached || isRefreshing
            ? 'border-theme-green'
            : 'border-muted'
        )}
      >
        {isRefreshing ? (
          <Loader2 className="w-5 h-5 text-theme-green animate-spin" />
        ) : (
          <svg
            className={cn(
              'w-5 h-5 transition-all duration-150',
              thresholdReached ? 'text-theme-green' : 'text-muted-foreground'
            )}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transform: `rotate(${progress * 180}deg)`,
            }}
          >
            <path d="M12 19V5" />
            <path d="M5 12l7-7 7 7" />
          </svg>
        )}
      </div>
    </div>
  );
}

export default PullToRefreshIndicator;
