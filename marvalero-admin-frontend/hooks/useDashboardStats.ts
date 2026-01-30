'use client';

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { fetchWithAuth } from "@/lib/api";

type DashboardStats = {
  totalUsers: number;
  businessUsers: number;
  consumerUsers: number;
  influencerUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  dailyLogins: number;
};

export function useDashboardStats() {
  const { token } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    setLoading(true);

    fetchWithAuth("/admin/metrics", token)
      .then((data: any) => {
        console.log("data: ", data);
        // Map backend response to DashboardStats
        const mapped: DashboardStats = {
          totalUsers: data.totalUsers ?? 0,
          businessUsers: data.businessUsers ?? 0,
          consumerUsers: data.consumerUsers ?? 0,
          influencerUsers: data.influencerUsers ?? 0,
          activeUsers: data.activeUsers ?? 0,
          inactiveUsers: data.inactiveUsers ?? 0,
          dailyLogins: data.dailyLogins ?? 0,
        };

        setStats(mapped);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  }, [token]);

  return { stats, loading, error };
}
