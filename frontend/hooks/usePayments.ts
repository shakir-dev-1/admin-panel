'use client';

// src/hooks/usePayments.ts
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { fetchWithAuth } from "@/lib/api";

export type PaymentStatus =
  | "succeeded"
  | "requires_payment_method"
  | "canceled"
  | "processing"
  | "requires_action"
  | "requires_capture"
  | "disputed"
  | "refunded";

export interface Payment {
  id: string;
  stripePaymentId: string;
  description: string;
  amount: number;
  refunded?: boolean;
  currency: string;
  status: PaymentStatus;
  userName: string;
  userEmail: string;
  userId: string;
  businessId?: string;
  businessName?: string;
  createdAt: string;
  disputeStatus?: string;
  customerId: string;
}

export interface PaymentStats {
  totalTransactions: number;
  completedRevenue: number;
  totalVolume: number;
  totalRefunded: number;
}

export interface PaymentsResponse {
  data: Payment[];
  hasMore: boolean;
  nextCursor?: string;
}

export function usePayments(params?: {
  limit?: number;
  cursor?: string;
  status?: PaymentStatus | "all";
  search?: string;
}) {
  const { token } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>();

  useEffect(() => {
    if (!token) return;

    const fetchPayments = async () => {
      try {
        setLoading(true);

        const queryParams = new URLSearchParams();
        if (params?.limit) queryParams.append("limit", params.limit.toString());
        if (params?.cursor) queryParams.append("starting_after", params.cursor);

        // Simplify: Remove the '/search' URL unless you implement it on the backend.
        // Stripe Search API has different syntax and rate limits.
        const url = `/admin/business/payments?${queryParams.toString()}`;
        const response = await fetchWithAuth<PaymentsResponse>(url, token);

        console.log("Fetched payments:", response.data);

        setPayments(response.data);
        setHasMore(response.hasMore);
        setNextCursor(response.nextCursor);
        setLoading(false);
      } catch (err: any) {
        console.error("Error fetching payments:", err);
        setError(err.message || "Failed to load payments");
        setLoading(false);
      }
    };

    fetchPayments();
  }, [token, params?.limit, params?.cursor, params?.status, params?.search]);

  const loadMore = async () => {
    if (!token || !nextCursor || loading) return;

    try {
      const queryParams = new URLSearchParams();
      if (params?.limit) queryParams.append("limit", params.limit.toString());
      queryParams.append("starting_after", nextCursor);
      if (params?.status && params.status !== "all") {
        queryParams.append("status", params.status);
      }

      const url = `/admin/business/payments?${queryParams.toString()}`;
      const response = await fetchWithAuth<PaymentsResponse>(url, token);

      setPayments((prev) => [...prev, ...response.data]);
      setHasMore(response.hasMore);
      setNextCursor(response.nextCursor);
    } catch (err: any) {
      console.error("Error loading more payments:", err);
      setError(err.message || "Failed to load more payments");
    }
  };

  return { payments, loading, error, hasMore, loadMore, nextCursor };
}

export function usePaymentStats() {
  const { token } = useAuth();
  const [stats, setStats] = useState<{
    totalTransactions: number;
    completedRevenue: number;
    totalVolume: number;
    totalRefunded: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const fetchStats = async () => {
      try {
        setLoading(true);

        // Fetch recent payments to calculate stats
        const paymentsStats = await fetchWithAuth<PaymentStats>(
          "/admin/business/payments/stats",
          token,
        );

        console.log("Fetched payments stats:", paymentsStats);
        const totalTransactions = paymentsStats.totalTransactions;
        const completedRevenue = paymentsStats.completedRevenue;
        const totalVolume = paymentsStats.totalVolume;
        const totalRefunded = paymentsStats.totalRefunded;

        setStats({
          totalTransactions,
          completedRevenue,
          totalVolume,
          totalRefunded,
        });
        setLoading(false);
      } catch (err: any) {
        console.error("Error fetching payment stats:", err);
        setError(err.message || "Failed to load payment statistics");
        setLoading(false);
      }
    };

    fetchStats();
  }, [token]);

  return { stats, loading, error };
}
