"use client";

import { useState, useMemo } from "react";
import {
  useAuditLogs,
  useAuditSummary,
  isValidAuditMetadata,
  type AuditLog as AuditLogType,
  type AuditLogFilters,
} from "@/hooks/useAuditLogs";

// ─── Icons (inline SVGs to avoid dependencies) ───────────────────────────────

const IconSearch = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <path
      d="M10 6.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Zm-.691 3.516a4.5 4.5 0 1 1 .707-.707l2.838 2.837a.5.5 0 0 1-.708.708L9.31 10.016Z"
      fill="currentColor"
      fillRule="evenodd"
      clipRule="evenodd"
    />
  </svg>
);
const IconFilter = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <path
      d="M1 3.5A.5.5 0 0 1 1.5 3h12a.5.5 0 0 1 0 1h-12A.5.5 0 0 1 1 3.5Zm2 4A.5.5 0 0 1 3.5 7h8a.5.5 0 0 1 0 1h-8A.5.5 0 0 1 3 7.5Zm2 4a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 1-.5-.5Z"
      fill="currentColor"
      fillRule="evenodd"
      clipRule="evenodd"
    />
  </svg>
);
const IconChevronLeft = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <path
      d="M9.854 3.146a.5.5 0 0 1 0 .708L6.707 7l3.147 3.146a.5.5 0 0 1-.708.708l-3.5-3.5a.5.5 0 0 1 0-.708l3.5-3.5a.5.5 0 0 1 .708 0Z"
      fill="currentColor"
      fillRule="evenodd"
      clipRule="evenodd"
    />
  </svg>
);
const IconChevronRight = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <path
      d="M5.146 3.146a.5.5 0 0 0 0 .708L8.293 7 5.146 10.146a.5.5 0 0 0 .708.708l3.5-3.5a.5.5 0 0 0 0-.708l-3.5-3.5a.5.5 0 0 0-.708 0Z"
      fill="currentColor"
      fillRule="evenodd"
      clipRule="evenodd"
    />
  </svg>
);
const IconX = () => (
  <svg width="12" height="12" viewBox="0 0 15 15" fill="none">
    <path
      d="M12.854 2.146a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.708-.708l10-10a.5.5 0 0 1 .708 0Z"
      fill="currentColor"
      fillRule="evenodd"
      clipRule="evenodd"
    />
    <path
      d="M2.146 2.146a.5.5 0 0 0 0 .708l10 10a.5.5 0 0 0 .708-.708l-10-10a.5.5 0 0 0-.708 0Z"
      fill="currentColor"
      fillRule="evenodd"
      clipRule="evenodd"
    />
  </svg>
);
const IconActivity = () => (
  <svg width="16" height="16" viewBox="0 0 15 15" fill="none">
    <path
      d="M2.5 7.5L5 4l3 6 2-3.5 1.5 2h1.5"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const IconUser = () => (
  <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
    <path
      d="M7.5 1a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm-2 3a2 2 0 1 1 4 0 2 2 0 0 1-4 0Zm-3 8.5A4.5 4.5 0 0 1 7 8h1a4.5 4.5 0 0 1 4.5 4.5.5.5 0 0 1-1 0A3.5 3.5 0 0 0 8 9H7a3.5 3.5 0 0 0-3.5 3.5.5.5 0 0 1-1 0Z"
      fill="currentColor"
      fillRule="evenodd"
      clipRule="evenodd"
    />
  </svg>
);
const IconClock = () => (
  <svg width="13" height="13" viewBox="0 0 15 15" fill="none">
    <path
      d="M7.5 1.5a6 6 0 1 0 0 12 6 6 0 0 0 0-12Zm-7 6a7 7 0 1 1 14 0 7 7 0 0 1-14 0Zm7-3.5a.5.5 0 0 1 .5.5v3.293l2.354 2.353a.5.5 0 0 1-.708.708L7.146 8.354A.5.5 0 0 1 7 8V4.5a.5.5 0 0 1 .5-.5Z"
      fill="currentColor"
      fillRule="evenodd"
      clipRule="evenodd"
    />
  </svg>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function methodColor(method: string) {
  const map: Record<string, string> = {
    GET: "bg-sky-500/10 text-sky-400 ring-sky-500/20",
    POST: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
    PUT: "bg-amber-500/10 text-amber-400 ring-amber-500/20",
    PATCH: "bg-violet-500/10 text-violet-400 ring-violet-500/20",
    DELETE: "bg-rose-500/10 text-rose-400 ring-rose-500/20",
  };
  return map[method] ?? "bg-zinc-500/10 text-zinc-400 ring-zinc-500/20";
}

function statusColor(code: number) {
  if (code >= 500) return "text-rose-400";
  if (code >= 400) return "text-amber-400";
  if (code >= 300) return "text-sky-400";
  return "text-emerald-400";
}

function formatDuration(ms: number) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
      <p className="text-[11px] font-medium uppercase tracking-widest text-zinc-500">
        {label}
      </p>
      <p className="mt-1 font-mono text-2xl font-semibold text-white">
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-zinc-600">{sub}</p>}
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 animate-pulse">
      <div className="h-4 w-12 rounded bg-white/5" />
      <div className="h-4 w-40 rounded bg-white/5" />
      <div className="h-4 w-28 rounded bg-white/5 ml-auto" />
      <div className="h-4 w-16 rounded bg-white/5" />
      <div className="h-4 w-20 rounded bg-white/5" />
    </div>
  );
}

function ExpandedRow({ log }: { log: AuditLogType }) {
  const meta = isValidAuditMetadata(log.metadata) ? log.metadata : null;
  if (!meta)
    return (
      <div className="px-4 py-3 text-xs text-zinc-600 italic">
        No metadata available.
      </div>
    );

  return (
    <div className="grid grid-cols-2 gap-x-8 gap-y-3 px-4 py-4 text-xs border-t border-white/[0.06] bg-white/[0.02]">
      <div>
        <p className="text-zinc-500 mb-1 uppercase tracking-wider text-[10px]">
          Request
        </p>
        <div className="space-y-1">
          <Row k="Method" v={meta.method} />
          <Row k="Path" v={meta.path} mono />
          <Row k="Status" v={String(meta.statusCode)} />
          <Row k="Duration" v={formatDuration(meta.duration)} />
          {meta.query && <Row k="Query" v={JSON.stringify(meta.query)} mono />}
        </div>
      </div>
      <div>
        <p className="text-zinc-500 mb-1 uppercase tracking-wider text-[10px]">
          Context
        </p>
        <div className="space-y-1">
          <Row k="Timestamp" v={formatTimestamp(meta.timestamp)} />
          {log.admin && <Row k="Admin" v={log.admin.email} />}
          {log.targetUser && (
            <Row
              k="Target"
              v={`${log.targetUser.name} (${log.targetUser.userType})`}
            />
          )}
          {meta.responseSummary && (
            <Row
              k="Response"
              v={`${meta.responseSummary.type}${meta.responseSummary.count != null ? ` · ${meta.responseSummary.count} items` : ""}`}
            />
          )}
        </div>
      </div>
      {meta.error && (
        <div className="col-span-2">
          <p className="text-zinc-500 mb-1 uppercase tracking-wider text-[10px]">
            Error
          </p>
          <pre className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-3 py-2 text-rose-400 font-mono text-[11px] whitespace-pre-wrap break-all">
            {meta.error}
          </pre>
        </div>
      )}
      {meta.requestBody && Object.keys(meta.requestBody).length > 0 && (
        <div className="col-span-2">
          <p className="text-zinc-500 mb-1 uppercase tracking-wider text-[10px]">
            Request Body
          </p>
          <pre className="rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-2 text-zinc-300 font-mono text-[11px] whitespace-pre-wrap break-all">
            {JSON.stringify(meta.requestBody, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex gap-2">
      <span className="text-zinc-600 w-20 shrink-0">{k}</span>
      <span
        className={`text-zinc-300 truncate ${mono ? "font-mono text-[10px]" : ""}`}
      >
        {v}
      </span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AuditLog() {
  const [filters, setFilters] = useState<AuditLogFilters>({
    page: 1,
    limit: 20,
  });
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [localFilters, setLocalFilters] = useState({
    actionType: "",
    adminId: "",
    startDate: "",
    endDate: "",
  });

  const { data, isLoading, isFetching } = useAuditLogs(filters);
  const { data: summary } = useAuditSummary();

  const activeFilterCount = useMemo(
    () => Object.values(localFilters).filter(Boolean).length + (search ? 1 : 0),
    [localFilters, search],
  );

  function applySearch() {
    setFilters((f) => ({ ...f, page: 1, search: search || undefined }));
  }

  function applyFilters() {
    setFilters((f) => ({
      ...f,
      page: 1,
      search: search || undefined,
      actionType: localFilters.actionType || undefined,
      adminId: localFilters.adminId || undefined,
      startDate: localFilters.startDate || undefined,
      endDate: localFilters.endDate || undefined,
    }));
    setShowFilters(false);
  }

  function clearAll() {
    setSearch("");
    setLocalFilters({
      actionType: "",
      adminId: "",
      startDate: "",
      endDate: "",
    });
    setFilters({ page: 1, limit: 20 });
  }

  const logs = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white font-['DM_Sans',_sans-serif]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
        .fade-in { animation: fadeIn 0.2s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        .row-hover { transition: background 0.12s; }
        .row-hover:hover { background: rgba(255,255,255,0.03); }
      `}</style>

      {/* ── Header ── */}
      <header className="border-b border-white/[0.06] px-6 py-4 flex items-center justify-between sticky top-0 z-20 bg-[#0a0a0b]/90 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400">
            <IconActivity />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight">Audit Log</h1>
            <p className="text-[11px] text-zinc-500">Admin activity trail</p>
          </div>
        </div>
        {isFetching && !isLoading && (
          <span className="flex items-center gap-1.5 text-xs text-zinc-500">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
            Syncing
          </span>
        )}
      </header>

      <div className="mx-auto max-w-6xl px-6 py-6 space-y-5">
        {/* ── Stats ── */}
        {summary && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              label="Total Logs"
              value={summary.totalLogs.toLocaleString()}
            />
            <StatCard
              label="Last 30 Days"
              value={summary.logsLast30Days.toLocaleString()}
            />
            <StatCard
              label="Top Action"
              value={summary.topActions[0]?.count ?? "—"}
              sub={summary.topActions[0]?.actionType}
            />
            <StatCard
              label="Top Admin"
              value={summary.topAdmins[0]?.count ?? "—"}
              sub={summary.topAdmins[0]?.adminEmail}
            />
          </div>
        )}

        {/* ── Toolbar ── */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">
              <IconSearch />
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applySearch()}
              placeholder="Search actions, paths, admins…"
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] py-2 pl-8 pr-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/60 focus:bg-white/[0.06] transition"
            />
          </div>

          {/* Filter button */}
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`relative flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition
              ${
                showFilters
                  ? "border-indigo-500/60 bg-indigo-500/10 text-indigo-300"
                  : "border-white/[0.08] bg-white/[0.04] text-zinc-400 hover:text-white hover:border-white/20"
              }`}
          >
            <IconFilter />
            <span>Filter</span>
            {activeFilterCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-500 px-1 text-[10px] font-semibold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>

          {activeFilterCount > 0 && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs text-zinc-500 hover:text-white transition"
            >
              <IconX />
              Clear
            </button>
          )}

          <div className="ml-auto flex items-center gap-2">
            <select
              value={filters.limit}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  limit: Number(e.target.value),
                  page: 1,
                }))
              }
              className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-2 py-2 text-xs text-zinc-400 focus:outline-none"
            >
              {[10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n} / page
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Filter Panel ── */}
        {showFilters && (
          <div className="fade-in rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-4">
            <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
              Filters
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <label className="mb-1 block text-[11px] text-zinc-500">
                  Action Type
                </label>
                <input
                  value={localFilters.actionType}
                  onChange={(e) =>
                    setLocalFilters((f) => ({
                      ...f,
                      actionType: e.target.value,
                    }))
                  }
                  placeholder="e.g. GET /admin/users"
                  className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs text-white placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500/60 transition"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-zinc-500">
                  Admin ID
                </label>
                <input
                  value={localFilters.adminId}
                  onChange={(e) =>
                    setLocalFilters((f) => ({ ...f, adminId: e.target.value }))
                  }
                  placeholder="Filter by admin…"
                  className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs text-white placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500/60 transition"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-zinc-500">
                  Start Date
                </label>
                <input
                  type="date"
                  value={localFilters.startDate}
                  onChange={(e) =>
                    setLocalFilters((f) => ({
                      ...f,
                      startDate: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500/60 transition [color-scheme:dark]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-zinc-500">
                  End Date
                </label>
                <input
                  type="date"
                  value={localFilters.endDate}
                  onChange={(e) =>
                    setLocalFilters((f) => ({ ...f, endDate: e.target.value }))
                  }
                  className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500/60 transition [color-scheme:dark]"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowFilters(false)}
                className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs text-zinc-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={applyFilters}
                className="rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-400 transition"
              >
                Apply
              </button>
            </div>
          </div>
        )}

        {/* ── Table ── */}
        <div className="rounded-xl border border-white/[0.06] overflow-hidden">
          {/* Column headers */}
          <div className="grid grid-cols-[80px_1fr_180px_72px_90px_72px] gap-0 border-b border-white/[0.06] px-4 py-2">
            {[
              "Method",
              "Action / Path",
              "Admin",
              "Status",
              "Duration",
              "Time",
            ].map((h) => (
              <span
                key={h}
                className="text-[10px] font-medium uppercase tracking-widest text-zinc-600"
              >
                {h}
              </span>
            ))}
          </div>

          {/* Rows */}
          <div className="divide-y divide-white/[0.04]">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-zinc-600">
                <IconActivity />
                <p className="mt-3 text-sm">No audit logs found</p>
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearAll}
                    className="mt-2 text-xs text-indigo-400 hover:underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              logs.map((log) => {
                const meta = isValidAuditMetadata(log.metadata)
                  ? log.metadata
                  : null;
                const isExpanded = expandedId === log.id;
                return (
                  <div
                    key={log.id}
                    className={`transition-colors ${isExpanded ? "bg-white/[0.03]" : ""}`}
                  >
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : log.id)}
                      className="row-hover w-full text-left grid grid-cols-[80px_1fr_180px_72px_90px_72px] gap-0 px-4 py-3 items-center"
                    >
                      {/* Method */}
                      <span>
                        {meta ? (
                          <span
                            className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-mono font-semibold ring-1 ${methodColor(meta.method)}`}
                          >
                            {meta.method}
                          </span>
                        ) : (
                          <span className="text-zinc-600 text-xs">—</span>
                        )}
                      </span>

                      {/* Action */}
                      <span className="flex flex-col min-w-0">
                        <span className="font-mono text-xs text-zinc-300 truncate">
                          {log.actionType}
                        </span>
                        {log.targetUser && (
                          <span className="flex items-center gap-1 text-[10px] text-zinc-600 mt-0.5">
                            <IconUser />
                            {log.targetUser.name}
                            <span className="rounded bg-white/[0.06] px-1 text-zinc-600">
                              {log.targetUser.userType}
                            </span>
                          </span>
                        )}
                      </span>

                      {/* Admin */}
                      <span className="text-xs text-zinc-500 truncate">
                        {log.admin?.email ?? (
                          <span className="text-zinc-700 italic">
                            anonymous
                          </span>
                        )}
                      </span>

                      {/* Status */}
                      <span
                        className={`font-mono text-xs font-medium ${meta ? statusColor(meta.statusCode) : "text-zinc-600"}`}
                      >
                        {meta?.statusCode ?? "—"}
                      </span>

                      {/* Duration */}
                      <span className="text-xs text-zinc-600 font-mono">
                        {meta ? formatDuration(meta.duration) : "—"}
                      </span>

                      {/* Time */}
                      <span className="flex items-center gap-1 text-xs text-zinc-600">
                        <IconClock />
                        {meta
                          ? timeAgo(meta.timestamp)
                          : timeAgo(log.createdAt)}
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="fade-in">
                        <ExpandedRow log={log} />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Pagination ── */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>
              {(pagination.page - 1) * pagination.limit + 1}–
              {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
              of {pagination.total.toLocaleString()} entries
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={pagination.page <= 1}
                onClick={() =>
                  setFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))
                }
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <IconChevronLeft />
              </button>

              {Array.from(
                { length: Math.min(pagination.totalPages, 7) },
                (_, i) => {
                  const p = i + 1;
                  return (
                    <button
                      key={p}
                      onClick={() => setFilters((f) => ({ ...f, page: p }))}
                      className={`flex h-7 w-7 items-center justify-center rounded-lg border text-xs transition
                      ${
                        p === pagination.page
                          ? "border-indigo-500/60 bg-indigo-500/20 text-indigo-300 font-medium"
                          : "border-white/[0.08] bg-white/[0.04] text-zinc-500 hover:text-white"
                      }`}
                    >
                      {p}
                    </button>
                  );
                },
              )}

              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() =>
                  setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))
                }
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <IconChevronRight />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
