"use client";

import { useState, useMemo, Fragment, useEffect, useRef } from "react";
import {
  useAuditLogs,
  useAuditSummary,
  isValidAuditMetadata,
  type AuditLog as AuditLogType,
  type AuditLogFilters,
} from "@/hooks/useAuditLogs";
import {
  Activity,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  User,
  Clock,
  ShieldCheck,
  ListFilter,
  Zap,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { StatCard } from "@/app/components/admin/StatCard";
import { Skeleton } from "@/app/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/app/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function methodVariant(method: string): string {
  const map: Record<string, string> = {
    GET: "bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/20",
    POST: "bg-green-500/10 text-green-600 dark:text-green-400 ring-1 ring-green-500/20",
    PUT: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 ring-1 ring-yellow-500/20",
    PATCH:
      "bg-violet-500/10 text-violet-600 dark:text-violet-400 ring-1 ring-violet-500/20",
    DELETE:
      "bg-red-500/10 text-red-600 dark:text-red-400 ring-1 ring-red-500/20",
  };
  return map[method] ?? "bg-muted text-muted-foreground ring-1 ring-border";
}

function statusVariant(code: number): string {
  if (code >= 500) return "text-red-500";
  if (code >= 400) return "text-yellow-500";
  if (code >= 300) return "text-blue-500";
  return "text-green-500";
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i}>
          <td className="py-3 px-4">
            <Skeleton className="h-5 w-12" />
          </td>
          <td className="py-3 px-4">
            <Skeleton className="h-4 w-48 mb-1.5" />
            <Skeleton className="h-3 w-32" />
          </td>
          <td className="py-3 px-4">
            <Skeleton className="h-4 w-36" />
          </td>
          <td className="py-3 px-4">
            <Skeleton className="h-4 w-10" />
          </td>
          <td className="py-3 px-4">
            <Skeleton className="h-4 w-14" />
          </td>
          <td className="py-3 px-4">
            <Skeleton className="h-4 w-20" />
          </td>
        </tr>
      ))}
    </>
  );
}

// ─── Expanded Detail Row ──────────────────────────────────────────────────────

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex gap-2">
      <span className="text-muted-foreground w-20 shrink-0 text-xs">
        {label}
      </span>
      <span
        className={`text-foreground text-xs truncate ${mono ? "font-mono" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

function ExpandedRow({ log }: { log: AuditLogType }) {
  const meta = isValidAuditMetadata(log.metadata) ? log.metadata : null;

  if (!meta) {
    return (
      <tr>
        <td
          colSpan={6}
          className="px-4 py-3 bg-muted/30 text-sm text-muted-foreground italic"
        >
          No metadata available.
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td colSpan={6} className="px-4 py-0">
        <div className="border border-border rounded-lg my-2 overflow-hidden bg-muted/20">
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 p-4 text-sm">
            {/* Request details */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Request
              </p>
              <div className="space-y-1.5">
                <DetailRow label="Method" value={meta.method} />
                <DetailRow label="Path" value={meta.path} mono />
                <DetailRow label="Status" value={String(meta.statusCode)} />
                <DetailRow
                  label="Duration"
                  value={formatDuration(meta.duration)}
                />
                {meta.query && (
                  <DetailRow
                    label="Query"
                    value={JSON.stringify(meta.query)}
                    mono
                  />
                )}
              </div>
            </div>

            {/* Users & Context */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Users
              </p>
              <div className="space-y-1.5">
                {/* Admin info */}
                {log.admin ? (
                  <>
                    <DetailRow label="Admin ID" value={log.admin.id} mono />
                    <DetailRow label="Admin Email" value={log.admin.email} />
                  </>
                ) : (
                  <DetailRow label="Admin" value="System / Anonymous" />
                )}

                {/* IP Address */}
                {log.metadata && (
                  <>
                    <DetailRow
                      label="IP Address"
                      value={log.metadata.ipAddress?.toString() || "Unknown"}
                    />
                    <DetailRow
                      label="User Agent"
                      value={log.metadata.userAgent?.toString() || "Unknown"}
                    />
                  </>
                )}

                {/* Target user info */}
                {log.targetUser ? (
                  <>
                    <DetailRow
                      label="Target ID"
                      value={log.targetUser.id}
                      mono
                    />
                    {log.targetUser.email && (
                      <DetailRow
                        label="Target Email"
                        value={log.targetUser.email}
                      />
                    )}
                    {log.targetUser.userType && (
                      <DetailRow
                        label="Target Type"
                        value={log.targetUser.userType}
                      />
                    )}
                    {log.targetUser.name && (
                      <DetailRow
                        label="Target Name"
                        value={log.targetUser.name}
                      />
                    )}
                  </>
                ) : (
                  <DetailRow label="Target User" value="None" />
                )}
              </div>
            </div>

            {/* Timestamp */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Timestamp
              </p>
              <DetailRow
                label="Created"
                value={new Date(log.createdAt).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              />
              <DetailRow
                label="Recorded"
                value={new Date(meta.timestamp).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              />
            </div>

            {/* Response Summary */}
            {meta.responseSummary && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Response
                </p>
                <DetailRow label="Type" value={meta.responseSummary.type} />
                {meta.responseSummary.count != null && (
                  <DetailRow
                    label="Count"
                    value={String(meta.responseSummary.count)}
                  />
                )}
                {meta.responseSummary.truncated && (
                  <DetailRow label="Truncated" value="Yes" />
                )}
              </div>
            )}

            {/* Error block */}
            {meta.error && (
              <div className="col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Error
                </p>
                <pre className="rounded-md border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-3 py-2 text-red-600 dark:text-red-400 text-xs font-mono whitespace-pre-wrap break-all">
                  {meta.error}
                </pre>
              </div>
            )}

            {/* Request body */}
            {meta.requestBody && Object.keys(meta.requestBody).length > 0 && (
              <div className="col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Request Body
                </p>
                <pre className="rounded-md border border-border bg-muted/50 px-3 py-2 text-foreground text-xs font-mono whitespace-pre-wrap break-all">
                  {JSON.stringify(meta.requestBody, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AuditLog() {
  const [filters, setFilters] = useState<AuditLogFilters>({
    page: 1,
    limit: 20,
  });
  const [searchInput, setSearchInput] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [localFilters, setLocalFilters] = useState({
    actionType: "",
    adminId: "",
    startDate: "",
    endDate: "",
  });

  // Add a ref to track initial mount
  const isInitialMount = useRef(true);

  const { data, isLoading, isFetching, refetch } = useAuditLogs(filters);
  const { data: summary, isLoading: summaryLoading } = useAuditSummary();

  const activeFilterCount = useMemo(
    () =>
      Object.values(localFilters).filter(Boolean).length +
      (filters.search ? 1 : 0),
    [localFilters, filters.search],
  );

  // Apply search when user types and hits Enter or clicks search button
  const handleSearch = () => {
    setFilters((f) => ({
      ...f,
      page: 1,
      search: searchInput || undefined,
    }));
  };

  // Handle Enter key in search input
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // Apply all filters
  const applyFilters = () => {
    setFilters((f) => ({
      ...f,
      page: 1,
      search: searchInput || undefined,
      actionType: localFilters.actionType || undefined,
      adminId: localFilters.adminId || undefined,
      startDate: localFilters.startDate || undefined,
      endDate: localFilters.endDate || undefined,
    }));
    setShowFilters(false);
  };

  // Clear all filters
  const clearAll = () => {
    const defaultFilters = { page: 1, limit: 20 };
    setSearchInput("");
    setLocalFilters({
      actionType: "",
      adminId: "",
      startDate: "",
      endDate: "",
    });
    setFilters(defaultFilters);
  };

  const logs = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-8">
      {/* ── Page Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Audit Log</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track all admin actions and system activity
        </p>
      </div>

      {/* ── Summary Stats ── */}
      {summaryLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="admin-card space-y-3 p-6">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-6 rounded-full" />
              </div>
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </div>
      ) : summary ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Logs"
            value={summary.totalLogs}
            icon={<Activity className="h-6 w-6 text-primary" />}
          />
          <StatCard
            title="Last 30 Days"
            value={summary.logsLast30Days}
            icon={<Clock className="h-6 w-6 text-blue-500" />}
            subtitle="Recent activity"
          />
          <StatCard
            title="Top Action"
            value={summary.topActions[0]?.count ?? 0}
            icon={<Zap className="h-6 w-6 text-yellow-500" />}
            subtitle={summary.topActions[0]?.actionType ?? "—"}
          />
          <StatCard
            title="Most Active Admin"
            value={summary.topAdmins[0]?.count ?? 0}
            icon={<ShieldCheck className="h-6 w-6 text-green-500" />}
            subtitle={summary.topAdmins[0]?.adminEmail ?? "—"}
          />
        </div>
      ) : null}

      {/* ── Log Table Card ── */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <CardTitle>Activity Log</CardTitle>
              <CardDescription>
                {pagination
                  ? `${pagination.total.toLocaleString()} total entries`
                  : "All recorded admin actions"}
              </CardDescription>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Search…"
                  className="h-9 w-52 pl-8 pr-3"
                />
              </div>

              {/* Filter toggle */}
              <Button
                variant={showFilters ? "default" : "outline"}
                size="sm"
                onClick={() => setShowFilters((v) => !v)}
                className="relative"
              >
                <ListFilter className="h-3.5 w-3.5 mr-1.5" />
                Filter
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                    {activeFilterCount}
                  </span>
                )}
              </Button>

              {activeFilterCount > 0 && (
                <Button variant="outline" size="sm" onClick={clearAll}>
                  <X className="h-3.5 w-3.5 mr-1.5" />
                  Clear
                </Button>
              )}

              {/* Refresh */}
              <Button
                variant="outline"
                size="icon"
                onClick={() => refetch()}
                disabled={isFetching}
                title="Refresh logs"
                className="h-9 w-9"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`}
                />
              </Button>

              {/* Per-page */}
              <Select
                value={String(filters.limit)}
                onValueChange={(value) =>
                  setFilters((f) => ({
                    ...f,
                    limit: Number(value),
                    page: 1,
                  }))
                }
              >
                <SelectTrigger className="w-[100px] h-9">
                  <SelectValue placeholder="20 / page" />
                </SelectTrigger>
                <SelectContent>
                  {[10, 20, 50, 100].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} / page
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Search button */}
              <Button size="sm" onClick={handleSearch}>
                Search
              </Button>
            </div>
          </div>

          {/* ── Filter Panel ── */}
          {showFilters && (
            <div className="mt-4 rounded-lg border border-border bg-muted/30 p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  {
                    label: "Action Type",
                    key: "actionType",
                    placeholder: "e.g. PASSWORD_RESET",
                    type: "text",
                  },
                  {
                    label: "Admin ID",
                    key: "adminId",
                    placeholder: "Filter by admin…",
                    type: "text",
                  },
                  {
                    label: "Start Date",
                    key: "startDate",
                    placeholder: "",
                    type: "date",
                  },
                  {
                    label: "End Date",
                    key: "endDate",
                    placeholder: "",
                    type: "date",
                  },
                ].map(({ label, key, placeholder, type }) => (
                  <div key={key}>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      {label}
                    </label>
                    <Input
                      type={type}
                      value={localFilters[key as keyof typeof localFilters]}
                      onChange={(e) =>
                        setLocalFilters((f) => ({
                          ...f,
                          [key]: e.target.value,
                        }))
                      }
                      placeholder={placeholder}
                      className="w-full"
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowFilters(false)}>
                  Cancel
                </Button>
                <Button onClick={applyFilters}>Apply Filters</Button>
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-hidden rounded-b-lg border-t border-border">
            <table className="admin-table">
              <thead className="bg-muted/50">
                <tr>
                  {[
                    "Method",
                    "Action / Target",
                    "Admin",
                    "Status",
                    "Duration",
                    "Time",
                  ].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {isLoading ? (
                  <TableSkeleton />
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <AlertCircle className="h-8 w-8 opacity-40" />
                        <p className="text-sm font-medium">
                          No audit logs found
                        </p>
                        {activeFilterCount > 0 && (
                          <button
                            onClick={clearAll}
                            className="text-xs text-primary hover:underline"
                          >
                            Clear all filters
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const meta = isValidAuditMetadata(log.metadata)
                      ? log.metadata
                      : null;
                    const isExpanded = expandedId === log.id;

                    return (
                      <Fragment key={log.id}>
                        <tr
                          key={log.id}
                          onClick={() =>
                            setExpandedId(isExpanded ? null : log.id)
                          }
                          className={`cursor-pointer transition-colors ${
                            isExpanded ? "bg-muted/40" : "hover:bg-muted/30"
                          }`}
                        >
                          {/* Method */}
                          <td className="py-3 px-4">
                            {meta ? (
                              <span
                                className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-mono font-semibold ${methodVariant(meta.method)}`}
                              >
                                {meta.method}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>

                          {/* Action / Target User */}
                          <td className="py-3 px-4 max-w-xs">
                            <p className="font-medium text-foreground font-mono text-xs truncate">
                              {log.actionType}
                            </p>
                            <div className="mt-0.5 space-y-0.5">
                              {log.targetUser && (
                                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <span className="truncate font-medium">
                                    {log.targetUser.name ||
                                      log.targetUser.email}
                                  </span>
                                  <span className="rounded bg-muted px-1 text-[10px] shrink-0">
                                    {log.targetUser.userType}
                                  </span>
                                </p>
                              )}
                            </div>
                          </td>

                          {/* Admin */}
                          <td className="py-3 px-4">
                            <p className="text-sm text-muted-foreground truncate max-w-[160px]">
                              {log.admin?.email ?? (
                                <span className="italic">anonymous</span>
                              )}
                            </p>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4">
                            <span
                              className={`font-mono text-sm font-medium ${
                                meta
                                  ? statusVariant(meta.statusCode)
                                  : "text-muted-foreground"
                              }`}
                            >
                              {meta?.statusCode ?? "—"}
                            </span>
                          </td>

                          {/* Duration */}
                          <td className="py-3 px-4">
                            <span className="font-mono text-sm text-muted-foreground">
                              {meta ? formatDuration(meta.duration) : "—"}
                            </span>
                          </td>

                          {/* Time */}
                          <td className="py-3 px-4">
                            <span className="text-sm text-muted-foreground">
                              {formatDistanceToNow(
                                new Date(meta?.timestamp ?? log.createdAt),
                                { addSuffix: true },
                              )}
                            </span>
                          </td>
                        </tr>

                        {isExpanded && (
                          <ExpandedRow key={`${log.id}-expanded`} log={log} />
                        )}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Pagination ── */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {(pagination.page - 1) * pagination.limit + 1}–
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
            {pagination.total.toLocaleString()} entries
          </span>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              disabled={pagination.page <= 1}
              onClick={() =>
                setFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))
              }
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {Array.from(
              { length: Math.min(pagination.totalPages, 5) },
              (_, i) => {
                let pageNum = i + 1;
                // Show pages around current page
                if (pagination.totalPages > 5) {
                  const half = Math.floor(5 / 2);
                  let start = Math.max(1, pagination.page - half);
                  const end = Math.min(pagination.totalPages, start + 5 - 1);
                  if (end - start + 1 < 5) {
                    start = Math.max(1, end - 5 + 1);
                  }
                  pageNum = start + i;
                  if (pageNum > pagination.totalPages) return null;
                }

                return (
                  <Button
                    key={pageNum}
                    variant={
                      pageNum === pagination.page ? "default" : "outline"
                    }
                    size="icon"
                    onClick={() => setFilters((f) => ({ ...f, page: pageNum }))}
                    className="h-8 w-8"
                  >
                    {pageNum}
                  </Button>
                );
              },
            )}

            <Button
              variant="outline"
              size="icon"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() =>
                setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))
              }
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
