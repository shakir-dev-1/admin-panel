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
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  Terminal,
  Eye,
  CreditCard,
  AlertTriangle,
  Activity,
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
import {
  useAuditLogs,
  useAuditSummary,
  isValidAuditMetadata,
  type AuditMetadata,
} from "@/hooks/useAuditLogs";

// ─── Action catalogue ────────────────────────────────────────────────────────
// Each entry maps a raw actionType to a human label, icon, and semantic category.
type ActionCategory =
  | "auth"
  | "user"
  | "business"
  | "payment"
  | "view"
  | "system";

interface ActionMeta {
  label: string;
  description: string;
  icon: React.ElementType;
  category: ActionCategory;
}

const ACTION_CATALOGUE: Record<string, ActionMeta> = {
  "POST /admin/auth/login": {
    label: "Admin Signed In",
    description: "Administrator authenticated into the dashboard",
    icon: User,
    category: "auth",
  },
  "GET /admin/metrics": {
    label: "Viewed Metrics",
    description: "Platform metrics were accessed",
    icon: BarChart3,
    category: "view",
  },
  "POST /admin/users/:userId/reset-password": {
    label: "Password Reset",
    description: "User account password was reset by admin",
    icon: Key,
    category: "user",
  },
  "PATCH /admin/users/:userId/email": {
    label: "Email Address Changed",
    description: "User's email address was updated by admin",
    icon: Mail,
    category: "user",
  },
  "PATCH /admin/users/:userId/phone": {
    label: "Phone Number Changed",
    description: "User's phone number was updated by admin",
    icon: Phone,
    category: "user",
  },
  "PATCH /admin/users/:userId/status": {
    label: "Account Status Changed",
    description: "User account was activated, deactivated, or banned",
    icon: UserX,
    category: "user",
  },
  "PATCH /admin/business/:id/cancel-subscription": {
    label: "Subscription Cancelled",
    description: "Business subscription was cancelled by admin",
    icon: RefreshCw,
    category: "business",
  },
  "POST /admin/business/:businessId/payments/:paymentIntentId/refund": {
    label: "Payment Refunded",
    description: "A payment was refunded to the customer",
    icon: CreditCard,
    category: "payment",
  },
  "GET /admin/users": {
    label: "Viewed User List",
    description: "The admin user directory was accessed",
    icon: Eye,
    category: "view",
  },
  "GET /admin/users/:userId": {
    label: "Viewed User Profile",
    description: "A specific user's profile was opened",
    icon: Eye,
    category: "view",
  },
  "GET /admin/dashboard": {
    label: "Viewed Dashboard",
    description: "The admin dashboard was accessed",
    icon: BarChart3,
    category: "view",
  },
  "GET /admin/business/payments": {
    label: "Viewed Payments",
    description: "The payments ledger was accessed",
    icon: CreditCard,
    category: "view",
  },
  "GET /admin/business/disputes": {
    label: "Viewed Disputes",
    description: "The disputes queue was accessed",
    icon: AlertTriangle,
    category: "view",
  },
  "GET /admin/business/refunds": {
    label: "Viewed Refunds",
    description: "The refund history was accessed",
    icon: RefreshCw,
    category: "view",
  },
};

const CATEGORY_STYLES: Record<
  ActionCategory,
  { dot: string; badge: string; label: string }
> = {
  auth: {
    dot: "bg-violet-500",
    badge: "bg-violet-50 text-violet-700 border-violet-200",
    label: "Auth",
  },
  user: {
    dot: "bg-blue-500",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    label: "User",
  },
  business: {
    dot: "bg-amber-500",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    label: "Business",
  },
  payment: {
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    label: "Payment",
  },
  view: {
    dot: "bg-slate-400",
    badge: "bg-slate-50 text-slate-600 border-slate-200",
    label: "View",
  },
  system: {
    dot: "bg-rose-400",
    badge: "bg-rose-50 text-rose-700 border-rose-200",
    label: "System",
  },
};

const getActionMeta = (actionType: string): ActionMeta => {
  return (
    ACTION_CATALOGUE[actionType] ?? {
      label: actionType
        .replace(/^(GET|POST|PATCH|PUT|DELETE)\s+/, "")
        .replace(/\//g, " › ")
        .replace(/:/g, "")
        .trim(),
      description: `API call: ${actionType}`,
      icon: Activity,
      category: "system" as ActionCategory,
    }
  );
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatusPill({ code }: { code: number }) {
  const isSuccess = code < 400;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-mono font-medium border ${
        isSuccess
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-red-50 text-red-700 border-red-200"
      }`}
    >
      {isSuccess ? (
        <CheckCircle2 className="h-3 w-3" />
      ) : (
        <XCircle className="h-3 w-3" />
      )}
      {code}
    </span>
  );
}

function DurationPill({ ms }: { ms: number }) {
  const color =
    ms < 200
      ? "bg-emerald-50 text-emerald-600 border-emerald-200"
      : ms < 1000
        ? "bg-amber-50 text-amber-600 border-amber-200"
        : "bg-red-50 text-red-600 border-red-200";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-mono border ${color}`}
    >
      <Clock className="h-3 w-3" />
      {ms}ms
    </span>
  );
}

function TechnicalDetails({
  metadata,
  actionType,
}: {
  metadata: AuditMetadata | null;
  actionType: string;
}) {
  const [open, setOpen] = useState(false);

  if (!metadata) return null;

  const hasQuery = metadata.query && Object.keys(metadata.query).length > 0;
  const hasBody =
    metadata.requestBody && Object.keys(metadata.requestBody).length > 0;

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {open ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        <Terminal className="h-3 w-3" />
        Technical details
      </button>

      {open && (
        <div className="mt-2 rounded-lg border bg-muted/30 p-3 space-y-2 text-xs font-mono">
          {/* Route */}
          <div className="flex items-start gap-2">
            <span className="text-muted-foreground w-20 shrink-0">Route</span>
            <span className="text-foreground break-all">
              <span className="font-semibold text-violet-600">
                {metadata.method}
              </span>{" "}
              {metadata.path ?? actionType.split(" ").slice(1).join(" ")}
            </span>
          </div>

          {/* Status */}
          {metadata.statusCode && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-20 shrink-0">
                Status
              </span>
              <StatusPill code={metadata.statusCode} />
            </div>
          )}

          {/* Duration */}
          {metadata.duration && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-20 shrink-0">
                Duration
              </span>
              <DurationPill ms={metadata.duration} />
            </div>
          )}

          {/* Timestamp */}
          {metadata.timestamp && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-20 shrink-0">Time</span>
              <span className="text-foreground">{metadata.timestamp}</span>
            </div>
          )}

          {/* Query params */}
          {hasQuery && (
            <div className="flex items-start gap-2">
              <span className="text-muted-foreground w-20 shrink-0">Query</span>
              <span className="text-foreground break-all">
                {Object.entries(metadata.query!)
                  .map(([k, v]) => `${k}=${Array.isArray(v) ? v.join(",") : v}`)
                  .join(" · ")}
              </span>
            </div>
          )}

          {/* Request body */}
          {hasBody && (
            <div className="flex items-start gap-2">
              <span className="text-muted-foreground w-20 shrink-0">Body</span>
              <pre className="text-foreground whitespace-pre-wrap break-all overflow-auto max-h-32">
                {JSON.stringify(metadata.requestBody, null, 2)}
              </pre>
            </div>
          )}

          {/* Response summary */}
          {metadata.responseSummary && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-20 shrink-0">
                Response
              </span>
              <span className="text-foreground">
                {metadata.responseSummary.type}
                {metadata.responseSummary.count !== undefined &&
                  ` · ${metadata.responseSummary.count} items`}
                {metadata.responseSummary.truncated && " · truncated"}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface LogEntryProps {
  log: {
    id: string;
    actionType: string;
    createdAt: string;
    admin: { id: string; email: string } | null;
    targetUser: {
      id: string;
      name: string;
      email: string;
      userType: string;
    } | null;
    metadata: AuditMetadata | null;
  };
  isLast: boolean;
}

function LogEntry({ log, isLast }: LogEntryProps) {
  const meta = getActionMeta(log.actionType);
  const Icon = meta.icon;
  const category = CATEGORY_STYLES[meta.category];
  const metadata = isValidAuditMetadata(log.metadata) ? log.metadata : null;
  const hasError = !!metadata?.error;

  return (
    <div className="relative flex gap-4">
      {/* Timeline spine */}
      {!isLast && (
        <div className="absolute left-5 top-10 bottom-0 w-px bg-border" />
      )}

      {/* Icon bubble */}
      <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-background shadow-sm">
        <Icon className="h-4 w-4 text-muted-foreground" />
        {/* Category dot */}
        <span
          className={`absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-background ${category.dot}`}
        />
      </div>

      {/* Card */}
      <div
        className={`mb-4 flex-1 rounded-xl border bg-card px-4 py-3 shadow-sm transition-colors ${
          hasError ? "border-red-200 bg-red-50/30" : "hover:bg-muted/20"
        }`}
      >
        {/* Top row: headline + time */}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1 min-w-0">
            {/* Human label — the headline */}
            <p className="font-semibold text-foreground leading-snug">
              {meta.label}
            </p>
            {/* One-line context description */}
            <p className="text-xs text-muted-foreground mt-0.5">
              {meta.description}
            </p>
          </div>

          {/* Timestamp — right-aligned */}
          <div className="sm:text-right shrink-0 sm:ml-4">
            <p className="text-sm font-medium text-foreground">
              {formatDistanceToNow(new Date(log.createdAt), {
                addSuffix: true,
              })}
            </p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(log.createdAt), "MMM d, yyyy · HH:mm")}
            </p>
          </div>
        </div>

        {/* Middle row: actors + inline pills */}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          {/* Category badge */}
          <span
            className={`rounded-full border px-2 py-0.5 text-xs font-medium ${category.badge}`}
          >
            {category.label}
          </span>

          {/* Admin who acted */}
          {log.admin ? (
            <span className="text-muted-foreground">
              by{" "}
              <span className="font-medium text-foreground">
                {log.admin.email}
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground italic">by System</span>
          )}

          {/* Target user */}
          {log.targetUser && (
            <>
              <span className="text-muted-foreground">→</span>
              <span className="text-muted-foreground">
                <span className="font-medium text-foreground">
                  {log.targetUser.name || log.targetUser.email}
                </span>
                {log.targetUser.userType && (
                  <span className="ml-1 text-muted-foreground">
                    ({log.targetUser.userType.toLowerCase()})
                  </span>
                )}
              </span>
            </>
          )}

          {/* Quick status / duration from metadata */}
          {metadata?.statusCode && <StatusPill code={metadata.statusCode} />}
          {metadata?.duration && <DurationPill ms={metadata.duration} />}
        </div>

        {/* Error banner */}
        {hasError && (
          <div className="mt-2 flex items-start gap-2 rounded-md bg-red-100 px-3 py-2">
            <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600" />
            <div>
              <p className="text-xs font-semibold text-red-700">
                {metadata!.error}
              </p>
              {metadata!.stack && process.env.NODE_ENV === "development" && (
                <pre className="mt-1 max-h-24 overflow-auto text-xs text-red-600">
                  {metadata!.stack}
                </pre>
              )}
            </div>
          </div>
        )}

        {/* Collapsible technical details */}
        <TechnicalDetails metadata={metadata} actionType={log.actionType} />
      </div>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

const getActionLabel = (actionType: string) =>
  ACTION_CATALOGUE[actionType]?.label ?? actionType;

export default function AuditLog() {
  const [search, setSearch] = useState("");
  const [actionTypeFilter, setActionTypeFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [showSummary, setShowSummary] = useState(false);

  const {
    data: logsResponse,
    isLoading: loading,
    error,
  } = useAuditLogs({
    page,
    limit: 20,
    search: search || undefined,
    actionType: actionTypeFilter !== "all" ? actionTypeFilter : undefined,
  });

  const { data: summary, isLoading: summaryLoading } = useAuditSummary();

  const logs = logsResponse?.data ?? [];
  const pagination = logsResponse?.pagination;

  const actionTypes = Array.from(
    new Set(logs.map((log) => log.actionType)),
  ).sort();

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  if (error && !loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <XCircle className="mx-auto h-10 w-10 text-destructive" />
          <h2 className="mt-3 text-lg font-semibold text-destructive">
            Error loading audit logs
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
          <Button className="mt-4" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <ClipboardList className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Audit Log</h1>
            <p className="text-sm text-muted-foreground">
              A record of every admin action on the platform
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
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* ── Summary Stats ───────────────────────────────────────── */}
      {showSummary && summary && !summaryLoading && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Actions Logged
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {summary.totalLogs?.toLocaleString() ?? "0"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {summary.logsLast30Days ?? 0} in the last 30 days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Most Common Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {summary.topActions?.slice(0, 3).map((action) => (
                <div
                  key={action.actionType}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="truncate text-sm">
                    {getActionLabel(action.actionType)}
                  </span>
                  <Badge variant="secondary" className="shrink-0">
                    {action.count}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Most Active Admins
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {summary.topAdmins?.slice(0, 3).map((admin) => (
                <div
                  key={admin.adminId}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="truncate text-sm">{admin.adminEmail}</span>
                  <Badge variant="secondary" className="shrink-0">
                    {admin.count}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Filters ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onChange={handleSearch}
          placeholder="Search by admin, user, or action…"
          className="flex-1"
        />
        <div className="flex gap-2">
          <Select
            value={actionTypeFilter}
            onValueChange={(value) => {
              setActionTypeFilter(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              {actionTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {getActionLabel(type)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" title="More filters">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── Log Timeline ────────────────────────────────────────── */}
      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="mt-3 text-sm text-muted-foreground">
              Loading audit logs…
            </p>
          </div>
        </div>
      ) : !logs || logs.length === 0 ? (
        <div className="flex min-h-[300px] items-center justify-center rounded-xl border border-dashed">
          <div className="text-center">
            <ClipboardList className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 text-sm font-medium text-muted-foreground">
              {search
                ? "No entries match your search"
                : "No audit log entries yet"}
            </p>
          </div>
        </div>
      ) : (
        <div className="pl-1">
          {logs.map((log, idx) => (
            <LogEntry key={log.id} log={log} isLast={idx === logs.length - 1} />
          ))}
        </div>
      )}

      {/* ── Pagination ──────────────────────────────────────────── */}
      {logs.length > 0 && pagination && (
        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Showing{" "}
            <span className="font-medium text-foreground">
              {(page - 1) * pagination.limit + 1}–
              {Math.min(page * pagination.limit, pagination.total)}
            </span>{" "}
            of{" "}
            <span className="font-medium text-foreground">
              {pagination.total.toLocaleString()}
            </span>{" "}
            entries
          </p>
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
