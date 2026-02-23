/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

// src/app/admin/components/CancelSubscriptionButton.tsx
import { useState } from "react";
import { XCircle, Loader2, Clock, Ban } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";
import { Label } from "@/app/components/ui/label";
import { Badge } from "@/app/components/ui/badge";
import { toast } from "sonner";
import { useUsersManagement } from "@/hooks/useUsers";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

export interface CancelSubscriptionButtonProps {
  subscriptionId: string;
  businessId: string;
  businessName: string;
  planName: string;
  status?: string;
  endDate?: string | null;
  cancelAtPeriodEnd?: boolean | null;
  variant?: "default" | "destructive" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  showIcon?: boolean;
  buttonText?: string;
  onSuccess?: () => void;
  onError?: (error: any) => void;
  invalidateQueries?: string[][];
}

export function CancelSubscriptionButton({
  subscriptionId,
  businessId,
  businessName,
  planName,
  status,
  endDate,
  cancelAtPeriodEnd = false,
  variant = "destructive",
  size = "sm",
  className,
  showIcon = true,
  buttonText = "Cancel",
  onSuccess,
  onError,
  invalidateQueries = [],
}: CancelSubscriptionButtonProps) {
  const [open, setOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"normal" | "immediate">(
    "normal",
  );
  const [isLoading, setIsLoading] = useState(false);

  const { cancelSubscription } = useUsersManagement();
  const queryClient = useQueryClient();

  const isActive = status === "ACTIVE" || status === "TRIAL";
  const isCancelling = status === "CANCELLED";
  const isPendingCancellation = isActive && cancelAtPeriodEnd;

  const handleOpenNormal = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDialogMode("normal");
    setOpen(true);
  };

  const handleOpenImmediate = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDialogMode("immediate");
    setOpen(true);
  };

  const handleCancel = async () => {
    setIsLoading(true);
    const isImmediate = dialogMode === "immediate";

    const toastId = toast.loading(
      isImmediate
        ? "Immediately canceling subscription..."
        : "Canceling subscription...",
    );

    try {
      await cancelSubscription(businessId, { immediate: isImmediate });

      toast.success(
        isImmediate
          ? "Subscription canceled immediately"
          : "Subscription scheduled for cancellation",
        {
          id: toastId,
          description: isImmediate
            ? `${planName} for ${businessName} has been canceled.`
            : `${planName} for ${businessName} will be canceled at the end of the billing period.`,
        },
      );

      // Invalidate queries
      if (invalidateQueries.length > 0) {
        invalidateQueries.forEach((queryKey) => {
          queryClient.invalidateQueries({ queryKey });
        });
      } else {
        // Default invalidations
        queryClient.invalidateQueries({ queryKey: ["businessSubscriptions"] });
        queryClient.invalidateQueries({ queryKey: ["businessUserPayments"] });
      }

      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error("Failed to cancel subscription", {
        id: toastId,
        description: error.message,
      });
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      // Reset dialog mode when closing
      setDialogMode("normal");
    }
    setOpen(open);
  };

  // Don't show if already cancelled
  if (isCancelling) {
    return (
      <Badge variant="outline" className="bg-gray-50 text-gray-700">
        <Ban className="h-3 w-3 mr-1" />
        Cancelled
      </Badge>
    );
  }

  return (
    <>
      {/* Button rendering based on state */}
      {isPendingCancellation ? (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
            <Clock className="h-3 w-3 mr-1" />
            Cancelling at period end
          </Badge>
          <Button
            variant="destructive"
            size={size}
            onClick={handleOpenImmediate}
            className={cn(className)}
            disabled={isLoading}
          >
            {showIcon && <XCircle className="h-3 w-3 mr-1" />}
            Cancel Now
          </Button>
        </div>
      ) : isActive ? (
        <Button
          variant={variant}
          size={size}
          onClick={handleOpenNormal}
          className={cn(className)}
          disabled={isLoading}
        >
          {showIcon && <XCircle className="h-3 w-3 mr-1" />}
          {buttonText}
        </Button>
      ) : null}

      {/* Shared Dialog - always rendered but controlled by open state */}
      <AlertDialog open={open} onOpenChange={handleDialogClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {dialogMode === "immediate"
                ? "Immediately Cancel Subscription"
                : "Cancel Subscription"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel the subscription for{" "}
              <span className="font-medium">{businessName}</span>?
              <br />
              <br />
              <span className="text-sm">
                Plan: <span className="font-medium">{planName}</span>
                <br />
                {status && (
                  <>
                    Status: <span className="font-medium">{status}</span>
                    <br />
                  </>
                )}
                {endDate && dialogMode !== "immediate" && (
                  <>
                    Current end date:{" "}
                    <span className="font-medium">
                      {new Date(endDate).toLocaleDateString()}
                    </span>
                  </>
                )}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Show checkbox only in normal mode */}
          {!isPendingCancellation && (
            <div className="py-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="immediateCancel"
                  onChange={(e) => {
                    setDialogMode(e.target.checked ? "immediate" : "normal");
                  }}
                  className="rounded border-gray-300"
                  disabled={isLoading}
                />
                <Label htmlFor="immediateCancel" className="text-sm">
                  Cancel immediately (instead of at period end)
                </Label>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                The subscription will be canceled at the end of the current
                billing period.
              </p>
            </div>
          )}

          {/* Show warning in immediate mode */}
          {dialogMode === "immediate" && (
            <div className="py-2">
              <p className="text-sm text-destructive">
                Warning: This will immediately revoke access. No refund will be
                issued automatically.
              </p>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>
              Keep Subscription
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={isLoading}
              className={cn(
                dialogMode === "immediate"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : "bg-primary text-primary-foreground hover:bg-primary/90",
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {dialogMode === "immediate"
                    ? "Canceling Immediately..."
                    : "Canceling..."}
                </>
              ) : dialogMode === "immediate" ? (
                "Yes, Cancel Immediately"
              ) : (
                "Yes, Cancel Subscription"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}