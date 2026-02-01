// components/admin/StatusBadge.tsx
import { cn } from "@/lib/utils";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  RotateCcw,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";

export type StatusType =
  | "active"
  | "inactive"
  | "disabled"
  | "completed"
  | "failed"
  | "canceled"
  | "processing"
  | "refunded"
  | "disputed" // Payment statuses
  | "pending"
  | "success"
  | "error"
  | "warning" // Generic statuses
  | string;

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

const statusConfig: Record<
  string,
  { label: string; icon?: React.ReactNode; className: string }
> = {
  // User statuses
  active: {
    label: "Active",
    icon: <CheckCircle className="h-3 w-3" />,
    className: "bg-status-active/10 text-status-active",
  },
  inactive: {
    label: "Inactive",
    icon: <Clock className="h-3 w-3" />,
    className: "bg-status-inactive/10 text-status-inactive",
  },
  disabled: {
    label: "Disabled",
    icon: <XCircle className="h-3 w-3" />,
    className: "bg-status-inactive/10 text-status-inactive",
  },
  // Payment statuses
  completed: {
    label: "Completed",
    icon: <CheckCircle className="h-3 w-3" />,
    className: "bg-status-active/10 text-status-active",
  },
  succeeded: {
    label: "Completed",
    icon: <CheckCircle className="h-3 w-3" />,
    className: "bg-status-active/10 text-status-active",
  },
  failed: {
    label: "Failed",
    icon: <XCircle className="h-3 w-3" />,
    className: "bg-status-disabled/10 text-status-disabled",
  },
  canceled: {
    label: "Canceled",
    icon: <XCircle className="h-3 w-3" />,
    className: "bg-status-disabled/10 text-status-disabled",
  },
  processing: {
    label: "Processing",
    icon: <Clock className="h-3 w-3" />,
    className: "bg-chart-3/10 text-chart-3",
  },
  refunded: {
    label: "Refunded",
    icon: <RotateCcw className="h-3 w-3" />,
    className: "bg-chart-4/10 text-chart-4",
  },
  disputed: {
    label: "Disputed",
    icon: <AlertTriangle className="h-3 w-3" />,
    className: "bg-chart-5/10 text-chart-5",
  },
  requires_action: {
    label: "Requires Action",
    icon: <AlertCircle className="h-3 w-3" />,
    className: "bg-status-suspended/10 text-status-suspended",
  },
  requires_capture: {
    label: "Requires Capture",
    icon: <ShieldAlert className="h-3 w-3" />,
    className: "bg-chart-2/10 text-chart-2",
  },

  // Generic
  pending: {
    label: "Pending",
    icon: <Clock className="h-3 w-3" />,
    className: "bg-chart-3/10 text-chart-3",
  },
  success: {
    label: "Success",
    icon: <CheckCircle className="h-3 w-3" />,
    className: "bg-status-active/10 text-status-active",
  },
  error: {
    label: "Error",
    icon: <XCircle className="h-3 w-3" />,
    className: "bg-status-disabled/10 text-status-disabled",
  },
  warning: {
    label: "Warning",
    icon: <AlertTriangle className="h-3 w-3" />,
    className: "bg-chart-5/10 text-chart-5",
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  if (status == null) {
    return null;
  }
  const config = statusConfig[status.toLowerCase()] || {
    label: status,
    className: "bg-muted text-muted-foreground",
  };

  return (
    <span className={cn("status-badge gap-1", config.className, className)}>
      {config.icon}
      {config.label}
    </span>
  );
}
