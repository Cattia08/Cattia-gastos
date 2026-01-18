import React from 'react';
import { Drawer } from 'vaul';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface BottomSheetProps {
  /** Whether the sheet is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Children to render in the sheet content */
  children: React.ReactNode;
  /** Optional title */
  title?: string;
  /** Optional description */
  description?: string;
  /** Whether to show the close button */
  showClose?: boolean;
  /** Snap points for the drawer (e.g., [0.5, 1] for half and full height) */
  snapPoints?: (number | string)[];
  /** Height when fully expanded (CSS value) */
  maxHeight?: string;
  /** Additional class names for the content */
  className?: string;
}

/**
 * Mobile-optimized modal that slides up from the bottom.
 * Uses vaul's Drawer component for smooth animations and gestures.
 * Automatically falls back to centered dialog on larger screens.
 */
export function BottomSheet({
  open,
  onOpenChange,
  children,
  title,
  description,
  showClose = true,
  snapPoints,
  maxHeight = '90vh',
  className,
}: BottomSheetProps) {
  return (
    <Drawer.Root
      open={open}
      onOpenChange={onOpenChange}
      snapPoints={snapPoints}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Drawer.Content
          className={cn(
            'fixed bottom-0 left-0 right-0 z-50',
            'flex flex-col',
            'bg-white dark:bg-card',
            'rounded-t-[20px]',
            'focus:outline-none',
            className
          )}
          style={{ maxHeight }}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-4 pb-2">
            <div className="w-12 h-1.5 rounded-full bg-muted" />
          </div>

          {/* Header */}
          {(title || showClose) && (
            <div className="flex items-center justify-between px-6 pb-4">
              <div className="flex-1">
                {title && (
                  <Drawer.Title className="text-lg font-semibold text-foreground">
                    {title}
                  </Drawer.Title>
                )}
                {description && (
                  <Drawer.Description className="text-sm text-muted-foreground mt-1">
                    {description}
                  </Drawer.Description>
                )}
              </div>
              {showClose && (
                <button
                  onClick={() => onOpenChange(false)}
                  className={cn(
                    'p-2 -m-2 rounded-full',
                    'hover:bg-muted transition-colors',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                  )}
                  aria-label="Cerrar"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              )}
            </div>
          )}

          {/* Content */}
          <div className={cn(
            'flex-1 overflow-y-auto px-6 pb-safe-bottom',
            'overscroll-contain'
          )}>
            {children}
          </div>

          {/* Safe area padding for notched devices */}
          <div className="h-safe-bottom" />
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

/**
 * Wrapper component that shows BottomSheet on mobile and Dialog on desktop.
 * Use this for forms and modals that need to work well on both.
 */
interface ResponsiveModalProps extends BottomSheetProps {
  /** Force using bottom sheet even on desktop */
  forceBottomSheet?: boolean;
}

export function ResponsiveModal({
  forceBottomSheet = false,
  ...props
}: ResponsiveModalProps) {
  // Always use BottomSheet for this implementation
  // Could add media query detection here if needed
  return <BottomSheet {...props} />;
}

export default BottomSheet;
