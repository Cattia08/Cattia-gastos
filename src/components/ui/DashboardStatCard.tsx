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
    className,
}: DashboardStatCardProps) => {
    const isNumericValue = typeof value === "number";
    const numericValue = isNumericValue ? value : 0;
    const isEmojiIcon = typeof icon === "string";

    // Tint styles based on accent color
    const tintStyles = {
        orange: "bg-category-tint-orange",
        blue: "bg-category-tint-blue",
        green: "bg-category-tint-green",
        lavender: "bg-category-tint-lavender",
        rose: "bg-category-tint-rose",
        dynamic: "bg-white dark:bg-card",
    };

    // Icon background styles
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
                "rounded-2xl border border-pink-100 dark:border-border shadow-card",
                "p-4 md:p-5 min-h-[120px]",
                "card-hover-lift",
                tintStyles[accentColor],
                interactive && "cursor-pointer",
                interactive && "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
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
                <p className="text-xl md:text-2xl font-extrabold tracking-tight text-text-emphasis dark:text-foreground">
                    {isNumericValue && isCurrency ? (
                        <>
                            S/ <AnimatedCounter value={numericValue} duration={250} decimals={2} />
                        </>
                    ) : (
                        value
                    )}
                </p>

                {/* Progress bar (optional) */}
                {progressPercent !== undefined && (
                    <div className="mt-2 h-2 rounded-full bg-gray-100 dark:bg-muted overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                                width: `${Math.min(100, Math.max(0, progressPercent))}%`,
                                backgroundColor: progressColor || dynamicColor || "#5DBE8A",
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
