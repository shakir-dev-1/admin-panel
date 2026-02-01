"use client";

import { useState } from "react";
import {
  ClipboardList,
  User,
  Key,
  UserX,
  RefreshCw,
  Mail,
  Phone,
  Filter,
  Download,
  Loader2,
  BarChart3,
} from "lucide-react";
import { SearchInput } from "@/app/components/admin/SearchInput";
import { Button } from "@/app/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { format, formatDistanceToNow } from "date-fns";
import { useAuditLogs, useAuditSummary } from "@/hooks/useAuditLogs";

// Action type mappings
const actionIcons: Record<string, React.ElementType> = {
  "POST /admin/auth/login": User,
  "GET /admin/metrics": BarChart3,
  "POST /admin/users/:userId/reset-password": Key,
  "PATCH /admin/users/:userId/email": Mail,
  "PATCH /admin/users/:userId/phone": Phone,
  "PATCH /admin/users/:userId/status": UserX,
  "PATCH /admin/business/:id/cancel-subscription": RefreshCw,
  "POST /admin/business/:businessId/payments/:paymentIntentId/refund":
    RefreshCw,
  "GET /admin/users": User,
  "GET /admin/users/:userId": User,
  "GET /admin/ping": User,
  "GET /admin/dashboard": BarChart3,
  "GET /admin/business/payments": BarChart3,
  "GET /admin/business/disputes": BarChart3,
  "GET /admin/business/refunds": RefreshCw,
};

const actionLabels: Record<string, string> = {
  "POST /admin/auth/login": "Admin Login",
  "GET /admin/metrics": "View Metrics",
  "POST /admin/users/:userId/reset-password": "Password Reset",
  "PATCH /admin/users/:userId/email": "Email Changed",
  "PATCH /admin/users/:userId/phone": "Phone Changed",
  "PATCH /admin/users/:userId/status": "Account Status Changed",
  "PATCH /admin/business/:id/cancel-subscription": "Subscription Cancelled",
  "POST /admin/business/:businessId/payments/:paymentIntentId/refund":
    "Payment Refunded",
  "GET /admin/users": "View Users",
  "GET /admin/users/:userId": "View User Details",
  "GET /admin/ping": "Admin Ping",
  "GET /admin/dashboard": "View Dashboard",
  "GET /admin/business/payments": "View Payments",
  "GET /admin/business/disputes": "View Disputes",
  "GET /admin/business/refunds": "View Refunds",
};

// Get action type from full path
const getActionType = (actionType: string): string => {
  if (!actionType) return "Unknown Action";

  if (actionLabels[actionType]) {
    return actionType;
  }

  const parts = actionType.split(" ");
  if (parts.length === 2) {
    const [method, path] = parts;
    const simplifiedPath = path.replace(/\/[^\/]+\/[^\/]+$/, "/:id");
    return `${method} ${simplifiedPath}`;
  }

  return actionType;
};

export default function AuditLog() {
  const [search, setSearch] = useState("");
  const [actionTypeFilter, setActionTypeFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [showSummary, setShowSummary] = useState(false);

  // Assuming your useAuditLogs hook is already Next.js compatible
  const { logs, pagination, loading, error } = useAuditLogs({
    page,
    limit: 20,
    search: search || undefined,
    actionType: actionTypeFilter !== "all" ? actionTypeFilter : undefined,
  });

  const { summary, loading: summaryLoading } = useAuditSummary();

  // Extract unique action types for filter
  const actionTypes = Array.from(
    new Set(logs?.map((log) => getActionType(log.actionType)) || []),
  ).sort();

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleExport = () => {
    // Export functionality - implement based on your API
    console.log("Export audit logs");
  };

  if (error && !loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-destructive">
            Error loading audit logs
          </h2>
          <p className="mt-2 text-muted-foreground">{error || String(error)}</p>
          <Button className="mt-4" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Audit Log</h1>
            <p className="text-sm text-muted-foreground">
              Track all admin actions for accountability
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSummary(!showSummary)}
          >
            <BarChart3 className="mr-2 h-4 w-4" />
            {showSummary ? "Hide Stats" : "Show Stats"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      {showSummary && summary && !summaryLoading && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Total Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary.totalLogs?.toLocaleString() || "0"}
              </div>
              <p className="text-xs text-muted-foreground">
                {summary.logsLast30Days || 0} in last 30 days
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Top Action Types
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {summary.topActions?.slice(0, 3).map((action) => (
                <div
                  key={action.actionType}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm truncate">
                    {actionLabels[getActionType(action.actionType)] ||
                      action.actionType}
                  </span>
                  <Badge variant="secondary">{action.count}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Most Active Admins
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {summary.topAdmins?.slice(0, 3).map((admin) => (
                <div
                  key={admin.adminId}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm truncate">{admin.adminEmail}</span>
                  <Badge variant="secondary">{admin.count}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="admin-card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <SearchInput
            value={search}
            onChange={handleSearch}
            placeholder="Search by admin email, user name, email, or action..."
            className="flex-1"
          />
          <div className="flex gap-3">
            <Select
              value={actionTypeFilter}
              onValueChange={(value) => {
                setActionTypeFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Action Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {actionTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {actionLabels[type] || type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Log Entries */}
      <div className="space-y-3">
        {loading ? (
          <div className="admin-card py-12 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Loading audit logs...</p>
          </div>
        ) : !logs || logs.length === 0 ? (
          <div className="admin-card py-12 text-center">
            <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">
              {search
                ? "No audit log entries found matching your search"
                : "No audit log entries yet"}
            </p>
          </div>
        ) : (
          <>
            {logs.map((log) => {
              const actionType = getActionType(log.actionType);
              const Icon = actionIcons[actionType] || User;
              const label = actionLabels[actionType] || actionType;

              return (
                <div key={log.id} className="admin-card">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-semibold text-foreground">
                            {label}
                          </p>
                          {log.targetUser ? (
                            <p className="text-sm text-muted-foreground">
                              Target:{" "}
                              <span className="font-medium">
                                {log.targetUser.name || log.targetUser.email}
                              </span>
                              {log.targetUser.userType && (
                                <Badge variant="outline" className="ml-2">
                                  {log.targetUser.userType.toLowerCase()}
                                </Badge>
                              )}
                            </p>
                          ) : log.metadata?.targetId ? (
                            <p className="text-sm text-muted-foreground">
                              Target ID:{" "}
                              <span className="font-mono">
                                {log.metadata.targetId}
                              </span>
                            </p>
                          ) : null}
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(log.createdAt), {
                              addSuffix: true,
                            })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(
                              new Date(log.createdAt),
                              "MMM d, yyyy HH:mm",
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 text-sm">
                        {log.admin ? (
                          <span className="text-muted-foreground">
                            By:{" "}
                            <span className="font-medium text-foreground">
                              {log.admin.email}
                            </span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            By: System
                          </span>
                        )}

                        {/* Show metadata if available */}
                        {log.metadata &&
                          Object.keys(log.metadata).length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {log.metadata.method && (
                                <Badge variant="outline" className="text-xs">
                                  {log.metadata.method}
                                </Badge>
                              )}
                              {log.metadata.statusCode && (
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${
                                    log.metadata.statusCode >= 400
                                      ? "border-red-200 bg-red-50 text-red-700"
                                      : "border-green-200 bg-green-50 text-green-700"
                                  }`}
                                >
                                  {log.metadata.statusCode}
                                </Badge>
                              )}
                              {log.metadata.duration && (
                                <Badge variant="outline" className="text-xs">
                                  {log.metadata.duration}ms
                                </Badge>
                              )}
                            </div>
                          )}
                      </div>

                      {/* Show error if present */}
                      {log.metadata?.error && (
                        <div className="mt-2 rounded-md bg-red-50 p-2">
                          <p className="text-xs text-red-700 font-medium">
                            Error:
                          </p>
                          <p className="text-xs text-red-600 truncate">
                            {log.metadata.error}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Pagination */}
      {logs && logs.length > 0 && pagination && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {(page - 1) * pagination.limit + 1} to{" "}
            {Math.min(page * pagination.limit, pagination.total)} of{" "}
            {pagination.total} audit log entries
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1 || loading}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
