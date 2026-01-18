import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useDeviceType } from "@/hooks/useDeviceType";
import { cn } from "@/lib/utils";

export interface ThemedDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
  trigger?: React.ReactNode;
  /** Force desktop modal even on mobile */
  forceDesktop?: boolean;
  /** Title for bottom sheet (mobile) */
  title?: string;
  /** Description for bottom sheet (mobile) */
  description?: string;
}

export interface ThemedDialogContentProps {
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "sm:max-w-[425px]",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
};

/**
 * ThemedDialog - Responsive wrapper that uses BottomSheet on mobile/tablet
 * and regular Dialog on desktop.
 */
const ThemedDialog: React.FC<ThemedDialogProps> = ({
  open,
  onOpenChange,
  children,
  trigger,
  forceDesktop = false,
  title,
  description,
}) => {
  const { isMobile, isTablet } = useDeviceType();
  const useMobileSheet = (isMobile || isTablet) && !forceDesktop;

  if (useMobileSheet) {
    return (
      <>
        {trigger}
        <BottomSheet
          open={open ?? false}
          onOpenChange={onOpenChange ?? (() => {})}
          title={title}
          description={description}
          showClose={true}
        >
          {children}
        </BottomSheet>
      </>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      {children}
    </Dialog>
  );
};

/**
 * ThemedDialogContent - Styled content wrapper
 * Note: On mobile, this content is rendered inside BottomSheet
 */
const ThemedDialogContent: React.FC<ThemedDialogContentProps> = ({
  children,
  className,
  size = "md",
}) => {
  const { isMobile, isTablet } = useDeviceType();

  // On mobile/tablet, content is already wrapped by BottomSheet
  // so we render a simpler wrapper
  if (isMobile || isTablet) {
    return <div className={cn("pb-6", className)}>{children}</div>;
  }

  return (
    <DialogContent
      className={cn(
        // Base styling from theme
        "bg-white dark:bg-card rounded-2xl",
        "border border-gray-200 dark:border-gray-700",
        "shadow-soft-lg",
        // Size
        sizeClasses[size],
        className
      )}
    >
      {children}
    </DialogContent>
  );
};

/**
 * ThemedDialogHeader - Consistent header styling
 * Hidden on mobile as BottomSheet handles header
 */
const ThemedDialogHeader: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => {
  const { isMobile, isTablet } = useDeviceType();

  // On mobile, BottomSheet handles the header
  if (isMobile || isTablet) {
    return null;
  }

  return (
    <DialogHeader className={cn("space-y-1.5", className)}>
      {children}
    </DialogHeader>
  );
};

/**
 * ThemedDialogTitle - Title with optional icon
 */
const ThemedDialogTitle: React.FC<{
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}> = ({ children, icon, className }) => (
  <DialogTitle className={cn("flex items-center gap-2 text-lg font-semibold", className)}>
    {icon && <span className="text-theme-green">{icon}</span>}
    {children}
  </DialogTitle>
);

/**
 * ThemedDialogDescription - Description text
 */
const ThemedDialogDescription: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <DialogDescription className={cn("text-sm text-muted-foreground", className)}>
    {children}
  </DialogDescription>
);

/**
 * ThemedDialogFooter - Footer with actions
 */
const ThemedDialogFooter: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <DialogFooter className={cn("flex justify-end gap-2 pt-4", className)}>
    {children}
  </DialogFooter>
);

export {
  ThemedDialog,
  ThemedDialogContent,
  ThemedDialogHeader,
  ThemedDialogTitle,
  ThemedDialogDescription,
  ThemedDialogFooter,
};

