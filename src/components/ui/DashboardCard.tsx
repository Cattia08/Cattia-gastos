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
    primary: "p-6 md:p-8 overflow-hidden",
    secondary: "min-h-[100px] p-3 md:p-4",
    default: "min-h-[88px] p-3 md:p-4",
  };

  // Tint background styles (primary uses plain card; rose accent applied via blob)
  const tintStyles = {
    rose: "bg-category-tint-rose",
    green: "bg-category-tint-green",
    lavender: "bg-category-tint-lavender",
    sage: "bg-category-tint-sage",
    orange: "bg-category-tint-orange",
    blue: "bg-category-tint-blue",
    none: "bg-white dark:bg-card",
  };

  const valueStyles = {
    primary: "text-5xl md:text-6xl lg:text-7xl",
    secondary: "text-xl md:text-2xl",
    default: emphasis ? "text-2xl md:text-3xl" : "text-xl md:text-2xl",
  };

  const titleStyles = {
    primary: "text-sm font-medium text-text-secondary",
    secondary: "text-xs font-medium text-text-secondary",
    default: "text-xs font-medium text-text-secondary",
  };

  const iconContainerStyles = {
    primary: "w-10 h-10",
    secondary: "w-10 h-10",
    default: "w-10 h-10 md:w-12 md:h-12",
  };

  // Sparkline color: token-based, not hardcoded green/red
  const getSparklineColor = () => {
    if (!sparklineData || sparklineData.length < 2) return "hsl(var(--accent))";
    const last = sparklineData[sparklineData.length - 1];
    const first = sparklineData[0];
    return last >= first ? "hsl(var(--destructive))" : "hsl(var(--accent))";
  };

  return (
    <div
      className={cn(
        "relative rounded-3xl border border-border shadow-soft",
        "flex flex-col h-full",
        "transition-shadow duration-300 ease-out",
        interactive && "hover:shadow-soft-md",
        variantStyles[variant],
        tintStyles[tint],
        interactive && "cursor-pointer",
        interactive && "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        className
      )}
      onClick={onClick}
      tabIndex={interactive ? 0 : undefined}
      role={interactive ? "button" : undefined}
    >
      {variant === "primary" ? (
        <>
          {/* Decorative rose blob — signature element, not generic gradient */}
          <div
            aria-hidden="true"
            className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-primary/[0.12] blur-3xl pointer-events-none"
          />
          <div className="relative grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-x-6 gap-y-4 items-end">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className={cn(
                  "rounded-xl flex items-center justify-center",
                  iconContainerStyles[variant],
                  "bg-primary text-primary-foreground shadow-[0_6px_18px_-6px_hsl(var(--primary)/0.55)]"
                )}>
                  {icon}
                </div>
                <h3 className={titleStyles[variant]}>{title}</h3>
              </div>
              <p
                className={cn(
                  "font-bold tracking-tight text-text-emphasis dark:text-foreground tabular-nums",
                  valueStyles[variant]
                )}
              >
                {isNumericValue && isCurrency ? (
                  <>
                    <span className="text-3xl md:text-4xl font-medium text-text-secondary mr-1.5 align-baseline">S/</span>
                    <AnimatedCounter value={numericValue} duration={250} decimals={2} />
                  </>
                ) : (
                  value
                )}
              </p>
              {(subtext || (showTrendIndicator && trendDirection)) && (
                <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  {showTrendIndicator && trendDirection && (
                    <span className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                      trendDirection === "up"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-accent/15 text-accent"
                    )}>
                      {trendDirection === "up" ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      vs anterior
                    </span>
                  )}
                  {subtext && <span className="text-sm text-text-secondary">{subtext}</span>}
                </div>
              )}
              {secondarySubtext && (
                <p className="text-xs text-text-muted mt-2">{secondarySubtext}</p>
              )}
            </div>
            {sparklineData && sparklineData.length >= 2 && (
              <div className="relative">
                <Sparkline
                  data={sparklineData}
                  color={getSparklineColor()}
                  width={140}
                  height={56}
                />
                <p className="text-[10px] text-text-muted text-right mt-1 tabular-nums uppercase tracking-wider">
                  6 meses
                </p>
              </div>
            )}
          </div>
        </>
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

