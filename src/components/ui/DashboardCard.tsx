import React from "react";
import { cn } from "@/lib/utils";
import Sparkline from "./Sparkline";
import AnimatedCounter from "./AnimatedCounter";
import { TrendingUp, TrendingDown } from "lucide-react";

type CardVariant = "primary" | "secondary" | "default";
type CategoryTint = "rose" | "green" | "lavender" | "sage" | "orange" | "blue" | "none";

interface DashboardCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  className?: string;
  iconColor?: string;
  isCurrency?: boolean;
  subtext?: string;
  /** Secondary subtext line (e.g., "X días transcurridos") */
  secondarySubtext?: string;
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
  /** Show trend indicator arrow (↑/↓) based on comparison */
  showTrendIndicator?: boolean;
  /** Previous value for trend comparison */
  previousValue?: number;
}

const DashboardCard = ({
  title,
  value,
  icon,
  className,
  iconColor = "bg-pastel-pink",
  isCurrency = true,
  subtext,
  secondarySubtext,
  interactive = false,
  emphasis = false,
  onClick,
  variant = "default",
  tint = "none",
  sparklineData,
  comparisonValue,
  showTrendIndicator = false,
  previousValue,
}: DashboardCardProps) => {
  // Format the value - use AnimatedCounter for numbers
  const isNumericValue = typeof value === "number";
  const numericValue = isNumericValue ? value : 0;

  // Calculate trend direction
  const getTrendDirection = () => {
    if (!showTrendIndicator || previousValue === undefined || !isNumericValue) return null;
    if (numericValue > previousValue) return "up";
    if (numericValue < previousValue) return "down";
    return null;
  };

  const trendDirection = getTrendDirection();

  // Variant-specific styles
  const variantStyles = {
    primary: "min-h-[160px] p-6 md:p-8",
    secondary: "min-h-[100px] p-3 md:p-4",
    default: "min-h-[88px] p-3 md:p-4",
  };

  // Tint background styles
  const tintStyles = {
    rose: "bg-category-tint-rose",
    green: "bg-category-tint-green",
    lavender: "bg-category-tint-lavender",
    sage: "bg-category-tint-sage",
    orange: "bg-category-tint-orange",
    blue: "bg-category-tint-blue",
    none: "bg-white dark:bg-card",
  };

  // Text size based on variant - ENHANCED for primary
  const valueStyles = {
    primary: "text-5xl md:text-6xl lg:text-6xl",
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
        // Primary layout: centered content with larger text
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
            {/* Comparison with trend indicator */}
            {subtext && (
              <div className="flex items-center justify-center gap-2 mt-3">
                {showTrendIndicator && trendDirection && (
                  <span className={cn(
                    "flex items-center gap-1 text-sm font-medium",
                    trendDirection === "up" ? "text-red-500" : "text-green-500"
                  )}>
                    {trendDirection === "up" ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                  </span>
                )}
                {sparklineData && sparklineData.length >= 2 && (
                  <Sparkline
                    data={sparklineData}
                    color={getSparklineColor()}
                    width={60}
                    height={24}
                  />
                )}
                <p className="text-sm text-text-secondary">{subtext}</p>
              </div>
            )}
            {/* Secondary subtext (e.g., days elapsed) */}
            {secondarySubtext && (
              <p className="text-xs text-text-muted mt-1">{secondarySubtext}</p>
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
            {secondarySubtext && (
              <p className="text-xs text-text-muted mt-0.5">{secondarySubtext}</p>
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

