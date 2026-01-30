"use client";
// src/pages/admin/Payments.tsx
import { useState, useEffect, useMemo } from "react";
import {
  RefreshCw,
  DollarSign,
  Loader2,
  Info,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
} from "lucide-react";
import { SearchInput } from "@/app/components/admin/SearchInput";
import { StatusBadge } from "@/app/components/admin/StatusBadge";
import { Button } from "@/app/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/app/components/ui/tooltip";
import { format, compareDesc, compareAsc } from "date-fns";
import { toast } from "sonner";
import {
  usePayments,
  usePaymentStats,
  type Payment,
  type PaymentStatus,
} from "@/hooks/usePayments";
import { useAuth } from "@/hooks/useAuth";
import { fetchWithAuth, postWithAuth } from "@/lib/api";
import { formatStripeAmount } from "@/lib/utils";

// Helper function to get display status
const getDisplayStatus = (status: PaymentStatus): string => {
  const statusMap: Record<PaymentStatus, string> = {
    succeeded: "Completed",
    requires_payment_method: "Failed",
    canceled: "Canceled",
    processing: "Processing",
    requires_action: "Requires Action",
    requires_capture: "Requires Capture",
    disputed: "Disputed",
    refunded: "Refunded",
  };
  return statusMap[status] || status;
};

// Sorting types
type SortField = "date" | "amount" | "user" | "status" | "business";
type SortDirection = "asc" | "desc";

export default function Payments() {
  const { token } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "all">(
    "all",
  );
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [refundPayment, setRefundPayment] = useState<Payment | null>(null);
  const [refunding, setRefunding] = useState(false);

  const { payments, loading, error, hasMore, loadMore } = usePayments({
    limit: 100, // Fetch more initially for client-side filtering
    status: undefined, // We'll handle filtering client-side
    search: undefined,
  });

  const { stats, loading: statsLoading } = usePaymentStats();

  // Client-side filtering and sorting
  const filteredAndSortedPayments = useMemo(() => {
    if (!payments) return [];

    let filtered = [...payments];

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter((payment) => {
        return (
          payment.userName?.toLowerCase().includes(searchLower) ||
          payment.userEmail?.toLowerCase().includes(searchLower) ||
          payment.stripePaymentId.toLowerCase().includes(searchLower) ||
          payment.businessName?.toLowerCase().includes(searchLower) ||
          payment.description?.toLowerCase().includes(searchLower)
        );
      });
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((payment) => payment.status === statusFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortField) {
        case "date":
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case "amount":
          aValue = a.amount;
          bValue = b.amount;
          break;
        case "user":
          aValue = a.userName?.toLowerCase() || "";
          bValue = b.userName?.toLowerCase() || "";
          break;
        case "status":
          aValue = getDisplayStatus(a.status);
          bValue = getDisplayStatus(b.status);
          break;
        case "business":
          aValue = a.businessName?.toLowerCase() || "";
          bValue = b.businessName?.toLowerCase() || "";
          break;
        default:
          return 0;
      }

      // Handle string comparison
      if (typeof aValue === "string" && typeof bValue === "string") {
        if (sortDirection === "asc") {
          return aValue.localeCompare(bValue);
        } else {
          return bValue.localeCompare(aValue);
        }
      }

      // Handle number/date comparison
      if (sortDirection === "asc") {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });

    return filtered;
  }, [payments, search, statusFilter, sortField, sortDirection]);

  const handleRefund = async () => {
    if (!refundPayment || !token) return;

    try {
      setRefunding(true);

      console.log("Initiating refund for:", refundPayment.stripePaymentId);

      await postWithAuth(
        `/admin/business/payments/${refundPayment.stripePaymentId}/refund`,
        token,
      );

      toast.success(`Refund initiated for ${refundPayment.stripePaymentId}`);
      setRefundPayment(null);
      toast.info("Refund processed successfully");
      window.location.reload();
    } catch (error: any) {
      console.error("Refund error:", error);

      if (error.message.includes("404")) {
        toast.error(
          "Refund endpoint not found. Please check API configuration.",
        );
      } else if (error.message.includes("Cannot refund")) {
        toast.error(error.message);
      } else {
        toast.error(`Failed to issue refund: ${error.message}`);
      }
    } finally {
      setRefunding(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearch(value);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // New field, default to descending for date, ascending for others
      setSortField(field);
      setSortDirection(field === "date" ? "desc" : "asc");
    }
  };

  const SortableHeader = ({
    field,
    children,
  }: {
    field: SortField;
    children: React.ReactNode;
  }) => {
    const isActive = sortField === field;
    return (
      <th
        className="cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => handleSort(field)}
      >
        <div className="flex items-center gap-1">
          {children}
          {isActive ? (
            sortDirection === "asc" ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )
          ) : (
            <ArrowUpDown className="h-4 w-4 opacity-50" />
          )}
        </div>
      </th>
    );
  };

  const triggerSync = async () => {
    try {
      if (!token) throw new Error("Not authenticated");

      const toastId = toast.loading("Syncing with Stripe...", {
        duration: Infinity,
      });

      try {
        await postWithAuth("/admin/sync/stripe/transactions?days=7", token);

        toast.success("Sync completed! Refreshing payments...", {
          id: toastId,
        });

        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } catch (error: any) {
        toast.error("Sync failed: " + error.message, {
          id: toastId,
        });
      }
    } catch (error: any) {
      toast.error("Sync failed: " + error.message);
    }
  };

  if (error && !loading) {
    return (
      <>
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-red-500">
              Error loading payments
            </h2>
            <p className="mt-2 text-muted-foreground">{error}</p>
            <Button className="mt-4" onClick={() => window.location.reload()}>
              Retry
            </Button>
            <div>
              <Button className="mt-4 " onClick={triggerSync}>
                Sync with Stripe
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Payments</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              View and manage payment transactions from Stripe
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={triggerSync} disabled={loading}>
              <RefreshCw
                className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Sync with Stripe
            </Button>
          </div>
        </div>

        {/* Stats */}
        {statsLoading ? (
          <div className="grid gap-4 sm:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="admin-stat-card">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 animate-pulse rounded-lg bg-muted" />
                  <div className="space-y-2">
                    <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                    <div className="h-8 w-16 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          stats && (
            <TooltipProvider>
              <div className="grid gap-4 sm:grid-cols-3">
                {/* Total Transactions */}
                <div className="admin-stat-card">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <DollarSign className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        Total Transactions
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-3.5 w-3.5 cursor-help opacity-50" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>The total number of payments processed.</p>
                          </TooltipContent>
                        </Tooltip>
                      </p>
                      <p className="text-2xl font-bold">
                        {stats.totalTransactions}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Completed Revenue */}
                <div className="admin-stat-card">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-status-active/10">
                      <DollarSign className="h-5 w-5 text-status-active" />
                    </div>
                    <div>
                      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        Completed Revenue
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-3.5 w-3.5 cursor-help opacity-50" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              Net revenue from succeeded payments. Refunds are
                              excluded.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </p>
                      <p className="text-2xl font-bold">
                        ${stats.completedRevenue.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Total Volume */}
                <div className="admin-stat-card">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-3/10">
                      <DollarSign className="h-5 w-5 text-chart-3" />
                    </div>
                    <div>
                      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        Total Volume
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-3.5 w-3.5 cursor-help opacity-50" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              The gross amount of all payment intents,
                              regardless of status.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </p>
                      <p className="text-2xl font-bold">
                        ${stats.totalVolume.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Total Refunded */}
                <div className="admin-stat-card">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-3/10">
                      <DollarSign className="h-5 w-5 text-chart-3" />
                    </div>
                    <div>
                      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        Total Refunded
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-3.5 w-3.5 cursor-help opacity-50" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              The total sum of all refunded amounts across the
                              business.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </p>
                      <p className="text-2xl font-bold">
                        ${stats.totalRefunded.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </TooltipProvider>
          )
        )}

        {/* Filters */}
        <div className="admin-card">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <SearchInput
              value={search}
              onChange={handleSearch}
              placeholder="Search by name, email, Stripe ID, or business..."
              className="flex-1"
            />
            <Select
              value={statusFilter}
              onValueChange={(value) =>
                setStatusFilter(value as PaymentStatus | "all")
              }
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="succeeded">Completed</SelectItem>
                <SelectItem value="requires_payment_method">Failed</SelectItem>
                <SelectItem value="canceled">Canceled</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
                <SelectItem value="disputed">Disputed</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-sm text-muted-foreground">
              Showing {filteredAndSortedPayments.length} of{" "}
              {payments?.length || 0} payments
            </div>
          </div>
        </div>

        {/* Payments Table */}
        <div className="admin-card p-0">
          <div className="overflow-x-auto rounded-lg">
            {loading ? (
              <div className="flex min-h-[200px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <table className="admin-table">
                <thead className="bg-muted/50">
                  <tr>
                    <th>Stripe Payment ID</th>
                    <SortableHeader field="user">User</SortableHeader>
                    <th>Description</th>
                    <SortableHeader field="amount">Amount</SortableHeader>
                    <SortableHeader field="status">Status</SortableHeader>
                    <SortableHeader field="date">Date</SortableHeader>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedPayments.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-8 text-center text-muted-foreground"
                      >
                        {search || statusFilter !== "all"
                          ? "No payments found matching your filters"
                          : "No payments found"}
                        {!search && statusFilter === "all" && (
                          <div className="mt-2">
                            <Button variant="ghost" onClick={triggerSync}>
                              <RefreshCw className="mr-1 h-4 w-4" />
                              Sync with Stripe
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredAndSortedPayments.map((payment) => (
                      <tr key={payment.id}>
                        <td className="font-mono text-xs max-w-[150px] truncate">
                          {payment.stripePaymentId}
                        </td>
                        <td>
                          <div>
                            <p className="font-medium">
                              {payment.userName || "N/A"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {payment.userEmail || "N/A"}
                            </p>
                            {payment.businessName && (
                              <p className="text-xs text-muted-foreground">
                                Business: {payment.businessName}
                              </p>
                            )}
                          </div>
                        </td>
                        <td>{payment.description || "Payment"}</td>
                        <td className="font-semibold">
                          {formatStripeAmount(payment.amount, payment.currency)}
                        </td>
                        <td>
                          <div>
                            <StatusBadge
                              status={getDisplayStatus(payment.status)}
                            />
                            {payment.disputeStatus && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                Dispute: {payment.disputeStatus}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="text-muted-foreground">
                          {format(
                            new Date(payment.createdAt),
                            "MMM d, yyyy HH:mm",
                          )}
                        </td>
                        <td className="text-right">
                          {payment.status === "succeeded" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setRefundPayment(payment)}
                              disabled={refunding}
                            >
                              <RefreshCw className="mr-1 h-4 w-4" />
                              Refund
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination Info */}
          {filteredAndSortedPayments.length > 0 && (
            <div className="border-t p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing {filteredAndSortedPayments.length} payments
                  {search && ` matching "${search}"`}
                  {statusFilter !== "all" &&
                    ` with status "${getDisplayStatus(statusFilter)}"`}
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={sortField}
                    onValueChange={(value) => setSortField(value as SortField)}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="amount">Amount</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
                    }
                  >
                    {sortDirection === "asc" ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Refund Dialog */}
      <AlertDialog
        open={!!refundPayment}
        onOpenChange={() => !refunding && setRefundPayment(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Issue Refund</AlertDialogTitle>
            <AlertDialogDescription>
              {refundPayment && (
                <>
                  Are you sure you want to refund{" "}
                  {formatStripeAmount(refundPayment.amount, refundPayment.currency)}{" "}
                  to {refundPayment.userName || "the customer"}?
                  <br />
                  <br />
                  <span className="font-mono text-xs block break-all">
                    Payment ID: {refundPayment.stripePaymentId}
                  </span>
                  {refundPayment.businessName && (
                    <span className="text-sm block mt-2">
                      Business: {refundPayment.businessName}
                    </span>
                  )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={refunding}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRefund}
              disabled={refunding}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {refunding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Issue Refund"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
