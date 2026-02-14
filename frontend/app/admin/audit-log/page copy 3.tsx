/* eslint-disable react-hooks/preserve-manual-memoization */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useMemo } from "react";
import {
  useAuditLogs,
  useAuditSummary,
  isValidAuditMetadata,
  type AuditLog,
  type AuditLogFilters,
} from "@/hooks/useAuditLogs";
import { format } from "date-fns";
import {
  Calendar,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Clock,
  User,
  Target,
  Server,
  Activity,
} from "lucide-react";

export default function AuditLog() {
  // State for filters
  const [filters, setFilters] = useState<AuditLogFilters>({
    page: 1,
    limit: 20,
    search: "",
    actionType: "",
    adminId: "",
    targetUserId: "",
    startDate: "",
    endDate: "",
  });

  const [showFilters, setShowFilters] = useState(false);

  // Fetch data
  const {
    data: logsData,
    isLoading: logsLoading,
    error: logsError,
    refetch: refetchLogs,
  } = useAuditLogs(filters);

  const { data: summary, isLoading: summaryLoading } = useAuditSummary();

  // Handle filter changes
  const handleFilterChange = (key: keyof AuditLogFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

  // Reset filters
  const handleResetFilters = () => {
    setFilters({
      page: 1,
      limit: 20,
      search: "",
      actionType: "",
      adminId: "",
      targetUserId: "",
      startDate: "",
      endDate: "",
    });
  };

  // Extract unique action types for filter dropdown
  const actionTypes = useMemo(() => {
    if (!logsData?.data) return [];
    const types = new Set(logsData.data.map((log) => log.actionType));
    return Array.from(types).sort();
  }, [logsData?.data]);

  // Format metadata for display
  const formatMetadata = (log: AuditLog) => {
    if (!log.metadata || !isValidAuditMetadata(log.metadata)) {
      return null;
    }

    const { metadata } = log;

    return (
      <div className="mt-2 space-y-1 text-xs">
        <div className="flex items-center gap-2 text-gray-600">
          <Server className="w-3 h-3" />
          <span className="font-mono">
            {metadata.method} {metadata.path}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span
            className={`px-2 py-0.5 rounded-full text-xs ${
              metadata.statusCode >= 200 && metadata.statusCode < 300
                ? "bg-green-100 text-green-800"
                : metadata.statusCode >= 400 && metadata.statusCode < 500
                  ? "bg-yellow-100 text-yellow-800"
                  : metadata.statusCode >= 500
                    ? "bg-red-100 text-red-800"
                    : "bg-gray-100 text-gray-800"
            }`}
          >
            {metadata.statusCode}
          </span>
          <span className="flex items-center gap-1 text-gray-500">
            <Clock className="w-3 h-3" />
            {metadata.duration}ms
          </span>
        </div>
        {metadata.error && (
          <div className="flex items-start gap-1 text-red-600 bg-red-50 p-2 rounded">
            <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <span className="font-mono text-xs break-all">
              {metadata.error}
            </span>
          </div>
        )}
        {metadata.responseSummary && (
          <div className="text-gray-500">
            Response: {metadata.responseSummary.type}
            {metadata.responseSummary.count !== undefined &&
              ` (${metadata.responseSummary.count} items)`}
            {metadata.responseSummary.truncated && " [truncated]"}
          </div>
        )}
      </div>
    );
  };

  if (logsError) {
    return (
      <div className="p-8 text-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-800 mb-2">
            Failed to load audit logs
          </h3>
          <p className="text-red-600 mb-4">{(logsError as Error).message}</p>
          <button
            onClick={() => refetchLogs()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track and monitor administrative actions
          </p>
        </div>
        <button
          onClick={() => refetchLogs()}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Summary Cards */}
      {!summaryLoading && summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Activity className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Logs</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {summary.totalLogs.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Calendar className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Last 30 Days</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {summary.logsLast30Days.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {summary.topActions[0] && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Filter className="w-5 h-5 text-purple-600" />
                </div>
                <div className="truncate">
                  <p className="text-sm text-gray-500">Top Action</p>
                  <p className="text-lg font-semibold text-gray-900 truncate">
                    {summary.topActions[0].actionType}
                  </p>
                  <p className="text-xs text-gray-500">
                    {summary.topActions[0].count} times
                  </p>
                </div>
              </div>
            </div>
          )}

          {summary.topAdmins[0] && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <User className="w-5 h-5 text-orange-600" />
                </div>
                <div className="truncate">
                  <p className="text-sm text-gray-500">Most Active Admin</p>
                  <p className="text-lg font-semibold text-gray-900 truncate">
                    {summary.topAdmins[0].adminEmail}
                  </p>
                  <p className="text-xs text-gray-500">
                    {summary.topAdmins[0].count} actions
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search logs..."
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 border rounded-lg flex items-center gap-2 transition-colors ${
                showFilters
                  ? "bg-blue-50 border-blue-300 text-blue-700"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
            {(filters.actionType ||
              filters.adminId ||
              filters.targetUserId ||
              filters.startDate ||
              filters.endDate) && (
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Expandable Filters */}
          {showFilters && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Action Type
                </label>
                <select
                  value={filters.actionType}
                  onChange={(e) =>
                    handleFilterChange("actionType", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Actions</option>
                  {actionTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Admin ID
                </label>
                <input
                  type="text"
                  placeholder="Filter by admin"
                  value={filters.adminId}
                  onChange={(e) =>
                    handleFilterChange("adminId", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target User ID
                </label>
                <input
                  type="text"
                  placeholder="Filter by target user"
                  value={filters.targetUserId}
                  onChange={(e) =>
                    handleFilterChange("targetUserId", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date Range
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) =>
                      handleFilterChange("startDate", e.target.value)
                    }
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Start"
                  />
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) =>
                      handleFilterChange("endDate", e.target.value)
                    }
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="End"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Logs Table */}
        <div className="overflow-x-auto">
          {logsLoading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600"></div>
              <p className="mt-2 text-gray-500">Loading audit logs...</p>
            </div>
          ) : !logsData?.data.length ? (
            <div className="p-12 text-center">
              <div className="bg-gray-50 rounded-lg p-6">
                <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No audit logs found
                </h3>
                <p className="text-gray-500">
                  {Object.values(filters).some(Boolean)
                    ? "Try adjusting your filters to see more results"
                    : "No administrative actions have been logged yet"}
                </p>
              </div>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Admin
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Target User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {logsData.data.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(new Date(log.createdAt), "MMM d, yyyy HH:mm:ss")}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                        {log.actionType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {log.admin ? (
                        <div>
                          <div className="font-medium text-gray-900">
                            {log.admin.email}
                          </div>
                          <div className="text-xs text-gray-500">
                            {log.admin.id}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">System</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {log.targetUser ? (
                        <div>
                          <div className="font-medium text-gray-900">
                            {log.targetUser.name || log.targetUser.email}
                          </div>
                          <div className="text-xs text-gray-500">
                            {log.targetUser.userType}
                          </div>
                          <div className="text-xs text-gray-400">
                            {log.targetUser.id}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">{formatMetadata(log)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {logsData && logsData.pagination.totalPages > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing{" "}
              {(logsData.pagination.page - 1) * logsData.pagination.limit + 1}{" "}
              to{" "}
              {Math.min(
                logsData.pagination.page * logsData.pagination.limit,
                logsData.pagination.total,
              )}{" "}
              of {logsData.pagination.total} logs
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(logsData.pagination.page - 1)}
                disabled={logsData.pagination.page === 1}
                className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="px-4 py-2 text-sm text-gray-700">
                Page {logsData.pagination.page} of{" "}
                {logsData.pagination.totalPages}
              </span>
              <button
                onClick={() => handlePageChange(logsData.pagination.page + 1)}
                disabled={
                  logsData.pagination.page === logsData.pagination.totalPages
                }
                className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
