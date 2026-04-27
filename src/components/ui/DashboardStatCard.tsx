import React from "react";
import { cn } from "@/lib/utils";
import AnimatedCounter from "./AnimatedCounter";

type AccentColor = "orange" | "blue" | "green" | "lavender" | "rose" | "dynamic";

interface DashboardStatCardProps {
    /** Card title */
    title: string;
    /** Main value to display */
    value: string | number;
    /** Whether the value is currency */
    isCurrency?: boolean;
    /** Icon emoji or React node */
    icon: React.ReactNode | string;
    /** First subtitle line */
    subtitle?: string;
    /** Second subtitle line */
    secondarySubtitle?: string;
    /** Accent color theme */
    accentColor?: AccentColor;
    /** Dynamic color (for category-based coloring) */
    dynamicColor?: string;
    /** Optional progress percentage (0-100) */
    progressPercent?: number;
    /** Progress bar color */
    progressColor?: string;
    /** Click handler */
    onClick?: () => void;
    /** Whether card is interactive */
    interactive?: boolean;
    /** Visual emphasis — bigger value, primary ring */
    emphasis?: boolean;
    /** Additional class name */
    className?: string;
}

const DashboardStatCard = ({
    title,
    value,
    isCurrency = true,
    icon,
    subtitle,
    secondarySubtitle,
    accentColor = "blue",
    dynamicColor,
    progressPercent,
    progressColor,
    onClick,
    interactive = false,
    emphasis = false,
    className,
}: DashboardStatCardProps) => {
    const isNumericValue = typeof value === "number";
    const numericValue = isNumericValue ? value : 0;
    const isEmojiIcon = typeof icon === "string";

    const tintStyles = {
        orange: "bg-category-tint-orange",
        blue: "bg-category-tint-blue",
        green: "bg-category-tint-green",
        lavender: "bg-category-tint-lavender",
        rose: "bg-category-tint-rose",
        dynamic: "bg-card",
    };

    const iconBgStyles = {
        orange: "bg-pastel-orange",
        blue: "bg-pastel-blue",
        green: "bg-pastel-green",
        lavender: "bg-pastel-lavender",
        rose: "bg-pastel-rose",
        dynamic: "",
    };

    return (
        <div
            className={cn(
                "relative rounded-2xl border shadow-soft",
                "p-4 md:p-5",
                emphasis ? "min-h-[140px] border-primary/30 ring-1 ring-primary/15" : "min-h-[120px] border-border",
                "transition-shadow duration-200 ease-out",
                interactive && "hover:shadow-soft-md",
                tintStyles[accentColor],
                interactive && "cursor-pointer",
                interactive && "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                className
            )}
            onClick={onClick}
            tabIndex={interactive ? 0 : undefined}
            role={interactive ? "button" : undefined}
            style={dynamicColor ? { backgroundColor: `${dynamicColor}10` } : undefined}
        >
            <div className="flex flex-col h-full">
                {/* Header: Icon + Title */}
                <div className="flex items-center gap-2 mb-3">
                    {isEmojiIcon ? (
                        <span className="text-2xl">{icon}</span>
                    ) : (
                        <div
                            className={cn(
                                "w-9 h-9 rounded-full flex items-center justify-center",
                                iconBgStyles[accentColor]
                            )}
                            style={dynamicColor ? { backgroundColor: `${dynamicColor}20` } : undefined}
                        >
                            {icon}
                        </div>
                    )}
                    <h3 className="text-xs font-medium text-text-secondary truncate">{title}</h3>
                </div>

                {/* Value */}
                <p
                    className={cn(
                        "font-bold tracking-tight text-text-emphasis dark:text-foreground tabular-nums",
                        emphasis ? "text-2xl md:text-3xl" : "text-xl md:text-2xl"
                    )}
                >
                    {isNumericValue && isCurrency ? (
                        <>
                            <span className="text-base font-medium text-text-secondary mr-1 align-baseline">S/</span>
                            <AnimatedCounter value={numericValue} duration={250} decimals={2} />
                        </>
                    ) : (
                        value
                    )}
                </p>

                {/* Progress bar (optional) */}
                {progressPercent !== undefined && (
                    <div className={cn("mt-2.5 rounded-full bg-muted overflow-hidden", emphasis ? "h-2.5" : "h-2")}>
                        <div
                            className="h-full rounded-full transition-[width] duration-700 ease-out"
                            style={{
                                width: `${Math.min(100, Math.max(0, progressPercent))}%`,
                                backgroundColor: progressColor || dynamicColor || "hsl(var(--primary))",
                            }}
                        />
                    </div>
                )}

                {/* Subtitles */}
                <div className="mt-auto pt-2">
                    {subtitle && (
                        <p className="text-xs text-text-secondary truncate">{subtitle}</p>
                    )}
                    {secondarySubtitle && (
                        <p className="text-xs text-text-muted truncate mt-0.5">{secondarySubtitle}</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DashboardStatCard;
