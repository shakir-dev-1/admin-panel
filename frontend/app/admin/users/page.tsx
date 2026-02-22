/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Eye,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Loader2,
  Users,
  Building2,
  Sparkles,
  Info,
} from "lucide-react";
import { SearchInput } from "@/app/components/admin/SearchInput";
import { StatusBadge } from "@/app/components/admin/StatusBadge";
import { UserTypeBadge } from "@/app/components/admin/UserTypeBadge";
import { Button } from "@/app/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/components/ui/tabs";
import { Card, CardContent } from "@/app/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/app/components/ui/tooltip";
import {
  useUsers,
  useBusinessUsers,
  useInfluencers,
  useAllUsers,
  type User,
  type BusinessUser,
  type Influencer,
} from "@/hooks/useUsers";
import { formatDistanceToNow } from "date-fns";
import { mapUserStatus } from "@/lib/utils";
import { StatCard } from "@/app/components/admin/StatCard";

// Sorting types
type SortField =
  | "name"
  | "email"
  | "type"
  | "status"
  | "lastLogin"
  | "createdAt";
type SortDirection = "asc" | "desc";

interface SortableHeaderProps {
  field: SortField;
  activeField: SortField;
  direction: SortDirection;
  onSort: (field: SortField) => void;
  children: React.ReactNode;
}

function SortableHeader({
  field,
  activeField,
  direction,
  onSort,
  children,
}: SortableHeaderProps) {
  const isActive = activeField === field;
  return (
    <th
      className="cursor-pointer hover:bg-muted/30 transition-colors p-4 text-left font-medium"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {isActive ? (
          direction === "asc" ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )
        ) : (
          <ArrowUpDown className="h-4 w-4 opacity-50" />
        )}
      </div>
    </th>
  );
}

type UserLike = {
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  username?: string | null;
};

function getDisplayName(user: UserLike): string {
  if (user.firstName || user.lastName) {
    return `${user.firstName || ""} ${user.lastName || ""}`
      .toLowerCase()
      .trim();
  }

  return (user.name || user.username || "").toLowerCase();
}

interface UsersTableProps {
  users: (User | BusinessUser | Influencer)[];
  loading: boolean;
  error: Error | null;
  search: string;
  statusFilter:
    | "all"
    | "ACTIVE"
    | "DISABLED"
    | "PENDING_VERIFICATION"
    | "INACTIVE";
  sortField: SortField;
  sortDirection: SortDirection;
  itemsPerPage: number;
  page: number;
  totalUsers: number;
  totalPages: number;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (
    value: "all" | "ACTIVE" | "DISABLED" | "PENDING_VERIFICATION" | "INACTIVE",
  ) => void;
  onSort: (field: SortField) => void;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (value: number) => void;
  userType: "all" | "consumer" | "business" | "influencer";
}

function UsersTable({
  users,
  loading,
  error,
  search,
  statusFilter,
  sortField,
  sortDirection,
  itemsPerPage,
  page,
  totalUsers,
  totalPages,
  onSearchChange,
  onStatusFilterChange,
  onSort,
  onPageChange,
  onItemsPerPageChange,
  userType,
}: UsersTableProps) {
  const filteredAndSortedUsers = useMemo(() => {
    if (!users || users.length === 0) return [];

    let filtered = [...users];

    // Apply search filter - FIXED: Check for firstName/lastName
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter((user) => {
        const id = user.id.toString().toLowerCase();
        // Handle consumer users with firstName/lastName
        const name =
          "firstName" in user &&
          user.firstName &&
          "lastName" in user &&
          user.lastName
            ? `${user.firstName} ${user.lastName}`.toLowerCase()
            : "name" in user
              ? user.name.toLowerCase()
              : "username" in user
                ? (user.username || "").toLowerCase()
                : "";

        const email = (user.email || "").toLowerCase();
        const phone = (user.phoneNumber || "").toLowerCase();
        const businessName =
          "businesses" in user && user.businesses?.[0]?.name
            ? user.businesses[0].name.toLowerCase()
            : "";

        return (
          id.includes(searchLower) ||
          name.includes(searchLower) ||
          email.includes(searchLower) ||
          phone.includes(searchLower) ||
          businessName.includes(searchLower)
        );
      });
    }

    // Apply status filter - FIXED: Handle consumer users with isBanned
    if (statusFilter !== "all") {
      filtered = filtered.filter((user) => {
        // For consumer users, check isBanned property
        if ("isBanned" in user) {
          if (statusFilter === "DISABLED") {
            return user.isBanned === true;
          }
          if (statusFilter === "ACTIVE") {
            return user.isBanned === false;
          }
        }

        // For business/influencer users, use the status property
        const status = user.status || "";

        if (statusFilter === "PENDING_VERIFICATION") {
          return status === "PENDING_VERIFICATION" || status === "pending";
        }
        if (statusFilter === "INACTIVE") {
          return status === "INACTIVE";
        }
        if (statusFilter === "DISABLED") {
          return status === "DISABLED" || status === "BANNED";
        }
        return status === statusFilter;
      });
    }

    // Apply sorting - FIXED: Handle consumer name properly
    filtered.sort((a, b) => {
      let aValue: string | number | Date = "";
      let bValue: string | number | Date = "";

      switch (sortField) {
        case "name":
          aValue = getDisplayName(a);
          bValue = getDisplayName(b);
          break;
        case "email":
          aValue = (a.email || "").toLowerCase();
          bValue = (b.email || "").toLowerCase();
          break;
        case "type":
          aValue =
            userType === "all"
              ? "userType" in a
                ? a.userType
                : "business"
              : userType;
          bValue =
            userType === "all"
              ? "userType" in b
                ? b.userType
                : "business"
              : userType;
          break;
        case "status":
          // For consumer users, map isBanned to status
          if ("isBanned" in a) {
            aValue = a.isBanned ? "DISABLED" : "ACTIVE";
          } else {
            aValue = a.status || "";
          }

          if ("isBanned" in b) {
            bValue = b.isBanned ? "DISABLED" : "ACTIVE";
          } else {
            bValue = b.status || "";
          }
          break;
        case "lastLogin":
          aValue = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0;
          bValue = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0;
          break;
        case "createdAt":
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        default:
          return 0;
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortDirection === "asc"
        ? aValue > bValue
          ? 1
          : aValue < bValue
            ? -1
            : 0
        : aValue < bValue
          ? 1
          : aValue > bValue
            ? -1
            : 0;
    });

    return filtered;
  }, [users, search, statusFilter, sortField, sortDirection, userType]);

  // Pagination
  const validPage = Math.min(page, totalPages);
  const paginatedUsers = useMemo(() => {
    const startIndex = (validPage - 1) * itemsPerPage;
    return filteredAndSortedUsers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedUsers, validPage, itemsPerPage]);

  // Get view link based on user type
  const getViewLink = (user: User | BusinessUser | Influencer) => {
    if ("userType" in user) {
      if (user.userType === "business") {
        return `/admin/users/business/${user.id}`;
      } else if (user.userType === "influencer") {
        return `/admin/users/influencer/${user.id}`;
      }
    }
    return `/admin/users/consumer/${user.id}`;
  };

  if (error) {
    return (
      <Card className="border-destructive/50 bg-destructive/10">
        <CardContent className="p-6 text-center">
          <p className="text-destructive font-medium">Error loading users</p>
          <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onChange={onSearchChange}
          placeholder={`Search ${userType === "all" ? "all" : userType} users...`}
          className="flex-1"
        />
        <div className="flex gap-3">
          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
              <SelectItem value="DISABLED">Disabled</SelectItem>
              <SelectItem value="PENDING_VERIFICATION">Pending</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={itemsPerPage.toString()}
            onValueChange={(v) => {
              onItemsPerPageChange(parseInt(v));
              onPageChange(1);
            }}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="text-sm text-muted-foreground">
        Showing {paginatedUsers.length} of {filteredAndSortedUsers.length} users
      </div>

      {/* Table */}
      <div className="admin-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="admin-table w-full">
            <thead className="bg-muted/50">
              <tr>
                <SortableHeader
                  field="name"
                  activeField={sortField}
                  direction={sortDirection}
                  onSort={onSort}
                >
                  User
                </SortableHeader>
                <SortableHeader
                  field="email"
                  activeField={sortField}
                  direction={sortDirection}
                  onSort={onSort}
                >
                  Email
                </SortableHeader>
                <SortableHeader
                  field="type"
                  activeField={sortField}
                  direction={sortDirection}
                  onSort={onSort}
                >
                  Type
                </SortableHeader>
                <SortableHeader
                  field="status"
                  activeField={sortField}
                  direction={sortDirection}
                  onSort={onSort}
                >
                  Status
                </SortableHeader>
                <SortableHeader
                  field="lastLogin"
                  activeField={sortField}
                  direction={sortDirection}
                  onSort={onSort}
                >
                  Last Login
                </SortableHeader>
                <th className="text-right p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      Loading users...
                    </p>
                  </td>
                </tr>
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-12 text-center text-muted-foreground"
                  >
                    No users found.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => {
                  // Determine user name based on type
                  const userName =
                    "firstName" in user &&
                    user.firstName &&
                    "lastName" in user &&
                    user.lastName
                      ? `${user.firstName} ${user.lastName}`
                      : "name" in user
                        ? user.name
                        : "username" in user
                          ? user.username || "N/A"
                          : "N/A";

                  // Determine user type
                  const userTypeValue =
                    "userType" in user
                      ? user.userType
                      : "username" in user && "campaignStats" in user
                        ? "influencer"
                        : "business";

                  const userStatus =
                    "isBanned" in user
                      ? user.isBanned
                        ? "DISABLED"
                        : "ACTIVE"
                      : user.status || "UNKNOWN";

                  return (
                    <tr key={user.id}>
                      <td className="p-4">
                        <p className="font-medium">{userName}</p>
                        <p className="text-xs text-muted-foreground">
                          {user.phoneNumber || "No phone"}
                        </p>
                      </td>
                      <td className="p-4">
                        <p className="text-sm">{user.email}</p>
                        {userTypeValue === "business" &&
                          "businesses" in user && (
                            <p className="text-xs text-muted-foreground">
                              {user.businesses?.length || 0} business(es)
                            </p>
                          )}
                        {userTypeValue === "influencer" &&
                          "campaignStats" in user && (
                            <p className="text-xs text-muted-foreground">
                              {user.campaignStats?.totalOffers || 0} campaigns
                            </p>
                          )}
                      </td>
                      <td className="p-4">
                        <UserTypeBadge type={userTypeValue || "unknown"} />
                      </td>
                      <td className="p-4">
                        <StatusBadge status={mapUserStatus(userStatus)} />
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {user.lastLoginAt
                          ? formatDistanceToNow(new Date(user.lastLoginAt), {
                              addSuffix: true,
                            })
                          : "Never"}
                      </td>
                      <td className="text-right p-4">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={getViewLink(user)}>
                            <Eye className="mr-2 h-4 w-4" /> View
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="border-t p-4 flex items-center justify-between bg-card">
          <div className="text-sm text-muted-foreground">
            Page {page} of {totalPages || 1}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => onPageChange(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UsersPage() {
  // State for each tab
  const [activeTab, setActiveTab] = useState<
    "all" | "consumer" | "business" | "influencer"
  >("all");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "ACTIVE" | "DISABLED" | "PENDING_VERIFICATION" | "INACTIVE"
  >("all");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Fetch all data in parallel
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

  // Stats for the dashboard
  const stats = useMemo(() => {
    const allUsers = [
      ...(consumers || []),
      ...(businessUsers || []),
      ...(influencers || []),
    ];

    // Calculate active/inactive counts properly
    let active = 0;
    let disabled = 0;
    let inactive = 0;

    allUsers.forEach((user) => {
      if ("status" in user) {
        const status = user.status;
        if (status === "ACTIVE") {
          active++;
        } else if (status === "DISABLED" || status === "BANNED") {
          disabled++;
        } else if (status === "INACTIVE" || status === "PENDING_VERIFICATION") {
          inactive++;
        }
      }
    });

    return {
      total: allUsers.length,
      consumer: consumers?.length || 0,
      business: businessUsers?.length || 0,
      influencer: influencers?.length || 0,
      active,
      disabled,
      inactive,
      pending: allUsers.filter(
        (u) =>
          "status" in u &&
          (u.status === "PENDING_VERIFICATION" || u.status === "pending"),
      ).length,
    };
  }, [consumers, businessUsers, influencers]);

  // Get users for current tab
  const getCurrentTabUsers = () => {
    switch (activeTab) {
      case "consumer":
        return consumers || [];
      case "business":
        return businessUsers || [];
      case "influencer":
        return influencers || [];
      case "all":
        return [
          ...(consumers || []),
          ...(businessUsers || []),
          ...(influencers || []),
        ];
      default:
        return [];
    }
  };

  const currentUsers = getCurrentTabUsers();
  const currentLoading =
    activeTab === "consumer"
      ? consumerLoading
      : activeTab === "business"
        ? businessLoading
        : activeTab === "influencer"
          ? influencerLoading
          : consumerLoading || businessLoading || influencerLoading;
  const currentError =
    activeTab === "consumer"
      ? consumerError
      : activeTab === "business"
        ? businessError
        : activeTab === "influencer"
          ? influencerError
          : consumerError || businessError || influencerError;

  const totalUsers = currentUsers.length;
  const totalPages = Math.max(1, Math.ceil(totalUsers / itemsPerPage));

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection(field === "createdAt" ? "desc" : "asc");
    }
    setPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleStatusFilterChange = (
    value: "all" | "ACTIVE" | "DISABLED" | "PENDING_VERIFICATION" | "INACTIVE",
  ) => {
    setStatusFilter(value);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">User Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Search and manage all platform users
        </p>
      </div>

      {/* Stats Dashboard with Tooltips */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Users"
          value={stats.total}
          icon={<Users className="h-5 w-5 text-primary" />}
          tooltip="Total number of registered users across all account types (consumers, business users, and influencers)"
        />

        <StatCard
          title="Active Users"
          value={stats.active}
          icon={<div className="h-5 w-5 text-green-600 font-bold">✓</div>}
          valueClassName="text-green-600"
          tooltip="Users with confirmed email addresses. For consumers, they must also not be banned."
        />

        <StatCard
          title="Inactive Users"
          value={stats.inactive}
          icon={<div className="h-5 w-5 text-amber-600 font-bold">!</div>}
          valueClassName="text-amber-600"
          tooltip="Users with unconfirmed emails. For consumers, this excludes banned users."
        />

        <StatCard
          title="Disabled Users"
          value={stats.disabled}
          icon={<div className="h-5 w-5 text-destructive font-bold">✗</div>}
          valueClassName="text-destructive"
          tooltip="Consumers who have been banned from the platform by administrators."
        />
      </div>

      {/* Breakdown Stats - Optional additional row for more detail */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Consumers"
          value={stats.consumer}
          icon={<Users className="h-5 w-5 text-blue-500" />}
          tooltip="Regular platform users who can book services and interact with businesses"
        />

        <StatCard
          title="Business Users"
          value={stats.business}
          icon={<Building2 className="h-5 w-5 text-purple-500" />}
          tooltip="Users associated with businesses who can manage services, appointments, and business operations"
        />

        <StatCard
          title="Influencers"
          value={stats.influencer}
          icon={<Sparkles className="h-5 w-5 text-amber-500" />}
          tooltip="Influencer account users who can participate in marketing campaigns and promotions"
        />
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          setActiveTab(v as any);
          setPage(1);
        }}
      >
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            All Users
            <span className="ml-1 text-xs bg-muted px-2 py-0.5 rounded-full">
              {stats.total}
            </span>
          </TabsTrigger>
          <TabsTrigger value="consumer" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Consumers
            <span className="ml-1 text-xs bg-muted px-2 py-0.5 rounded-full">
              {stats.consumer}
            </span>
          </TabsTrigger>
          <TabsTrigger value="business" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Business Users
            <span className="ml-1 text-xs bg-muted px-2 py-0.5 rounded-full">
              {stats.business}
            </span>
          </TabsTrigger>
          <TabsTrigger value="influencer" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Influencers
            <span className="ml-1 text-xs bg-muted px-2 py-0.5 rounded-full">
              {stats.influencer}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <UsersTable
            users={currentUsers}
            loading={currentLoading}
            error={currentError}
            search={search}
            statusFilter={statusFilter}
            sortField={sortField}
            sortDirection={sortDirection}
            itemsPerPage={itemsPerPage}
            page={page}
            totalUsers={totalUsers}
            totalPages={totalPages}
            onSearchChange={handleSearchChange}
            onStatusFilterChange={handleStatusFilterChange}
            onSort={handleSort}
            onPageChange={setPage}
            onItemsPerPageChange={setItemsPerPage}
            userType="all"
          />
        </TabsContent>

        <TabsContent value="consumer" className="mt-6">
          <UsersTable
            users={currentUsers}
            loading={currentLoading}
            error={currentError}
            search={search}
            statusFilter={statusFilter}
            sortField={sortField}
            sortDirection={sortDirection}
            itemsPerPage={itemsPerPage}
            page={page}
            totalUsers={totalUsers}
            totalPages={totalPages}
            onSearchChange={handleSearchChange}
            onStatusFilterChange={handleStatusFilterChange}
            onSort={handleSort}
            onPageChange={setPage}
            onItemsPerPageChange={setItemsPerPage}
            userType="consumer"
          />
        </TabsContent>

        <TabsContent value="business" className="mt-6">
          <UsersTable
            users={currentUsers}
            loading={currentLoading}
            error={currentError}
            search={search}
            statusFilter={statusFilter}
            sortField={sortField}
            sortDirection={sortDirection}
            itemsPerPage={itemsPerPage}
            page={page}
            totalUsers={totalUsers}
            totalPages={totalPages}
            onSearchChange={handleSearchChange}
            onStatusFilterChange={handleStatusFilterChange}
            onSort={handleSort}
            onPageChange={setPage}
            onItemsPerPageChange={setItemsPerPage}
            userType="business"
          />
        </TabsContent>

        <TabsContent value="influencer" className="mt-6">
          <UsersTable
            users={currentUsers}
            loading={currentLoading}
            error={currentError}
            search={search}
            statusFilter={statusFilter}
            sortField={sortField}
            sortDirection={sortDirection}
            itemsPerPage={itemsPerPage}
            page={page}
            totalUsers={totalUsers}
            totalPages={totalPages}
            onSearchChange={handleSearchChange}
            onStatusFilterChange={handleStatusFilterChange}
            onSort={handleSort}
            onPageChange={setPage}
            onItemsPerPageChange={setItemsPerPage}
            userType="influencer"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
