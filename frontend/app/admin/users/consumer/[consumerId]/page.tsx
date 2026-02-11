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
import { safeFormatDate } from "@/lib/utils";
import { useUsersManagement, useUserById } from "@/hooks/useUsers";

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
    business: {
      id: string;
      name: string;
    };
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

export default function UserDetail() {
  const params = useParams();
  const userId = params?.consumerId as string;
  const router = useRouter();
  const { token } = useAuth();

  const { data: user, isLoading, error, refetch } = useUserById(userId);

  const [activeTab, setActiveTab] = useState("overview");

  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [showPhoneDialog, setShowPhoneDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");

  const { resetPassword, changeEmail, changePhone, changeStatus } = useUsersManagement();

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
    try {
      if (!token) return;
      await resetPassword(user.id);

      toast.success("Password reset email sent to " + user.email);
    } catch (error) {
      toast.error("Failed to reset password");
      console.error("Password reset error:", error);
    }
  };

  const handleChangeEmail = async () => {
    if (!newEmail || !token) return;

    try {
      await changeEmail(user.id, newEmail);

      toast.success("Email changed from " + user.email + " to " + newEmail);

      // Refetch to get updated data (cache will be invalidated by the hook)
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
      await changePhone(user.id, newPhone);

      toast.success(
        "Phone changed from " + user.phoneNumber + " to " + newPhone,
      );

      // Refetch to get updated data (cache will be invalidated by the hook)
      refetch();

      setShowPhoneDialog(false);
      setNewPhone("");
    } catch (error) {
      toast.error("Failed to change phone");
      console.error("Phone change error:", error);
    }
  };

  const handleToggleStatus = async () => {
    const newStatus = !user.isBanned;

    try {
      await changeStatus(user.id, newStatus);

      toast.success(
        `Account ${newStatus ? "banned" : "unbanned"} for ${user.name}`,
      );

      // Refetch to get updated data (cache will be invalidated by the hook)
      refetch();

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

  // console.log("User: ", user);

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
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
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
                    onClick={handleResetPassword}
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
              </div>
            </div>

            {/* Associated Businesses */}
            {user.businessClients.length > 0 && (
              <div className="admin-card">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <h2 className="text-lg font-semibold">
                    Associated Businesses
                  </h2>
                </div>
                <div className="mt-4 grid gap-3">
                  {user.businessClients.map((client, index) => (                    
                    <div
                      key={client.business.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >                      
                      <div>
                        <p className="font-medium">{client.business.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Business ID: {client.business.id}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          router.push(`/admin/business/${client.business.id}`)
                        }
                      >
                        View Business
                      </Button>
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
                      className="rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                    >
                      <p className="font-medium truncate">{favorite.name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        ID: {favorite.id}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
                <h2 className="text-lg font-semibold">Recent Reviews</h2>
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
                              {review.business
                                ? review.business.name
                                : "Unknown Business"}
                            </span>
                          </p>
                          <p className="text-sm">{review.createdAt}</p>
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
                    <Phone className="h-4 w-4" />
                    <span className="font-medium">Phone Verification</span>
                  </div>
                  <Badge
                    variant={user.isPhoneConfirmed ? "default" : "secondary"}
                  >
                    {user.isPhoneConfirmed ? "Verified" : "Pending"}
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
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4" />
                    <span className="font-medium">Agreements</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">User Agreement</span>
                      <Badge
                        variant={
                          user.isAgreementAccepted ? "default" : "secondary"
                        }
                      >
                        {user.isAgreementAccepted ? "Accepted" : "Pending"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Privacy Policy</span>
                      <Badge
                        variant={
                          user.hasAcceptedPolicy ? "default" : "secondary"
                        }
                      >
                        {user.hasAcceptedPolicy ? "Accepted" : "Pending"}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4" />
                    <span className="font-medium">Onboarding</span>
                  </div>
                  <Badge
                    variant={user.onboardingCompleted ? "default" : "secondary"}
                  >
                    {user.onboardingCompleted ? "Completed" : "Incomplete"}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Account Status */}
            <div className="admin-card">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold">Account Status</h2>
              </div>
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">
                      Account Status
                    </p>
                    <div className="mt-2">
                      <StatusBadge status={getUserStatus()} />
                    </div>
                    {user.banDate && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Banned on:{" "}
                        {safeFormatDate(user.banDate, "MMM d, yyyy HH:mm")}
                      </p>
                    )}
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">
                      Last Updated
                    </p>
                    <p className="mt-2 font-medium">
                      {safeFormatDate(user.updatedAt, "MMM d, yyyy HH:mm")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

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
      <Dialog open={showPhoneDialog} onOpenChange={setShowPhoneDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Phone Number</DialogTitle>
            <DialogDescription>
              Update the phone number for {user.name}. This will require the
              user to verify their new phone number.
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
