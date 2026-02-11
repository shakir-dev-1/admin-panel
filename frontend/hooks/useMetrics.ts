/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
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

// Main metrics hook - GET /admin/metrics
export function useMetrics() {
  const { token } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    fetchWithAuth("/admin/metrics", token)
      .then((data: any) => {
        console.log("Metrics data:", data);

        // The backend returns the exact structure we need
        const mapped: DashboardStats = {
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

        setStats(mapped);
        setLoading(false);
        setError(null);
      })
      .catch((err: any) => {
        console.error("Metrics error:", err);
        const errorMessage =
          err?.message || err?.toString() || "Unknown error occurred";
        setError(errorMessage);
        setLoading(false);
      });
  }, [token]);

  return { stats, loading, error };
}

// Business metrics hook - GET /admin/metrics/business
export function useBusinessMetrics() {
  const { token } = useAuth();
  const [metrics, setMetrics] = useState<BusinessMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    fetchWithAuth("/admin/metrics/business", token)
      .then((data: any) => {
        console.log("Business metrics:", data);

        const mapped: BusinessMetrics = {
          totalBusinesses: data.totalBusinesses ?? 0,
          verifiedBusinesses: data.verifiedBusinesses ?? 0,
          businessesWithSubscriptions: data.businessesWithSubscriptions ?? 0,
          businessesWithPayoutInfo: data.businessesWithPayoutInfo ?? 0,
          verificationRate: data.verificationRate ?? 0,
          subscriptionRate: data.subscriptionRate ?? 0,
          payoutInfoRate: data.payoutInfoRate ?? 0,
        };

        setMetrics(mapped);
        setLoading(false);
        setError(null);
      })
      .catch((err: any) => {
        console.error("Business metrics error:", err);
        const errorMessage =
          err?.message || err?.toString() || "Unknown error occurred";
        setError(errorMessage);
        setLoading(false);
      });
  }, [token]);

  return { metrics, loading, error };
}

// Login analytics hook - GET /admin/metrics/logins?days={days}
export function useLoginAnalytics(days: number = 7) {
  const { token } = useAuth();
  const [analytics, setAnalytics] = useState<LoginAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    fetchWithAuth(`/admin/metrics/logins?days=${days}`, token)
      .then((data: any) => {
        console.log("Login analytics:", data);

        setAnalytics({
          loginsByDay: data.loginsByDay ?? [],
          totalLoginsLast7Days: data.totalLoginsLast7Days ?? 0,
        });
        setLoading(false);
        setError(null);
      })
      .catch((err: any) => {
        console.error("Login analytics error:", err);
        const errorMessage =
          err?.message || err?.toString() || "Unknown error occurred";
        setError(errorMessage);
        setLoading(false);
      });
  }, [token, days]);

  return { analytics, loading, error };
}

// All metrics combined hook - GET /admin/metrics/all
export function useAllMetrics() {
  const { token } = useAuth();
  const [metrics, setMetrics] = useState<AllMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    fetchWithAuth("/admin/metrics/all", token)
      .then((data: any) => {
        console.log("All metrics:", data);

        const mapped: AllMetrics = {
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
          },
        };

        setMetrics(mapped);
        setLoading(false);
        setError(null);
      })
      .catch((err: any) => {
        console.error("All metrics error:", err);
        const errorMessage =
          err?.message || err?.toString() || "Unknown error occurred";
        setError(errorMessage);
        setLoading(false);
      });
  }, [token]);

  return { metrics, loading, error };
}

// For backwards compatibility
export default useMetrics;
