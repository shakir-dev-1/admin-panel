/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
// frontend/app/admin/business/users/[userId]/page.tsx
import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  Key,
  UserX,
  UserCheck,
  Shield,
  MapPin,
  Monitor,
  Building2,
  User,
  FileText,
  CreditCard,
  Users,
  Briefcase,
  Star,
  Globe,
  BadgeCheck,
  AlertCircle,
  XCircle,
  Loader2,
  Receipt,
  Package,
} from "lucide-react";
import { StatusBadge } from "@/app/components/admin/StatusBadge";
import { UserTypeBadge } from "@/app/components/admin/UserTypeBadge";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Badge } from "@/app/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/components/ui/tabs";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
// import { fetchWithAuth } from "@/lib/api";
import { cn, safeFormatDate } from "@/lib/utils";
import { useUsersManagement, useBusinessUserById } from "@/hooks/useUsers";
import { CancelSubscriptionButton } from "@/app/components/admin/CancelSubscriptionButton";
import { useBusinessUserPaymentsByUserId } from "@/hooks/usePayments";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";

export default function BusinessUserDetail() {
  const params = useParams();
  const userId = params?.userId as string;
  const router = useRouter();
  const { token } = useAuth();

  const { data: user, isLoading, error, refetch } = useBusinessUserById(userId);

  const [activeTab, setActiveTab] = useState("overview");
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [showPhoneDialog, setShowPhoneDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showCancelSubscriptionDialog, setShowCancelSubscriptionDialog] =
    useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<any>(null);
  const [selectedSubscription, setSelectedSubscription] = useState<any>(null);
  const [isImmediateCancel, setIsImmediateCancel] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("all");
  const { resetPassword, changeEmail, changePhone, cancelSubscription } =
    useUsersManagement();

  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  const {
    payments: userPayments,
    loading: paymentsLoading,
    error: paymentsError,
    totalSpent,
    pendingPayments,
    successfulPayments,
    failedPayments,
    hasMore,
    loadMore,
  } = useBusinessUserPaymentsByUserId(userId, { limit: 20 });

  const filteredPayments = useMemo(() => {
    if (paymentStatusFilter === "all") return userPayments;
    return userPayments.filter(
      (payment) => payment.status === paymentStatusFilter,
    );
  }, [userPayments, paymentStatusFilter]);

  const filteredTotalSpent = useMemo(() => {
    return filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [filteredPayments]);

  const filteredSuccessfulPayments = useMemo(() => {
    return filteredPayments.filter((p) => p.status === "SUCCESS").length;
  }, [filteredPayments]);

  const filteredPendingPayments = useMemo(() => {
    return filteredPayments.filter((p) => p.status === "PENDING").length;
  }, [filteredPayments]);

  const filteredFailedPayments = useMemo(() => {
    return filteredPayments.filter((p) => p.status === "FAILED").length;
  }, [filteredPayments]);

  // Add this helper function near the top with other helpers
  const formatAmount = (amount: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold">Loading user...</h2>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="flex min-h-100 flex-col items-center justify-center space-y-4">
        <h2 className="text-xl font-semibold">
          {error ? "Error loading user" : "User not found"}
        </h2>
        <Button onClick={() => router.push("/admin/users")}>
          Back to Users
        </Button>
      </div>
    );
  }

  const handleResetPassword = async () => {
    if (!token) return;

    // Validate passwords
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsResetting(true);
    try {
      await resetPassword(user.id, newPassword, true);
      toast.success(`Password successfully reset for ${user.email}`);
      setShowResetPasswordDialog(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast.error("Failed to reset password");
      console.error("Password reset error:", error);
    } finally {
      setIsResetting(false);
    }
  };
  
  const handleChangeEmail = async () => {
    if (!newEmail || !token) return;

    try {
      await changeEmail(user.id, newEmail, true);
      toast.success("Email changed from " + user.email + " to " + newEmail);
      refetch();
      setShowEmailDialog(false);
      setNewEmail("");
    } catch (error) {
      toast.error("Failed to change email");
      console.error("Email change error:", error);
    }
  };

  const handleChangePhone = async () => {
    if (!newPhone || !token) return;

    try {
      await changePhone(user.id, newPhone, true);
      toast.success(
        "Phone changed from " + user.phoneNumber + " to " + newPhone,
      );
      refetch();
      setShowPhoneDialog(false);
      setNewPhone("");
    } catch (error) {
      toast.error("Failed to change phone");
      console.error("Phone change error:", error);
    }
  };

  const handleCancelSubscription = async () => {
    if (!token || !selectedBusiness || !selectedSubscription) return;

    try {
      setIsCancelling(true);

      const result = await cancelSubscription(selectedBusiness.id, {
        immediate: isImmediateCancel,
      });

      toast.success(result.message);
      refetch(); // Refresh user data
      setShowCancelSubscriptionDialog(false);
      setSelectedBusiness(null);
      setSelectedSubscription(null);
      setIsImmediateCancel(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to cancel subscription");
      console.error("Subscription cancellation error:", error);
    } finally {
      setIsCancelling(false);
    }
  };

  const openCancelDialog = (business: any, subscription: any) => {
    setSelectedBusiness(business);
    setSelectedSubscription(subscription);
    setShowCancelSubscriptionDialog(true);
  };

  const getStatus = () => {
    if (!user.isEmailConfirmed) return "INACTIVE";
    return "ACTIVE";
  };

  const getUserName = () => {
    if (user.fullName) return user.fullName;
    if (user.firstName || user.lastName)
      return `${user.firstName || ""} ${user.lastName || ""}`.trim();
    return user.email;
  };

  const getRecentLoginSessions = () => {
    // Use recentLoginSessions if available, otherwise fall back to refreshTokens
    if (user.recentLoginSessions && user.recentLoginSessions.length > 0) {
      return user.recentLoginSessions;
    }

    if (!user.refreshTokens || user.refreshTokens.length === 0) return [];

    return user.refreshTokens.map((token) => ({
      id: token.id,
      lastLogin: token.lastLogin,
      device: token.device,
      userAgent: token.userAgent,
      ipAddress: token.ipAddress,
      location:
        token.city || token.country
          ? `${token.city || ""}${token.city && token.country ? ", " : ""}${token.country || ""}`
          : null,
      coordinates:
        token.latitude && token.longitude
          ? { latitude: token.latitude, longitude: token.longitude }
          : null,
      timezone: token.timezone,
      region: token.regionName,
      sessionStart: token.createdAt,
    }));
  };

  // console.log("user:", user);

  return (
    <>
      <div className="space-y-6">
        {/* Back Button & Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/admin/users")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">
                {getUserName()}
              </h1>
              <UserTypeBadge type="business" />
              <StatusBadge status={getStatus()} />
              {user.isEmailConfirmed && (
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  <Mail className="mr-1 h-3 w-3" />
                  Email Verified
                </Badge>
              )}
              {user.twoFactorEnabled && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  <Shield className="mr-1 h-3 w-3" />
                  2FA Enabled
                </Badge>
              )}
              {user.businessUserType && (
                <Badge
                  variant="outline"
                  className="bg-purple-50 text-purple-700"
                >
                  <Briefcase className="mr-1 h-3 w-3" />
                  {user.businessUserType}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              User ID: {user.id} | Clerk ID: {user.clerkUserId} | Referral Code:{" "}
              {user.referralCode}
            </p>
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="businesses">Businesses</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* User Info */}
              <div className="admin-card lg:col-span-2">
                <h2 className="text-lg font-semibold">
                  Business User Information
                </h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="font-medium">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p className="font-medium">
                        {user.phoneNumber || "Not set"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Username</p>
                      <p className="font-medium">
                        {user.username || "Not set"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Date of Birth
                      </p>
                      <p className="font-medium">
                        {user.dateOfBirth
                          ? safeFormatDate(user.dateOfBirth, "MMM d, yyyy")
                          : "Not set"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Gender</p>
                      <p className="font-medium">
                        {user.gender || "Not specified"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Joined</p>
                      <p className="font-medium">
                        {safeFormatDate(user.createdAt, "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3 sm:col-span-2">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Address</p>
                      <p className="font-medium">
                        {[user.address, user.city, user.state, user.zipcode]
                          .filter(Boolean)
                          .join(", ") || "Not set"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Admin Actions */}
              <div className="admin-card">
                <h2 className="text-lg font-semibold">Admin Actions</h2>
                <div className="mt-4 space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setShowResetPasswordDialog(true)}
                  >
                    <Key className="mr-2 h-4 w-4" />
                    Reset Password
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      setNewEmail(user.email);
                      setShowEmailDialog(true);
                    }}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Change Email
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      setNewPhone(user.phoneNumber || "");
                      setShowPhoneDialog(true);
                    }}
                  >
                    <Phone className="mr-2 h-4 w-4" />
                    Change Phone
                  </Button>
                </div>

                {/* Stats */}
                <div className="mt-6 pt-6 border-t">
                  <h3 className="text-sm font-medium mb-3">Quick Stats</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Businesses
                      </span>
                      <Badge variant="secondary">
                        {user.businesses.length}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Invitations
                      </span>
                      <Badge variant="secondary">
                        {user.invitations.length}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Last Login
                      </span>
                      <span className="text-sm">
                        {user.lastLoginAt
                          ? safeFormatDate(user.lastLoginAt, "MMM d")
                          : "unknown"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Business User Type & Referral Info */}
            <div className="admin-card">
              <h2 className="text-lg font-semibold">Account Details</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Briefcase className="h-4 w-4" />
                    <span className="font-medium">User Type</span>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {user.businessUserType.toLowerCase()}
                  </Badge>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4" />
                    <span className="font-medium">Referral Code</span>
                  </div>
                  <p className="font-mono text-sm truncate">
                    {user.referralCode}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="h-4 w-4" />
                    <span className="font-medium">Invite Code</span>
                  </div>
                  <p className="font-mono text-sm truncate">
                    {user.inviteCode || "None"}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <BadgeCheck className="h-4 w-4" />
                    <span className="font-medium">Consent Approved</span>
                  </div>
                  <Badge
                    variant={
                      user.isEmployeeConsentApproved ? "default" : "secondary"
                    }
                  >
                    {user.isEmployeeConsentApproved ? "Approved" : "Pending"}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Subscriptions Section */}
            <div className="admin-card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  <h2 className="text-lg font-semibold">Subscriptions</h2>
                </div>
                <Badge variant="outline">
                  {user.businesses?.reduce(
                    (acc, biz) => acc + (biz.subscriptions?.length || 0),
                    0,
                  )}{" "}
                  total
                </Badge>
              </div>

              <div className="space-y-4">
                {user.businesses?.filter(
                  (biz) => biz.subscriptions && biz.subscriptions.length > 0,
                ).length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    No active subscriptions found for this user
                  </div>
                ) : (
                  user.businesses?.map(
                    (business) =>
                      business.subscriptions &&
                      business.subscriptions.length > 0 && (
                        <div
                          key={business.id}
                          className="rounded-lg border p-4"
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <h3 className="font-medium">{business.name}</h3>
                            {business.isVerified && (
                              <BadgeCheck className="h-4 w-4 text-blue-500" />
                            )}
                          </div>

                          <div className="space-y-3">
                            {business.subscriptions.map((sub) => (
                              <div
                                key={sub.id}
                                className="rounded-lg bg-muted/30 p-3"
                              >
                                <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">
                                      {sub.plan.title}
                                    </span>
                                    <Badge
                                      variant={
                                        sub.status === "ACTIVE"
                                          ? "default"
                                          : sub.status === "TRIAL"
                                            ? "secondary"
                                            : "outline"
                                      }
                                      className={
                                        sub.status === "CANCELLED"
                                          ? "bg-red-50 text-red-700"
                                          : ""
                                      }
                                    >
                                      {sub.status}
                                    </Badge>
                                    {sub.isTrialUsed && (
                                      <Badge
                                        variant="outline"
                                        className="bg-purple-50 text-purple-700"
                                      >
                                        Trial
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge
                                      variant="outline"
                                      className="bg-green-50 text-green-700"
                                    >
                                      {sub.paymentStatus}
                                    </Badge>
                                    {sub.status === "ACTIVE" && (
                                      <CancelSubscriptionButton
                                        subscriptionId={sub.id}
                                        businessId={business.id}
                                        businessName={business.name}
                                        planName={sub.plan.title}
                                        status={sub.status}
                                        endDate={sub.endDate?.toString()}
                                        cancelAtPeriodEnd={
                                          sub.cancelAtPeriodEnd
                                        }
                                        size="sm"
                                        variant="destructive"
                                        onSuccess={refetch}
                                        invalidateQueries={[
                                          ["businessSubscriptions"],
                                          ["businessUser", userId],
                                        ]}
                                      />
                                    )}
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2 text-sm">
                                  <div>
                                    <p className="text-xs text-muted-foreground">
                                      Billing Cycle
                                    </p>
                                    <p className="font-medium capitalize">
                                      {sub.billingCycle.toLowerCase()}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">
                                      Start Date
                                    </p>
                                    {sub.startDate ? (
                                      <p className="font-medium">
                                        {safeFormatDate(
                                          sub.startDate.toString(),
                                          "MMM d, yyyy",
                                        )}
                                      </p>
                                    ) : (
                                      <p className="font-medium">N/A</p>
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">
                                      End Date
                                    </p>
                                    {sub.endDate ? (
                                      <p className="font-medium">
                                        {safeFormatDate(
                                          sub.endDate.toString(),
                                          "MMM d, yyyy",
                                        )}
                                      </p>
                                    ) : (
                                      <p className="font-medium">N/A</p>
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">
                                      Cancel at Period End
                                    </p>
                                    <Badge variant="outline" className="mt-1">
                                      {sub.cancelAtPeriodEnd ? "Yes" : "No"}
                                    </Badge>
                                  </div>
                                </div>

                                {sub.canceledDate && (
                                  <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
                                    <AlertCircle className="h-4 w-4" />
                                    <span>
                                      Cancelled on{" "}
                                      {safeFormatDate(
                                        sub.canceledDate.toString(),
                                        "MMM d, yyyy",
                                      )}
                                    </span>
                                  </div>
                                )}

                                {sub.orderId && (
                                  <div className="mt-2 text-xs text-muted-foreground">
                                    Order ID: {sub.orderId}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ),
                  )
                )}
              </div>
            </div>
          </TabsContent>

          {/* Businesses Tab - Enhanced Version */}
          <TabsContent value="businesses" className="space-y-6">
            <div className="admin-card">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold">Associated Businesses</h2>
                <Badge variant="outline">
                  {user.businesses?.length || 0} business(es)
                </Badge>
              </div>

              <div className="space-y-4">
                {!user.businesses || user.businesses.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    No businesses associated with this user
                  </div>
                ) : (
                  user.businesses.map((business) => {
                    // Find the user's specific membership details for this business
                    const membership = business.memberId
                      ? {
                          // You might need to fetch this from your data structure
                          onlineBooking: business.onlineBooking,
                          walkInBooking: business.walkInBooking,
                          designation: business.designation,
                          businessAverageRating: business.businessAverageRating,
                        }
                      : null;

                    return (
                      <div
                        key={business.memberId || business.id}
                        className="rounded-lg border p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            {/* Header with business name and badges */}
                            <div className="flex items-center gap-2 mb-3 flex-wrap">
                              <h3 className="font-semibold text-lg">
                                {business.name}
                              </h3>
                              {business.isVerified && (
                                <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                                  <BadgeCheck className="mr-1 h-3 w-3" />
                                  Verified
                                </Badge>
                              )}
                              {/* Business status badge */}
                              <Badge
                                variant="outline"
                                className={
                                  business.isVerified
                                    ? "bg-green-50 text-green-700"
                                    : "bg-yellow-50 text-yellow-700"
                                }
                              >
                                {business.isVerified
                                  ? "Active"
                                  : "Pending Verification"}
                              </Badge>
                            </div>

                            {/* Role and Designation */}
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-3">
                              <div>
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Briefcase className="h-3 w-3" />
                                  Role
                                </p>
                                <Badge
                                  variant="outline"
                                  className="capitalize mt-1 font-medium"
                                >
                                  {business.role.toLowerCase()}
                                </Badge>
                              </div>

                              {business.designation && (
                                <div>
                                  <p className="text-xs text-muted-foreground">
                                    Designation
                                  </p>
                                  <p className="text-sm font-medium mt-1">
                                    {business.designation}
                                  </p>
                                </div>
                              )}

                              <div>
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  Joined
                                </p>
                                <p className="text-sm font-medium mt-1">
                                  {safeFormatDate(
                                    business.joinedAt,
                                    "MMM d, yyyy",
                                  )}
                                </p>
                              </div>

                              <div>
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  Location
                                </p>
                                <p className="text-sm font-medium mt-1">
                                  {business.city}, {business.country}
                                </p>
                              </div>
                            </div>

                            {/* Additional Details Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3 text-sm">
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Industry
                                </p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {business.industryType?.length > 0 ? (
                                    business.industryType.map(
                                      (industry, idx) => (
                                        <span
                                          key={idx}
                                          className="text-xs bg-muted px-2 py-0.5 rounded-full"
                                        >
                                          {industry}
                                        </span>
                                      ),
                                    )
                                  ) : (
                                    <span className="text-sm">N/A</span>
                                  )}
                                </div>
                              </div>

                              {/* Business Contact Info */}
                              {business.phoneNumber && (
                                <div>
                                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    Phone
                                  </p>
                                  <p className="text-sm font-medium mt-1">
                                    {business.phoneNumber}
                                  </p>
                                </div>
                              )}

                              {business.email && (
                                <div>
                                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    Email
                                  </p>
                                  <p className="text-sm font-medium mt-1 truncate">
                                    {business.email}
                                  </p>
                                </div>
                              )}

                              {business.website && (
                                <div>
                                  <p className="text-xs text-muted-foreground">
                                    Website
                                  </p>
                                  <a
                                    href={business.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-600 hover:underline truncate block mt-1"
                                  >
                                    {business.website.replace(
                                      /^https?:\/\//,
                                      "",
                                    )}
                                  </a>
                                </div>
                              )}
                            </div>

                            {/* Business Stats */}
                            <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t">
                              {business.businessAverageRating && (
                                <div className="flex items-center gap-1">
                                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                  <span className="text-sm font-medium">
                                    {business.businessAverageRating.toFixed(1)}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    avg rating
                                  </span>
                                </div>
                              )}

                              {business.businessTotalAverageRating && (
                                <div className="flex items-center gap-1">
                                  <Star className="h-4 w-4 text-yellow-500" />
                                  <span className="text-sm font-medium">
                                    {business.businessTotalAverageRating.toFixed(
                                      1,
                                    )}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    overall
                                  </span>
                                </div>
                              )}

                              {/* Employee-specific settings */}
                              {membership && (
                                <>
                                  {membership.onlineBooking !== undefined && (
                                    <Badge
                                      variant="outline"
                                      className={
                                        membership.onlineBooking
                                          ? "bg-green-50"
                                          : "bg-gray-50"
                                      }
                                    >
                                      Online Booking:{" "}
                                      {membership.onlineBooking ? "Yes" : "No"}
                                    </Badge>
                                  )}
                                  {membership.walkInBooking !== undefined && (
                                    <Badge
                                      variant="outline"
                                      className={
                                        membership.walkInBooking
                                          ? "bg-green-50"
                                          : "bg-gray-50"
                                      }
                                    >
                                      Walk-in:{" "}
                                      {membership.walkInBooking ? "Yes" : "No"}
                                    </Badge>
                                  )}
                                </>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          {/* <div className="flex flex-col gap-2 ml-4">
                            {business.id && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    router.push(
                                      `/admin/businesses/${business.id}`,
                                    )
                                  }
                                  className="whitespace-nowrap"
                                >
                                  <Building2 className="mr-1 h-4 w-4" />
                                  View Business
                                </Button>
                              </>
                            )}
                          </div> */}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </TabsContent>

          {/* Payments Tab - Fixed */}
          <TabsContent value="payments" className="space-y-6">
            <div className="admin-card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-muted-foreground" />
                  <h2 className="text-lg font-semibold">Add-On Purchases</h2>
                  <Badge variant="outline">
                    {filteredPayments.length} of {userPayments.length} purchases
                  </Badge>
                </div>

                {/* Filter by add-on status */}
                <Select
                  value={paymentStatusFilter}
                  onValueChange={setPaymentStatusFilter}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Filter by Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="SUCCESS">Successful</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="FAILED">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {paymentsLoading && userPayments.length === 0 ? (
                <div className="flex min-h-[200px] items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : paymentsError ? (
                <div className="flex items-center justify-center min-h-[200px] text-red-500">
                  Error loading purchases: {paymentsError}
                </div>
              ) : userPayments.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-lg font-medium">
                    No add-on purchases found
                  </p>
                  <p className="text-sm mt-1">
                    This user hasn&apos;t purchased any add-ons yet.
                  </p>
                </div>
              ) : filteredPayments.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-lg font-medium">
                    No purchases match the selected filter
                  </p>
                  <Button
                    variant="link"
                    onClick={() => setPaymentStatusFilter("all")}
                    className="mt-2"
                  >
                    Clear filter
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Summary Cards - Now showing filtered stats */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">
                        Total Spent
                      </p>
                      <p className="text-xl font-bold mt-1">
                        {formatAmount(filteredTotalSpent)}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">
                        Successful
                      </p>
                      <p className="text-xl font-bold mt-1 text-green-600">
                        {filteredSuccessfulPayments}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Pending</p>
                      <p className="text-xl font-bold mt-1 text-yellow-600">
                        {filteredPendingPayments}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Failed</p>
                      <p className="text-xl font-bold mt-1 text-red-600">
                        {filteredFailedPayments}
                      </p>
                    </div>
                  </div>

                  {/* Add-Ons List */}
                  <div className="space-y-3">
                    {filteredPayments.map((payment) => (
                      <div
                        key={payment.id}
                        className="rounded-lg border p-4 hover:shadow-sm transition-shadow"
                      >
                        <div className="flex items-start gap-3">
                          {/* Icon for add-ons */}
                          <div className="p-2 rounded-lg bg-purple-500/10">
                            <Package className="h-5 w-5 text-purple-600" />
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium">
                                {payment.description}
                              </p>
                              <StatusBadge status={payment.status} />
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Business
                                </p>
                                <p className="font-medium">
                                  {payment.businessName}
                                </p>
                              </div>

                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Amount
                                </p>
                                <p className="font-semibold">
                                  {payment.amount !== null
                                    ? formatAmount(
                                        payment.amount,
                                        payment.currency,
                                      )
                                    : "—"}
                                </p>
                              </div>

                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Date
                                </p>
                                <p className="text-sm">
                                  {format(
                                    new Date(payment.createdAt),
                                    "MMM d, yyyy",
                                  )}
                                </p>
                              </div>

                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Purchase ID
                                </p>
                                <p className="font-mono text-xs">
                                  {payment.id}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Load More Button - only show if there are more pages AND we're not filtering */}
                  {hasMore && paymentStatusFilter === "all" && (
                    <div className="flex justify-center pt-4">
                      <Button
                        variant="outline"
                        onClick={() => loadMore()}
                        disabled={paymentsLoading}
                      >
                        {paymentsLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          "Load More Purchases"
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Activity Tab - FIXED */}
          <TabsContent value="activity" className="space-y-6">
            {/* Last Login Info */}
            <div className="admin-card">
              <div className="flex items-center gap-2">
                <Monitor className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold">Last Login</h2>
              </div>
              {user.lastLoginAt ? (
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Date & Time</p>
                    <p className="font-medium">
                      {safeFormatDate(user.lastLoginAt, "MMM d, yyyy HH:mm")}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Device</p>
                    <p className="font-medium">
                      {user.lastLoginDevice || "Unknown"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">IP Address</p>
                    <p className="font-mono text-sm">
                      {user.lastLoginIp || "Unknown"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Location</p>
                    <p className="font-medium">
                      {user.lastLoginLocation || "Unknown"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-4 py-8 text-center text-muted-foreground">
                  No login activity recorded
                </div>
              )}
            </div>

            {/* Recent Login Sessions */}
            <div className="admin-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Monitor className="h-5 w-5 text-muted-foreground" />
                  <h2 className="text-lg font-semibold">
                    Recent Login Sessions
                  </h2>
                </div>
                <Badge variant="outline">
                  {getRecentLoginSessions().length} sessions
                </Badge>
              </div>
              <div className="mt-4 overflow-hidden rounded-lg border">
                <table className="admin-table">
                  <thead className="bg-muted/50">
                    <tr>
                      <th>Date & Time</th>
                      <th>Device</th>
                      <th>IP Address</th>
                      <th>Location</th>
                      <th>User Agent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getRecentLoginSessions().length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="py-8 text-center text-muted-foreground"
                        >
                          No login sessions found
                        </td>
                      </tr>
                    ) : (
                      getRecentLoginSessions().map((session, index) => (
                        <tr key={session.id || index}>
                          <td>
                            {safeFormatDate(
                              session.lastLogin,
                              "MMM d, yyyy HH:mm",
                            )}
                          </td>
                          <td>{session.device || "Unknown"}</td>
                          <td className="font-mono text-xs">
                            {session.ipAddress || "Unknown"}
                          </td>
                          <td>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <span>{session.location || "Unknown"}</span>
                            </div>
                            {session.coordinates && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {session.coordinates.latitude.toFixed(4)},{" "}
                                {session.coordinates.longitude.toFixed(4)}
                              </p>
                            )}
                          </td>
                          <td className="max-w-[200px] truncate text-xs">
                            {session.userAgent}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <div className="admin-card">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold">Security & Settings</h2>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="h-4 w-4" />
                    <span className="font-medium">Email Verification</span>
                  </div>
                  <Badge
                    variant={user.isEmailConfirmed ? "default" : "secondary"}
                  >
                    {user.isEmailConfirmed ? "Verified" : "Pending"}
                  </Badge>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4" />
                    <span className="font-medium">User Agreement</span>
                  </div>
                  <Badge
                    variant={user.isAgreementAccepted ? "default" : "secondary"}
                  >
                    {user.isAgreementAccepted ? "Accepted" : "Pending"}
                  </Badge>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4" />
                    <span className="font-medium">Two-Factor Auth</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={user.twoFactorEnabled ? "default" : "secondary"}
                    >
                      {user.twoFactorEnabled ? "Enabled" : "Disabled"}
                    </Badge>
                    {user.twoFactorType && (
                      <span className="text-sm text-muted-foreground">
                        ({user.twoFactorType})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Invitations */}
            {user.invitations && user.invitations.length > 0 && (
              <div className="admin-card">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <h2 className="text-lg font-semibold">Invitations Sent</h2>
                  <Badge variant="outline">{user.invitations.length}</Badge>
                </div>
                <div className="mt-4 overflow-hidden rounded-lg border">
                  <table className="admin-table">
                    <thead className="bg-muted/50">
                      <tr>
                        <th>Email</th>
                        <th>Status</th>
                        <th>Sent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {user.invitations.map((invitation) => (
                        <tr key={invitation.id}>
                          <td className="font-medium">{invitation.email}</td>
                          <td>
                            <Badge
                              variant="outline"
                              className={
                                invitation.status === "ACCEPTED"
                                  ? "bg-green-50 text-green-700"
                                  : invitation.status === "PENDING"
                                    ? "bg-yellow-50 text-yellow-700"
                                    : "bg-red-50 text-red-700"
                              }
                            >
                              {invitation.status}
                            </Badge>
                          </td>
                          <td className="text-muted-foreground">
                            {safeFormatDate(
                              invitation.createdAt,
                              "MMM d, yyyy",
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Password Reset Dialog */}
      <Dialog
        open={showResetPasswordDialog}
        onOpenChange={setShowResetPasswordDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set a new password for {user.firstName} ({user.email}).
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                //type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-2"
                placeholder="Enter new password"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Password must be at least 6 characters long
              </p>
            </div>
            <div>
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                // type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-2"
                placeholder="Confirm new password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowResetPasswordDialog(false);
                setNewPassword("");
                setConfirmPassword("");
              }}
              disabled={isResetting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleResetPassword}
              disabled={!newPassword || !confirmPassword || isResetting}
            >
              {isResetting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                "Reset Password"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Email Address</DialogTitle>
            <DialogDescription>
              Update the email address for {getUserName()}. This will require
              the user to verify their new email.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="email">New Email Address</Label>
            <Input
              id="email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="mt-2"
              placeholder="Enter new email"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmailDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleChangeEmail}
              disabled={!newEmail || newEmail === user.email}
            >
              Update Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Phone Dialog */}
      <Dialog open={showPhoneDialog} onOpenChange={setShowPhoneDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Phone Number</DialogTitle>
            <DialogDescription>
              Update the phone number for {getUserName()}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="phone">New Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              className="mt-2"
              placeholder="Enter new phone number"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPhoneDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleChangePhone}
              disabled={!newPhone || newPhone === user.phoneNumber}
            >
              Update Phone
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
