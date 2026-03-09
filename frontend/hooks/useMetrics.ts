/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { fetchWithAuth } from "@/lib/api";

// Main dashboard stats type - matches backend response exactly
export type DashboardStats = {
  // Total counts
  totalUsers: number;
  totalConsumers: number;
  totalBusinessUsers: number;
  totalInfluencers: number;

  // Active users
  activeUsers: number;
  activeConsumers: number;
  activeBusinessUsers: number;
  activeInfluencers: number;

  // Inactive/banned
  inactiveUsers: number;
  bannedConsumers: number;

  // Login metrics
  dailyLogins: number;
  dailyConsumerLogins: number;
  dailyBusinessLogins: number;
  dailyInfluencerLogins: number;

  // Never logged in
  neverLoggedIn: number;
  consumersNeverLoggedIn: number;
  businessUsersNeverLoggedIn: number;
  influencersNeverLoggedIn: number;

  // Email confirmation
  emailConfirmed: number;
  consumersEmailConfirmed: number;
  businessUsersEmailConfirmed: number;
  influencersEmailConfirmed: number;

  // 2FA adoption
  twoFactorEnabled: number;
  consumers2FAEnabled: number;
  businessUsers2FAEnabled: number;
  influencers2FAEnabled: number;

  // Distributions
  userTypeDistribution: Array<{ type: string; count: number }>;
  consumerStatusDistribution: Array<{ status: string; count: number }>;
};

// Business metrics type - matches backend response
export type BusinessMetrics = {
  totalBusinesses: number;
  verifiedBusinesses: number;
  businessesWithSubscriptions: number;
  businessesWithPayoutInfo: number;
  verificationRate: number;
  subscriptionRate: number;
  payoutInfoRate: number;
  totalAppointments: number;
  activeAppointments: number;
  completedAppointments: number;
  averageAppointmentsPerBusiness: number;
};

// Login analytics type - matches backend response
export type LoginAnalytics = {
  loginsByDay: Array<{
    date: Date;
    consumer_logins: number;
    business_logins: number;
    influencer_logins: number;
    total_logins: number;
  }>;
  totalLoginsLast7Days: number;
};

// Combined metrics type
export type AllMetrics = DashboardStats & {
  business: BusinessMetrics;
};

// Add query keys for metrics
export const queryKeys = {
  metrics: {
    all: ["metrics"] as const,
    dashboard: () => [...queryKeys.metrics.all, "dashboard"] as const,
    business: () => [...queryKeys.metrics.all, "business"] as const,
    logins: (days: number) =>
      [...queryKeys.metrics.all, "logins", { days }] as const,
    recentUsers: (limit: number) =>
      [...queryKeys.metrics.all, "recent-users", { limit }] as const,
  },
};

const DEFAULT_METRICS_OPTIONS = {
  staleTime: 5 * 60 * 1000, // 5 minutes - metrics don't change that frequently
  gcTime: 30 * 60 * 1000, // 30 minutes cache
  refetchOnWindowFocus: false,
  retry: 1,
  refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes in the background
};

// Helper function to fetch with auth
const fetchWithAuthWrapper = async <T>(
  endpoint: string,
  token: string | null,
): Promise<T> => {
  if (!token) {
    throw new Error("No authentication token");
  }
  return fetchWithAuth<T>(endpoint, token);
};

// Main metrics hook - GET /admin/metrics
export function useMetrics() {
  const { token } = useAuth();

  return useQuery<DashboardStats>({
    queryKey: queryKeys.metrics.dashboard(),
    queryFn: async () => {
      const data = await fetchWithAuthWrapper<any>("/admin/metrics", token);

      return {
        // Total counts
        totalUsers: data.totalUsers ?? 0,
        totalConsumers: data.totalConsumers ?? 0,
        totalBusinessUsers: data.totalBusinessUsers ?? 0,
        totalInfluencers: data.totalInfluencers ?? 0,

        // Active users
        activeUsers: data.activeUsers ?? 0,
        activeConsumers: data.activeConsumers ?? 0,
        activeBusinessUsers: data.activeBusinessUsers ?? 0,
        activeInfluencers: data.activeInfluencers ?? 0,

        // Inactive/banned
        inactiveUsers: data.inactiveUsers ?? 0,
        bannedConsumers: data.bannedConsumers ?? 0,

        // Login metrics
        dailyLogins: data.dailyLogins ?? 0,
        dailyConsumerLogins: data.dailyConsumerLogins ?? 0,
        dailyBusinessLogins: data.dailyBusinessLogins ?? 0,
        dailyInfluencerLogins: data.dailyInfluencerLogins ?? 0,

        // Never logged in
        neverLoggedIn: data.neverLoggedIn ?? 0,
        consumersNeverLoggedIn: data.consumersNeverLoggedIn ?? 0,
        businessUsersNeverLoggedIn: data.businessUsersNeverLoggedIn ?? 0,
        influencersNeverLoggedIn: data.influencersNeverLoggedIn ?? 0,

        // Email confirmation
        emailConfirmed: data.emailConfirmed ?? 0,
        consumersEmailConfirmed: data.consumersEmailConfirmed ?? 0,
        businessUsersEmailConfirmed: data.businessUsersEmailConfirmed ?? 0,
        influencersEmailConfirmed: data.influencersEmailConfirmed ?? 0,

        // 2FA adoption
        twoFactorEnabled: data.twoFactorEnabled ?? 0,
        consumers2FAEnabled: data.consumers2FAEnabled ?? 0,
        businessUsers2FAEnabled: data.businessUsers2FAEnabled ?? 0,
        influencers2FAEnabled: data.influencers2FAEnabled ?? 0,

        // Distributions
        userTypeDistribution: data.userTypeDistribution ?? [],
        consumerStatusDistribution: data.consumerStatusDistribution ?? [],
      };
    },
    enabled: !!token,
    ...DEFAULT_METRICS_OPTIONS,
  });
}

// Business metrics hook - GET /admin/metrics/business
export function useBusinessMetrics() {
  const { token } = useAuth();

  return useQuery<BusinessMetrics>({
    queryKey: queryKeys.metrics.business(),
    queryFn: async () => {
      const data = await fetchWithAuthWrapper<any>(
        "/admin/metrics/business",
        token,
      );

      return {
        totalBusinesses: data.totalBusinesses ?? 0,
        verifiedBusinesses: data.verifiedBusinesses ?? 0,
        businessesWithSubscriptions: data.businessesWithSubscriptions ?? 0,
        businessesWithPayoutInfo: data.businessesWithPayoutInfo ?? 0,
        verificationRate: data.verificationRate ?? 0,
        subscriptionRate: data.subscriptionRate ?? 0,
        payoutInfoRate: data.payoutInfoRate ?? 0,
        totalAppointments: data.totalAppointments ?? 0,
        activeAppointments: data.activeAppointments ?? 0,
        completedAppointments: data.completedAppointments ?? 0,
        averageAppointmentsPerBusiness:
          data.averageAppointmentsPerBusiness ?? 0,
      };
    },
    enabled: !!token,
    ...DEFAULT_METRICS_OPTIONS,
  });
}

// Login analytics hook - GET /admin/metrics/logins?days={days}
export function useLoginAnalytics(days: number = 7) {
  const { token } = useAuth();

  return useQuery<LoginAnalytics>({
    queryKey: queryKeys.metrics.logins(days),
    queryFn: async () => {
      const data = await fetchWithAuthWrapper<any>(
        `/admin/metrics/logins?days=${days}`,
        token,
      );

      return {
        loginsByDay: data.loginsByDay ?? [],
        totalLoginsLast7Days: data.totalLoginsLast7Days ?? 0,
      };
    },
    enabled: !!token,
    ...DEFAULT_METRICS_OPTIONS,
  });
}

// All metrics combined hook - GET /admin/metrics/all
export function useAllMetrics() {
  const { token } = useAuth();

  return useQuery<AllMetrics>({
    queryKey: queryKeys.metrics.all,
    queryFn: async () => {
      const data = await fetchWithAuthWrapper<any>("/admin/metrics/all", token);

      return {
        // Dashboard stats - from the spread of userMetrics
        totalUsers: data.totalUsers ?? 0,
        totalConsumers: data.totalConsumers ?? 0,
        totalBusinessUsers: data.totalBusinessUsers ?? 0,
        totalInfluencers: data.totalInfluencers ?? 0,
        activeUsers: data.activeUsers ?? 0,
        activeConsumers: data.activeConsumers ?? 0,
        activeBusinessUsers: data.activeBusinessUsers ?? 0,
        activeInfluencers: data.activeInfluencers ?? 0,
        inactiveUsers: data.inactiveUsers ?? 0,
        bannedConsumers: data.bannedConsumers ?? 0,
        dailyLogins: data.dailyLogins ?? 0,
        dailyConsumerLogins: data.dailyConsumerLogins ?? 0,
        dailyBusinessLogins: data.dailyBusinessLogins ?? 0,
        dailyInfluencerLogins: data.dailyInfluencerLogins ?? 0,
        neverLoggedIn: data.neverLoggedIn ?? 0,
        consumersNeverLoggedIn: data.consumersNeverLoggedIn ?? 0,
        businessUsersNeverLoggedIn: data.businessUsersNeverLoggedIn ?? 0,
        influencersNeverLoggedIn: data.influencersNeverLoggedIn ?? 0,
        emailConfirmed: data.emailConfirmed ?? 0,
        consumersEmailConfirmed: data.consumersEmailConfirmed ?? 0,
        businessUsersEmailConfirmed: data.businessUsersEmailConfirmed ?? 0,
        influencersEmailConfirmed: data.influencersEmailConfirmed ?? 0,
        twoFactorEnabled: data.twoFactorEnabled ?? 0,
        consumers2FAEnabled: data.consumers2FAEnabled ?? 0,
        businessUsers2FAEnabled: data.businessUsers2FAEnabled ?? 0,
        influencers2FAEnabled: data.influencers2FAEnabled ?? 0,
        userTypeDistribution: data.userTypeDistribution ?? [],
        consumerStatusDistribution: data.consumerStatusDistribution ?? [],

        // Business metrics - nested under business object
        business: {
          totalBusinesses: data.business?.totalBusinesses ?? 0,
          verifiedBusinesses: data.business?.verifiedBusinesses ?? 0,
          businessesWithSubscriptions:
            data.business?.businessesWithSubscriptions ?? 0,
          businessesWithPayoutInfo:
            data.business?.businessesWithPayoutInfo ?? 0,
          verificationRate: data.business?.verificationRate ?? 0,
          subscriptionRate: data.business?.subscriptionRate ?? 0,
          payoutInfoRate: data.business?.payoutInfoRate ?? 0,
          totalAppointments: data.business?.totalAppointments ?? 0,
          activeAppointments: data.business?.activeAppointments ?? 0,
          completedAppointments: data.business?.completedAppointments ?? 0,
          averageAppointmentsPerBusiness:
            data.business?.averageAppointmentsPerBusiness ?? 0,
        },
      };
    },
    enabled: !!token,
    ...DEFAULT_METRICS_OPTIONS,
  });
}

// Optional: Hook to manually invalidate metrics cache
export function useInvalidateMetrics() {
  const queryClient = useQueryClient();

  const invalidateAllMetrics = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.metrics.all });
  };

  const invalidateDashboard = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.metrics.dashboard() });
  };

  const invalidateBusinessMetrics = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.metrics.business() });
  };

  const invalidateLoginAnalytics = (days?: number) => {
    if (days) {
      queryClient.invalidateQueries({
        queryKey: queryKeys.metrics.logins(days),
      });
    } else {
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === "metrics" && query.queryKey[1] === "logins",
      });
    }
  };

  return {
    invalidateAllMetrics,
    invalidateDashboard,
    invalidateBusinessMetrics,
    invalidateLoginAnalytics,
  };
}

// For backwards compatibility
export default useMetrics;
