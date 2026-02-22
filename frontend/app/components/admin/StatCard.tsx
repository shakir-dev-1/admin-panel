import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Info } from "lucide-react";
import { Card, CardContent } from "@/app/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/app/components/ui/tooltip";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  subtitle?: string;
  tooltip?: string;
  trend?: {
    value: string;
    positive: boolean;
  };
  className?: string;
  valueClassName?: string;
}

export const StatCard = ({
  title,
  value,
  icon,
  subtitle,
  tooltip,
  trend,
  className = "",
  valueClassName = "",
}: StatCardProps) => (
  <Card className={cn("border-border", className)}>
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {tooltip && ( // Only show tooltip if tooltip text is provided
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help hover:text-foreground transition-colors" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-sm">{tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <p className={cn("text-2xl font-bold", valueClassName)}>{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          {icon}
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center gap-2">
          <span
            className={cn(
              "text-sm font-medium",
              trend.positive ? "text-green-600" : "text-red-600",
            )}
          >
            {trend.value}
          </span>
          <span className="text-xs text-muted-foreground">vs last month</span>
        </div>
      )}
    </CardContent>
  </Card>
);
