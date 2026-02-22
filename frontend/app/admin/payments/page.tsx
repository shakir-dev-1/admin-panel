/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

// src/pages/admin/Payments.tsx
import { useState, useMemo, useEffect } from "react";
import {
  RefreshCw,
  DollarSign,
  Loader2,
  Info,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Plus,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Receipt,
  Building2,
  Package,
  Landmark,
  RotateCcw,
  Users,
  Briefcase,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { SearchInput } from "@/app/components/admin/SearchInput";
import { StatusBadge } from "@/app/components/admin/StatusBadge";
import { Button } from "@/app/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/components/ui/tabs";
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
  useConsumerPayments,
  useConsumerPaymentStats,
  useBusinessUserPayments,
  useBusinessUserPaymentStats,
  useAllRefunds,
  useAllBusinessSubscriptions,
  useSubscriptionPlans,
  useInvoiceStats,
  useAllPayoutInfo,
  useAllAddOns,
  usePaymentStats,
  usePayments,
  type ConsumerPayment,
  type PaymentTransaction,
  type TransactionPaymentStatus,
  type SubscriptionStatus,
  type BillingCycle,
  type BusinessUserPaymentType,
  type TransactionStatus,
} from "@/hooks/usePayments";
import { useAuth } from "@/hooks/useAuth";
import { fetchWithAuth, postWithAuth } from "@/lib/api";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatAmount = (amount: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);

type SortField = "date" | "amount" | "payer" | "status" | "paymentStatus" | "business";
type SortDirection = "asc" | "desc";
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const DEFAULT_PAGE_SIZE = 25;

// ─── Sub-components ───────────────────────────────────────────────────────────

function SortableHeader({
  field,
  children,
  sortField,
  sortDirection,
  onSort,
}: {
  field: SortField;
  children: React.ReactNode;
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (f: SortField) => void;
}) {
  const isActive = sortField === field;
  return (
    <th
      className="cursor-pointer hover:bg-muted/30 transition-colors px-4 py-3 text-left text-sm font-medium text-muted-foreground"
      onClick={() => onSort(field)}
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
}

function PaginationBar({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
}) {
  const pageNumbers = useMemo((): (number | string)[] => {
    const delta = 2;
    const range: number[] = [];
    const result: (number | string)[] = [];
    let l: number | undefined;
    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - delta && i <= currentPage + delta)
      )
        range.push(i);
    }
    range.forEach((i) => {
      if (l && i - l === 2) result.push(l + 1);
      else if (l && i - l !== 1) result.push("...");
      result.push(i);
      l = i;
    });
    return result;
  }, [totalPages, currentPage]);

  if (totalItems === 0) return null;

  return (
    <div className="border-t p-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows per page:</span>
          <Select
            value={pageSize.toString()}
            onValueChange={(v) => onPageSizeChange(Number(v))}
          >
            <SelectTrigger className="w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((s) => (
                <SelectItem key={s} value={s.toString()}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-muted-foreground">
          Showing {(currentPage - 1) * pageSize + 1}–
          {Math.min(currentPage * pageSize, totalItems)} of {totalItems}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {pageNumbers.map((page, i) => (
            <Button
              key={i}
              variant={page === currentPage ? "default" : "outline"}
              size="sm"
              className="min-w-[32px]"
              onClick={() => typeof page === "number" && onPageChange(page)}
              disabled={typeof page !== "number"}
            >
              {page}
            </Button>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Consumer Payments Tab ────────────────────────────────────────────────────

function ConsumerPaymentsTab({
  onRefund,
  refunding,
}: {
  onRefund: (p: ConsumerPayment) => void;
  refunding: boolean;
}) {
  const [filters, setFilters] = useState({
    search: "",
    txStatusFilter: "all" as TransactionStatus | "all",
    txPaymentStatusFilter: "all" as TransactionPaymentStatus | "all",
    sortField: "date" as SortField,
    sortDirection: "desc" as SortDirection,
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
  });
  const {
    search,
    txStatusFilter,
    txPaymentStatusFilter,
    sortField,
    sortDirection,
    page,
    pageSize,
  } = filters;
  const set = (patch: Partial<typeof filters>) =>
    setFilters((prev) => ({ ...prev, ...patch }));

  const { payments, loading, error, refetch, isRefetching } =
    useConsumerPayments();

  // Apply client-side filters and sorting
  const filteredAndSorted = useMemo(() => {
    let result = [...payments];

    // Apply status filter
    if (txStatusFilter !== "all") {
      console.log("result:",result);
      console.log("txStatusFilter:",txStatusFilter);
      result = result.filter((p) => p.status === txStatusFilter);
    } 

    // Apply transaction payment status filter
    if (txPaymentStatusFilter !== "all") {
      result = result.filter((p) => p.paymentStatus === txPaymentStatusFilter);
    }       

    // Apply search filter
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.consumerName?.toLowerCase().includes(s) ||
          p.consumerEmail?.toLowerCase().includes(s) ||
          p.consumerUsername?.toLowerCase().includes(s) ||
          p.businessName?.toLowerCase().includes(s) ||
          p.id.toLowerCase().includes(s) ||
          p.serviceName?.toLowerCase().includes(s) ||
          p.packageName?.toLowerCase().includes(s),
      );
    }

    // Apply sorting
    result.sort((a, b) => {
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
        case "payer":
          aValue = a.consumerName?.toLowerCase() ?? "";
          bValue = b.consumerName?.toLowerCase() ?? "";
          break;
        case "status":
          aValue = a.status;
          bValue = b.status;
          break;
        case "paymentStatus":
          aValue = a.paymentStatus;
          bValue = b.paymentStatus;
          break;
        case "business":
          aValue = a.businessName?.toLowerCase() ?? "";
          bValue = b.businessName?.toLowerCase() ?? "";
          break;
        default:
          return 0;
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        return sortDirection === "asc"
          ? aValue > bValue
            ? 1
            : -1
          : aValue < bValue
            ? 1
            : -1;
      }
    });

    return result;
  }, [payments, search, txStatusFilter, txPaymentStatusFilter, sortField, sortDirection]);

  const totalPages = Math.ceil(filteredAndSorted.length / pageSize);
  const currentPage = Math.min(page, totalPages || 1);
  const pageItems = filteredAndSorted.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const handleSort = (f: SortField) => {
    if (sortField === f) {
      set({ sortDirection: sortDirection === "asc" ? "desc" : "asc", page: 1 });
    } else {
      set({
        sortField: f,
        sortDirection: f === "date" ? "desc" : "asc",
        page: 1,
      });
    }
  };

  const handleRefresh = () => {
    refetch();
  };

  // Debug
  // useEffect(() => {
  //   console.log("Total consumer payments:", payments.length);
  //   console.log("Filtered count:", filteredAndSorted.length);
  // }, [payments, filteredAndSorted]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[200px] text-red-500">
        Error loading consumer payments: {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="admin-card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <SearchInput
            value={search}
            onChange={(v) => set({ search: v, page: 1 })}
            placeholder="Search by name, email, business, or service..."
            className="flex-1"
          />
          <Select
            value={txStatusFilter}
            onValueChange={(v) =>
              set({
                txStatusFilter: v as TransactionStatus | "all",
                page: 1,
              })
            }
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="TxStatus" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Transactions</SelectItem>
              <SelectItem value="CREATED">Created</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
              <SelectItem value="FAILED">Failed</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={txPaymentStatusFilter}
            onValueChange={(v) =>
              set({
                txPaymentStatusFilter: v as TransactionPaymentStatus | "all",
                page: 1,
              })
            }
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="PaymentStatus" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="PAID_OUT">Paid Out</SelectItem>
              <SelectItem value="REFUNDED">Refunded</SelectItem>
              <SelectItem value="UNPAID">Unpaid</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
            </SelectContent>
          </Select>
          
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {filteredAndSorted.length} payments
          </span>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={loading || isRefetching}
          >
            <RefreshCw
              className={`h-4 w-4 ${loading || isRefetching ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      <div className="admin-card p-0">
        <div className="overflow-x-auto rounded-lg">
          {loading && payments.length === 0 ? (
            <div className="flex min-h-[200px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <table className="admin-table w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    ID
                  </th>
                  <SortableHeader
                    field="payer"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    Consumer
                  </SortableHeader>
                  <SortableHeader
                    field="business"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    Business
                  </SortableHeader>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Service
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Stripe ID
                  </th>
                  <SortableHeader
                    field="amount"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    Amount
                  </SortableHeader>
                  <SortableHeader
                    field="status"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    Status
                  </SortableHeader>
                   <SortableHeader
                    field="paymentStatus"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    Payment Status
                  </SortableHeader>
                  <SortableHeader
                    field="date"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    Date
                  </SortableHeader>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-8 text-center text-muted-foreground"
                    >
                      {search || txPaymentStatusFilter !== "all"
                        ? "No payments match your filters"
                        : "No consumer payments found"}
                    </td>
                  </tr>
                ) : (
                  pageItems.map((p) => (
                    <tr key={p.id} className="border-b hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono text-xs">
                        {p.id}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{p.consumerName ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.consumerEmail ?? p.consumerPhone ?? ""}
                        </p>
                        {p.consumerUsername && (
                          <p className="text-xs text-muted-foreground">
                            @{p.consumerUsername}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">{p.businessName ?? "—"}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {p.serviceName ?? p.packageName ?? "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {p.stripePaymentIntentId}
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        {formatAmount(p.amount, p.currency)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={p.paymentStatus} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-sm">
                        {format(new Date(p.createdAt), "MMM d, yyyy")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {(p.paymentStatus === "PAID" ||
                          p.paymentStatus === "PAID_OUT") && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRefund(p)}
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
        <PaginationBar
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredAndSorted.length}
          pageSize={pageSize}
          onPageChange={(p) => set({ page: p })}
          onPageSizeChange={(s) => set({ pageSize: s, page: 1 })}
        />
      </div>
    </div>
  );
}

// ─── BusinessUser Payments Tab ────────────────────────────────────────────────

function BusinessUserPaymentsTab() {
  const [filters, setFilters] = useState({
    search: "",
    typeFilter: "all" as BusinessUserPaymentType,
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
  });
  const { search, typeFilter, page, pageSize } = filters;
  const set = (patch: Partial<typeof filters>) =>
    setFilters((prev) => ({ ...prev, ...patch }));

  const { payments, loading, hasMore, loadMore, isFetchingNextPage } =
    useBusinessUserPayments({ type: typeFilter });
  const { stats } = useBusinessUserPaymentStats();

  useEffect(() => {
    if (hasMore && !isFetchingNextPage) loadMore();
  }, [hasMore, isFetchingNextPage, loadMore]);

  const filtered = useMemo(() => {
    if (!search) return payments;
    const s = search.toLowerCase();
    return payments.filter(
      (p) =>
        p.businessName.toLowerCase().includes(s) ||
        p.businessUserEmail?.toLowerCase().includes(s) ||
        p.businessUserName?.toLowerCase().includes(s) ||
        p.description.toLowerCase().includes(s),
    );
  }, [payments, search]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const currentPage = Math.min(page, totalPages || 1);
  const pageItems = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="admin-card">
            <p className="text-sm text-muted-foreground">Total Subscriptions</p>
            <p className="text-2xl font-bold mt-1">
              {stats.subscriptions.total}
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {stats.subscriptions.byStatus.map((s) => (
                <span
                  key={s.status}
                  className="text-xs bg-muted px-2 py-0.5 rounded-full"
                >
                  {s.status}: {s._count}
                </span>
              ))}
            </div>
          </div>
          <div className="admin-card">
            <p className="text-sm text-muted-foreground">Total Add-Ons</p>
            <p className="text-2xl font-bold mt-1">{stats.addOns.total}</p>
          </div>
          <div className="admin-card">
            <p className="text-sm text-muted-foreground">Add-On Revenue</p>
            <p className="text-2xl font-bold mt-1">
              {formatAmount(stats.addOns.totalRevenue)}
            </p>
          </div>
          <div className="admin-card">
            <p className="text-sm text-muted-foreground">By Add-On Type</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {stats.addOns.byType.map((t) => (
                <span
                  key={t.type}
                  className="text-xs bg-muted px-2 py-0.5 rounded-full"
                >
                  {t.type}: {t._count} · {formatAmount(t._sum.price ?? 0)}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="admin-card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <SearchInput
            value={search}
            onChange={(v) => set({ search: v, page: 1 })}
            placeholder="Search by business, user, or description..."
            className="flex-1"
          />
          <Select
            value={typeFilter}
            onValueChange={(v) =>
              set({ typeFilter: v as BusinessUserPaymentType, page: 1 })
            }
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="subscription">Subscriptions</SelectItem>
              <SelectItem value="addon">Add-Ons</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {filtered.length} entries
          </span>
        </div>
      </div>

      {isFetchingNextPage && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground px-4 py-2 bg-muted/30 rounded">
          <Loader2 className="h-3 w-3 animate-spin" />
          Loading more…
        </div>
      )}

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
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Business
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    BusinessUser
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-8 text-center text-muted-foreground"
                    >
                      {search || typeFilter !== "all"
                        ? "No entries match your filters"
                        : "No business payments found"}
                    </td>
                  </tr>
                ) : (
                  pageItems.map((p) => (
                    <tr key={p.id} className="border-b hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "text-xs px-2 py-0.5 rounded-full font-medium",
                            p.entryType === "subscription"
                              ? "bg-blue-500/10 text-blue-600"
                              : "bg-purple-500/10 text-purple-600",
                          )}
                        >
                          {p.entryType === "subscription"
                            ? "Subscription"
                            : "Add-On"}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {p.businessName}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium">
                          {p.businessUserName ?? "—"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {p.businessUserEmail ?? ""}
                        </p>
                        {p.businessUserPhone && (
                          <p className="text-xs text-muted-foreground">
                            {p.businessUserPhone}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <p>{p.description}</p>
                        {p.billingCycle && (
                          <p className="text-xs text-muted-foreground">
                            {p.billingCycle}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        {p.amount !== null ? (
                          formatAmount(p.amount, p.currency)
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            Stripe-billed
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={p.status} />
                        {p.paymentStatus && p.paymentStatus !== p.status && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {p.paymentStatus}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-sm">
                        {format(new Date(p.createdAt), "MMM d, yyyy")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
        <PaginationBar
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filtered.length}
          pageSize={pageSize}
          onPageChange={(p) => set({ page: p })}
          onPageSizeChange={(s) => set({ pageSize: s, page: 1 })}
        />
      </div>
    </div>
  );
}

// ─── Subscriptions Tab ────────────────────────────────────────────────────────

function SubscriptionsTab() {
  const [filters, setFilters] = useState({
    search: "",
    statusFilter: "all" as SubscriptionStatus | "all",
    billingFilter: "all" as BillingCycle | "all",
    sortField: "business" as
      | "business"
      | "plan"
      | "status"
      | "billing"
      | "startDate",
    sortDirection: "asc" as "asc" | "desc",
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
  });
  const {
    search,
    statusFilter,
    billingFilter,
    sortField,
    sortDirection,
    page,
    pageSize,
  } = filters;
  const set = (patch: Partial<typeof filters>) =>
    setFilters((prev) => ({ ...prev, ...patch }));

  // Fetch all subscriptions once
  const { subscriptions, loading, error, refetch, isRefetching } =
    useAllBusinessSubscriptions();

  const { plans } = useSubscriptionPlans();

  // Apply client-side filters and sorting
  const filteredAndSorted = useMemo(() => {
    let result = [...subscriptions];

    // Apply status filter
    if (statusFilter !== "all") {
      result = result.filter((sub) => sub.status === statusFilter);
    }

    // Apply billing cycle filter
    if (billingFilter !== "all") {
      result = result.filter((sub) => sub.billingCycle === billingFilter);
    }

    // Apply search filter
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(
        (sub) =>
          sub.business?.name?.toLowerCase().includes(s) ||
          sub.subscription?.title?.toLowerCase().includes(s) ||
          sub.id.toLowerCase().includes(s) ||
          sub.business?.members?.some(
            (m) =>
              m.businessUser.email.toLowerCase().includes(s) ||
              m.businessUser.fullName?.toLowerCase().includes(s),
          ),
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortField) {
        case "business":
          aValue = a.business?.name || "";
          bValue = b.business?.name || "";
          break;
        case "plan":
          aValue = a.subscription?.title || "";
          bValue = b.subscription?.title || "";
          break;
        case "status":
          aValue = a.status;
          bValue = b.status;
          break;
        case "billing":
          aValue = a.billingCycle;
          bValue = b.billingCycle;
          break;
        case "startDate":
          aValue = a.startDate ? new Date(a.startDate).getTime() : 0;
          bValue = b.startDate ? new Date(b.startDate).getTime() : 0;
          break;
        default:
          return 0;
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        return sortDirection === "asc"
          ? aValue > bValue
            ? 1
            : -1
          : aValue < bValue
            ? 1
            : -1;
      }
    });

    return result;
  }, [
    subscriptions,
    search,
    statusFilter,
    billingFilter,
    sortField,
    sortDirection,
  ]);

  const totalPages = Math.ceil(filteredAndSorted.length / pageSize);
  const currentPage = Math.min(page, totalPages || 1);
  const pageItems = filteredAndSorted.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      set({ sortDirection: sortDirection === "asc" ? "desc" : "asc", page: 1 });
    } else {
      set({ sortField: field, sortDirection: "asc", page: 1 });
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    refetch();
  };

  // Debug
  useEffect(() => {
    console.log("Total subscriptions:", subscriptions.length);
    console.log("Filtered count:", filteredAndSorted.length);
  }, [subscriptions, filteredAndSorted]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[200px] text-red-500">
        Error loading subscriptions: {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {plans.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan.id} className="admin-card">
              <p className="font-semibold">{plan.title}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {plan.businessSubscriptions?.length || 0} subscribers
              </p>
              <div className="mt-2 flex gap-2 flex-wrap">
                {["ACTIVE", "TRIAL", "CANCELLED", "INACTIVE"].map((s) => {
                  const count =
                    plan.businessSubscriptions?.filter((b) => b.status === s)
                      .length || 0;
                  return count > 0 ? (
                    <span
                      key={s}
                      className="text-xs bg-muted px-2 py-0.5 rounded-full"
                    >
                      {s}: {count}
                    </span>
                  ) : null;
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="admin-card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <SearchInput
            value={search}
            onChange={(v) => set({ search: v, page: 1 })}
            placeholder="Search by business or plan…"
            className="flex-1"
          />
          <Select
            value={statusFilter}
            onValueChange={(v) =>
              set({
                statusFilter: v as SubscriptionStatus | "all",
                page: 1,
              })
            }
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="TRIAL">Trial</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={billingFilter}
            onValueChange={(v) =>
              set({
                billingFilter: v as BillingCycle | "all",
                page: 1,
              })
            }
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Billing" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Billing</SelectItem>
              <SelectItem value="MONTH">Monthly</SelectItem>
              <SelectItem value="YEAR">Yearly</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {filteredAndSorted.length} subscriptions
          </span>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={loading || isRefetching}
          >
            <RefreshCw
              className={`h-4 w-4 ${loading || isRefetching ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      {loading && subscriptions.length === 0 ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="admin-card p-0">
          <div className="overflow-x-auto rounded-lg">
            <table className="admin-table w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th
                    className="cursor-pointer hover:bg-muted/30 px-4 py-3 text-left text-sm font-medium text-muted-foreground"
                    onClick={() => handleSort("business")}
                  >
                    <div className="flex items-center gap-1">
                      Business
                      {sortField === "business" &&
                        (sortDirection === "asc" ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        ))}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Owner
                  </th>
                  <th
                    className="cursor-pointer hover:bg-muted/30 px-4 py-3 text-left text-sm font-medium text-muted-foreground"
                    onClick={() => handleSort("plan")}
                  >
                    <div className="flex items-center gap-1">
                      Plan
                      {sortField === "plan" &&
                        (sortDirection === "asc" ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        ))}
                    </div>
                  </th>
                  <th
                    className="cursor-pointer hover:bg-muted/30 px-4 py-3 text-left text-sm font-medium text-muted-foreground"
                    onClick={() => handleSort("status")}
                  >
                    <div className="flex items-center gap-1">
                      Status
                      {sortField === "status" &&
                        (sortDirection === "asc" ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        ))}
                    </div>
                  </th>
                  <th
                    className="cursor-pointer hover:bg-muted/30 px-4 py-3 text-left text-sm font-medium text-muted-foreground"
                    onClick={() => handleSort("billing")}
                  >
                    <div className="flex items-center gap-1">
                      Billing
                      {sortField === "billing" &&
                        (sortDirection === "asc" ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        ))}
                    </div>
                  </th>
                  <th
                    className="cursor-pointer hover:bg-muted/30 px-4 py-3 text-left text-sm font-medium text-muted-foreground"
                    onClick={() => handleSort("startDate")}
                  >
                    <div className="flex items-center gap-1">
                      Start
                      {sortField === "startDate" &&
                        (sortDirection === "asc" ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        ))}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    End
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Last Event
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-8 text-center text-muted-foreground"
                    >
                      {search ||
                      statusFilter !== "all" ||
                      billingFilter !== "all"
                        ? "No subscriptions match your filters"
                        : "No subscriptions found"}
                    </td>
                  </tr>
                ) : (
                  pageItems.map((sub) => {
                    const owner = (sub.business as any)?.members?.[0]
                      ?.businessUser;
                    return (
                      <tr key={sub.id} className="border-b hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">
                          {sub.business?.name ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          {owner ? (
                            <>
                              <p className="text-sm font-medium">
                                {owner.fullName ?? "—"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {owner.email}
                              </p>
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {sub.subscription?.title ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={sub.status} />
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {sub.billingCycle}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-sm">
                          {sub.startDate
                            ? format(new Date(sub.startDate), "MMM d, yyyy")
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-sm">
                          {sub.endDate
                            ? format(new Date(sub.endDate), "MMM d, yyyy")
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {sub.history && sub.history.length > 0 ? (
                            <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                              {sub.history[0].eventType}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <PaginationBar
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredAndSorted.length}
            pageSize={pageSize}
            onPageChange={(p) => set({ page: p })}
            onPageSizeChange={(s) => set({ pageSize: s, page: 1 })}
          />
        </div>
      )}
    </div>
  );
}

// ─── Refunds Tab ──────────────────────────────────────────────────────────────

function RefundsTab() {
  const [filters, setFilters] = useState({
    search: "",
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
  });
  const { search, page, pageSize } = filters;
  const set = (patch: Partial<typeof filters>) =>
    setFilters((prev) => ({ ...prev, ...patch }));

  const { refunds, loading, hasMore, loadMore, isFetchingNextPage } =
    useAllRefunds();

  useEffect(() => {
    if (hasMore && !isFetchingNextPage) loadMore();
  }, [hasMore, isFetchingNextPage, loadMore]);

  const filtered = useMemo(() => {
    if (!search) return refunds;
    const s = search.toLowerCase();
    return refunds.filter(
      (r) =>
        r.businessName?.toLowerCase().includes(s) ||
        r.clientName?.toLowerCase().includes(s) ||
        r.consumerEmail?.toLowerCase().includes(s) ||
        r.id.toLowerCase().includes(s),
    );
  }, [refunds, search]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const currentPage = Math.min(page, totalPages || 1);
  const pageItems = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  return (
    <div className="space-y-4">
      <div className="admin-card">
        <SearchInput
          value={search}
          onChange={(v) => set({ search: v, page: 1 })}
          placeholder="Search by business, client, or email…"
          className="max-w-sm"
        />
      </div>
      {isFetchingNextPage && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground px-4 py-2 bg-muted/30 rounded">
          <Loader2 className="h-3 w-3 animate-spin" />
          Loading more…
        </div>
      )}
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
                    ID
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Business
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Payer
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Amount Sent
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Refund Amount
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No refunds found
                    </td>
                  </tr>
                ) : (
                  pageItems.map((r) => (
                    <tr key={r.id} className="border-b hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono text-xs">
                        {r.id.slice(0, 8)}…
                      </td>
                      <td className="px-4 py-3">{r.businessName ?? "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              "text-xs px-1.5 py-0.5 rounded-full",
                              r.payerType === "consumer"
                                ? "bg-blue-500/10 text-blue-600"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {r.payerType === "consumer"
                              ? "Consumer"
                              : "Walk-in"}
                          </span>
                        </div>
                        <p className="text-sm mt-0.5">{r.clientName ?? "—"}</p>
                        {r.consumerEmail && (
                          <p className="text-xs text-muted-foreground">
                            {r.consumerEmail}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        {formatAmount(r.amount)}
                      </td>
                      <td className="px-4 py-3 text-red-500 font-semibold">
                        {formatAmount(r.refundAmount)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {format(new Date(r.createdAt), "MMM d, yyyy")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
        <PaginationBar
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filtered.length}
          pageSize={pageSize}
          onPageChange={(p) => set({ page: p })}
          onPageSizeChange={(s) => set({ pageSize: s, page: 1 })}
        />
      </div>
    </div>
  );
}

// ─── Add-Ons Tab ──────────────────────────────────────────────────────────────

function AddOnsTab() {
  const [filters, setFilters] = useState({
    search: "",
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
  });
  const { search, page, pageSize } = filters;
  const set = (patch: Partial<typeof filters>) =>
    setFilters((prev) => ({ ...prev, ...patch }));

  const { addOns, loading, hasMore, loadMore, isFetchingNextPage } =
    useAllAddOns();

  useEffect(() => {
    if (hasMore && !isFetchingNextPage) loadMore();
  }, [hasMore, isFetchingNextPage, loadMore]);

  const filtered = useMemo(() => {
    if (!search) return addOns;
    const s = search.toLowerCase();
    return addOns.filter(
      (a) =>
        a.business?.name.toLowerCase().includes(s) ||
        a.purchaseBy?.businessUser?.email.toLowerCase().includes(s) ||
        a.type.toLowerCase().includes(s),
    );
  }, [addOns, search]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const currentPage = Math.min(page, totalPages || 1);
  const pageItems = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  return (
    <div className="space-y-4">
      <div className="admin-card">
        <SearchInput
          value={search}
          onChange={(v) => set({ search: v, page: 1 })}
          placeholder="Search add-ons…"
          className="max-w-sm"
        />
      </div>
      {isFetchingNextPage && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground px-4 py-2 bg-muted/30 rounded">
          <Loader2 className="h-3 w-3 animate-spin" />
          Loading more…
        </div>
      )}
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
                    Business
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Price
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Purchased By
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No add-ons found
                    </td>
                  </tr>
                ) : (
                  pageItems.map((a) => (
                    <tr key={a.id} className="border-b hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">
                        {a.business?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                          {a.type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={a.status} />
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        {formatAmount(a.price, a.currency)}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        <p>{a.purchaseBy?.businessUser?.fullName ?? "—"}</p>
                        <p className="text-xs">
                          {a.purchaseBy?.businessUser?.email ?? ""}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {format(new Date(a.createdAt), "MMM d, yyyy")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
        <PaginationBar
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filtered.length}
          pageSize={pageSize}
          onPageChange={(p) => set({ page: p })}
          onPageSizeChange={(s) => set({ pageSize: s, page: 1 })}
        />
      </div>
    </div>
  );
}

// ─── Payout Info Tab ──────────────────────────────────────────────────────────

function PayoutInfoTab() {
  const [filters, setFilters] = useState({
    search: "",
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
  });
  const { search, page, pageSize } = filters;
  const set = (patch: Partial<typeof filters>) =>
    setFilters((prev) => ({ ...prev, ...patch }));

  const { payoutInfo, loading, hasMore, loadMore, isFetchingNextPage } =
    useAllPayoutInfo();

  useEffect(() => {
    if (hasMore && !isFetchingNextPage) loadMore();
  }, [hasMore, isFetchingNextPage, loadMore]);

  const filtered = useMemo(() => {
    if (!search) return payoutInfo;
    const s = search.toLowerCase();
    return payoutInfo.filter(
      (p) =>
        p.business?.name.toLowerCase().includes(s) ||
        p.bank?.bankName.toLowerCase().includes(s) ||
        p.accountTitle.toLowerCase().includes(s),
    );
  }, [payoutInfo, search]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const currentPage = Math.min(page, totalPages || 1);
  const pageItems = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  return (
    <div className="space-y-4">
      <div className="admin-card">
        <SearchInput
          value={search}
          onChange={(v) => set({ search: v, page: 1 })}
          placeholder="Search payout info…"
          className="max-w-sm"
        />
      </div>
      {isFetchingNextPage && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground px-4 py-2 bg-muted/30 rounded">
          <Loader2 className="h-3 w-3 animate-spin" />
          Loading more…
        </div>
      )}
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
                    Business
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Bank
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Account Title
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Country
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Account #
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No payout info found
                    </td>
                  </tr>
                ) : (
                  pageItems.map((p) => (
                    <tr key={p.id} className="border-b hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">
                        {p.business?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3">{p.bank?.bankName ?? "—"}</td>
                      <td className="px-4 py-3">{p.accountTitle}</td>
                      <td className="px-4 py-3 text-sm">{p.countryCode}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        ••••{p.accountNumber.slice(-4)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
        <PaginationBar
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filtered.length}
          pageSize={pageSize}
          onPageChange={(p) => set({ page: p })}
          onPageSizeChange={(s) => set({ pageSize: s, page: 1 })}
        />
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Payments() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  // Refund state (for consumer payments)
  const [refundPayment, setRefundPayment] = useState<ConsumerPayment | null>(
    null,
  );
  const [refunding, setRefunding] = useState(false);

  // Create test payment state
  const [showCreatePayment, setShowCreatePayment] = useState(false);
  const [creatingPayment, setCreatingPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    businessId: "",
    amount: "",
    invoiceId: `test-invoice-${Date.now()}`,
    clientId: "",
  });
  const [businesses, setBusinesses] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [loadingBusinesses, setLoadingBusinesses] = useState(false);
  const [clients, setClients] = useState<
    Array<{
      id: string;
      fullName: string;
      email?: string;
      phoneNumber?: string;
    }>
  >([]);
  const [loadingClients, setLoadingClients] = useState(false);

  const {
    stats,
    loading: statsLoading,
    refetch: refetchStats,
  } = usePaymentStats();
  const { stats: consumerStats } = useConsumerPaymentStats();
  const { stats: invoiceStats } = useInvoiceStats();
  const { refetch: refetchPayments } = usePayments();

  const fetchBusinesses = async () => {
    if (!token) return;
    setLoadingBusinesses(true);
    try {
      const res = await fetchWithAuth("/admin/payments/businesses", token);
      setBusinesses(
        Array.isArray(res) ? (res as Array<{ id: string; name: string }>) : [],
      );
    } catch {
      toast.error("Failed to load businesses");
      setBusinesses([]);
    } finally {
      setLoadingBusinesses(false);
    }
  };

  const fetchClients = async (businessId: string) => {
    if (!token) return;
    setLoadingClients(true);
    try {
      const res = await fetchWithAuth(
        `/admin/payments/${businessId}/clients`,
        token,
      );
      setClients(Array.isArray(res) ? (res as typeof clients) : []);
    } catch {
      toast.error("Failed to load clients");
      setClients([]);
    } finally {
      setLoadingClients(false);
    }
  };

  const handleBusinessChange = (businessId: string) => {
    setPaymentForm({ ...paymentForm, businessId, clientId: "" });
    if (businessId) fetchClients(businessId);
    else setClients([]);
  };

  const handleOpenCreatePayment = () => {
    fetchBusinesses();
    setPaymentForm({
      businessId: "",
      amount: "",
      invoiceId: `test-invoice-${Date.now()}`,
      clientId: "",
    });
    setShowCreatePayment(true);
  };

  const handleCreatePayment = async () => {
    if (!token || !paymentForm.businessId || !paymentForm.amount) {
      toast.error("Please select a business and enter an amount");
      return;
    }
    const toastId = toast.loading("Creating test payment…");
    setCreatingPayment(true);
    try {
      const res = (await postWithAuth(
        `/admin/payments/${paymentForm.businessId}/create-payment-intent`,
        token,
        {
          amount: parseFloat(paymentForm.amount),
          invoiceId: paymentForm.invoiceId,
          clientId: paymentForm.clientId || undefined,
        },
      )) as { clientName: string; status: string };
      toast.success("Test payment created", {
        id: toastId,
        description: `Payment for ${res.clientName} — status: ${res.status}`,
      });
      setShowCreatePayment(false);
      await refetchPayments();
      await refetchStats();
    } catch (err: any) {
      toast.error("Failed to create payment", {
        id: toastId,
        description: err?.response?.data?.message ?? err.message,
      });
    } finally {
      setCreatingPayment(false);
    }
  };

  const handleRefund = async () => {
    if (!refundPayment || !token) return;
    const toastId = toast.loading("Processing refund…");
    setRefunding(true);
    try {
      await postWithAuth(
        `/admin/payments/payments/${refundPayment.id}/refund`,
        token,
        {},
      );
      toast.success("Refund processed", {
        id: toastId,
        description: `${formatAmount(refundPayment.amount, refundPayment.currency)} refunded to ${refundPayment.consumerName ?? "consumer"}.`,
      });
      setRefundPayment(null);
      await queryClient.invalidateQueries({ queryKey: ["consumerPayments"] });
      await queryClient.invalidateQueries({ queryKey: ["paymentStats"] });
      await queryClient.invalidateQueries({
        queryKey: ["consumerPaymentStats"],
      });
    } catch (err: any) {
      const d = err?.response?.data;
      const errorMap: Record<string, [string, string]> = {
        PAYMENT_INTENT_NOT_FOUND: [
          "Payment Intent Not Found",
          d?.message ?? "Stripe payment intent not found.",
        ],
        ALREADY_REFUNDED: [
          "Already Refunded",
          d?.message ?? "Payment already refunded.",
        ],
        INVALID_STATUS: [
          "Invalid Status",
          d?.message ?? "Payment is not in a refundable state.",
        ],
        STRIPE_ERROR: ["Stripe Error", d?.message ?? "Stripe error occurred."],
      };
      const [title, desc] = errorMap[d?.error] ?? [
        "Refund Failed",
        d?.message ?? err.message ?? "Unknown error",
      ];
      toast.error(title, { id: toastId, description: desc, duration: 8000 });
    } finally {
      setRefunding(false);
    }
  };

  const handleSync = async () => {
    if (!token) return;
    const toastId = toast.loading("Syncing with Stripe…");
    try {
      await postWithAuth("/admin/sync/stripe/transactions?days=7", token, {});
      toast.success("Sync complete — refreshing…", { id: toastId });
      await refetchPayments();
      await refetchStats();
    } catch (err: unknown) {
      toast.error(
        "Sync failed: " +
          (err instanceof Error ? err.message : "Unknown error"),
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Payments</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Consumer payments (User → Business) and business payments (Business
            → Platform)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleOpenCreatePayment}>
            <Plus className="mr-2 h-4 w-4" />
            Create Test Payment
          </Button>
          <Button variant="outline" onClick={handleSync}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Sync Stripe
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
            {/* Consumer payment stats row */}
            {consumerStats && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-semibold text-foreground">
                    Consumer Payments
                  </span>
                  <span className="text-xs text-muted-foreground">
                    (User → Business)
                  </span>
                </div>
                <div className="grid gap-4 sm:grid-cols-4">
                  {[
                    {
                      label: "Total Transactions",
                      value: consumerStats.totalTransactions.toString(),
                      color: "text-blue-500",
                      bg: "bg-blue-500/10",
                      tip: "Appointment payments by consumers.",
                    },
                    {
                      label: "Completed Revenue",
                      value: `$${consumerStats.completedRevenue.toFixed(2)}`,
                      color: "text-green-500",
                      bg: "bg-green-500/10",
                      tip: "Revenue from completed consumer payments.",
                    },
                    {
                      label: "Total Refunded",
                      value: `$${consumerStats.totalRefunded.toFixed(2)}`,
                      color: "text-orange-500",
                      bg: "bg-orange-500/10",
                      tip: "Total refunded to consumers.",
                    },
                    {
                      label: "Failed",
                      value: consumerStats.failedTransactions.toString(),
                      color: "text-red-500",
                      bg: "bg-red-500/10",
                      tip: "Failed consumer payment attempts.",
                    },
                  ].map(({ label, value, color, bg, tip }) => (
                    <div key={label} className="admin-stat-card">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-lg",
                            bg,
                          )}
                        >
                          <Users className={cn("h-5 w-5", color)} />
                        </div>
                        <div>
                          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            {label}
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="h-3.5 w-3.5 cursor-help opacity-50" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{tip}</p>
                              </TooltipContent>
                            </Tooltip>
                          </p>
                          <p className="text-2xl font-bold">{value}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Business payment stats row */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Briefcase className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-semibold text-foreground">
                  Business Payments
                </span>
                <span className="text-xs text-muted-foreground">
                  (Business → Platform)
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {stats.subscriptionStats.length > 0 && (
                  <div className="admin-card">
                    <p className="text-sm font-medium mb-2 flex items-center gap-1.5">
                      <Receipt className="h-4 w-4 text-purple-500" />
                      Subscriptions by Status
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {stats.subscriptionStats.map((s) => (
                        <div
                          key={s.status}
                          className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-full"
                        >
                          <span className="text-xs font-medium">
                            {s.status}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {s._count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {stats.addOnStats.length > 0 && (
                  <div className="admin-card">
                    <p className="text-sm font-medium mb-2 flex items-center gap-1.5">
                      <Package className="h-4 w-4 text-purple-500" />
                      Add-On Revenue
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {stats.addOnStats.map((a) => (
                        <div
                          key={a.status}
                          className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-full"
                        >
                          <span className="text-xs font-medium">
                            {a.status}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {a._count} · {formatAmount(a._sum.price ?? 0)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {invoiceStats && (
                  <div className="admin-card">
                    <p className="text-sm font-medium mb-2">Invoice Summary</p>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">
                        Total: {invoiceStats.totalInvoices} invoices
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Due: {formatAmount(invoiceStats.totalAmountDue)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Paid: {formatAmount(invoiceStats.totalAmountPaid)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Tips: {formatAmount(invoiceStats.totalTips)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TooltipProvider>
        )
      )}

      {/* Tabs */}
      <Tabs defaultValue="consumer-payments">
        <TabsList className="mb-4">
          <TabsTrigger
            value="consumer-payments"
            className="flex items-center gap-1.5"
          >
            <Users className="h-4 w-4" />
            Consumer Payments
          </TabsTrigger>
          <TabsTrigger
            value="business-payments"
            className="flex items-center gap-1.5"
          >
            <Briefcase className="h-4 w-4" />
            Business Payments
          </TabsTrigger>
          <TabsTrigger
            value="subscriptions"
            className="flex items-center gap-1.5"
          >
            <Receipt className="h-4 w-4" />
            Subscriptions
          </TabsTrigger>
          <TabsTrigger value="refunds" className="flex items-center gap-1.5">
            <RotateCcw className="h-4 w-4" />
            Refunds
          </TabsTrigger>
          <TabsTrigger value="add-ons" className="flex items-center gap-1.5">
            <Package className="h-4 w-4" />
            Add-Ons
          </TabsTrigger>
          <TabsTrigger
            value="payout-info"
            className="flex items-center gap-1.5"
          >
            <Landmark className="h-4 w-4" />
            Payout Info
          </TabsTrigger>
        </TabsList>

        <TabsContent value="consumer-payments">
          <ConsumerPaymentsTab
            onRefund={setRefundPayment}
            refunding={refunding}
          />
        </TabsContent>
        <TabsContent value="business-payments">
          <BusinessUserPaymentsTab />
        </TabsContent>
        <TabsContent value="subscriptions">
          <SubscriptionsTab />
        </TabsContent>
        <TabsContent value="refunds">
          <RefundsTab />
        </TabsContent>
        <TabsContent value="add-ons">
          <AddOnsTab />
        </TabsContent>
        <TabsContent value="payout-info">
          <PayoutInfoTab />
        </TabsContent>
      </Tabs>

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
                  to {refundPayment.consumerName ?? "the consumer"}?
                  <br />
                  <br />
                  <span className="font-mono text-xs block break-all">
                    Transaction ID: {refundPayment.id}
                  </span>
                  {refundPayment.consumerEmail && (
                    <span className="text-sm block mt-1">
                      Email: {refundPayment.consumerEmail}
                    </span>
                  )}
                  {refundPayment.businessName && (
                    <span className="text-sm block mt-1">
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
                  Processing…
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
              Creates a real Stripe payment intent in test mode.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">
                Business <span className="text-red-500">*</span>
              </label>
              <Select
                value={paymentForm.businessId}
                onValueChange={handleBusinessChange}
                disabled={loadingBusinesses || creatingPayment}
              >
                <SelectTrigger>
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
                    businesses.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {paymentForm.businessId && (
              <div className="grid gap-2">
                <label className="text-sm font-medium">Client (Optional)</label>
                <Select
                  value={paymentForm.clientId}
                  onValueChange={(v) =>
                    setPaymentForm({
                      ...paymentForm,
                      clientId: v === "__test__" ? "" : v,
                    })
                  }
                  disabled={loadingClients || creatingPayment}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingClients ? (
                      <div className="flex items-center justify-center p-4">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : (
                      <>
                        <SelectItem value="__test__">
                          ✨ Create test client
                        </SelectItem>
                        {clients.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.fullName}
                            {c.email ? ` (${c.email})` : ""}
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Leave empty to auto-create a test client
                </p>
              </div>
            )}

            <div className="grid gap-2">
              <label className="text-sm font-medium">
                Amount (USD) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.50"
                value={paymentForm.amount}
                onChange={(e) =>
                  setPaymentForm({ ...paymentForm, amount: e.target.value })
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                placeholder="10.00"
                disabled={creatingPayment}
              />
              <p className="text-xs text-muted-foreground">Minimum: $0.50</p>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Invoice ID</label>
              <input
                type="text"
                value={paymentForm.invoiceId}
                onChange={(e) =>
                  setPaymentForm({ ...paymentForm, invoiceId: e.target.value })
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
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
                  Creating…
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
