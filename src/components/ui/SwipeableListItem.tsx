import React, { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Pencil, Trash2 } from 'lucide-react';

interface SwipeableListItemProps {
  children: React.ReactNode;
  /** Called when swiped left past threshold (delete) */
  onDelete?: () => void;
  /** Called when swiped right past threshold (edit) */
  onEdit?: () => void;
  /** Custom left action (shown on swipe right) */
  leftAction?: {
    icon: React.ReactNode;
    label: string;
    color: string;
    bgColor: string;
    onAction: () => void;
  };
  /** Custom right action (shown on swipe left) */
  rightAction?: {
    icon: React.ReactNode;
    label: string;
    color: string;
    bgColor: string;
    onAction: () => void;
  };
  /** Distance threshold to snap open (px) */
  threshold?: number;
  /** Whether swipe is disabled */
  disabled?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * A list item that supports swipe gestures for actions.
 * Swipe reveals action buttons - user must tap the revealed button to confirm.
 * This prevents accidental actions from slight swipe movements.
 */
export function SwipeableListItem({
  children,
  onDelete,
  onEdit,
  leftAction,
  rightAction,
  threshold = 100,
  disabled = false,
  className,
}: SwipeableListItemProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [translateX, setTranslateX] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isOpen, setIsOpen] = useState<'left' | 'right' | null>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const currentXRef = useRef(0);
  const isHorizontalSwipe = useRef<boolean | null>(null);

  const defaultLeftAction = leftAction || (onEdit ? {
    icon: <Pencil className="w-5 h-5" />,
    label: 'Editar',
    color: 'text-white',
    bgColor: 'bg-blue-500',
    onAction: onEdit,
  } : undefined);

  const defaultRightAction = rightAction || (onDelete ? {
    icon: <Trash2 className="w-5 h-5" />,
    label: 'Eliminar',
    color: 'text-white',
    bgColor: 'bg-red-500',
    onAction: onDelete,
  } : undefined);

  const actionWidth = threshold;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled) return;
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    currentXRef.current = translateX;
    isHorizontalSwipe.current = null;
    setIsAnimating(false);
  }, [disabled, translateX]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (disabled) return;
    
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - startXRef.current;
    const deltaY = currentY - startYRef.current;

    // Determine swipe direction on first significant movement
    if (isHorizontalSwipe.current === null) {
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);
      
      // Need at least 10px movement to determine direction
      if (absDeltaX < 10 && absDeltaY < 10) return;
      
      // If vertical motion is greater, this is a scroll - ignore
      if (absDeltaY > absDeltaX) {
        isHorizontalSwipe.current = false;
        return;
      }
      
      isHorizontalSwipe.current = true;
    }

    // If this is a vertical scroll, don't handle
    if (!isHorizontalSwipe.current) return;

    let newTranslate = currentXRef.current + deltaX;

    // Limit swipe distance with resistance
    const maxSwipe = actionWidth + 20;
    if (!defaultLeftAction) {
      newTranslate = Math.min(0, newTranslate);
    }
    if (!defaultRightAction) {
      newTranslate = Math.max(0, newTranslate);
    }
    
    // Apply rubber band resistance beyond threshold
    if (Math.abs(newTranslate) > actionWidth) {
      const excess = Math.abs(newTranslate) - actionWidth;
      const dampedExcess = excess * 0.3;
      newTranslate = newTranslate > 0 
        ? actionWidth + dampedExcess 
        : -(actionWidth + dampedExcess);
    }
    
    newTranslate = Math.max(-maxSwipe, Math.min(maxSwipe, newTranslate));
    setTranslateX(newTranslate);
  }, [disabled, actionWidth, defaultLeftAction, defaultRightAction]);

  const handleTouchEnd = useCallback(() => {
    if (disabled || !isHorizontalSwipe.current) return;
    
    setIsAnimating(true);

    const absTranslate = Math.abs(translateX);
    const snapThreshold = actionWidth * 0.4; // 40% of action width to snap open

    if (translateX > snapThreshold && defaultLeftAction) {
      // Snap open to left (reveal edit)
      setTranslateX(actionWidth);
      setIsOpen('left');
    } else if (translateX < -snapThreshold && defaultRightAction) {
      // Snap open to right (reveal delete)
      setTranslateX(-actionWidth);
      setIsOpen('right');
    } else {
      // Snap back closed
      setTranslateX(0);
      setIsOpen(null);
    }
  }, [disabled, translateX, actionWidth, defaultLeftAction, defaultRightAction]);

  const handleActionClick = useCallback((action: () => void) => {
    action();
    setTranslateX(0);
    setIsOpen(null);
    setIsAnimating(true);
  }, []);

  const handleClose = useCallback(() => {
    setTranslateX(0);
    setIsOpen(null);
    setIsAnimating(true);
  }, []);

  return (
    <div 
      ref={containerRef}
      className={cn(
        'relative overflow-hidden',
        className
      )}
    >
      {/* Left action button (revealed on swipe right) */}
      {defaultLeftAction && (
        <button
          onClick={() => handleActionClick(defaultLeftAction.onAction)}
          className={cn(
            'absolute left-0 top-0 bottom-0 flex flex-col items-center justify-center gap-1',
            defaultLeftAction.bgColor,
            defaultLeftAction.color,
            'transition-opacity duration-150',
            isOpen === 'left' ? 'opacity-100' : 'opacity-80'
          )}
          style={{ width: actionWidth }}
        >
          {defaultLeftAction.icon}
          <span className="text-xs font-medium">{defaultLeftAction.label}</span>
        </button>
      )}

      {/* Right action button (revealed on swipe left) */}
      {defaultRightAction && (
        <button
          onClick={() => handleActionClick(defaultRightAction.onAction)}
          className={cn(
            'absolute right-0 top-0 bottom-0 flex flex-col items-center justify-center gap-1',
            defaultRightAction.bgColor,
            defaultRightAction.color,
            'transition-opacity duration-150',
            isOpen === 'right' ? 'opacity-100' : 'opacity-80'
          )}
          style={{ width: actionWidth }}
        >
          {defaultRightAction.icon}
          <span className="text-xs font-medium">{defaultRightAction.label}</span>
        </button>
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
        onClick={isOpen ? handleClose : undefined}
      >
        {children}
      </div>
    </div>
  );
}

export default SwipeableListItem;

