/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  Users,
  Building2,
  User,
  Star,
  UserCheck,
  UserX,
  LogIn,
  Shield,
  Mail,
  Ban,
  Clock,
} from "lucide-react";
import { StatCard } from "@/app/components/admin/StatCard";
import { useAllMetrics, useLoginAnalytics } from "@/hooks/useMetrics";
import { useRecentUsers } from "@/hooks/useUsers";
import type { RecentUser } from "@/hooks/useUsers";
import { formatDistanceToNow, format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { UserTypeBadge } from "@/app/components/admin/UserTypeBadge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = ["#00C49F", "#0088FE", "#8884D8", "#FFBB28", "#FF8042"];

// ─── Chart height constant ────────────────────────────────────────────────────
// ResponsiveContainer only needs width="100%"; give it a fixed pixel height so
// Recharts never sees -1 dimensions from an unresolved percentage chain.
const CHART_HEIGHT = 350;

export default function Dashboard() {
  // Single call for all metrics
  const {
    metrics,
    loading: metricsLoading,
    error: metricsError,
  } = useAllMetrics();

  // Login analytics for last 7 days
  const {
    analytics: loginAnalytics,
    loading: analyticsLoading,
    error: analyticsError,
  } = useLoginAnalytics(7);

  // Recent users (separate call since it's not part of metrics)
  const {
    data: recentLogins = [],
    isLoading: usersLoading,
    error: usersError,
  } = useRecentUsers(5);

  const loading = metricsLoading || usersLoading || analyticsLoading;
  const error = metricsError || usersError || analyticsError;

  // Show loading state
  if (loading) {
    return (
      <div className="space-y-8">
        {/* Header Skeleton */}
        <div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="mt-2 h-4 w-48" />
        </div>

        {/* Stats Grid Skeleton */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="admin-card space-y-3 p-6">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-6 rounded-full" />
              </div>
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </div>

        {/* Secondary Stats Grid Skeleton */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="admin-card space-y-3 p-6">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-6 w-6 rounded-full" />
              </div>
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-32" />
            </div>
          ))}
        </div>

        {/* Charts Skeleton */}
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="admin-card">
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-64 mb-6" />
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="admin-card">
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-64 mb-6" />
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="admin-card lg:col-span-2">
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-64 mb-6" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>

        {/* Table Skeleton */}
        <div className="admin-card">
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-4 w-48 mb-6" />
          <div className="space-y-4">
            <div className="flex gap-4 border-b pb-4">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-1/3" />
            </div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-4 py-2">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <div className="flex-1">
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
                <div className="flex-1">
                  <Skeleton className="h-4 w-24 mt-2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500">
        Error loading dashboard data:{" "}
        {error instanceof Error ? error.message : String(error)}
      </div>
    );
  }

  if (!metrics) return <div className="p-4">No stats available</div>;

  const stats = metrics;
  const businessMetrics = metrics.business;

  // Format login analytics data for the chart
  const chartData =
    loginAnalytics?.loginsByDay.map((day) => ({
      ...day,
      date: format(new Date(day.date), "MMM d"),
      fullDate: format(new Date(day.date), "MMMM d, yyyy"),
    })) || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Dashboard Overview
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitor platform usage, user activity, and business metrics
        </p>
      </div>

      {/* Main User Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          icon={<Users className="h-6 w-6 text-primary" />}
          subtitle={`${stats.totalConsumers} consumers, ${stats.totalBusinessUsers} business, ${stats.totalInfluencers} influencers`}
        />
        <StatCard
          title="Active Users"
          value={stats.activeUsers}
          icon={<UserCheck className="h-6 w-6 text-status-active" />}
          subtitle={`${Math.round((stats.activeUsers / stats.totalUsers) * 100)}% of total`}
        />
        <StatCard
          title="Daily Logins"
          value={stats.dailyLogins}
          icon={<LogIn className="h-6 w-6 text-chart-3" />}
          subtitle={`${stats.dailyConsumerLogins} consumers, ${stats.dailyBusinessLogins} business, ${stats.dailyInfluencerLogins} influencers`}
        />
        <StatCard
          title="Never Logged In"
          value={stats.neverLoggedIn}
          icon={<Clock className="h-6 w-6 text-muted-foreground" />}
          subtitle={`${Math.round((stats.neverLoggedIn / stats.totalUsers) * 100)}% of total`}
        />
      </div>

      {/* User Type Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Consumers"
          value={stats.totalConsumers}
          icon={<User className="h-6 w-6 text-chart-2" />}
          subtitle={`${stats.activeConsumers} active, ${stats.bannedConsumers} banned`}
        />
        <StatCard
          title="Business Users"
          value={stats.totalBusinessUsers}
          icon={<Building2 className="h-6 w-6 text-chart-1" />}
          subtitle={`${stats.activeBusinessUsers} active, ${stats.businessUsersNeverLoggedIn} never logged in`}
        />
        <StatCard
          title="Influencers"
          value={stats.totalInfluencers}
          icon={<Star className="h-6 w-6 text-chart-4" />}
          subtitle={`${stats.activeInfluencers} active, ${stats.influencersNeverLoggedIn} never logged in`}
        />
      </div>

      {/* Security & Verification Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Email Verified"
          value={stats.emailConfirmed}
          icon={<Mail className="h-6 w-6 text-green-500" />}
          subtitle={`${Math.round((stats.emailConfirmed / stats.totalUsers) * 100)}% of users`}
        />
        <StatCard
          title="2FA Enabled"
          value={stats.twoFactorEnabled}
          icon={<Shield className="h-6 w-6 text-blue-500" />}
          subtitle={`${Math.round((stats.twoFactorEnabled / stats.totalUsers) * 100)}% of users`}
        />
        <StatCard
          title="Banned Consumers"
          value={stats.bannedConsumers}
          icon={<Ban className="h-6 w-6 text-red-500" />}
          subtitle={`${Math.round((stats.bannedConsumers / stats.totalConsumers) * 100)}% of consumers`}
        />
        <StatCard
          title="Inactive Users"
          value={stats.inactiveUsers}
          icon={<UserX className="h-6 w-6 text-status-inactive" />}
          subtitle={`${Math.round((stats.inactiveUsers / stats.totalUsers) * 100)}% of total`}
        />
      </div>

      {/* Business Metrics Section */}
      {businessMetrics && (
        <>
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Business Metrics
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Businesses"
              value={businessMetrics.totalBusinesses}
              icon={<Building2 className="h-6 w-6 text-primary" />}
            />
            <StatCard
              title="Verified Businesses"
              value={businessMetrics.verifiedBusinesses}
              icon={<Shield className="h-6 w-6 text-green-500" />}
              subtitle={`${businessMetrics.verificationRate.toFixed(1)}% verified`}
            />
            <StatCard
              title="Active Subscriptions"
              value={businessMetrics.businessesWithSubscriptions}
              icon={<Star className="h-6 w-6 text-yellow-500" />}
              subtitle={`${businessMetrics.subscriptionRate.toFixed(1)}% of businesses`}
            />
            <StatCard
              title="Payout Info Set"
              value={businessMetrics.businessesWithPayoutInfo}
              icon={<Users className="h-6 w-6 text-blue-500" />}
              subtitle={`${businessMetrics.payoutInfoRate.toFixed(1)}% of businesses`}
            />
          </div>
        </>
      )}

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2 mt-8">
        {/* User Type Distribution Chart */}
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>User Type Distribution</CardTitle>
            <CardDescription>
              Breakdown of users by account type
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ width: "100%", height: CHART_HEIGHT }}>
              <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                <PieChart>
                  <Pie
                    data={stats.userTypeDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ payload, percent = 0 }) => {
                      const data = payload as any;
                      return `${data.type}: ${(percent * 100).toFixed(0)}%`;
                    }}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                    nameKey="type"
                  >
                    {stats.userTypeDistribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name, props) => {
                      const payload = props.payload as any;
                      return [value, payload.type];
                    }}
                  />
                  <Legend
                    formatter={(value, entry) => {
                      const payload = entry.payload as any;
                      return payload?.type || value;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Consumer Status Distribution Chart */}
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Consumer Status</CardTitle>
            <CardDescription>
              Active, banned, and unverified consumers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ width: "100%", height: CHART_HEIGHT }}>
              <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                <PieChart>
                  <Pie
                    data={stats.consumerStatusDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ payload, percent = 0 }) => {
                      const data = payload as any;
                      return `${data.status}: ${(percent * 100).toFixed(0)}%`;
                    }}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                    nameKey="status"
                  >
                    {stats.consumerStatusDistribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name, props) => {
                      const payload = props.payload as any;
                      return [value, payload.status];
                    }}
                  />
                  <Legend
                    formatter={(value, entry) => {
                      const payload = entry.payload as any;
                      return payload?.status || value;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Daily Logins Chart */}
        <Card className="w-full lg:col-span-2 min-w-0">
          <CardHeader>
            <CardTitle>Daily Logins (Last 7 Days)</CardTitle>
            <CardDescription>
              Login activity by user type
              {loginAnalytics && (
                <span className="ml-2 text-sm font-medium">
                  Total: {loginAnalytics.totalLoginsLast7Days} logins
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ width: "100%", height: CHART_HEIGHT }}>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                  <BarChart
                    data={chartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip
                      labelFormatter={(label) => {
                        const item = chartData.find((d) => d.date === label);
                        return item?.fullDate || label;
                      }}
                    />
                    <Legend />
                    <Bar
                      dataKey="consumer_logins"
                      name="Consumers"
                      fill="#3dd787"
                      stackId="stack"
                    />
                    <Bar
                      dataKey="business_logins"
                      name="Business"
                      fill="#639ce6"
                      stackId="stack"
                    />
                    <Bar
                      dataKey="influencer_logins"
                      name="Influencers"
                      fill="#8884D8"
                      stackId="stack"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  No login data available for the last 7 days
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="admin-card">
        <h2 className="text-lg font-semibold text-foreground">Recent Logins</h2>
        <p className="text-sm text-muted-foreground">
          Users who logged in recently
        </p>
        <div className="mt-4 overflow-hidden rounded-lg border">
          <table className="admin-table">
            <thead className="bg-muted/50">
              <tr>
                <th>User</th>
                <th>Type</th>
                <th>Last Login</th>
              </tr>
            </thead>
            <tbody>
              {recentLogins.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No recent logins found
                  </td>
                </tr>
              ) : (
                recentLogins.map((user: RecentUser) => (
                  <tr key={user.id}>
                    <td>
                      <div>
                        <p className="font-medium text-foreground">
                          {user.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </td>
                    <td>
                      <UserTypeBadge type={user.userType} />
                    </td>
                    <td className="text-muted-foreground">
                      {user.lastLoginAt
                        ? formatDistanceToNow(
                            toZonedTime(user.lastLoginAt, "UTC"),
                            { addSuffix: true },
                          )
                        : "Never"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
