// src/app/admin/components/CancelSubscriptionCell.tsx
import { CancelSubscriptionButton } from "./CancelSubscriptionButton";

interface CancelSubscriptionCellProps {
  subscription: {
    id: string;
    businessId: string;
    business?: { name: string };
    subscription?: { title: string };
    status: string;
    endDate?: string | null;
    cancelAtPeriodEnd?: boolean | null;
  };
  invalidateQueries?: string[][];
}

export function CancelSubscriptionCell({
  subscription,
  invalidateQueries = [["businessSubscriptions"]],
}: CancelSubscriptionCellProps) {
  const isActive =
    subscription.status === "ACTIVE" || subscription.status === "TRIAL";

  if (!isActive) {
    return <span className="text-muted-foreground text-sm">—</span>;
  }

  return (
    <CancelSubscriptionButton
      subscriptionId={subscription.id}
      businessId={subscription.businessId}
      businessName={subscription.business?.name || "Unknown"}
      planName={subscription.subscription?.title || "Unknown"}
      status={subscription.status}
      endDate={subscription.endDate}
      cancelAtPeriodEnd={subscription.cancelAtPeriodEnd}
      size="sm"
      variant="destructive"
      invalidateQueries={invalidateQueries}
    />
  );
}
