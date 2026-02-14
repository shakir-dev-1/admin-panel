/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
// frontend/app/admin/business/users/[userId]/page.tsx
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/components/ui/tabs";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
// import { fetchWithAuth } from "@/lib/api";
import { safeFormatDate } from "@/lib/utils";
import { useUsersManagement, useBusinessUserById } from "@/hooks/useUsers";


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
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");

  const { resetPassword, changeEmail, changePhone } = useUsersManagement();

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
      await resetPassword(user.id, true);
      toast.success("Password reset email sent to " + user.email);
    } catch (error) {
      toast.error("Failed to reset password");
      console.error("Password reset error:", error);
    }
  };

  const handleChangeEmail = async () => {
    if (!newEmail || !token) return;

    try {
      await changeEmail(user.id, newEmail, true);
      toast.success("Email changed from " + user.email + " to " + newEmail);
      // refetch();
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
      // refetch();
      setShowPhoneDialog(false);
      setNewPhone("");
    } catch (error) {
      toast.error("Failed to change phone");
      console.error("Phone change error:", error);
    }
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
          </TabsContent>

          {/* Businesses Tab - FIXED */}
          <TabsContent value="businesses" className="space-y-6">
            <div className="admin-card">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold">Associated Businesses</h2>
                <Badge variant="outline">
                  {user.businesses?.length || 0} business(es)
                </Badge>
              </div>
              <div className="mt-4 space-y-4">
                {!user.businesses || user.businesses.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    No businesses associated with this user
                  </div>
                ) : (
                  user.businesses.map((business) => {
                    return (
                      <div
                        key={business.memberId || business.id}
                        className="rounded-lg border p-4"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold">{business.name}</h3>
                              {business.isVerified && (
                                <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                                  <BadgeCheck className="mr-1 h-3 w-3" />
                                  Verified
                                </Badge>
                              )}
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Role
                                </p>
                                <Badge
                                  variant="outline"
                                  className="capitalize mt-1"
                                >
                                  {business.role.toLowerCase()}
                                </Badge>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Joined
                                </p>
                                <p className="text-sm font-medium">
                                  {safeFormatDate(
                                    business.joinedAt,
                                    "MMM d, yyyy",
                                  )}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Location
                                </p>
                                <p className="text-sm font-medium">
                                  {business.city}, {business.country}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Industry
                                </p>
                                <p className="text-sm font-medium">
                                  {business.industryType?.join(", ") || "N/A"}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2 ml-4">
                            {business.id && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  router.push(
                                    `/admin/businesses/${business.id}`,
                                  )
                                }
                              >
                                View Business
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
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
