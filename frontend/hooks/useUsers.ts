/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

// src/hooks/useUsers.ts
import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { fetchWithAuth } from "@/lib/api";

export type User = {
  id: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  email: string;
  username: string | null;
  phoneNumber: string | null;
  avatarId: string | null;
  profilePicture: string | null;
  isAgreementAccepted: boolean;
  isEmailConfirmed: boolean;
  isPhoneConfirmed: boolean;
  twoFactorEnabled: boolean;
  twoFactorType: string | null;
  onboardingCompleted: boolean;
  hasAcceptedPolicy: boolean;
  isBanned: boolean;
  banDate: string | null;
  createdAt: string;
  updatedAt: string;
  clerkUserId: string;
  userType: "consumer";
  lastLoginAt: string;
  lastLoginDevice: string | null;
  lastLoginIp: string | null;
  lastLoginLocation: string | null;
  status: "ACTIVE" | "DISABLED";

  // Relationships
  avatar: any | null;
  userSettings: any | null;
  favorites: Array<{
    id: string;
    name: string;
  }>;
  businessClients: Array<{
    business: {
      id: string;
      name: string;
    };
  }>;
  reviews: Array<{
    id: string;
    ratings: number;
    business: {
      name: string;
    };
    createdAt: string;
  }>;
  recentLoginSessions: Array<{
    lastLogin: string;
    device: string;
    userAgent: string;
    ipAddress: string;
    location: string | null;
    coordinates: {
      latitude: number;
      longitude: number;
    } | null;
    timezone: string | null;
    region: string | null;
  }>;
};

export type SubscriptionStatus = 'ACTIVE' | 'INACTIVE' | 'TRIAL' | 'CANCELLED';
export type BillingCycle = 'YEAR' | 'MONTH';
export type PaymentStatus = 'PAID' | 'PREPAID' | 'UNPAID' | 'FAILED' | 'REFUNDED';
export type JsonValue = 
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };


export type BusinessUser = {
  id: string;
  email: string;
  username: string | null;
  phoneNumber: string | null;
  alternativePhoneNumber: string | null;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  clerkUserId: string;
  city: string | null;
  zipcode: string | null;
  address: string | null;
  state: string | null;
  homeNumber: string | null;
  floor: string | null;
  street: string | null;
  area: string | null;
  sector: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  businessUserType: "PILOT" | "REGULAR" | "REFERRAL";
  referralCode: string;
  inviteCode: string | null;
  isEmailConfirmed: boolean;
  isAgreementAccepted: boolean;
  twoFactorEnabled: boolean;
  twoFactorType: string | null;
  isEmployeeConsentApproved: boolean;
  createdAt: string;
  updatedAt: string;
  userType: "business";
  lastLoginAt: string | null;
  lastLoginDevice: string | null;
  lastLoginIp: string | null;
  lastLoginLocation: string | null;
  status: string;
  // Relationships - FIXED STRUCTURE
  avatar: {
    id: string;
    url: string;
    key: string;
  } | null;

  // FIXED: This is now an array of businesses directly, not BusinessMember objects
  businesses: Array<{
    id: string; // Business ID
    name: string;
    industryType: string[];
    city: string;
    country: string;
    isVerified: boolean;
    role: string; // Role name (OWNER, EMPLOYEE, ADMIN, USER)
    joinedAt: string; // When they joined the business
    memberId: string; // BusinessMember ID
    subscriptions: Array<{
      id: string;
      status: SubscriptionStatus;
      billingCycle: BillingCycle;
      startDate: Date | null;
      endDate: Date | null;
      paymentStatus: PaymentStatus | null;
      isTrialUsed: boolean | null;
      cancelAtPeriodEnd: boolean | null;
      canceledDate: Date | null;
      orderId: string | null;
      plan: {
        id: string;
        title: string;
        prices: JsonValue;
        features: JsonValue;
        trialPeriodDays: number | null;
        country: string;
      };
    }>;
  }>;

  businessUserSettings: {
    appointmentNotification: boolean;
  } | null;

  // FIXED: Recent login sessions structure
  recentLoginSessions?: Array<{
    id: string;
    lastLogin: string;
    device: string | null;
    userAgent: string;
    ipAddress: string | null;
    location: string | null;
    coordinates?: {
      latitude: number;
      longitude: number;
    } | null;
    region: string | null;
    timezone: string | null;
    sessionStart: string;
  }>;

  // Original refresh tokens (still available)
  refreshTokens: Array<{
    id: string;
    lastLogin: string;
    userAgent: string;
    device: string | null;
    ipAddress: string | null;
    city: string | null;
    country: string | null;
    latitude: number | null;
    longitude: number | null;
    regionName: string | null;
    timezone: string | null;
    createdAt: string;
  }>;

  invitations: Array<{
    id: string;
    email: string;
    status: string;
    createdAt: string;
  }>;

  rewardReceived: Array<{
    id: string;
    rewardType: string;
    status: string;
    amount: number;
    createdAt: string;
    referredByUser: {
      id: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
    } | null;
  }>;

  rewardReferred: Array<any>;
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
  isEmailConfirmed: boolean;
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

export interface CancelSubscriptionResponse {
  success: boolean;
  message: string;
  subscription: {
    id: string;
    status: string;
    cancelAtPeriodEnd: boolean;
    endDate: string | null;
    plan: string;
  };
  stripeResult?: any;
}

// React Query configuration
const DEFAULT_QUERY_OPTIONS = {
  staleTime: 5 * 60 * 1000, // 5 minutes before data becomes stale
  gcTime: 30 * 60 * 1000, // 30 minutes cache time (was cacheTime in v4)
  refetchOnWindowFocus: false,
  retry: 1,
};

// Query keys factory for consistent cache keys
export const queryKeys = {
  users: {
    all: ["users"] as const,
    consumers: () => [...queryKeys.users.all, "consumers"] as const,
    consumer: (id: string) => [...queryKeys.users.consumers(), id] as const,
    business: () => [...queryKeys.users.all, "business"] as const,
    businessUser: (id: string) => [...queryKeys.users.business(), id] as const,
    influencers: () => [...queryKeys.users.all, "influencers"] as const,
    influencer: (id: string) => [...queryKeys.users.influencers(), id] as const,
    recent: (limit?: number) =>
      [...queryKeys.users.all, "recent", { limit }] as const,
  },
  paginated: {
    business: (params?: BusinessUserFilterParams) =>
      [...queryKeys.users.business(), "paginated", params] as const,
    influencers: (params?: InfluencerFilterParams) =>
      [...queryKeys.users.influencers(), "paginated", params] as const,
  },
};

// Helper function to fetch with auth
const fetchWithAuthWrapper = async <T>(
  endpoint: string,
  token: string | null,
  options?: RequestInit,
): Promise<T> => {
  if (!token) {
    throw new Error("No authentication token");
  }
  return fetchWithAuth<T>(endpoint, token, options);
};

// React Query hooks
export function useUsers() {
  const { token } = useAuth();

  return useQuery({
    queryKey: queryKeys.users.consumers(),
    queryFn: () => fetchWithAuthWrapper<User[]>("/admin/users/all", token),
    enabled: !!token,
    ...DEFAULT_QUERY_OPTIONS,
  });
}

export function useUserById(userId: string) {
  const { token } = useAuth();

  return useQuery({
    queryKey: queryKeys.users.consumer(userId),
    queryFn: () => fetchWithAuthWrapper<User>(`/admin/users/${userId}`, token),
    enabled: !!token && !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes for details
    gcTime: 10 * 60 * 1000, // 10 minutes cache
  });
}

export function useRecentUsers(limit = 5) {
  const { token } = useAuth();

  return useQuery<RecentUser[]>({
    queryKey: queryKeys.users.recent(limit),
    queryFn: () =>
      fetchWithAuthWrapper<RecentUser[]>(
        `/admin/metrics/users/recent?limit=${limit}`,
        token,
      ),
    enabled: !!token,
    ...DEFAULT_QUERY_OPTIONS,
  });
}

export interface RecentUser {
  id: string;
  name: string;
  email: string;
  username: string | null;
  phoneNumber: string | null;
  userType: "consumer" | "business" | "influencer";
  status: string;
  lastLoginAt: string | null;
  lastLoginDevice: string | null;
  lastLoginIp: string | null;
  createdAt: string;
}

// Hook for fetching business users
export function useBusinessUsers() {
  const { token } = useAuth();

  return useQuery({
    queryKey: queryKeys.users.business(),
    queryFn: () =>
      fetchWithAuthWrapper<BusinessUser[]>("/admin/business/users", token),
    enabled: !!token,
    ...DEFAULT_QUERY_OPTIONS,
  });
}

// Hook for paginated business users with filters
export function usePaginatedBusinessUsers(params?: BusinessUserFilterParams) {
  const { token } = useAuth();

  const queryKey = queryKeys.paginated.business(params);

  return useQuery({
    queryKey,
    queryFn: async () => {
      if (!token) throw new Error("No authentication token");

      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append("page", params.page.toString());
      if (params?.limit) queryParams.append("limit", params.limit.toString());
      if (params?.search) queryParams.append("search", params.search);
      if (params?.userType) queryParams.append("type", params.userType);
      if (params?.sortBy) queryParams.append("sortBy", params.sortBy);
      if (params?.sortOrder) queryParams.append("sortOrder", params.sortOrder);

      const queryString = queryParams.toString();
      const url = `/admin/business/users/list${queryString ? `?${queryString}` : ""}`;

      return fetchWithAuth<PaginatedBusinessUserResponse>(url, token);
    },
    enabled: !!token,
    ...DEFAULT_QUERY_OPTIONS,
  });
}

// Hook for single business user
export function useBusinessUserById(userId: string) {
  const { token } = useAuth();

  return useQuery({
    queryKey: queryKeys.users.businessUser(userId),
    queryFn: () =>
      fetchWithAuthWrapper<BusinessUser>(
        `/admin/business/users/${userId}`,
        token,
      ),
    enabled: !!token && !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes for details
    gcTime: 10 * 60 * 1000, // 10 minutes cache
  });
}

export function useInfluencers() {
  const { token } = useAuth();

  return useQuery({
    queryKey: queryKeys.users.influencers(),
    queryFn: () =>
      fetchWithAuthWrapper<Influencer[]>("/admin/influencers/all", token),
    enabled: !!token,
    ...DEFAULT_QUERY_OPTIONS,
  });
}

// Hook for recent influencers
export function useRecentInfluencers(limit = 5) {
  const { token } = useAuth();

  return useQuery({
    queryKey: [...queryKeys.users.influencers(), "recent", { limit }],
    queryFn: () =>
      fetchWithAuthWrapper<Influencer[]>(
        `/admin/influencers/recent?limit=${limit}`,
        token,
      ),
    enabled: !!token,
    ...DEFAULT_QUERY_OPTIONS,
  });
}

// Hook for paginated influencers with filters
export function usePaginatedInfluencers(params?: InfluencerFilterParams) {
  const { token } = useAuth();

  const queryKey = queryKeys.paginated.influencers(params);

  return useQuery({
    queryKey,
    queryFn: async () => {
      if (!token) throw new Error("No authentication token");

      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append("page", params.page.toString());
      if (params?.limit) queryParams.append("limit", params.limit.toString());
      if (params?.search) queryParams.append("search", params.search);
      if (params?.status) queryParams.append("status", params.status);
      if (params?.sortBy) queryParams.append("sortBy", params.sortBy);
      if (params?.sortOrder) queryParams.append("sortOrder", params.sortOrder);

      const queryString = queryParams.toString();
      const url = `/admin/influencers${queryString ? `?${queryString}` : ""}`;

      return fetchWithAuth<PaginatedInfluencerResponse>(url, token);
    },
    enabled: !!token,
    ...DEFAULT_QUERY_OPTIONS,
  });
}

// Hook for single influencer
export function useInfluencerById(influencerId: string) {
  const { token } = useAuth();

  return useQuery({
    queryKey: queryKeys.users.influencer(influencerId),
    queryFn: () =>
      fetchWithAuthWrapper<InfluencerDetails>(
        `/admin/influencers/${influencerId}`,
        token,
      ),
    enabled: !!token && !!influencerId,
    ...DEFAULT_QUERY_OPTIONS,
  });
}

// Hook for influencer login history
export function useInfluencerLoginHistory(influencerId: string, limit = 10) {
  const { token } = useAuth();

  return useQuery({
    queryKey: [
      ...queryKeys.users.influencer(influencerId),
      "login-history",
      { limit },
    ],
    queryFn: () =>
      fetchWithAuthWrapper<any[]>(
        `/admin/influencers/${influencerId}/login-history?limit=${limit}`,
        token,
      ),
    enabled: !!token && !!influencerId,
    ...DEFAULT_QUERY_OPTIONS,
  });
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

  const queryKey = [
    ...queryKeys.users.influencer(influencerId),
    "campaign-offers",
    params,
  ];

  return useQuery({
    queryKey,
    queryFn: async () => {
      if (!token || !influencerId)
        throw new Error("Missing token or influencerId");

      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append("page", params.page.toString());
      if (params?.limit) queryParams.append("limit", params.limit.toString());
      if (params?.status) queryParams.append("status", params.status);

      const queryString = queryParams.toString();
      const url = `/admin/influencers/${influencerId}/campaign-offers${queryString ? `?${queryString}` : ""}`;

      return fetchWithAuth<{
        data: CampaignOffer[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      }>(url, token);
    },
    enabled: !!token && !!influencerId,
    ...DEFAULT_QUERY_OPTIONS,
  });
}

// Hook for user management actions with cache invalidation
export function useUsersManagement() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const resetPassword = async (userId: string, isBusinessUser = false) => {
    if (!token) throw new Error("No authentication token");

    const endpoint = isBusinessUser
      ? `/admin/business/users/${userId}/reset-password`
      : `/admin/users/${userId}/reset-password`;

    const response = await fetchWithAuth(endpoint, token, {
      method: "POST",
    });

    // Invalidate relevant caches
    if (isBusinessUser) {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.business() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.paginated.business(),
      });
    } else {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.consumers() });
    }

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

    // Invalidate relevant caches
    queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    if (isBusinessUser) {
      queryClient.invalidateQueries({
        queryKey: queryKeys.users.businessUser(userId),
      });
    }

    return response;
  };

  const changePhone = async (
    userId: string,
    phone: string,
    isBusinessUser = false,
  ) => {
    if (!token) throw new Error("No authentication token");
    console.log("isBusinessUser: ", isBusinessUser);

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

    // Invalidate relevant caches
    queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    if (isBusinessUser) {
      queryClient.invalidateQueries({
        queryKey: queryKeys.users.businessUser(userId),
      });
    } else {
      queryClient.invalidateQueries({
        queryKey: queryKeys.users.consumer(userId),
      });
    }

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

    // Invalidate user caches
    queryClient.invalidateQueries({ queryKey: queryKeys.users.consumers() });
    queryClient.invalidateQueries({
      queryKey: queryKeys.users.consumer(userId),
    });

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

    // Invalidate influencer cache
    queryClient.invalidateQueries({ queryKey: queryKeys.users.influencers() });
    queryClient.invalidateQueries({
      queryKey: queryKeys.users.influencer(influencerId),
    });

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

    // Invalidate influencer cache
    queryClient.invalidateQueries({ queryKey: queryKeys.users.influencers() });

    queryClient.invalidateQueries({
      queryKey: queryKeys.users.influencer(influencerId),
    });

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

    // Invalidate influencer cache
    queryClient.invalidateQueries({ queryKey: queryKeys.users.influencers() });
    queryClient.invalidateQueries({
      queryKey: queryKeys.users.influencer(influencerId),
    });

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

    // Invalidate influencer cache
    queryClient.invalidateQueries({ queryKey: queryKeys.users.influencers() });
    queryClient.invalidateQueries({
      queryKey: queryKeys.users.influencer(influencerId),
    });

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

   const cancelSubscription = async (
    businessId: string,
    options?: {
      immediate?: boolean;
    }
  ): Promise<CancelSubscriptionResponse> => {
    if (!token) throw new Error("No authentication token");

    const endpoint = options?.immediate
      ? `/admin/business/users/${businessId}/subscription/immediately-cancel`
      : `/admin/business/users/${businessId}/subscription/cancel`;

    const response = await fetchWithAuth<CancelSubscriptionResponse>(
      endpoint,
      token,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    // Invalidate business user cache and any subscription-related queries
    queryClient.invalidateQueries({
      queryKey: queryKeys.users.businessUser(businessId),
    });
    queryClient.invalidateQueries({
      queryKey: queryKeys.users.business(),
    });
    
    return response;
  };

  // Get subscription details for a business
  const getBusinessSubscription = async (businessId: string) => {
    if (!token) throw new Error("No authentication token");

    const response = await fetchWithAuth(
      `/admin/business/users/${businessId}/subscription`,
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
    cancelSubscription,
    getBusinessSubscription,
  };
}



// Combined hook for all users with React Query
export function useAllUsers() {
  const {
    data: consumers = [],
    isLoading: consumerLoading,
    error: consumerError,
  } = useUsers();
  const {
    data: businessUsers = [],
    isLoading: businessLoading,
    error: businessError,
  } = useBusinessUsers();
  const {
    data: influencers = [],
    isLoading: influencerLoading,
    error: influencerError,
  } = useInfluencers();

  const allUsers = [
    ...(consumers || []),
    ...(businessUsers || []).map((bu) => ({
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
    ...(influencers || []).map((inf) => ({
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

// Hook for manual cache invalidation
export function useInvalidateUserCache() {
  const queryClient = useQueryClient();

  const invalidateAllUsers = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
  };

  const invalidateConsumers = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.users.consumers() });
  };

  const invalidateBusinessUsers = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.users.business() });
    queryClient.invalidateQueries({ queryKey: queryKeys.paginated.business() });
  };

  const invalidateInfluencers = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.users.influencers() });
    queryClient.invalidateQueries({
      queryKey: queryKeys.paginated.influencers(),
    });
  };

  const invalidateUser = (
    userId: string,
    type?: "consumer" | "business" | "influencer",
  ) => {
    if (type === "business" || !type) {
      queryClient.invalidateQueries({
        queryKey: queryKeys.users.businessUser(userId),
      });
    }
    if (type === "consumer" || !type) {
      queryClient.invalidateQueries({
        queryKey: queryKeys.users.consumer(userId),
      });
    }
    if (type === "influencer" || !type) {
      queryClient.invalidateQueries({
        queryKey: queryKeys.users.influencer(userId),
      });
    }
  };

  return {
    invalidateAllUsers,
    invalidateConsumers,
    invalidateBusinessUsers,
    invalidateInfluencers,
    invalidateUser,
  };
}

// React Query mutations for better UX
export function useUpdateUserMutation() {
  const queryClient = useQueryClient();
  const { token } = useAuth();

  return useMutation({
    mutationFn: async ({
      userId,
      data,
      isBusinessUser = false,
    }: {
      userId: string;
      data: any;
      isBusinessUser?: boolean;
    }) => {
      if (!token) throw new Error("No authentication token");

      const endpoint = isBusinessUser
        ? `/admin/business/users/${userId}`
        : `/admin/users/${userId}`;

      return fetchWithAuth(endpoint, token, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
    },
    onSuccess: (_, variables) => {
      // Optimistically update cache
      if (variables.isBusinessUser) {
        queryClient.invalidateQueries({ queryKey: queryKeys.users.business() });
        queryClient.invalidateQueries({
          queryKey: queryKeys.users.businessUser(variables.userId),
        });
      } else {
        queryClient.invalidateQueries({
          queryKey: queryKeys.users.consumers(),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.users.consumer(variables.userId),
        });
      }
    },
  });
}

export function useUpdateInfluencerMutation() {
  const queryClient = useQueryClient();
  const { token } = useAuth();

  return useMutation({
    mutationFn: async ({
      influencerId,
      data,
    }: {
      influencerId: string;
      data: any;
    }) => {
      if (!token) throw new Error("No authentication token");

      return fetchWithAuth(`/admin/influencers/${influencerId}`, token, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
    },
    onSuccess: (_, variables) => {
      // Invalidate influencer cache
      queryClient.invalidateQueries({
        queryKey: queryKeys.users.influencers(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.users.influencer(variables.influencerId),
      });
    },
  });
}
