"use client";

// src/hooks/useAuditLogs.ts
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { fetchWithAuth } from "@/lib/api";

// ✅ Match the AuditMetadata from the interceptor
export interface AuditMetadata {
  method: string;
  path: string;
  statusCode: number;
  duration: number;
  query?: Record<string, string | string[]>;
  error?: string;
  stack?: string;
  timestamp: string;
  requestBody?: Record<string, unknown> | null;
  responseSummary?: {
    type: string;
    count?: number;
    truncated?: boolean;
  };
  [key: string]: unknown; // Keep index signature for flexibility
}

export interface AuditLog {
  id: string;
  actionType: string;
  createdAt: string;
  admin: {
    id: string;
    email: string;
  } | null;
  ipAddress?: string; 
  userAgent?: string; 
  targetUser: {
    id: string;
    // Optional: you can keep these as optional if you want to add them later
    name?: string;
    email?: string;
    userType?: string;
  } | null;
  metadata: AuditMetadata | null;
}

export interface AuditSummary {
  totalLogs: number;
  logsLast30Days: number;
  topActions: Array<{
    actionType: string;
    count: number;
  }>;
  topAdmins: Array<{
    adminId: string;
    adminEmail: string;
    count: number;
  }>;
}

export interface AuditLogsResponse {
  data: AuditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AuditLogFilters {
  page?: number;
  limit?: number;
  search?: string;
  actionType?: string;
  adminId?: string;
  targetUserId?: string;
  startDate?: string;
  endDate?: string;
}

// Query keys for cache management
export const auditQueryKeys = {
  all: ["audit"] as const,
  logs: (filters?: AuditLogFilters) =>
    [...auditQueryKeys.all, "logs", filters] as const,
  summary: () => [...auditQueryKeys.all, "summary"] as const,
  log: (id: string) => [...auditQueryKeys.all, "log", id] as const,
};

const DEFAULT_AUDIT_OPTIONS = {
  staleTime: 5 * 60 * 1000, // 5 minutes
  gcTime: 10 * 60 * 1000, // 10 minutes
  refetchOnWindowFocus: false,
  retry: 1,
};

// Helper function to build query string
const buildQueryString = (params?: AuditLogFilters): string => {
  if (!params) return "";

  const queryParams = new URLSearchParams();
  if (params.page) queryParams.append("page", params.page.toString());
  if (params.limit) queryParams.append("limit", params.limit.toString());
  if (params.search) queryParams.append("search", params.search);
  if (params.actionType) queryParams.append("actionType", params.actionType);
  if (params.adminId) queryParams.append("adminId", params.adminId);
  if (params.targetUserId)
    queryParams.append("targetUserId", params.targetUserId);
  if (params.startDate) queryParams.append("startDate", params.startDate);
  if (params.endDate) queryParams.append("endDate", params.endDate);

  return queryParams.toString();
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

// ✅ Type guard to check if metadata exists and has expected shape
export function isValidAuditMetadata(
  metadata: unknown,
): metadata is AuditMetadata {
  return (
    metadata !== null &&
    typeof metadata === "object" &&
    metadata !== null &&
    "method" in metadata &&
    "path" in metadata &&
    "statusCode" in metadata &&
    "duration" in metadata &&
    "timestamp" in metadata
  );
}

// Main hook for audit logs with React Query
export function useAuditLogs(filters?: AuditLogFilters) {
  const { token } = useAuth();

  const queryString = buildQueryString(filters);
  const endpoint = `/admin/audit/logs${queryString ? `?${queryString}` : ""}`;

  return useQuery<AuditLogsResponse>({
    queryKey: auditQueryKeys.logs(filters),
    queryFn: () => fetchWithAuthWrapper<AuditLogsResponse>(endpoint, token),
    enabled: !!token,
    ...DEFAULT_AUDIT_OPTIONS,
    placeholderData: (previousData) => previousData,
  });
}

// Hook for audit summary with React Query
export function useAuditSummary() {
  const { token } = useAuth();

  return useQuery<AuditSummary>({
    queryKey: auditQueryKeys.summary(),
    queryFn: () =>
      fetchWithAuthWrapper<AuditSummary>("/admin/audit/summary", token),
    enabled: !!token,
    ...DEFAULT_AUDIT_OPTIONS,
    staleTime: 15 * 60 * 1000,
  });
}

// Hook to manually invalidate audit cache
export function useInvalidateAuditCache() {
  const queryClient = useQueryClient();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: auditQueryKeys.all });
  };

  const invalidateLogs = () => {
    queryClient.invalidateQueries({
      predicate: (query) =>
        Array.isArray(query.queryKey) &&
        query.queryKey[0] === "audit" &&
        query.queryKey[1] === "logs",
    });
  };

  const invalidateSummary = () => {
    queryClient.invalidateQueries({ queryKey: auditQueryKeys.summary() });
  };

  return {
    invalidateAll,
    invalidateLogs,
    invalidateSummary,
  };
}
