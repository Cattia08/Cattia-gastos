import React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { BudgetWithUsage } from "@/hooks/useBudgets";

interface BudgetProgressProps {
    budgets: BudgetWithUsage[];
    className?: string;
}

const statusConfig = {
    safe: {
        barColor: "bg-emerald-500",
        bgColor: "bg-emerald-500/10",
        borderColor: "border-emerald-500/20",
        icon: CheckCircle2,
        iconColor: "text-emerald-500",
        label: "Normal",
    },
    warning: {
        barColor: "bg-amber-500",
        bgColor: "bg-amber-500/10",
        borderColor: "border-amber-500/20",
        icon: TrendingUp,
        iconColor: "text-amber-500",
        label: "Atención",
    },
    danger: {
        barColor: "bg-red-500",
        bgColor: "bg-red-500/10",
        borderColor: "border-red-500/20",
        icon: AlertTriangle,
        iconColor: "text-red-500",
        label: "¡Cuidado!",
    },
    exceeded: {
        barColor: "bg-red-600",
        bgColor: "bg-red-600/10",
        borderColor: "border-red-600/30",
        icon: TrendingDown,
        iconColor: "text-red-600",
        label: "Excedido",
    },
};

function fmt(n: number): string {
    return `S/ ${n.toLocaleString("es-PE", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

const BudgetProgress: React.FC<BudgetProgressProps> = ({ budgets, className }) => {
    if (budgets.length === 0) return null;

    // Sort: exceeded first, then danger, warning, safe
    const priorityOrder = { exceeded: 0, danger: 1, warning: 2, safe: 3 };
    const sorted = [...budgets].sort(
        (a, b) => priorityOrder[a.status] - priorityOrder[b.status]
    );

    return (
        <Card className={cn("p-5 border-primary/10", className)}>
            <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                    <span className="text-white text-sm">🎯</span>
                </div>
                <div>
                    <h3 className="font-semibold text-sm text-foreground">Presupuestos del Mes</h3>
                    <p className="text-xs text-muted-foreground">
                        {sorted.filter(b => b.status === "safe" || b.status === "warning").length}/{sorted.length} en buen estado
                    </p>
                </div>
            </div>

            <div className="space-y-3">
                {sorted.map((budget) => {
                    const config = statusConfig[budget.status];
                    const StatusIcon = config.icon;
                    const barWidth = Math.min(budget.percentage, 100);
                    const categoryName = budget.categories?.name ?? "Sin nombre";
                    const categoryColor = budget.categories?.color ?? "#9ca3af";

                    return (
                        <div
                            key={budget.category_id}
                            className={cn(
                                "rounded-xl p-3 border transition-all duration-200",
                                config.bgColor,
                                config.borderColor
                            )}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div
                                        className="w-3 h-3 rounded-full shrink-0"
                                        style={{ backgroundColor: categoryColor }}
                                    />
                                    <span className="text-sm font-medium text-foreground truncate max-w-[120px]">
                                        {categoryName}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <StatusIcon className={cn("w-3.5 h-3.5", config.iconColor)} />
                                    <span className={cn("text-xs font-semibold", config.iconColor)}>
                                        {budget.percentage}%
                                    </span>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="h-2 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className={cn(
                                        "h-full rounded-full transition-all duration-700 ease-out",
                                        config.barColor
                                    )}
                                    style={{ width: `${barWidth}%` }}
                                />
                            </div>

                            {/* Amount */}
                            <div className="flex justify-between mt-1.5">
                                <span className="text-xs text-muted-foreground">
                                    {fmt(budget.spent)} gastado
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    de {fmt(budget.monthly_limit)}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </Card>
    );
};

export default BudgetProgress;
