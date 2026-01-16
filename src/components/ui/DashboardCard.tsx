import React from "react";
import { cn } from "@/lib/utils";
import Sparkline from "./Sparkline";
import AnimatedCounter from "./AnimatedCounter";

type CardVariant = "primary" | "secondary" | "default";
type CategoryTint = "rose" | "green" | "lavender" | "sage" | "none";

interface DashboardCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  className?: string;
  iconColor?: string;
  isCurrency?: boolean;
  subtext?: string;
  interactive?: boolean;
  emphasis?: boolean;
  onClick?: () => void;
  /** Card size variant: primary (large), secondary (small), default */
  variant?: CardVariant;
  /** Optional category tint for background */
  tint?: CategoryTint;
  /** Optional sparkline data for trend visualization */
  sparklineData?: number[];
  /** Optional comparison value for sparkline coloring */
  comparisonValue?: number;
}

const DashboardCard = ({
  title,
  value,
  icon,
  className,
  iconColor = "bg-pastel-pink",
  isCurrency = true,
  subtext,
  interactive = false,
  emphasis = false,
  onClick,
  variant = "default",
  tint = "none",
  sparklineData,
  comparisonValue,
}: DashboardCardProps) => {
  // Format the value - use AnimatedCounter for numbers
  const isNumericValue = typeof value === "number";
  const numericValue = isNumericValue ? value : 0;

  // Variant-specific styles
  const variantStyles = {
    primary: "min-h-[140px] p-5 md:p-6",
    secondary: "min-h-[100px] p-3 md:p-4",
    default: "min-h-[88px] p-3 md:p-4",
  };

  // Tint background styles
  const tintStyles = {
    rose: "bg-category-tint-rose",
    green: "bg-category-tint-green",
    lavender: "bg-category-tint-lavender",
    sage: "bg-category-tint-sage",
    none: "bg-white dark:bg-card",
  };

  // Text size based on variant
  const valueStyles = {
    primary: "text-3xl md:text-4xl lg:text-5xl",
    secondary: "text-xl md:text-2xl",
    default: emphasis ? "text-2xl md:text-3xl" : "text-xl md:text-2xl",
  };

  const titleStyles = {
    primary: "text-sm md:text-base font-semibold text-text-secondary",
    secondary: "text-xs font-medium text-text-secondary",
    default: "text-xs font-medium text-text-secondary",
  };

  const iconContainerStyles = {
    primary: "w-14 h-14 md:w-16 md:h-16",
    secondary: "w-10 h-10",
    default: "w-10 h-10 md:w-12 md:h-12",
  };

  // Calculate sparkline color based on comparison
  const getSparklineColor = () => {
    if (!sparklineData || sparklineData.length < 2) return "#5DBE8A";
    const last = sparklineData[sparklineData.length - 1];
    const first = sparklineData[0];
    return last >= first ? "#5DBE8A" : "#E57373";
  };

  return (
    <div
      className={cn(
        "rounded-2xl border border-pink-100 dark:border-border shadow-card",
        "flex flex-col justify-between h-full",
        "card-hover-lift", // Optimized 150ms hover transition
        variantStyles[variant],
        tintStyles[tint],
        interactive && "cursor-pointer",
        interactive && "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
        className
      )}
      onClick={onClick}
      tabIndex={interactive ? 0 : undefined}
      role={interactive ? "button" : undefined}
    >
      {variant === "primary" ? (
        // Primary layout: centered content
        <div className="flex flex-col items-center text-center gap-3">
          <div className={cn("rounded-full flex items-center justify-center", iconContainerStyles[variant], iconColor)}>
            {icon}
          </div>
          <div className="flex-1">
            <h3 className={cn(titleStyles[variant])}>{title}</h3>
            <p
              className={cn(
                "font-extrabold mt-2 tracking-tight text-text-emphasis dark:text-foreground",
                valueStyles[variant]
              )}
            >
              {isNumericValue && isCurrency ? (
                <>
                  S/ <AnimatedCounter value={numericValue} duration={250} decimals={2} />
                </>
              ) : (
                value
              )}
            </p>
            {(subtext || sparklineData) && (
              <div className="flex items-center justify-center gap-2 mt-2">
                {sparklineData && sparklineData.length >= 2 && (
                  <Sparkline
                    data={sparklineData}
                    color={getSparklineColor()}
                    width={48}
                    height={20}
                  />
                )}
                {subtext && <p className="text-sm text-text-secondary">{subtext}</p>}
              </div>
            )}
          </div>
        </div>
      ) : (
        // Default/secondary layout: horizontal
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className={cn(titleStyles[variant], "truncate")}>{title}</h3>
            <p
              className={cn(
                "font-extrabold mt-1 tracking-tight text-text-emphasis dark:text-foreground break-words",
                valueStyles[variant]
              )}
            >
              {isNumericValue && isCurrency ? (
                <>
                  S/ <AnimatedCounter value={numericValue} duration={250} decimals={2} />
                </>
              ) : (
                value
              )}
            </p>
            {(subtext || sparklineData) && (
              <div className="flex items-center gap-2 mt-1">
                {sparklineData && sparklineData.length >= 2 && (
                  <Sparkline
                    data={sparklineData}
                    color={getSparklineColor()}
                    width={40}
                    height={16}
                  />
                )}
                {subtext && <p className="text-xs text-text-secondary">{subtext}</p>}
              </div>
            )}
          </div>
          <div className={cn("shrink-0 rounded-full flex items-center justify-center", iconContainerStyles[variant], iconColor)}>
            {icon}
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardCard;
