"use client";

// src/hooks/usePayments.ts
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { fetchWithAuth } from "@/lib/api";
import type Stripe from "stripe";

// Types based on the service response
export type TransactionStatus = "CREATED" | "PAID" | "FAILED";
export type TransactionPaymentStatus =
  | "PAID_OUT"
  | "REFUNDED"
  | "UNPAID"
  | "PAID";
export type TransactionType = "PAY_IN" | "PAY_OUT";

export interface PaymentTransaction {
  id: string;
  amount: number;
  refundAmount: number;
  currency: string;
  status: TransactionStatus;
  paymentStatus: TransactionPaymentStatus;
  type: TransactionType;
  businessId: string;
  businessName?: string;
  invoiceId: string;
  clientName?: string;
  clientPhone?: string;
  createdAt: string;
}

export interface PaymentsResponse {
  data: PaymentTransaction[];
  hasMore: boolean;
  nextCursor?: string;
}

export interface PaymentStats {
  totalTransactions: number;
  completedRevenue: number;
  totalVolume: number;
  totalRefunded: number;
  failedTransactions: number;
  subscriptionStats: Array<{
    status: string;
    _count: number;
  }>;
}

export interface UsePaymentsParams {
  limit?: number;
  paymentStatus?: TransactionPaymentStatus | "all";
}

export function usePayments(params?: UsePaymentsParams) {
  const { token } = useAuth();
  const limit = params?.limit || 50;

  const fetchPayments = async ({ pageParam }: { pageParam?: string }) => {
    if (!token) throw new Error("Not authenticated");

    const queryParams = new URLSearchParams();
    queryParams.append("limit", limit.toString());
    if (pageParam) queryParams.append("cursor", pageParam);

    const url = `/admin/payments/payments?${queryParams.toString()}`;
    const response = await fetchWithAuth<PaymentsResponse>(url, token);

    return response;
  };

  const query = useInfiniteQuery({
    queryKey: ["payments", limit, params?.paymentStatus],
    queryFn: fetchPayments,
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!token,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Flatten all pages of payments
  const allPayments = query.data?.pages.flatMap((page) => page.data) || [];

  // Filter by status if needed
  const filteredPayments =
    params?.paymentStatus && params.paymentStatus !== "all"
      ? allPayments.filter((p) => p.paymentStatus === params.paymentStatus)
      : allPayments;

  return {
    payments: filteredPayments,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    hasMore: query.hasNextPage,
    loadMore: query.fetchNextPage,
    refetch: query.refetch,
    isFetchingNextPage: query.isFetchingNextPage,
  };
}

export function usePaymentStats() {
  const { token } = useAuth();

  const fetchStats = async () => {
    if (!token) throw new Error("Not authenticated");
    return fetchWithAuth<PaymentStats>("/admin/payments/payments/stats", token);
  };

  const query = useQuery({
    queryKey: ["paymentStats"],
    queryFn: fetchStats,
    enabled: !!token,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  return {
    stats: query.data || null,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refetch: query.refetch,
  };
}

export function useFailedPayments(params?: { limit?: number }) {
  const { token } = useAuth();
  const limit = params?.limit || 50;

  const fetchFailedPayments = async ({ pageParam }: { pageParam?: string }) => {
    if (!token) throw new Error("Not authenticated");

    const queryParams = new URLSearchParams();
    queryParams.append("limit", limit.toString());
    if (pageParam) queryParams.append("cursor", pageParam);

    const url = `/admin/payments/payments/failed?${queryParams.toString()}`;
    const response = await fetchWithAuth<PaymentsResponse>(url, token);

    return response;
  };

  const query = useInfiniteQuery({
    queryKey: ["failedPayments", limit],
    queryFn: fetchFailedPayments,
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });

  const allPayments = query.data?.pages.flatMap((page) => page.data) || [];

  return {
    payments: allPayments,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    hasMore: query.hasNextPage,
    loadMore: query.fetchNextPage,
    refetch: query.refetch,
    isFetchingNextPage: query.isFetchingNextPage,
  };
}

export function useBusinessPayments(businessId: string) {
  const { token } = useAuth();

  const fetchBusinessPayments = async () => {
    if (!token) throw new Error("Not authenticated");
    if (!businessId) throw new Error("Business ID is required");

    const response = await fetchWithAuth<{
      transactions: {
        id: string;
        amountSent: number;
        amountReceived: number;
        transactionStatus: TransactionStatus;
        paymentStatus: TransactionPaymentStatus;
        transactionType: TransactionType;
        businessId: string;
        invoiceId: string;
        createdAt: string;
      }[];
      stripePayments: Stripe.PaymentIntent[];
    }>(`/admin/payments/${businessId}/payments`, token);

    // Transform transactions to match PaymentTransaction type
    const transactions: PaymentTransaction[] = response.transactions.map(
      (t) => ({
        id: t.id,
        amount: t.amountSent,
        refundAmount: t.amountReceived,
        currency: "USD",
        status: t.transactionStatus,
        paymentStatus: t.paymentStatus,
        type: t.transactionType,
        businessId: t.businessId,
        invoiceId: t.invoiceId,
        createdAt: t.createdAt,
      }),
    );

    return {
      transactions,
      stripePayments: response.stripePayments,
    };
  };

  const query = useQuery({
    queryKey: ["businessPayments", businessId],
    queryFn: fetchBusinessPayments,
    enabled: !!token && !!businessId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  return {
    payments: query.data || null,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refetch: query.refetch,
  };
}
