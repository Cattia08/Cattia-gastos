import React, { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { FaEdit, FaTrash } from 'react-icons/fa';

interface SwipeableListItemProps {
  children: React.ReactNode;
  /** Called when swiped left past threshold (delete) */
  onDelete?: () => void;
  /** Called when swiped right past threshold (edit) */
  onEdit?: () => void;
  /** Custom left action (shown on swipe right) */
  leftAction?: {
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    onAction: () => void;
  };
  /** Custom right action (shown on swipe left) */
  rightAction?: {
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    onAction: () => void;
  };
  /** Distance threshold to trigger action (px) */
  threshold?: number;
  /** Whether swipe is disabled */
  disabled?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * A list item that supports swipe gestures for actions.
 * Swipe right reveals edit action, swipe left reveals delete action.
 */
export function SwipeableListItem({
  children,
  onDelete,
  onEdit,
  leftAction,
  rightAction,
  threshold = 80,
  disabled = false,
  className,
}: SwipeableListItemProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [translateX, setTranslateX] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);

  const defaultLeftAction = leftAction || (onEdit ? {
    icon: <FaEdit className="w-5 h-5" />,
    color: 'text-white',
    bgColor: 'bg-blue-500',
    onAction: onEdit,
  } : undefined);

  const defaultRightAction = rightAction || (onDelete ? {
    icon: <FaTrash className="w-5 h-5" />,
    color: 'text-white',
    bgColor: 'bg-red-500',
    onAction: onDelete,
  } : undefined);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled) return;
    startXRef.current = e.touches[0].clientX;
    currentXRef.current = translateX;
    setIsAnimating(false);
  }, [disabled, translateX]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (disabled) return;
    
    const deltaX = e.touches[0].clientX - startXRef.current;
    let newTranslate = currentXRef.current + deltaX;

    // Limit swipe distance
    const maxSwipe = threshold + 20;
    if (!defaultLeftAction) {
      newTranslate = Math.min(0, newTranslate);
    }
    if (!defaultRightAction) {
      newTranslate = Math.max(0, newTranslate);
    }
    
    newTranslate = Math.max(-maxSwipe, Math.min(maxSwipe, newTranslate));
    setTranslateX(newTranslate);
  }, [disabled, threshold, defaultLeftAction, defaultRightAction]);

  const handleTouchEnd = useCallback(() => {
    if (disabled) return;
    
    setIsAnimating(true);

    // Check if threshold was reached
    if (translateX >= threshold && defaultLeftAction) {
      // Swipe right - trigger left action (edit)
      defaultLeftAction.onAction();
      setTranslateX(0);
    } else if (translateX <= -threshold && defaultRightAction) {
      // Swipe left - trigger right action (delete)
      defaultRightAction.onAction();
      setTranslateX(0);
    } else {
      // Snap back
      setTranslateX(0);
    }
  }, [disabled, translateX, threshold, defaultLeftAction, defaultRightAction]);

  const actionWidth = threshold + 20;

  return (
    <div 
      ref={containerRef}
      className={cn(
        'relative overflow-hidden',
        className
      )}
    >
      {/* Left action (revealed on swipe right) */}
      {defaultLeftAction && (
        <div
          className={cn(
            'absolute left-0 top-0 bottom-0 flex items-center justify-center',
            defaultLeftAction.bgColor,
            defaultLeftAction.color
          )}
          style={{ width: actionWidth }}
        >
          <div 
            className="flex items-center justify-center w-12 h-12"
            style={{
              opacity: Math.min(translateX / threshold, 1),
              transform: `scale(${Math.min(translateX / threshold, 1)})`,
            }}
          >
            {defaultLeftAction.icon}
          </div>
        </div>
      )}

      {/* Right action (revealed on swipe left) */}
      {defaultRightAction && (
        <div
          className={cn(
            'absolute right-0 top-0 bottom-0 flex items-center justify-center',
            defaultRightAction.bgColor,
            defaultRightAction.color
          )}
          style={{ width: actionWidth }}
        >
          <div 
            className="flex items-center justify-center w-12 h-12"
            style={{
              opacity: Math.min(-translateX / threshold, 1),
              transform: `scale(${Math.min(-translateX / threshold, 1)})`,
            }}
          >
            {defaultRightAction.icon}
          </div>
        </div>
      )}

      {/* Main content */}
      <div
        className={cn(
          'relative bg-white dark:bg-card z-10',
          isAnimating && 'transition-transform duration-200 ease-out'
        )}
        style={{ transform: `translateX(${translateX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}

export default SwipeableListItem;
