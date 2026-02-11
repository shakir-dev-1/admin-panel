/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

// src/hooks/useUsers.ts
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { fetchWithAuth } from "@/lib/api";

export type User = {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  userType: "consumer" | "business" | "influencer";
  status: "ACTIVE" | "DISABLED";
  lastLoginAt: string | null;
  createdAt: string;
  businessName: string | null;
};

export type BusinessUser = {
  id: string;
  email: string;
  username: string | null;
  phoneNumber: string | null;
  fullName: string | null;
  userType: string;
  status: string;
  agreementAccepted: boolean;
  businesses: Array<{
    id: string;
    name: string;
  }>;
  createdAt: string;
  lastLoginAt: string;
};

export type PaginatedBusinessUserResponse = {
  data: BusinessUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type BusinessUserFilterParams = {
  page?: number;
  limit?: number;
  search?: string;
  userType?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

export type Influencer = {
  id: string;
  name: string;
  email: string;
  username: string | null;
  phoneNumber: string | null;
  status: "ACTIVE" | "INACTIVE";
  twoFactorEnabled: boolean;
  lastLoginAt: string | null;
  lastLoginDevice: string | null;
  lastLoginIp: string | null;
  lastLoginLocation: string | null;
  createdAt: string;
  updatedAt: string;
  campaignStats: {
    totalOffers: number;
    acceptedOffers: number;
    pendingOffers: number;
    rejectedOffers: number;
  };
  userType: "influencer";
};

export type PaginatedInfluencerResponse = {
  data: Influencer[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type InfluencerFilterParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: "ACTIVE" | "INACTIVE";
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

export type CampaignOffer = {
  id: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "COUNTERED";
  createdAt: string;
  updatedAt: string;
  business: {
    id: string;
    name: string;
    city: string;
    country: string;
  };
  campaign: {
    id: string;
    name: string;
    createdAt: string;
  };
};

export type InfluencerDetails = Influencer & {
  twoFactorType: string | null;
  campaignOffers: CampaignOffer[];
  recentLoginSessions: Array<{
    lastLogin: string;
    device: string;
    userAgent: string;
    ipAddress: string;
    location: string;
    coordinates: { latitude: number; longitude: number } | null;
    timezone: string;
    region: string;
  }>;
  campaignStats: {
    totalOffers: number;
    acceptedOffers: number;
    pendingOffers: number;
    rejectedOffers: number;
    counteredOffers: number;
    acceptanceRate: number;
  };
};

export function useUsers() {
  const { token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(() => !token);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    // setLoading(true);
    fetchWithAuth<User[]>(`/admin/users/all`, token)
      .then((data) => {
        setUsers(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching users:", err);
        setError(err.message);
        setLoading(false);
      });
  }, [token]);

  return { users, loading, error };
}

export function useRecentUsers(limit = 5) {
  const { token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(() => !token);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    // setLoading(true);
    fetchWithAuth<User[]>(`/admin/users/recent?limit=${limit}`, token)
      .then((data) => {
        setUsers(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  }, [token, limit]);

  return { users, loading, error };
}

// Hook for fetching business users
export function useBusinessUsers() {
  const { token } = useAuth();
  const [businessUsers, setBusinessUsers] = useState<BusinessUser[]>([]);
  const [loading, setLoading] = useState(() => !token);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      // setLoading(false);
      return;
    }

    // setLoading(true);
    fetchWithAuth<BusinessUser[]>(`/admin/business/users`, token)
      .then((data) => {
        setBusinessUsers(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching business users:", err);
        setError(err.message);
        setLoading(false);
      });
  }, [token]);

  return { businessUsers, loading, error };
}

// Hook for paginated business users with filters
export function usePaginatedBusinessUsers(params?: BusinessUserFilterParams) {
  const { token } = useAuth();
  const [data, setData] = useState<PaginatedBusinessUserResponse>({
    data: [],
    pagination: {
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
    },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBusinessUsers = useCallback(
    async (fetchParams?: BusinessUserFilterParams) => {
      if (!token) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Build query string
        const queryParams = new URLSearchParams();

        if (fetchParams?.page)
          queryParams.append("page", fetchParams.page.toString());
        if (fetchParams?.limit)
          queryParams.append("limit", fetchParams.limit.toString());
        if (fetchParams?.search)
          queryParams.append("search", fetchParams.search);
        if (fetchParams?.userType)
          queryParams.append("type", fetchParams.userType);
        if (fetchParams?.sortBy)
          queryParams.append("sortBy", fetchParams.sortBy);
        if (fetchParams?.sortOrder)
          queryParams.append("sortOrder", fetchParams.sortOrder);

        const queryString = queryParams.toString();
        const url = `/admin/business/users/list${queryString ? `?${queryString}` : ""}`;

        const result = await fetchWithAuth<PaginatedBusinessUserResponse>(
          url,
          token,
        );
        setData(result);
        setError(null);
      } catch (err: any) {
        console.error("Error fetching paginated business users:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    fetchBusinessUsers(params);
  }, [fetchBusinessUsers, params]);

  const refetch = (newParams?: BusinessUserFilterParams) => {
    return fetchBusinessUsers(newParams || params);
  };

  return {
    data: data.data,
    pagination: data.pagination,
    loading,
    error,
    refetch,
    total: data.pagination.total,
    totalPages: data.pagination.totalPages,
  };
}

// Hook for single business user
export function useBusinessUserById(userId: string) {
  const { token } = useAuth();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(() => !token);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !userId) {
      // setLoading(false);
      return;
    }

    // setLoading(true);
    fetchWithAuth(`/admin/business/users/${userId}`, token)
      .then((data) => {
        setUser(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching business user:", err);
        setError(err.message);
        setLoading(false);
      });
  }, [token, userId]);

  return { user, loading, error };
}

export function useInfluencers() {
  const { token } = useAuth();
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [loading, setLoading] = useState(() => !token);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      // setLoading(false);
      return;
    }

    // setLoading(true);
    fetchWithAuth<Influencer[]>(`/admin/influencers/all`, token)
      .then((data) => {
        setInfluencers(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching influencers:", err);
        setError(err.message);
        setLoading(false);
      });
  }, [token]);

  return { influencers, loading, error };
}

// Hook for recent influencers
export function useRecentInfluencers(limit = 5) {
  const { token } = useAuth();
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [loading, setLoading] = useState(() => !token);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      // setLoading(false);
      return;
    }

    // setLoading(true);
    fetchWithAuth<Influencer[]>(
      `/admin/influencers/recent?limit=${limit}`,
      token,
    )
      .then((data) => {
        setInfluencers(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching recent influencers:", err);
        setError(err.message);
        setLoading(false);
      });
  }, [token, limit]);

  return { influencers, loading, error };
}

// Hook for paginated influencers with filters
export function usePaginatedInfluencers(params?: InfluencerFilterParams) {
  const { token } = useAuth();
  const [data, setData] = useState<PaginatedInfluencerResponse>({
    data: [],
    pagination: {
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
    },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInfluencers = useCallback(
    async (fetchParams?: InfluencerFilterParams) => {
      if (!token) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Build query string
        const queryParams = new URLSearchParams();

        if (fetchParams?.page)
          queryParams.append("page", fetchParams.page.toString());
        if (fetchParams?.limit)
          queryParams.append("limit", fetchParams.limit.toString());
        if (fetchParams?.search)
          queryParams.append("search", fetchParams.search);
        if (fetchParams?.status)
          queryParams.append("status", fetchParams.status);
        if (fetchParams?.sortBy)
          queryParams.append("sortBy", fetchParams.sortBy);
        if (fetchParams?.sortOrder)
          queryParams.append("sortOrder", fetchParams.sortOrder);

        const queryString = queryParams.toString();
        const url = `/admin/influencers${queryString ? `?${queryString}` : ""}`;

        const result = await fetchWithAuth<PaginatedInfluencerResponse>(
          url,
          token,
        );
        setData(result);
        setError(null);
      } catch (err: any) {
        console.error("Error fetching paginated influencers:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    fetchInfluencers(params);
  }, [fetchInfluencers, params]);

  const refetch = (newParams?: InfluencerFilterParams) => {
    return fetchInfluencers(newParams || params);
  };

  return {
    data: data.data,
    pagination: data.pagination,
    loading,
    error,
    refetch,
    total: data.pagination.total,
    totalPages: data.pagination.totalPages,
  };
}

// Hook for single influencer
export function useInfluencerById(influencerId: string) {
  const { token } = useAuth();
  const [influencer, setInfluencer] = useState<InfluencerDetails | null>(null);
  const [loading, setLoading] = useState(() => !token);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !influencerId) {
      // setLoading(false);
      return;
    }

    // setLoading(true);
    fetchWithAuth<InfluencerDetails>(
      `/admin/influencers/${influencerId}`,
      token,
    )
      .then((data) => {
        setInfluencer(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching influencer:", err);
        setError(err.message);
        setLoading(false);
      });
  }, [token, influencerId]);

  return { influencer, loading, error };
}

// Hook for influencer login history
export function useInfluencerLoginHistory(influencerId: string, limit = 10) {
  const { token } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(() => !token);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !influencerId) {
      // setLoading(false);
      return;
    }

    // setLoading(true);
    fetchWithAuth<any[]>(
      `/admin/influencers/${influencerId}/login-history?limit=${limit}`,
      token,
    )
      .then((data) => {
        setSessions(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching influencer login history:", err);
        setError(err.message);
        setLoading(false);
      });
  }, [token, influencerId, limit]);

  return { sessions, loading, error };
}

// Hook for influencer campaign offers
export function useInfluencerCampaignOffers(
  influencerId: string,
  params?: {
    page?: number;
    limit?: number;
    status?: string;
  },
) {
  const { token } = useAuth();
  const [data, setData] = useState<{
    data: CampaignOffer[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>({
    data: [],
    pagination: {
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
    },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOffers = useCallback(
    async (fetchParams?: typeof params) => {
      if (!token || !influencerId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const queryParams = new URLSearchParams();

        if (fetchParams?.page)
          queryParams.append("page", fetchParams.page.toString());
        if (fetchParams?.limit)
          queryParams.append("limit", fetchParams.limit.toString());
        if (fetchParams?.status)
          queryParams.append("status", fetchParams.status);

        const queryString = queryParams.toString();
        const url = `/admin/influencers/${influencerId}/campaign-offers${queryString ? `?${queryString}` : ""}`;

        const result = await fetchWithAuth<typeof data>(url, token);
        setData(result);
        setError(null);
      } catch (err: any) {
        console.error("Error fetching influencer campaign offers:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [token, influencerId],
  );

  useEffect(() => {
    fetchOffers(params);
  }, [fetchOffers, params]);

  const refetch = (newParams?: typeof params) => {
    return fetchOffers(newParams || params);
  };

  return {
    data: data.data,
    pagination: data.pagination,
    loading,
    error,
    refetch,
    total: data.pagination.total,
    totalPages: data.pagination.totalPages,
  };
}

// Hook for user management actions
export function useUsersManagement() {
  const { token } = useAuth();

  const resetPassword = async (userId: string, isBusinessUser = false) => {
    if (!token) throw new Error("No authentication token");

    const endpoint = isBusinessUser
      ? `/admin/business/users/${userId}/reset-password`
      : `/admin/users/${userId}/reset-password`;

    const response = await fetchWithAuth(endpoint, token, {
      method: "POST",
    });
    return response;
  };

  const changeEmail = async (
    userId: string,
    email: string,
    isBusinessUser = false,
  ) => {
    if (!token) throw new Error("No authentication token");

    const endpoint = isBusinessUser
      ? `/admin/business/users/${userId}/email`
      : `/admin/users/${userId}/email`;

    const response = await fetchWithAuth(endpoint, token, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });
    return response;
  };

  const changePhone = async (
    userId: string,
    phone: string,
    isBusinessUser = false,
  ) => {
    if (!token) throw new Error("No authentication token");

    const endpoint = isBusinessUser
      ? `/admin/business/users/${userId}/phone`
      : `/admin/users/${userId}/phone`;

    const response = await fetchWithAuth(endpoint, token, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ phoneNumber: phone }),
    });
    return response;
  };

  const changeStatus = async (userId: string, isBanned: boolean) => {
    if (!token) throw new Error("No authentication token");

    const response = await fetchWithAuth(
      `/admin/users/${userId}/status`,
      token,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isBanned }),
      },
    );
    return response;
  };

  const getUserById = async (userId: string): Promise<User> => {
    if (!token) throw new Error("No authentication token");

    const response = await fetchWithAuth<User>(`/admin/users/${userId}`, token);
    return response;
  };

  const resetInfluencerPassword = async (influencerId: string) => {
    if (!token) throw new Error("No authentication token");

    const response = await fetchWithAuth(
      `/admin/influencers/${influencerId}/reset-password`,
      token,
      {
        method: "POST",
      },
    );
    return response;
  };

  const changeInfluencerEmail = async (influencerId: string, email: string) => {
    if (!token) throw new Error("No authentication token");

    const response = await fetchWithAuth(
      `/admin/influencers/${influencerId}/email`,
      token,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      },
    );
    return response;
  };

  const changeInfluencerPhone = async (influencerId: string, phone: string) => {
    if (!token) throw new Error("No authentication token");

    const response = await fetchWithAuth(
      `/admin/influencers/${influencerId}/phone`,
      token,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phoneNumber: phone }),
      },
    );
    return response;
  };

  const changeInfluencerStatus = async (
    influencerId: string,
    isActive: boolean,
  ) => {
    if (!token) throw new Error("No authentication token");

    const response = await fetchWithAuth(
      `/admin/influencers/${influencerId}/status`,
      token,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isActive }),
      },
    );
    return response;
  };

  const getInfluencerById = async (
    influencerId: string,
  ): Promise<InfluencerDetails> => {
    if (!token) throw new Error("No authentication token");

    const response = await fetchWithAuth<InfluencerDetails>(
      `/admin/influencers/${influencerId}`,
      token,
    );
    return response;
  };

  return {
    resetPassword,
    changeEmail,
    changePhone,
    changeStatus,
    getUserById,
    resetInfluencerPassword,
    changeInfluencerEmail,
    changeInfluencerPhone,
    changeInfluencerStatus,
    getInfluencerById,
  };
}

// Combined hook for all users
export function useAllUsers() {
  const {
    users: consumers,
    loading: consumerLoading,
    error: consumerError,
  } = useUsers();
  const {
    businessUsers,
    loading: businessLoading,
    error: businessError,
  } = useBusinessUsers();
  const {
    influencers,
    loading: influencerLoading,
    error: influencerError,
  } = useInfluencers();

  const allUsers = [
    ...consumers,
    ...businessUsers.map((bu) => ({
      id: bu.id,
      name: bu.fullName || "N/A",
      email: bu.email,
      phone: bu.phoneNumber || "N/A",
      userType: "business" as const,
      status: bu.status as "ACTIVE" | "DISABLED",
      lastLoginAt: bu.lastLoginAt,
      createdAt: bu.createdAt,
      businessName: bu.businesses[0]?.name || null,
      isBusinessUser: true,
    })),
    ...influencers.map((inf) => ({
      id: inf.id,
      name: inf.name,
      email: inf.email,
      phone: inf.phoneNumber || "N/A",
      userType: "influencer" as const,
      status: inf.status,
      lastLoginAt: inf.lastLoginAt,
      createdAt: inf.createdAt,
      businessName: null,
      isInfluencer: true,
      twoFactorEnabled: inf.twoFactorEnabled,
    })),
  ];

  return {
    allUsers,
    loading: consumerLoading || businessLoading || influencerLoading,
    error: consumerError || businessError || influencerError,
    consumers,
    businessUsers,
    influencers,
  };
}
