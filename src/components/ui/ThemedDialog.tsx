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
import { cn } from "@/lib/utils";

export interface ThemedDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
  trigger?: React.ReactNode;
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
 * ThemedDialog - Wrapper component for consistent modal styling
 * Uses theme tokens for easy theme switching
 */
const ThemedDialog: React.FC<ThemedDialogProps> = ({
  open,
  onOpenChange,
  children,
  trigger,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      {children}
    </Dialog>
  );
};

/**
 * ThemedDialogContent - Styled content wrapper
 */
const ThemedDialogContent: React.FC<ThemedDialogContentProps> = ({
  children,
  className,
  size = "md",
}) => {
  return (
    <DialogContent
      className={cn(
        // Base styling from theme
        "bg-white rounded-2xl",
        "border border-gray-200",
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
 */
const ThemedDialogHeader: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <DialogHeader className={cn("space-y-1.5", className)}>
    {children}
  </DialogHeader>
);

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
