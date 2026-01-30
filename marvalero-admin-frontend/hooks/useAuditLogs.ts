'use client';

// src/hooks/useAuditLogs.ts
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { fetchWithAuth } from '@/lib/api';

export interface AuditLog {
  id: string;
  actionType: string;
  createdAt: string;
  admin: {
    id: string;
    email: string;
  } | null;
  targetUser: {
    id: string;
    name: string;
    email: string;
    userType: string;
  } | null;
  metadata: Record<string, any>;
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

export function useAuditLogs(params?: {
  page?: number;
  limit?: number;
  search?: string;
  actionType?: string;
  adminId?: string;
  targetUserId?: string;
  startDate?: string;
  endDate?: string;
}) {
  const { token } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const fetchLogs = async () => {
      try {
        setLoading(true);
        
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.append('page', params.page.toString());
        if (params?.limit) queryParams.append('limit', params.limit.toString());
        if (params?.search) queryParams.append('search', params.search);
        if (params?.actionType) queryParams.append('actionType', params.actionType);
        if (params?.adminId) queryParams.append('adminId', params.adminId);
        if (params?.targetUserId) queryParams.append('targetUserId', params.targetUserId);
        if (params?.startDate) queryParams.append('startDate', params.startDate);
        if (params?.endDate) queryParams.append('endDate', params.endDate);

        const response = await fetchWithAuth<AuditLogsResponse>(
          `/admin/audit/logs?${queryParams.toString()}`,
          token
        );

        setLogs(response.data);
        setPagination(response.pagination);
        setLoading(false);
      } catch (err: any) {
        console.error('Error fetching audit logs:', err);
        setError(err.message || 'Failed to load audit logs');
        setLoading(false);
      }
    };

    fetchLogs();
  }, [token, JSON.stringify(params)]); // Stringify for deep comparison

  return { logs, pagination, loading, error };
}

export function useAuditSummary() {
  const { token } = useAuth();
  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const fetchSummary = async () => {
      try {
        setLoading(true);
        const data = await fetchWithAuth<AuditSummary>('/admin/audit/summary', token);
        setSummary(data);
        setLoading(false);
      } catch (err: any) {
        console.error('Error fetching audit summary:', err);
        setError(err.message || 'Failed to load audit summary');
        setLoading(false);
      }
    };

    fetchSummary();
  }, [token]);

  return { summary, loading, error };
}