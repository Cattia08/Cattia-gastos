import React from "react";
import { cn } from "@/lib/utils";

interface DashboardCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  className?: string;
  iconColor?: string;
  isCurrency?: boolean;
}

const DashboardCard = ({
  title,
  value,
  icon,
  className,
  iconColor = "bg-pastel-pink",
  isCurrency = true
}: DashboardCardProps) => {
  // Format the value if it's a currency amount
  const formattedValue = typeof value === "number" && isCurrency ? `S/ ${value.toFixed(2)}` : value;

  return (
    <div className={cn("card-pastel flex flex-col justify-between min-h-[90px] h-full p-3 md:p-4 dark:bg-gray-800 dark:border-pastel-pink/20", className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-xs font-medium text-muted-foreground truncate">{title}</h3>
          <p className="text-xl md:text-2xl font-bold mt-1 break-words">{formattedValue}</p>
        </div>
        <div className={cn("icon-container shrink-0 w-9 h-9 md:w-10 md:h-10", iconColor)}>{icon}</div>
      </div>
    </div>
  );
};

export default DashboardCard;
