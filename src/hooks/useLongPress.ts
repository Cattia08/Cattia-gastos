import { useState, useRef, useCallback, useEffect } from 'react';

interface LongPressOptions {
  /** Duration in ms before long press triggers */
  delay?: number;
  /** Callback when long press is triggered */
  onLongPress: () => void;
  /** Optional callback when press starts */
  onPressStart?: () => void;
  /** Optional callback when press ends without long press */
  onPressEnd?: () => void;
  /** Movement threshold that cancels the long press */
  moveThreshold?: number;
  /** Whether long press is disabled */
  disabled?: boolean;
}

/**
 * Hook for detecting long press gestures.
 * Triggers haptic feedback if available.
 */
export function useLongPress<T extends HTMLElement>(options: LongPressOptions) {
  const {
    delay = 500,
    onLongPress,
    onPressStart,
    onPressEnd,
    moveThreshold = 10,
    disabled = false,
  } = options;

  const elementRef = useRef<T>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const [isPressed, setIsPressed] = useState(false);
  const [isLongPressed, setIsLongPressed] = useState(false);

  const triggerHaptic = useCallback(() => {
    // Trigger haptic feedback if available
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  }, []);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const handlePressStart = useCallback((e: TouchEvent | MouseEvent) => {
    if (disabled) return;

    const point = 'touches' in e ? e.touches[0] : e;
    startPosRef.current = { x: point.clientX, y: point.clientY };
    
    setIsPressed(true);
    onPressStart?.();

    timeoutRef.current = setTimeout(() => {
      setIsLongPressed(true);
      triggerHaptic();
      onLongPress();
    }, delay);
  }, [disabled, delay, onLongPress, onPressStart, triggerHaptic]);

  const handlePressMove = useCallback((e: TouchEvent | MouseEvent) => {
    if (disabled || !startPosRef.current) return;

    const point = 'touches' in e ? e.touches[0] : e;
    const deltaX = Math.abs(point.clientX - startPosRef.current.x);
    const deltaY = Math.abs(point.clientY - startPosRef.current.y);

    // Cancel long press if moved too much
    if (deltaX > moveThreshold || deltaY > moveThreshold) {
      clearTimer();
      setIsPressed(false);
      startPosRef.current = null;
    }
  }, [disabled, moveThreshold, clearTimer]);

  const handlePressEnd = useCallback(() => {
    clearTimer();
    
    if (isPressed && !isLongPressed) {
      onPressEnd?.();
    }
    
    setIsPressed(false);
    setIsLongPressed(false);
    startPosRef.current = null;
  }, [clearTimer, isPressed, isLongPressed, onPressEnd]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || disabled) return;

    // Touch events
    element.addEventListener('touchstart', handlePressStart, { passive: true });
    element.addEventListener('touchmove', handlePressMove, { passive: true });
    element.addEventListener('touchend', handlePressEnd, { passive: true });
    element.addEventListener('touchcancel', handlePressEnd, { passive: true });

    // Mouse events (for desktop testing)
    element.addEventListener('mousedown', handlePressStart);
    element.addEventListener('mousemove', handlePressMove);
    element.addEventListener('mouseup', handlePressEnd);
    element.addEventListener('mouseleave', handlePressEnd);

    return () => {
      clearTimer();
      element.removeEventListener('touchstart', handlePressStart);
      element.removeEventListener('touchmove', handlePressMove);
      element.removeEventListener('touchend', handlePressEnd);
      element.removeEventListener('touchcancel', handlePressEnd);
      element.removeEventListener('mousedown', handlePressStart);
      element.removeEventListener('mousemove', handlePressMove);
      element.removeEventListener('mouseup', handlePressEnd);
      element.removeEventListener('mouseleave', handlePressEnd);
    };
  }, [handlePressStart, handlePressMove, handlePressEnd, clearTimer, disabled]);

  return {
    ref: elementRef,
    isPressed,
    isLongPressed,
  };
}

export default useLongPress;
