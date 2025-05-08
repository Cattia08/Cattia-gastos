
import React from "react";
import { cn } from "@/lib/utils";

interface DashboardCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  className?: string;
  iconColor?: string;
}

const DashboardCard = ({
  title,
  value,
  icon,
  className,
  iconColor = "bg-pastel-pink",
}: DashboardCardProps) => {
  return (
    <div className={cn("card-pastel p-4 md:p-6", className)}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className={cn("icon-container", iconColor)}>
          {icon}
        </div>
      </div>
    </div>
  );
};

export default DashboardCard;
