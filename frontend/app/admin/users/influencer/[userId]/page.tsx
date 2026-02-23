/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
// frontend/app/admin/users/influencer/[influencerId]/page.tsx
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
  TrendingUp,
  Target,
  Award,
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
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { fetchWithAuth } from "@/lib/api";
import { safeFormatDate } from "@/lib/utils";
import { useUsersManagement, useInfluencerById } from "@/hooks/useUsers";

interface ApiInfluencer {
  id: string;
  name: string;
  email: string;
  username: string;
  phoneNumber: string | null;
  isEmailConfirmed: boolean;
  twoFactorEnabled: boolean;
  twoFactorType: string | null;
  twoFactorSecret: string | null;
  createdAt: string;
  updatedAt: string;
  userType: string;
  lastLoginAt: string;
  lastLoginDevice: string | null;
  lastLoginIp: string | null;
  lastLoginLocation: string | null;

  // Campaign stats (from API response)
  campaignStats?: {
    totalOffers: number;
    acceptedOffers: number;
    pendingOffers: number;
    rejectedOffers: number;
    counteredOffers: number;
    acceptanceRate: number;
  };

  // Campaign relationships - CORRECTED
  campaignOffers: Array<{
    id: string;
    status: string;
    createdAt: string;
    business: {
      id: string;
      name: string;
    };
    campaign: {
      id: string;
      name: string;
    };
  }>;

  // Login sessions
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

export default function InfluencerDetail() {
  const params = useParams();
  const influencerId = params?.userId as string;
  const router = useRouter();

  // Use the cached hook instead of useState + useEffect
  const {
    data: influencer,
    isLoading,
    error,
    // refetch,
  } = useInfluencerById(influencerId);

  const { token } = useAuth();

  // const [influencer, setInfluencer] = useState<ApiInfluencer | null>(null);
  // const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState("overview");

  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [showPhoneDialog, setShowPhoneDialog] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");

  const {
    resetInfluencerPassword,
    changeInfluencerEmail,
    changeInfluencerPhone,
  } = useUsersManagement();

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold">Loading influencer...</h2>
        </div>
      </div>
    );
  }

  if (error || !influencer) {
    return (
      <div className="flex min-h-100 flex-col items-center justify-center space-y-4">
        <h2 className="text-xl font-semibold">
          {error ? "Error loading influencer" : "Influencer not found"}
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
      await resetInfluencerPassword(influencer.id);

      toast.success("Password reset email sent to " + influencer.email);
    } catch (error) {
      toast.error("Failed to reset password");
      console.error("Password reset error:", error);
    }
  };

  const handleChangeEmail = async () => {
    if (!newEmail || !token) return;

    try {
      await changeInfluencerEmail(influencer.id, newEmail);

      toast.success(
        "Email changed from " + influencer.email + " to " + newEmail,
      );
      // refetch(); // Refetch influencer data to get updated email and status

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
      await changeInfluencerPhone(influencer.id, newPhone);

      toast.success(
        "Phone changed from " + influencer.phoneNumber + " to " + newPhone,
      );

      // refetch(); // Refetch influencer data to get updated email and status
      setShowPhoneDialog(false);
      setNewPhone("");
    } catch (error) {
      toast.error("Failed to change phone");
      console.error("Phone change error:", error);
    }
  };

  const getCampaignStats = () => {
    const total = influencer.campaignOffers.length;
    const accepted = influencer.campaignOffers.filter(
      (c) => c.status === "ACCEPTED",
    ).length;
    const pending = influencer.campaignOffers.filter(
      (c) => c.status === "PENDING",
    ).length;
    const rejected = influencer.campaignOffers.filter(
      (c) => c.status === "REJECTED",
    ).length;

    return { total, accepted, pending, rejected };
  };

  const campaignStats = getCampaignStats();

  // console.log("Influencer:", influencer);
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
                {influencer.name}
              </h1>
              <UserTypeBadge type="influencer" />
              <StatusBadge
                status={influencer.isEmailConfirmed ? "Active" : "Inactive"}
              />
              {influencer.isEmailConfirmed && (
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  <Mail className="mr-1 h-3 w-3" />
                  Email Verified
                </Badge>
              )}
              {influencer.twoFactorEnabled && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  <Shield className="mr-1 h-3 w-3" />
                  2FA Enabled
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Influencer ID: {influencer.id}
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
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Influencer Info */}
              <div className="admin-card lg:col-span-2">
                <h2 className="text-lg font-semibold">
                  Influencer Information
                </h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="font-medium">{influencer.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p className="font-medium">
                        {influencer.phoneNumber || "Not set"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Username</p>
                      <p className="font-medium">{influencer.username}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Joined</p>
                      <p className="font-medium">
                        {safeFormatDate(influencer.createdAt, "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                    <TrendingUp className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Total Campaigns
                      </p>
                      <p className="font-medium">{campaignStats.total}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                    <Award className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Accepted Campaigns
                      </p>
                      <p className="font-medium">{campaignStats.accepted}</p>
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
                      setNewEmail(influencer.email);
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
                      setNewPhone(influencer.phoneNumber || "");
                      setShowPhoneDialog(true);
                    }}
                  >
                    <Phone className="mr-2 h-4 w-4" />
                    Change Phone
                  </Button>
                </div>
              </div>
            </div>

            {/* Campaign Stats */}
            <div className="admin-card">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold">Campaign Statistics</h2>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Total Campaigns
                      </p>
                      <p className="text-2xl font-bold mt-1">
                        {campaignStats.total}
                      </p>
                    </div>
                    <Target className="h-8 w-8 text-blue-500" />
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Accepted</p>
                      <p className="text-2xl font-bold mt-1 text-green-600">
                        {campaignStats.accepted}
                      </p>
                    </div>
                    <Award className="h-8 w-8 text-green-500" />
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Pending</p>
                      <p className="text-2xl font-bold mt-1 text-yellow-600">
                        {campaignStats.pending}
                      </p>
                    </div>
                    <Clock className="h-8 w-8 text-yellow-500" />
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Rejected</p>
                      <p className="text-2xl font-bold mt-1 text-red-600">
                        {campaignStats.rejected}
                      </p>
                    </div>
                    <XCircle className="h-8 w-8 text-red-500" />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns" className="space-y-6">
            <div className="admin-card">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold">Campaign Offers</h2>
                <Badge variant="secondary">
                  {influencer.campaignOffers.length} offers
                </Badge>
              </div>
              <div className="mt-4 overflow-hidden rounded-lg border">
                <table className="admin-table">
                  <thead className="bg-muted/50">
                    <tr>
                      <th>Campaign Name</th>
                      <th>Business</th>
                      <th>Status</th>
                      <th>Received Date</th>
                      {/* <th>Actions</th> */}
                    </tr>
                  </thead>
                  <tbody>
                    {influencer.campaignOffers.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="py-8 text-center text-muted-foreground"
                        >
                          No campaign offers found
                        </td>
                      </tr>
                    ) : (
                      influencer.campaignOffers.map((offer) => (
                        <tr key={offer.id}>
                          <td className="font-medium">
                            {offer.campaign?.name}
                          </td>
                          <td>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <span>{offer.business?.name}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Business ID: {offer.business?.id || "N/A"}
                            </p>
                          </td>
                          <td>
                            <Badge
                              variant={
                                offer.status === "ACCEPTED"
                                  ? "default"
                                  : offer.status === "PENDING"
                                    ? "secondary"
                                    : "destructive"
                              }
                            >
                              {offer.status}
                            </Badge>
                          </td>
                          <td>
                            {safeFormatDate(offer.createdAt, "MMM d, yyyy")}
                          </td>
                          {/* <td>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                router.push(
                                  `/admin/business/${offer.business.id}`,
                                )
                              }
                            >
                              View Business
                            </Button>
                          </td> */}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
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
              {influencer.lastLoginAt ? (
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Date & Time</p>
                    <p className="font-medium">
                      {safeFormatDate(
                        influencer.lastLoginAt,
                        "MMM d, yyyy HH:mm",
                      )}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Device</p>
                    <p className="font-medium">
                      {influencer.lastLoginDevice || "Unknown"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">IP Address</p>
                    <p className="font-mono text-sm">
                      {influencer.lastLoginIp || "Unknown"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Location</p>
                    <p className="font-medium">
                      {influencer.lastLoginLocation || "Unknown"}
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
                  {influencer.recentLoginSessions.length} sessions
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
                    {influencer.recentLoginSessions.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="py-8 text-center text-muted-foreground"
                        >
                          No login sessions found
                        </td>
                      </tr>
                    ) : (
                      influencer.recentLoginSessions.map((session, index) => (
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
                    variant={
                      influencer.isEmailConfirmed ? "default" : "secondary"
                    }
                  >
                    {influencer.isEmailConfirmed ? "Verified" : "Pending"}
                  </Badge>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4" />
                    <span className="font-medium">Two-Factor Auth</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        influencer.twoFactorEnabled ? "default" : "secondary"
                      }
                    >
                      {influencer.twoFactorEnabled ? "Enabled" : "Disabled"}
                    </Badge>
                    {influencer.twoFactorType && (
                      <span className="text-sm text-muted-foreground">
                        ({influencer.twoFactorType})
                      </span>
                    )}
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4" />
                    <span className="font-medium">Last Updated</span>
                  </div>
                  <p className="font-medium">
                    {safeFormatDate(influencer.updatedAt, "MMM d, yyyy HH:mm")}
                  </p>
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
              Update the email address for {influencer.name}. This will require
              the influencer to verify their new email.
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
              disabled={!newEmail || newEmail === influencer.email}
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
              Update the phone number for {influencer.name}. This will require
              the influencer to verify their new phone number.
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
              disabled={!newPhone || newPhone === influencer.phoneNumber}
            >
              Update Phone
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Add missing icon components
function Clock(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function XCircle(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}
