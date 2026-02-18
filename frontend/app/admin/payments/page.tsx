/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

// src/pages/admin/Payments.tsx
import { useState, useMemo } from "react";
import {
  RefreshCw,
  DollarSign,
  Loader2,
  Info,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Plus,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
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
import { format } from "date-fns";
import { toast } from "sonner";
import {
  usePayments,
  usePaymentStats,
  type PaymentTransaction,
  // type TransactionStatus,
  type TransactionPaymentStatus,
} from "@/hooks/usePayments";
import { useAuth } from "@/hooks/useAuth";
import { fetchWithAuth, postWithAuth } from "@/lib/api";
import { cn } from "@/lib/utils";

// Helper function to get display status
// const getDisplayStatus = (status: TransactionStatus): string => {
//   const statusMap: Record<TransactionStatus, string> = {
//     CREATED: "Created",
//     PAID: "Completed",
//     FAILED: "Failed",
//   };
//   return statusMap[status] || status;
// };

const getPaymentStatus = (status: TransactionPaymentStatus): string => {
  const paymentStatusMap: Record<TransactionPaymentStatus, string> = {
    PAID_OUT: "PAID_OUT",
    REFUNDED: "REFUNDED",
    UNPAID: "UNPAID",
    PAID: "PAID",
  };
  return paymentStatusMap[status] || status;
};

// Helper to format amount from cents
const formatAmount = (amount: number, currency: string = "USD"): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount); // Assuming amount is in cents
};

// Sorting types
type SortField = "date" | "amount" | "user" | "status" | "business";
type SortDirection = "asc" | "desc";

export default function Payments() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    TransactionPaymentStatus | "all"
  >("all");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [refundPayment, setRefundPayment] = useState<PaymentTransaction | null>(
    null,
  );
  const [refunding, setRefunding] = useState(false);

  const {
    payments,
    loading,
    error,
    hasMore,
    loadMore,
    isFetchingNextPage,
    refetch: refetchPayments,
  } = usePayments({
    limit: 50,
    paymentStatus: statusFilter !== "all" ? statusFilter : undefined,
  });

  const {
    stats,
    loading: statsLoading,
    refetch: refetchStats,
  } = usePaymentStats();

  const [showCreatePayment, setShowCreatePayment] = useState(false);
  const [creatingPayment, setCreatingPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    businessId: "",
    amount: "",
    invoiceId: `test-invoice-${Date.now()}`,
  });
  const [businesses, setBusinesses] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [loadingBusinesses, setLoadingBusinesses] = useState(false);

  // Fetch businesses for the dropdown
  const fetchBusinesses = async () => {
    try {
      if (!token) {
        return;
      }
      setLoadingBusinesses(true);
      const response = await fetchWithAuth("/admin/payments/businesses", token);

      // Type assertion or type guard
      if (Array.isArray(response)) {
        setBusinesses(response as Array<{ id: string; name: string }>);
      } else {
        console.error("Unexpected response format:", response);
        setBusinesses([]);
      }
    } catch (error) {
      console.error("Failed to fetch businesses:", error);
      toast.error("Failed to load businesses");
      setBusinesses([]); // Reset on error
    } finally {
      setLoadingBusinesses(false);
    }
  };

  // Handle opening the create payment modal
  const handleOpenCreatePayment = () => {
    fetchBusinesses();
    setPaymentForm({
      businessId: "",
      amount: "",
      invoiceId: `test-invoice-${Date.now()}`,
    });
    setShowCreatePayment(true);
  };

  // Handle creating a test payment
const handleCreatePayment = async () => {
  if (!token) return;
  if (!paymentForm.businessId || !paymentForm.amount) {
    toast.error("Please select a business and enter an amount");
    return;
  }

  const toastId = toast.loading("Creating test payment...");

  try {
    setCreatingPayment(true);

    interface CreatePaymentResponse {
      clientSecret: string;
      transactionId: string;
    }

    // FIX: Include businessId in the URL path, not in the body
    const response = (await postWithAuth(
      `/admin/payments/${paymentForm.businessId}/create-payment-intent`, // Changed URL
      token,
      {
        amount: parseFloat(paymentForm.amount), // Only amount and invoiceId in body
        invoiceId: paymentForm.invoiceId,
      },
    )) as CreatePaymentResponse;

    toast.success("Test payment created successfully", {
      id: toastId,
      description: `Payment intent created with client secret: ${response.clientSecret.slice(0, 20)}...`,
    });

    setShowCreatePayment(false);

    // Refetch payments to show the new one
    await refetchPayments();
    await refetchStats();
  } catch (error: any) {
    console.error("Create payment error:", error);
    toast.error("Failed to create test payment", {
      id: toastId,
      description: error.response?.data?.message || error.message,
    });
  } finally {
    setCreatingPayment(false);
  }
};

  // Client-side search and sorting
  const filteredAndSortedPayments = useMemo(() => {
    if (!payments) return [];

    let filtered = [...payments];

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter((payment) => {
        return (
          payment.clientName?.toLowerCase().includes(searchLower) ||
          payment.businessName?.toLowerCase().includes(searchLower) ||
          payment.id.toLowerCase().includes(searchLower) ||
          payment.invoiceId.toLowerCase().includes(searchLower)
        );
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

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
          aValue = a.clientName?.toLowerCase() || "";
          bValue = b.clientName?.toLowerCase() || "";
          break;
        case "status":
          aValue = getPaymentStatus(a.paymentStatus);
          bValue = getPaymentStatus(b.paymentStatus);
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
  }, [payments, search, sortField, sortDirection]);

  const handleRefund = async () => {
    if (!refundPayment || !token) return;

    const toastId = toast.loading("Processing refund...");

    try {
      setRefunding(true);

      await postWithAuth(
        `/admin/payments/payments/${refundPayment.id}/refund`,
        token,
        {},
      );

      toast.success("Refund initiated successfully", {
        id: toastId,
        description: `Refund for ${formatAmount(refundPayment.amount, refundPayment.currency)} has been processed.`,
      });

      setRefundPayment(null);

      // Invalidate and refetch payments
      await queryClient.invalidateQueries({ queryKey: ["payments"] });
      await queryClient.invalidateQueries({ queryKey: ["paymentStats"] });
    } catch (error: any) {
      // console.error("Refund error details:", {
      //   transactionId: refundPayment?.id,
      //   error: error.response?.data || error.message,
      // });

      // Better error messages based on the error
      let errorMessage = "Failed to issue refund";
      let errorDescription =
        "Please try again or contact support if the issue persists.";

      // Check if we have a structured error response
      if (error.response?.data) {
        const { error: errorCode, message } = error.response.data;

        if (errorCode === "PAYMENT_INTENT_NOT_FOUND") {
          errorMessage = "Payment Intent Not Found";
          errorDescription =
            message ||
            "This payment cannot be refunded because the associated Stripe payment intent was not found. It may have been created in test mode or deleted.";
        } else if (errorCode === "ALREADY_REFUNDED") {
          errorMessage = "Already Refunded";
          errorDescription =
            message || "This payment has already been refunded.";
        } else if (errorCode === "INVALID_STATUS") {
          errorMessage = "Invalid Payment Status";
          errorDescription =
            message ||
            "This payment cannot be refunded because it is not in a completed state.";
        } else if (errorCode === "STRIPE_ERROR") {
          errorMessage = "Stripe Error";
          errorDescription =
            message ||
            "An error occurred while processing the refund with Stripe.";
        } else {
          errorMessage = "Refund Failed";
          errorDescription = message || errorDescription;
        }
      } else if (error instanceof Error) {
        // Fallback for non-structured errors
        if (error.message.includes("PAYMENT_INTENT_NOT_FOUND")) {
          errorMessage = "Payment Intent Not Found";
          errorDescription =
            "This payment cannot be refunded because the associated Stripe payment intent was not found.";
        } else {
          errorMessage = "Refund Failed";
          errorDescription = error.message;
        }
      }

      toast.error(errorMessage, {
        id: toastId,
        description: errorDescription,
        duration: 8000,
      });
    } finally {
      setRefunding(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearch(value);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection(field === "date" ? "desc" : "asc");
    }
  };

  const handleSync = async () => {
    try {
      if (!token) throw new Error("Not authenticated");

      const toastId = toast.loading("Syncing with Stripe...");

      // Note: You might need to implement this endpoint
      await postWithAuth("/admin/sync/stripe/transactions?days=7", token, {});

      toast.success("Sync completed! Refreshing data...", { id: toastId });

      // Refetch all payment data
      await refetchPayments();
      await refetchStats();

      toast.success("Data refreshed successfully");
    } catch (error: unknown) {
      toast.error(
        "Sync failed: " +
          (error instanceof Error ? error.message : "Unknown error"),
      );
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
        className="cursor-pointer hover:bg-muted/30 transition-colors px-4 py-3 text-left text-sm font-medium text-muted-foreground"
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

  if (error && !loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-red-500">
            Error loading payments
          </h2>
          <p className="mt-2 text-muted-foreground">{error}</p>
          <Button className="mt-4" onClick={() => refetchPayments()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Payments</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            View and manage payment transactions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleOpenCreatePayment}
            disabled={loading}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Test Payment
          </Button>
          <Button variant="outline" onClick={handleSync} disabled={loading}>
            <RefreshCw
              className={cn("mr-2 h-4 w-4", loading && "animate-spin")}
            />
            Sync with Stripe
          </Button>
        </div>
      </div>

      {/* Stats */}
      {statsLoading ? (
        <div className="grid gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="admin-stat-card animate-pulse">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted" />
                <div className="space-y-2">
                  <div className="h-4 w-20 rounded bg-muted" />
                  <div className="h-8 w-16 rounded bg-muted" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        stats && (
          <TooltipProvider>
            <div className="grid gap-4 sm:grid-cols-4">
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
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                    <DollarSign className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      Completed Revenue
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3.5 w-3.5 cursor-help opacity-50" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Revenue from successful payments (in dollars).</p>
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
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                    <DollarSign className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      Total Volume
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3.5 w-3.5 cursor-help opacity-50" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Gross amount of all transactions (in dollars).</p>
                        </TooltipContent>
                      </Tooltip>
                    </p>
                    <p className="text-2xl font-bold">
                      ${stats.totalVolume.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Failed Transactions */}
              <div className="admin-stat-card">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
                    <DollarSign className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      Failed Transactions
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3.5 w-3.5 cursor-help opacity-50" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Number of failed payment attempts.</p>
                        </TooltipContent>
                      </Tooltip>
                    </p>
                    <p className="text-2xl font-bold">
                      {stats.failedTransactions}
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
            placeholder="Search by client, business, or invoice ID..."
            className="flex-1"
          />
          <Select
            value={statusFilter}
            onValueChange={(value) =>
              setStatusFilter(value as TransactionPaymentStatus | "all")
            }
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="PAID_OUT">Paid Out</SelectItem>
              <SelectItem value="REFUNDED">Refunded</SelectItem>
              <SelectItem value="UNPAID">Unpaid</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
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
            <table className="admin-table w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Transaction ID
                  </th>
                  <SortableHeader field="user">Client</SortableHeader>
                  <SortableHeader field="business">Business</SortableHeader>
                  <SortableHeader field="amount">Amount</SortableHeader>
                  <SortableHeader field="status">Status</SortableHeader>
                  <SortableHeader field="date">Date</SortableHeader>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                    Actions
                  </th>
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
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedPayments.map((payment) => (
                    <tr key={payment.id} className="border-b hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono text-xs">
                        {payment.id.slice(0, 8)}...
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">
                            {payment.clientName || "N/A"}
                          </p>
                          {payment.clientPhone && (
                            <p className="text-xs text-muted-foreground">
                              {payment.clientPhone}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {payment.businessName || "N/A"}
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        {formatAmount(payment.amount, payment.currency)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          status={getPaymentStatus(payment.paymentStatus)}
                        />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {format(new Date(payment.createdAt), "MMM d, yyyy")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {payment.status === "PAID" && (
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

        {/* Load More */}
        {hasMore && filteredAndSortedPayments.length > 0 && (
          <div className="flex justify-center border-t p-4">
            <Button
              variant="outline"
              onClick={() => loadMore()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                "Load More"
              )}
            </Button>
          </div>
        )}

        {/* Pagination Info */}
        {filteredAndSortedPayments.length > 0 && (
          <div className="border-t p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {filteredAndSortedPayments.length} payments
                {search && ` matching "${search}"`}
                {statusFilter !== "all" &&
                  ` with status "${getPaymentStatus(statusFilter)}"`}
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
                    <SelectItem value="user">Client</SelectItem>
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
                  {formatAmount(refundPayment.amount, refundPayment.currency)}{" "}
                  to {refundPayment.clientName || "the client"}?
                  <br />
                  <br />
                  <span className="font-mono text-xs block break-all">
                    Transaction ID: {refundPayment.id}
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

      {/* Create Test Payment Dialog */}
      <AlertDialog open={showCreatePayment} onOpenChange={setShowCreatePayment}>
        <AlertDialogContent className="sm:max-w-[425px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Create Test Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Create a test payment intent in Stripe. This will create a real
              payment intent in test mode.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="business" className="text-sm font-medium">
                Business
              </label>
              <Select
                value={paymentForm.businessId}
                onValueChange={(value) =>
                  setPaymentForm({ ...paymentForm, businessId: value })
                }
                disabled={loadingBusinesses || creatingPayment}
              >
                <SelectTrigger id="business">
                  <SelectValue placeholder="Select a business" />
                </SelectTrigger>
                <SelectContent>
                  {loadingBusinesses ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : businesses.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No businesses found
                    </div>
                  ) : (
                    businesses.map((business) => (
                      <SelectItem key={business.id} value={business.id}>
                        {business.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label htmlFor="amount" className="text-sm font-medium">
                Amount (in dollars)
              </label>
              <input
                id="amount"
                type="number"
                step="0.01"
                min="0.50"
                value={paymentForm.amount}
                onChange={(e) =>
                  setPaymentForm({ ...paymentForm, amount: e.target.value })
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="10.00"
                disabled={creatingPayment}
              />
              <p className="text-xs text-muted-foreground">
                Minimum amount: $0.50
              </p>
            </div>
            <div className="grid gap-2">
              <label htmlFor="invoiceId" className="text-sm font-medium">
                Invoice ID (optional)
              </label>
              <input
                id="invoiceId"
                type="text"
                value={paymentForm.invoiceId}
                onChange={(e) =>
                  setPaymentForm({ ...paymentForm, invoiceId: e.target.value })
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="invoice-123"
                disabled={creatingPayment}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={creatingPayment}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCreatePayment}
              disabled={
                creatingPayment ||
                !paymentForm.businessId ||
                !paymentForm.amount
              }
            >
              {creatingPayment ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Payment"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
