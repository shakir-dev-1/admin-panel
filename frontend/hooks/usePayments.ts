/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

// src/hooks/usePayments.ts
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { fetchWithAuth } from "@/lib/api";
import type Stripe from "stripe";

// ─── Enums ───────────────────────────────────────────────────────────────────

export type TransactionStatus = "CREATED" | "PAID" | "FAILED";
export type TransactionPaymentStatus =
  | "PAID_OUT"
  | "REFUNDED"
  | "UNPAID"
  | "PAID";
export type TransactionType = "PAY_IN" | "PAY_OUT";
export type SubscriptionStatus = "ACTIVE" | "INACTIVE" | "TRIAL" | "CANCELLED";
export type BillingCycle = "YEAR" | "MONTH";
export type PaymentStatus =
  | "PAID"
  | "PREPAID"
  | "UNPAID"
  | "FAILED"
  | "REFUNDED";
export type PaymentMethod = "CASH" | "ONLINE";
export type AddOnType = "EMPLOYEE" | "LOCATION";
export type AddOnStatus = "PENDING" | "SUCCESS" | "FAILED";
export type SubscriptionEventType =
  | "CREATED"
  | "UPGRADED"
  | "DOWNGRADED"
  | "RENEWED"
  | "CANCELLED";
export type BusinessUserPaymentType = "all" | "subscription" | "addon";

// ─── Shared ───────────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  hasMore: boolean;
  nextCursor?: string;
}

// ─── Consumer Payments ────────────────────────────────────────────────────────
// Payments made by end-users (consumers) when booking appointments.
// Flow: User → BusinessClient → Appointment → Invoice → Transaction

export interface ConsumerPayment {
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
  stripePaymentIntentId: string;
  // Consumer identity
  userId?: string;
  consumerEmail?: string;
  consumerName?: string;
  consumerPhone?: string;
  consumerUsername?: string;
  // Appointment context
  serviceName?: string;
  packageName?: string;
  appointmentStart?: string;
  createdAt: string;
}

export interface ConsumerPaymentStats {
  totalTransactions: number;
  totalVolume: number;
  completedRevenue: number;
  completedCount: number;
  totalRefunded: number;
  refundedCount: number;
  failedTransactions: number;
  byPaymentStatus: Array<{
    paymentStatus: TransactionPaymentStatus;
    _count: number;
    _sum: { amountSent: number | null };
  }>;
  byMethod: Array<{
    paymentMethod: PaymentMethod;
    _count: number;
    _sum: { amountDue: number | null; amountPaid: number | null };
  }>;
}

export interface CreateSubscriptionParams {
  businessId: string;
  subscriptionId: string;
  billingCycle: BillingCycle;
  startDate?: string;
  trialPeriodDays?: number;
  stripeCustomerId?: string;
  stripePaymentMethodId?: string;
}

export interface CreateSubscriptionResponse {
  success: boolean;
  message: string;
  subscription: {
    id: string;
    businessId: string;
    planId: string;
    planName: string;
    status: string;
    billingCycle: BillingCycle;
    startDate: string | null;
    endDate: string | null;
    stripeSubscriptionId: string | null;
    amount: number;
    currency: string;
  };
  stripeData?: any;
}

// ─── BusinessUser Payments ────────────────────────────────────────────────────
// Payments made BY a business TO the platform (subscriptions + add-ons).

export interface BusinessUserPayment {
  id: string;
  entryType: "subscription" | "addon";
  businessId: string;
  businessName: string;
  businessUserEmail: string | null;
  businessUserName: string | null;
  businessUserPhone: string | null;
  businessUserId: string | null;
  description: string;
  amount: number | null;
  currency: string;
  status: string;
  billingCycle?: string;
  paymentStatus?: string | null;
  createdAt: string;
}

export interface BusinessUserPaymentStats {
  subscriptions: {
    total: number;
    byStatus: Array<{ status: SubscriptionStatus; _count: number }>;
  };
  addOns: {
    total: number;
    totalRevenue: number;
    byStatus: Array<{
      status: AddOnStatus;
      _count: number;
      _sum: { price: number | null };
    }>;
    byType: Array<{
      type: AddOnType;
      _count: number;
      _sum: { price: number | null };
    }>;
  };
}

// ─── Legacy / shared types ────────────────────────────────────────────────────

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

export type PaymentsResponse = PaginatedResponse<PaymentTransaction>;

export interface FailedPaymentTransaction {
  id: string;
  amount: number;
  businessId: string;
  businessName?: string;
  invoiceId: string;
  clientName?: string;
  error: string;
  createdAt: string;
}

export interface RefundedTransaction {
  id: string;
  amount: number;
  refundAmount: number;
  businessId: string;
  businessName?: string;
  status: TransactionStatus;
  payerType: "consumer" | "walk_in";
  clientName?: string;
  consumerEmail?: string;
  createdAt: string;
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export interface SubscriptionStat {
  status: SubscriptionStatus;
  _count: number;
}
export interface AddOnStat {
  status: AddOnStatus;
  _count: number;
  _sum: { price: number | null };
}
export interface InvoiceMethodStat {
  paymentMethod: PaymentMethod;
  _count: number;
  _sum: { amountDue: number | null; amountPaid: number | null };
}

export interface PaymentStats {
  totalTransactions: number;
  completedRevenue: number;
  totalVolume: number;
  totalRefunded: number;
  failedTransactions: number;
  subscriptionStats: SubscriptionStat[];
  addOnStats: AddOnStat[];
  invoiceStats: InvoiceMethodStat[];
}

export interface InvoiceByStatus {
  paymentStatus: PaymentStatus;
  _count: number;
  _sum: { amountDue: number | null };
}
export interface InvoiceStats {
  totalInvoices: number;
  totalAmountDue: number;
  totalAmountPaid: number;
  totalTips: number;
  paidCount: number;
  paidAmount: number;
  byStatus: InvoiceByStatus[];
}

export interface Invoice {
  id: string;
  appointmentId: string;
  stripePaymentIntentId?: string;
  businessId: string;
  amountPaid?: number;
  amountDue: number;
  tip?: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  prePayment: number;
  createdAt: string;
  updatedAt: string;
  appointment?: {
    id: string;
    status: string;
    start: string;
    end: string;
    client: {
      id: string;
      fullName: string;
      phoneNumber: string;
      email: string;
    };
    businessService?: { id: string; price: number };
    businessPackage?: { id: string; title: string };
  };
  transactions?: PaymentTransaction[];
  business?: { id: string; name: string; stripeAccountId?: string };
}

export interface SubscriptionPlan {
  id: string;
  title: string;
  prices: unknown;
  country: string;
  features: unknown;
  trialPeriodDays?: number;
  createdAt: string;
  updatedAt: string;
  businessSubscriptions: Array<{
    id: string;
    status: SubscriptionStatus;
    billingCycle: BillingCycle;
  }>;
}

export interface SubscriptionHistoryEntry {
  id: string;
  businessSubscriptionId: string;
  subscriptionId: string;
  eventType: SubscriptionEventType;
  oldPlanId?: string;
  newPlanId?: string;
  amount?: number;
  currency?: string;
  startDate?: string;
  endDate?: string;
  createdAt: string;
}

export interface BusinessSubscription {
  id: string;
  businessId: string;
  subscriptionId: string;
  customerTransactionId: string;
  startDate?: string;
  endDate?: string;
  billingCycle: BillingCycle;
  status: SubscriptionStatus;
  paymentStatus?: PaymentStatus;
  isTrialUsed?: boolean;
  cancelAtPeriodEnd?: boolean;
  canceledDate?: string;
  orderId?: string;
  createdAt: string;
  updatedAt: string;
  subscription?: { id: string; title: string };
  business?: {
    id: string;
    name: string;
    stripeAccountId?: string;
    members?: Array<{
      businessUser: {
        id: string;
        email: string;
        fullName?: string;
        phoneNumber?: string;
      };
    }>;
  };
  history: SubscriptionHistoryEntry[];
}

export interface Bank {
  id: string;
  bankName: string;
  bankCode: string;
}
export interface BusinessPayoutInfo {
  id: string;
  businessId: string;
  accountTitle: string;
  countryCode: string;
  msisdn: string;
  cnic: string;
  accountNumber: string;
  bank: Bank;
  business?: { id: string; name: string };
}

export interface BusinessAddOn {
  id: string;
  businessId: string;
  purchaseById: string;
  type: AddOnType;
  status: AddOnStatus;
  transactionId?: string;
  resourceId?: string;
  price: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  business?: { id: string; name: string };
  purchaseBy?: {
    id: string;
    businessUser: { id: string; email: string; fullName?: string };
  };
}

export interface CreateSubscriptionParams {
  businessId: string;
  subscriptionId: string;
  billingCycle: BillingCycle;
  startDate?: string;
  trialPeriodDays?: number;
  stripeCustomerId?: string;
  stripePaymentMethodId?: string;
}

export interface CreateCheckoutSessionParams {
  businessId: string;
  subscriptionId: string;
  billingCycle: BillingCycle;
  successUrl: string;
  cancelUrl: string;
}

// ─── Hooks: Consumer Payments ─────────────────────────────────────────────────

export function useConsumerPayments() {
  const { token } = useAuth();

  const query = useQuery({
    queryKey: ["consumerPayments", "all"],
    queryFn: async () => {
      if (!token) throw new Error("Not authenticated");

      // console.log("Fetching all consumer payments");

      // Fetch first page
      const firstPage = await fetchWithAuth<PaginatedResponse<ConsumerPayment>>(
        `/admin/payments/consumer-payments?limit=100`,
        token,
      );

      let allData = [...firstPage.data];
      let nextCursor = firstPage.nextCursor;

      // Fetch remaining pages
      while (nextCursor) {
        const nextPage = await fetchWithAuth<
          PaginatedResponse<ConsumerPayment>
        >(
          `/admin/payments/consumer-payments?limit=100&cursor=${nextCursor}`,
          token,
        );
        allData = [...allData, ...nextPage.data];
        nextCursor = nextPage.nextCursor;
      }

      // console.log(`Fetched ${allData.length} consumer payments`);
      return allData;
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  return {
    payments: query.data ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
  };
}

export function useConsumerPaymentStats() {
  const { token } = useAuth();

  const query = useQuery({
    queryKey: ["consumerPaymentStats"],
    queryFn: () => {
      if (!token) throw new Error("Not authenticated");
      return fetchWithAuth<ConsumerPaymentStats>(
        "/admin/payments/consumer-payments/stats",
        token,
      );
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  return {
    stats: query.data ?? null,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refetch: query.refetch,
  };
}

// ─── Hooks: BusinessUser Payments ─────────────────────────────────────────────

export function useBusinessUserPayments(params?: {
  limit?: number;
  type?: BusinessUserPaymentType;
}) {
  const { token } = useAuth();
  const { limit = 50, type = "all" } = params ?? {};

  const query = useInfiniteQuery({
    queryKey: ["businessUserPayments", limit, type],
    queryFn: async ({ pageParam }: { pageParam?: string }) => {
      if (!token) throw new Error("Not authenticated");
      const qs = new URLSearchParams({ limit: limit.toString(), type });
      if (pageParam) qs.append("cursor", pageParam);
      return fetchWithAuth<PaginatedResponse<BusinessUserPayment>>(
        `/admin/payments/business-user-payments?${qs}`,
        token,
      );
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });

  return {
    payments: query.data?.pages.flatMap((p) => p.data) ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    hasMore: query.hasNextPage,
    loadMore: query.fetchNextPage,
    refetch: query.refetch,
    isFetchingNextPage: query.isFetchingNextPage,
  };
}

export function useBusinessUserPaymentStats() {
  const { token } = useAuth();

  const query = useQuery({
    queryKey: ["businessUserPaymentStats"],
    queryFn: () => {
      if (!token) throw new Error("Not authenticated");
      return fetchWithAuth<BusinessUserPaymentStats>(
        "/admin/payments/business-user-payments/stats",
        token,
      );
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  return {
    stats: query.data ?? null,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refetch: query.refetch,
  };
}

// ─── Hooks: Legacy Transactions ───────────────────────────────────────────────

export function usePayments(params?: { limit?: number }) {
  const { token } = useAuth();
  const limit = params?.limit ?? 50;

  const query = useInfiniteQuery({
    queryKey: ["payments", limit],
    queryFn: async ({ pageParam }: { pageParam?: string }) => {
      if (!token) throw new Error("Not authenticated");
      const qs = new URLSearchParams({ limit: limit.toString() });
      if (pageParam) qs.append("cursor", pageParam);
      return fetchWithAuth<PaymentsResponse>(
        `/admin/payments/payments?${qs}`,
        token,
      );
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });

  return {
    payments: query.data?.pages.flatMap((p) => p.data) ?? [],
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

  const query = useQuery({
    queryKey: ["paymentStats"],
    queryFn: () => {
      if (!token) throw new Error("Not authenticated");
      return fetchWithAuth<PaymentStats>(
        "/admin/payments/payments/stats",
        token,
      );
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  return {
    stats: query.data ?? null,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refetch: query.refetch,
  };
}

export function useFailedPayments(params?: { limit?: number }) {
  const { token } = useAuth();
  const limit = params?.limit ?? 50;

  const query = useInfiniteQuery({
    queryKey: ["failedPayments", limit],
    queryFn: async ({ pageParam }: { pageParam?: string }) => {
      if (!token) throw new Error("Not authenticated");
      const qs = new URLSearchParams({ limit: limit.toString() });
      if (pageParam) qs.append("cursor", pageParam);
      return fetchWithAuth<PaginatedResponse<FailedPaymentTransaction>>(
        `/admin/payments/payments/failed?${qs}`,
        token,
      );
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });

  return {
    payments: query.data?.pages.flatMap((p) => p.data) ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    hasMore: query.hasNextPage,
    loadMore: query.fetchNextPage,
    refetch: query.refetch,
    isFetchingNextPage: query.isFetchingNextPage,
  };
}

export function useAllRefunds(params?: { limit?: number }) {
  const { token } = useAuth();
  const limit = params?.limit ?? 50;

  const query = useInfiniteQuery({
    queryKey: ["refunds", limit],
    queryFn: async ({ pageParam }: { pageParam?: string }) => {
      if (!token) throw new Error("Not authenticated");
      const qs = new URLSearchParams({ limit: limit.toString() });
      if (pageParam) qs.append("cursor", pageParam);
      return fetchWithAuth<PaginatedResponse<RefundedTransaction>>(
        `/admin/payments/refunds?${qs}`,
        token,
      );
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });

  return {
    refunds: query.data?.pages.flatMap((p) => p.data) ?? [],
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

  const query = useQuery({
    queryKey: ["businessPayments", businessId],
    queryFn: async () => {
      if (!token) throw new Error("Not authenticated");
      if (!businessId) throw new Error("Business ID is required");

      const response = await fetchWithAuth<{
        transactions: Array<{
          id: string;
          amountSent: number;
          amountReceived: number;
          transactionStatus: TransactionStatus;
          paymentStatus: TransactionPaymentStatus;
          transactionType: TransactionType;
          businessId: string;
          invoiceId: string;
          createdAt: string;
        }>;
        stripePayments: Stripe.PaymentIntent[];
      }>(`/admin/payments/${businessId}/payments`, token);

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

      return { transactions, stripePayments: response.stripePayments };
    },
    enabled: !!token && !!businessId,
    staleTime: 2 * 60 * 1000,
  });

  return {
    payments: query.data ?? null,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refetch: query.refetch,
  };
}

// ─── Hooks: Subscriptions ─────────────────────────────────────────────────────

export function useSubscriptionPlans() {
  const { token } = useAuth();

  const query = useQuery({
    queryKey: ["subscriptionPlans"],
    queryFn: () => {
      if (!token) throw new Error("Not authenticated");
      return fetchWithAuth<SubscriptionPlan[]>(
        "/admin/payments/subscription-plans",
        token,
      );
    },
    enabled: !!token,
    staleTime: 10 * 60 * 1000,
  });

  return {
    plans: query.data ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refetch: query.refetch,
  };
}

export function useAllBusinessSubscriptions(params?: {
  status?: SubscriptionStatus;
  billingCycle?: BillingCycle;
}) {
  const { token } = useAuth();
  const { status, billingCycle } = params ?? {};

  const query = useQuery({
    queryKey: ["businessSubscriptions", "all"], // Fixed key to cache all data together
    queryFn: async () => {
      if (!token) throw new Error("Not authenticated");

      // Build query params for initial fetch
      const qs = new URLSearchParams();
      if (status) qs.append("status", status);
      if (billingCycle) qs.append("billingCycle", billingCycle);

      // console.log("Fetching all subscriptions with filters:", {
      //   status,
      //   billingCycle,
      // });

      // Fetch first page to get total count
      const firstPage = await fetchWithAuth<
        PaginatedResponse<BusinessSubscription>
      >(
        `/admin/payments/subscriptions?limit=100${qs.toString() ? `&${qs.toString()}` : ""}`,
        token,
      );

      let allData = [...firstPage.data];
      let nextCursor = firstPage.nextCursor;

      // Fetch remaining pages
      while (nextCursor) {
        const nextPage = await fetchWithAuth<
          PaginatedResponse<BusinessSubscription>
        >(
          `/admin/payments/subscriptions?limit=100&cursor=${nextCursor}${qs.toString() ? `&${qs.toString()}` : ""}`,
          token,
        );
        allData = [...allData, ...nextPage.data];
        nextCursor = nextPage.nextCursor;
      }

      return allData;
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes (formerly cacheTime)
  });

  return {
    subscriptions: query.data ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
  };
}

export function useSubscriptionHistory(businessSubscriptionId: string) {
  const { token } = useAuth();

  const query = useQuery({
    queryKey: ["subscriptionHistory", businessSubscriptionId],
    queryFn: () => {
      if (!token) throw new Error("Not authenticated");
      return fetchWithAuth<BusinessSubscription>(
        `/admin/payments/subscriptions/${businessSubscriptionId}/history`,
        token,
      );
    },
    enabled: !!token && !!businessSubscriptionId,
    staleTime: 5 * 60 * 1000,
  });

  return {
    record: query.data ?? null,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refetch: query.refetch,
  };
}

// ─── Hooks: Invoices ──────────────────────────────────────────────────────────

export function useInvoiceStats(businessId?: string) {
  const { token } = useAuth();
  const url = businessId
    ? `/admin/payments/${businessId}/invoices/stats`
    : "/admin/payments/invoices/stats";

  const query = useQuery({
    queryKey: ["invoiceStats", businessId ?? "global"],
    queryFn: () => {
      if (!token) throw new Error("Not authenticated");
      return fetchWithAuth<InvoiceStats>(url, token);
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });

  return {
    stats: query.data ?? null,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refetch: query.refetch,
  };
}

export function useBusinessInvoices(
  businessId: string,
  params?: { limit?: number; paymentStatus?: PaymentStatus },
) {
  const { token } = useAuth();
  const { limit = 50, paymentStatus } = params ?? {};

  const query = useInfiniteQuery({
    queryKey: ["businessInvoices", businessId, limit, paymentStatus],
    queryFn: async ({ pageParam }: { pageParam?: string }) => {
      if (!token) throw new Error("Not authenticated");
      const qs = new URLSearchParams({ limit: limit.toString() });
      if (pageParam) qs.append("cursor", pageParam);
      if (paymentStatus) qs.append("paymentStatus", paymentStatus);
      return fetchWithAuth<PaginatedResponse<Invoice>>(
        `/admin/payments/${businessId}/invoices?${qs}`,
        token,
      );
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!token && !!businessId,
    staleTime: 3 * 60 * 1000,
  });

  return {
    invoices: query.data?.pages.flatMap((p) => p.data) ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    hasMore: query.hasNextPage,
    loadMore: query.fetchNextPage,
    refetch: query.refetch,
    isFetchingNextPage: query.isFetchingNextPage,
  };
}

export function useInvoice(invoiceId: string) {
  const { token } = useAuth();

  const query = useQuery({
    queryKey: ["invoice", invoiceId],
    queryFn: () => {
      if (!token) throw new Error("Not authenticated");
      return fetchWithAuth<Invoice>(
        `/admin/payments/invoices/${invoiceId}`,
        token,
      );
    },
    enabled: !!token && !!invoiceId,
    staleTime: 5 * 60 * 1000,
  });

  return {
    invoice: query.data ?? null,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refetch: query.refetch,
  };
}

// ─── Hooks: Payout Info ───────────────────────────────────────────────────────

export function useAllPayoutInfo(params?: { limit?: number }) {
  const { token } = useAuth();
  const limit = params?.limit ?? 50;

  const query = useInfiniteQuery({
    queryKey: ["payoutInfo", limit],
    queryFn: async ({ pageParam }: { pageParam?: string }) => {
      if (!token) throw new Error("Not authenticated");
      const qs = new URLSearchParams({ limit: limit.toString() });
      if (pageParam) qs.append("cursor", pageParam);
      return fetchWithAuth<PaginatedResponse<BusinessPayoutInfo>>(
        `/admin/payments/payout-info?${qs}`,
        token,
      );
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!token,
    staleTime: 10 * 60 * 1000,
  });

  return {
    payoutInfo: query.data?.pages.flatMap((p) => p.data) ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    hasMore: query.hasNextPage,
    loadMore: query.fetchNextPage,
    refetch: query.refetch,
    isFetchingNextPage: query.isFetchingNextPage,
  };
}

export function useBusinessPayoutInfo(businessId: string) {
  const { token } = useAuth();

  const query = useQuery({
    queryKey: ["businessPayoutInfo", businessId],
    queryFn: () => {
      if (!token) throw new Error("Not authenticated");
      return fetchWithAuth<BusinessPayoutInfo>(
        `/admin/payments/${businessId}/payout-info`,
        token,
      );
    },
    enabled: !!token && !!businessId,
    staleTime: 10 * 60 * 1000,
  });

  return {
    payoutInfo: query.data ?? null,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refetch: query.refetch,
  };
}

export function useBanks() {
  const { token } = useAuth();

  const query = useQuery({
    queryKey: ["banks"],
    queryFn: () => {
      if (!token) throw new Error("Not authenticated");
      return fetchWithAuth<Bank[]>("/admin/payments/banks", token);
    },
    enabled: !!token,
    staleTime: 30 * 60 * 1000,
  });

  return {
    banks: query.data ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
  };
}

// ─── Hooks: Add-Ons ───────────────────────────────────────────────────────────

export function useAllAddOns(params?: { limit?: number }) {
  const { token } = useAuth();
  const limit = params?.limit ?? 50;

  const query = useInfiniteQuery({
    queryKey: ["addOns", limit],
    queryFn: async ({ pageParam }: { pageParam?: string }) => {
      if (!token) throw new Error("Not authenticated");
      const qs = new URLSearchParams({ limit: limit.toString() });
      if (pageParam) qs.append("cursor", pageParam);
      return fetchWithAuth<PaginatedResponse<BusinessAddOn>>(
        `/admin/payments/add-ons?${qs}`,
        token,
      );
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });

  return {
    addOns: query.data?.pages.flatMap((p) => p.data) ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    hasMore: query.hasNextPage,
    loadMore: query.fetchNextPage,
    refetch: query.refetch,
    isFetchingNextPage: query.isFetchingNextPage,
  };
}

export function useBusinessAddOns(businessId: string) {
  const { token } = useAuth();

  const query = useQuery({
    queryKey: ["businessAddOns", businessId],
    queryFn: () => {
      if (!token) throw new Error("Not authenticated");
      return fetchWithAuth<BusinessAddOn[]>(
        `/admin/payments/${businessId}/add-ons`,
        token,
      );
    },
    enabled: !!token && !!businessId,
    staleTime: 5 * 60 * 1000,
  });

  return {
    addOns: query.data ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refetch: query.refetch,
  };
}

export function useCreateSubscription() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateSubscriptionParams) => {
      if (!token) throw new Error("No authentication token");

      const response = await fetchWithAuth<CreateSubscriptionResponse>(
        "/admin/payments/subscriptions/create",
        token,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(params),
        },
      );

      return response;
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: ["businessSubscriptions", "all"],
      });
      queryClient.invalidateQueries({
        queryKey: ["businessUserPayments"],
      });
      queryClient.invalidateQueries({
        queryKey: ["business", variables.businessId],
      });
      queryClient.invalidateQueries({
        queryKey: ["subscriptionPlans"],
      });

      // Show success message (optional - can be handled in component)
      console.log("Subscription created successfully:", data.message);
    },
    onError: (error) => {
      console.error("Failed to create subscription:", error);
    },
  });
}

// Add this for checkout session creation
export interface CreateCheckoutSessionParams {
  businessId: string;
  subscriptionId: string;
  billingCycle: BillingCycle;
  successUrl: string;
  cancelUrl: string;
}

export interface CreateCheckoutSessionResponse {
  success: boolean;
  sessionId: string;
  url: string;
}

export function useCreateCheckoutSession() {
  const { token } = useAuth();

  return useMutation({
    mutationFn: async (params: CreateCheckoutSessionParams) => {
      if (!token) throw new Error("No authentication token");

      const response = await fetchWithAuth<CreateCheckoutSessionResponse>(
        "/admin/payments/subscriptions/checkout-session",
        token,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(params),
        },
      );

      return response;
    },
    onError: (error) => {
      console.error("Failed to create checkout session:", error);
    },
  });
}
