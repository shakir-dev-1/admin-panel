/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
// frontend/app/admin/users/consumer/[consumerId]/page.tsx
import { useState, useEffect } from "react";
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
  Globe,
  Star,
  Building2,
  User,
  FileText,
  CreditCard,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
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
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/components/ui/tabs";
import { format } from "date-fns";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { fetchWithAuth } from "@/lib/api";
import { cn, safeFormatDate } from "@/lib/utils";
import { useUsersManagement, useUserById } from "@/hooks/useUsers";
import { useConsumerPaymentsByUserId } from "@/hooks/usePayments";
import { ChangePhoneDialog } from "@/app/components/admin/ChangePhoneDialog";

interface ApiUser {
  id: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  email: string;
  username: string | null;
  phoneNumber: string | null;
  avatarId: string | null;
  profilePicture: string | null;
  isAgreementAccepted: boolean;
  isEmailConfirmed: boolean;
  isPhoneConfirmed: boolean;
  twoFactorEnabled: boolean;
  twoFactorType: string | null;
  onboardingCompleted: boolean;
  hasAcceptedPolicy: boolean;
  isBanned: boolean;
  banDate: string | null;
  createdAt: string;
  updatedAt: string;
  clerkUserId: string;
  userType: "consumer";
  lastLoginAt: string;
  lastLoginDevice: string | null;
  lastLoginIp: string | null;
  lastLoginLocation: string | null;

  // Relationships
  avatar: any | null;
  userSettings: any | null;
  favorites: Array<{
    id: string;
    name: string;
  }>;
  businessClients: Array<{
    id: string;
    fullName: string;
    phoneNumber: string;
    email: string;
    business: {
      id: string;
      name: string;
    };
    appointments: Array<{
      id: string;
      start: string;
      end: string;
      status: string;
      businessService?: {
        service: { title: string };
      };
      businessPackage?: { title: string };
      invoice?: {
        id: string;
        amountDue: number;
        amountPaid: number | null;
        paymentStatus: string;
      };
    }>;
  }>;
  reviews: Array<{
    id: string;
    ratings: number;
    business: {
      name: string;
    };
    createdAt: string;
  }>;
  recentLoginSessions: Array<{
    lastLogin: string;
    device: string;
    userAgent: string;
    ipAddress: string;
    location: string | null;
    coordinates: {
      latitude: number;
      longitude: number;
    } | null;
    timezone: string | null;
    region: string | null;
  }>;
}

// Helper function to format currency
const formatAmount = (amount: number, currency: string = "USD") => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
};

// Appointment status badge component
const AppointmentStatusBadge = ({ status }: { status: string }) => {
  const statusConfig: Record<string, { color: string; icon: any }> = {
    CREATED: { color: "bg-blue-50 text-blue-700 border-blue-200", icon: Clock },
    CONFIRMED: {
      color: "bg-purple-50 text-purple-700 border-purple-200",
      icon: CheckCircle2,
    },
    CHECKED_IN: {
      color: "bg-indigo-50 text-indigo-700 border-indigo-200",
      icon: UserCheck,
    },
    CHECKED_OUT: {
      color: "bg-gray-50 text-gray-700 border-gray-200",
      icon: UserX,
    },
    CANCELLED: {
      color: "bg-red-50 text-red-700 border-red-200",
      icon: XCircle,
    },
    COMPLETED: {
      color: "bg-green-50 text-green-700 border-green-200",
      icon: CheckCircle2,
    },
    NO_SHOW: {
      color: "bg-orange-50 text-orange-700 border-orange-200",
      icon: AlertCircle,
    },
  };

  const config = statusConfig[status] || {
    color: "bg-gray-50 text-gray-700 border-gray-200",
    icon: Clock,
  };
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={`${config.color} flex items-center gap-1`}
    >
      <Icon className="h-3 w-3" />
      {status}
    </Badge>
  );
};

export default function UserDetail() {
  const params = useParams();
  const userId = params?.consumerId as string;
  const router = useRouter();
  const { token } = useAuth();

  const { data: user, isLoading, error, refetch } = useUserById(userId);

  const {
    payments: consumerPayments,
    loading: paymentsLoading,
    error: paymentsError,
    hasMore: hasMorePayments,
    loadMore: loadMorePayments,
    totalSpent,
    totalRefunded,
    completedCount,
  } = useConsumerPaymentsByUserId(userId, { limit: 20 });

  const [activeTab, setActiveTab] = useState("overview");

  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [showPhoneDialog, setShowPhoneDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");

  const { resetPassword, changeEmail, changePhone, changeStatus } =
    useUsersManagement();

  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  // Flatten all appointments from all business clients
  const allAppointments =
    user?.businessClients
      ?.flatMap(
        (client) =>
          client.appointments?.map((apt) => ({
            ...apt,
            clientName: client.fullName,
            businessName: client.business.name,
            businessId: client.business.id,
            serviceName:
              apt.businessService?.service?.title ||
              apt.businessPackage?.title ||
              "Service",
          })) || [],
      )
      .sort(
        (a, b) => new Date(b.start).getTime() - new Date(a.start).getTime(),
      ) || [];

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
      await resetPassword(user.id, newPassword, false);
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
      await changeEmail(user.id, newEmail);

      toast.success("Email changed from " + user.email + " to " + newEmail);

      setShowEmailDialog(false);
      setNewEmail("");
    } catch (error) {
      toast.error("Failed to change email");
      console.error("Email change error:", error);
    }
  };

  const handleToggleStatus = async () => {
    const newStatus = !user.isBanned;

    try {
      await changeStatus(user.id, newStatus);

      toast.success(
        `Account ${newStatus ? "banned" : "unbanned"} for ${user.name}`,
      );

      setShowStatusDialog(false);
    } catch (error) {
      toast.error("Failed to update account status");
      console.error("Status change error:", error);
    }
  };

  const getUserStatus = () => {
    if (user.isBanned) return "BANNED";
    return "ACTIVE";
  };

  // console.log("User data:", user);

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
                {user.name}
              </h1>
              <UserTypeBadge type="consumer" />
              <StatusBadge status={getUserStatus()} />
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
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              User ID: {user.id} | Clerk ID: {user.clerkUserId}
            </p>
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid grid-cols-5 ">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* User Info */}
              <div className="admin-card lg:col-span-2">
                <h2 className="text-lg font-semibold">User Information</h2>
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
                  <Button
                    variant={user.isBanned ? "default" : "destructive"}
                    className="w-full justify-start"
                    onClick={() => setShowStatusDialog(true)}
                  >
                    {user.isBanned ? (
                      <>
                        <UserCheck className="mr-2 h-4 w-4" />
                        Unban Account
                      </>
                    ) : (
                      <>
                        <UserX className="mr-2 h-4 w-4" />
                        Ban Account
                      </>
                    )}
                  </Button>
                </div>

                {/* Quick Stats */}
                <div className="mt-6 pt-6 border-t">
                  <h3 className="text-sm font-medium mb-3">Quick Stats</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Total Appointments
                      </span>
                      <Badge variant="secondary">
                        {allAppointments.length}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Total Spent
                      </span>
                      <Badge variant="secondary">
                        {formatAmount(totalSpent)}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Businesses Visited
                      </span>
                      <Badge variant="secondary">
                        {user.businessClients?.length || 0}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Associated Businesses */}
            {user.businessClients.length > 0 && (
              <div className="admin-card">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <h2 className="text-lg font-semibold">Businesses Visited</h2>
                  <Badge variant="outline">{user.businessClients.length}</Badge>
                </div>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {user.businessClients.map((client) => (
                    <div
                      key={client.business.id}
                      className="rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                      // onClick={() =>
                      //   router.push(`/admin/businesses/${client.business.id}`)
                      // }
                    >
                      <p className="font-medium truncate">
                        {client.business.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {client.appointments?.length || 0} appointments
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Favorites */}
            {user.favorites.length > 0 && (
              <div className="admin-card">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-muted-foreground" />
                  <h2 className="text-lg font-semibold">Favorites</h2>
                  <Badge variant="secondary">{user.favorites.length}</Badge>
                </div>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {user.favorites.map((favorite) => (
                    <div
                      key={favorite.id}
                      className="rounded-lg border p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() =>
                        router.push(`/admin/businesses/${favorite.id}`)
                      }
                    >
                      <p className="font-medium truncate">{favorite.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Appointments Tab */}
          <TabsContent value="appointments" className="space-y-6">
            <div className="admin-card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <h2 className="text-lg font-semibold">Appointment History</h2>
                  <Badge variant="outline">
                    {allAppointments.length} total
                  </Badge>
                </div>
              </div>

              {allAppointments.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-lg font-medium">No appointments found</p>
                  <p className="text-sm mt-1">
                    This user hasn&apos;t booked any appointments yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {allAppointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="rounded-lg border p-4 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {appointment.businessName}
                            </span>
                            <AppointmentStatusBadge
                              status={appointment.status}
                            />
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Service
                              </p>
                              <p className="font-medium">
                                {appointment.serviceName}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Date & Time
                              </p>
                              <p className="font-medium">
                                {format(
                                  new Date(appointment.start),
                                  "MMM d, yyyy",
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(appointment.start), "h:mm a")}{" "}
                                - {format(new Date(appointment.end), "h:mm a")}
                              </p>
                            </div>
                            {appointment.invoice && (
                              <>
                                <div>
                                  <p className="text-xs text-muted-foreground">
                                    Amount
                                  </p>
                                  <p className="font-semibold">
                                    {formatAmount(
                                      appointment.invoice.amountDue,
                                    )}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">
                                    Payment
                                  </p>
                                  <StatusBadge
                                    status={appointment.invoice.paymentStatus}
                                  />
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            router.push(
                              `/admin/businesses/${appointment.businessId}/appointments/${appointment.id}`,
                            )
                          }
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-6">
            <div className="admin-card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  <h2 className="text-lg font-semibold">Payment History</h2>
                  <Badge variant="outline">
                    {consumerPayments.length} payments
                  </Badge>
                </div>
              </div>

              {paymentsLoading && consumerPayments.length === 0 ? (
                <div className="flex min-h-[200px] items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : paymentsError ? (
                <div className="flex items-center justify-center min-h-[200px] text-red-500">
                  Error loading payments: {paymentsError}
                </div>
              ) : consumerPayments.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-lg font-medium">
                    No payment history found
                  </p>
                  <p className="text-sm mt-1">
                    This user hasn&apos;t made any payments yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">
                        Total Spent
                      </p>
                      <p className="text-xl font-bold mt-1">
                        {formatAmount(totalSpent)}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">
                        Completed Payments
                      </p>
                      <p className="text-xl font-bold mt-1 text-green-600">
                        {completedCount}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">
                        Total Refunded
                      </p>
                      <p className="text-xl font-bold mt-1 text-orange-600">
                        {formatAmount(totalRefunded)}
                      </p>
                    </div>
                  </div>

                  {/* Payments List */}
                  <div className="space-y-3">
                    {consumerPayments.map((payment) => (
                      <div
                        key={payment.id}
                        className="rounded-lg border p-4 hover:shadow-sm transition-shadow"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {payment.businessName}
                              </span>
                              <StatusBadge status={payment.status} />
                              {payment.paymentStatus && (
                                <Badge
                                  variant="outline"
                                  className="bg-blue-50 text-blue-700"
                                >
                                  {payment.paymentStatus}
                                </Badge>
                              )}
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Service
                                </p>
                                <p className="font-medium">
                                  {payment.serviceName ||
                                    payment.packageName ||
                                    "—"}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Amount
                                </p>
                                <p className="font-semibold">
                                  {formatAmount(payment.amount)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Date
                                </p>
                                <p className="font-medium">
                                  {format(
                                    new Date(payment.createdAt),
                                    "MMM d, yyyy",
                                  )}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Transaction ID
                                </p>
                                <p className="font-mono text-xs">
                                  {payment.id}
                                </p>
                              </div>
                            </div>

                            {payment.refundAmount > 0 && (
                              <div className="mt-2 flex items-center gap-2 text-sm text-orange-600">
                                <AlertCircle className="h-4 w-4" />
                                <span>
                                  Refunded: {formatAmount(payment.refundAmount)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Load More Button */}
                  {hasMorePayments && (
                    <div className="flex justify-center pt-4">
                      <Button
                        variant="outline"
                        onClick={() => loadMorePayments()}
                        disabled={paymentsLoading}
                      >
                        {paymentsLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          "Load More Payments"
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-6">
            {/* Last Login Info */}
            <div className="admin-card">
              <div className="flex items-center gap-2">
                <Monitor className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold">Last Login</h2>
              </div>
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
                  {user.recentLoginSessions.length} sessions
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
                    {user.recentLoginSessions.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="py-8 text-center text-muted-foreground"
                        >
                          No login sessions found
                        </td>
                      </tr>
                    ) : (
                      user.recentLoginSessions.map((session, index) => (
                        <tr key={index}>
                          <td>
                            {safeFormatDate(
                              session.lastLogin,
                              "MMM d, yyyy HH:mm",
                            )}
                          </td>
                          <td>{session.device}</td>
                          <td className="font-mono text-xs">
                            {session.ipAddress}
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

          {/* Reviews Tab */}
          <TabsContent value="reviews" className="space-y-6">
            <div className="admin-card">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold">Reviews</h2>
                <Badge variant="secondary">{user.reviews.length} reviews</Badge>
              </div>
              <div className="mt-4 space-y-4">
                {user.reviews.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    No reviews found
                  </div>
                ) : (
                  user.reviews.map((review) => (
                    <div key={review.id} className="rounded-lg border p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex items-center">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-4 w-4 ${
                                    i < Math.floor(review.ratings)
                                      ? "fill-yellow-400 text-yellow-400"
                                      : "text-gray-300"
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm font-medium">
                              {review.ratings.toFixed(1)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            For{" "}
                            <span className="font-medium">
                              {review.business?.name || "Unknown Business"}
                            </span>
                          </p>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {safeFormatDate(review.createdAt, "MMM d, yyyy")}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
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
              Set a new password for {user.name} ({user.email}).
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                // type="password"
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
              Update the email address for {user.name}. This will require the
              user to verify their new email.
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
      <ChangePhoneDialog
        open={showPhoneDialog}
        onOpenChange={setShowPhoneDialog}
        userId={user.id}
        userName={user.name}
        currentPhone={user.phoneNumber}
        userType={user.userType}
        onSuccess={() => {
          // refetch(); // Uncomment if you want to refresh data after update
        }}
      />

      {/* Status Confirmation */}
      <AlertDialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {user.isBanned ? "Unban Account" : "Ban Account"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {user.isBanned
                ? `Are you sure you want to unban the account for ${user.name}? They will be able to log in again.`
                : `Are you sure you want to ban the account for ${user.name}? They will no longer be able to log in.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggleStatus}>
              {user.isBanned ? "Unban" : "Ban"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
