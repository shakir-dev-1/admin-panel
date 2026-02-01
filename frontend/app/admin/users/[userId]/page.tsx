"use client";
// src/pages/admin/UserDetail.tsx
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
  CreditCard,
  Building2,
} from "lucide-react";
import { SideBar } from "@/app/components/admin/SideBar";
import { StatusBadge } from "@/app/components/admin/StatusBadge";
import { UserTypeBadge } from "@/app/components/admin/UserTypeBadge";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
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
import { format } from "date-fns";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { fetchWithAuth } from "@/lib/api";
import type { User } from "@/hooks/useUsers";
import { formatStripeAmount, formatStripeDate, safeFormatDate } from "@/lib/utils";

interface ApiUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  userType: "USER" | "BUSINESS" | "INFLUENCER";
  status: "ACTIVE" | "DISABLED";
  lastLoginAt: string | null;
  createdAt: string;
  business: {
    id: string;
    name: string;
    stripeCustomerId: string;
    stripeSubscriptionId: string;
    subscriptionPlan: string;
    subscriptionStatus: string;
  } | null;
}

interface Payment {
  id: string;
  description: string;
  amount: number;
  currency: string;
  status: string;
  created: string;
}

export default function UserDetail() {
  const params = useParams();
  const userId = params?.userId as string;
  const router = useRouter();
  const { token } = useAuth();

  const [user, setUser] = useState<ApiUser | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [showPhoneDialog, setShowPhoneDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showCancelSubDialog, setShowCancelSubDialog] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");

  useEffect(() => {
    if (!token || !userId) return;

    const fetchUserData = async () => {
      try {
        setLoading(true);

        // Fetch user details
        const userData = await fetchWithAuth<ApiUser>(
          `/admin/users/${userId}`,
          token,
        );
        setUser(userData);

        console.log("Fetched user data:", userData);

        // Fetch payments for business users
        if (userData.userType === "BUSINESS" && userData.business) {
          try {
            const paymentsData = await fetchWithAuth<Payment[]>(
              `/admin/business/${userData.business.id}/payments`,
              token,
            );
            console.log("Fetched payments data:", paymentsData);
            setPayments(paymentsData);
          } catch (error) {
            console.error("Error fetching payments:", error);
            setPayments([]);
          }
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        toast.error("Failed to load user data");
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [token, userId]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold">Loading user...</h2>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-100 flex-col items-center justify-center space-y-4">
        <h2 className="text-xl font-semibold">User not found</h2>
        <Button onClick={() => router.push("/admin/users")}>
          Back to Users
        </Button>
      </div>
    );
  }

  // Map backend userType to frontend type for UserTypeBadge
  const getFrontendUserType = (
    userType: ApiUser["userType"],
  ): "business" | "consumer" | "influencer" => {
    switch (userType) {
      case "BUSINESS":
        return "business";
      case "USER":
        return "consumer";
      case "INFLUENCER":
        return "influencer";
      default:
        return "consumer";
    }
  };

  const handleResetPassword = async () => {
    try {
      if (!user.email || !token) return;
      await fetchWithAuth(`/admin/users/${user.id}/reset-password`, token, {
        method: "POST",
      });
      toast.success("Password reset email sent to " + user.email);
    } catch (error) {
      toast.error("Failed to reset password");
      console.error("Password reset error:", error);
    }
  };

  const handleChangeEmail = async () => {
    if (!newEmail || !token) return;

    try {
      await fetchWithAuth(`/admin/users/${user.id}/email`, token, {
        method: "PATCH",
        body: JSON.stringify({ email: newEmail }),
      });
      toast.success("Email changed from " + user.email + " to " + newEmail);
      setUser({ ...user, email: newEmail });
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
      await fetchWithAuth(`/admin/users/${user.id}/phone`, token, {
        method: "PATCH",
        body: JSON.stringify({ phone: newPhone }),
      });
      toast.success("Phone changed from " + user.phone + " to " + newPhone);
      setUser({ ...user, phone: newPhone });
      setShowPhoneDialog(false);
      setNewPhone("");
    } catch (error) {
      toast.error("Failed to change phone");
      console.error("Phone change error:", error);
    }
  };

  const handleToggleStatus = async () => {
    const newStatus = user.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
    if (!token) return;

    try {
      await fetchWithAuth(`/admin/users/${user.id}/status`, token, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      toast.success(
        `Account ${newStatus === "ACTIVE" ? "enabled" : "disabled"} for ${user.name}`,
      );
      setUser({ ...user, status: newStatus });
      setShowStatusDialog(false);
    } catch (error) {
      toast.error("Failed to update account status");
      console.error("Status change error:", error);
    }
  };

  const handleCancelSubscription = async () => {
    if (!user.business || !token) return;

    try {
      await fetchWithAuth(
        `/admin/business/${user.id}/cancel-subscription`,
        token,
        { method: "PATCH" },
      );
      toast.success("Subscription cancelled for " + user.business.name);
      setShowCancelSubDialog(false);
      // Refresh user data to update subscription status
      const updatedUser = await fetchWithAuth<ApiUser>(
        `/admin/users/${userId}`,
        token,
      );
      setUser(updatedUser);
    } catch (error) {
      toast.error("Failed to cancel subscription");
      console.error("Cancel subscription error:", error);
    }
  };

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
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">
                {user.name}
              </h1>
              <UserTypeBadge type={getFrontendUserType(user.userType)} />
              <StatusBadge status={user.status} />
            </div>
            <p className="text-sm text-muted-foreground">User ID: {user.id}</p>
          </div>
        </div>

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
                  <p className="font-medium">{user.phone}</p>
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
              <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Last Login</p>
                  <p className="font-medium">
                    {safeFormatDate(user.lastLoginAt, "MMM d, yyyy HH:mm") ||
                      "Never"}
                  </p>
                </div>
              </div>
              {user.business && (
                <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3 sm:col-span-2">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Business Name
                    </p>
                    <p className="font-medium">{user.business.name}</p>
                  </div>
                </div>
              )}
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
              {(user.userType === "BUSINESS" || user.userType === "USER") && (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    setNewPhone(user.phone);
                    setShowPhoneDialog(true);
                  }}
                >
                  <Phone className="mr-2 h-4 w-4" />
                  Change Phone
                </Button>
              )}
              <Button
                variant={user.status === "ACTIVE" ? "destructive" : "default"}
                className="w-full justify-start"
                onClick={() => setShowStatusDialog(true)}
              >
                {user.status === "ACTIVE" ? (
                  <>
                    <UserX className="mr-2 h-4 w-4" />
                    Disable Account
                  </>
                ) : (
                  <>
                    <UserCheck className="mr-2 h-4 w-4" />
                    Enable Account
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Subscription (Business only) */}
        {user.userType === "BUSINESS" && user.business && (
          <div className="admin-card">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Subscription</h2>
                <p className="text-sm text-muted-foreground">
                  Current subscription plan and status
                </p>
              </div>
              {user.business.subscriptionStatus === "active" && (
                <Button
                  variant="destructive"
                  onClick={() => setShowCancelSubDialog(true)}
                >
                  Cancel Subscription
                </Button>
              )}
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-4">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Plan</p>
                <p className="font-semibold">
                  {user.business.subscriptionPlan}
                </p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Status</p>
                <StatusBadge status={user.business.subscriptionStatus} />
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">
                  Stripe Customer ID
                </p>
                <p className="font-mono text-xs truncate">
                  {user.business.stripeCustomerId || "Not set"}
                </p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">
                  Stripe Subscription ID
                </p>
                <p className="font-mono text-xs truncate">
                  {user.business.stripeSubscriptionId || "Not set"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Payments */}
        {user.userType === "BUSINESS" && (
          <div className="admin-card">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Payment History</h2>
            </div>
            <div className="mt-4 overflow-hidden rounded-lg border">
              <table className="admin-table">
                <thead className="bg-muted/50">
                  <tr>
                    <th>Stripe ID</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-8 text-center text-muted-foreground"
                      >
                        No payment history
                      </td>
                    </tr>
                  ) : (
                    payments.map((payment) => (
                      <tr key={payment.id}>
                        <td className="font-mono text-xs">{payment.id}</td>
                        <td>{payment.description}</td>
                        <td className="font-medium">
                          {formatStripeAmount(payment.amount, payment.currency)}
                        </td>
                        <td>
                          <StatusBadge status={payment.status} />
                        </td>
                        <td className="text-muted-foreground">
                          {formatStripeDate(payment.created, "MMM d, yyyy")}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Email Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Email Address</DialogTitle>
            <DialogDescription>
              Update the email address for {user.name}. This action will be
              logged.
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
              Save Changes
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
              Update the phone number for {user.name}. This action will be
              logged.
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
              disabled={!newPhone || newPhone === user.phone}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Confirmation */}
      <AlertDialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {user.status === "ACTIVE" ? "Disable Account" : "Enable Account"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {user.status === "ACTIVE"
                ? `Are you sure you want to disable the account for ${user.name}? They will no longer be able to log in.`
                : `Are you sure you want to enable the account for ${user.name}? They will be able to log in again.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggleStatus}>
              {user.status === "ACTIVE" ? "Disable" : "Enable"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Subscription Confirmation */}
      {user.business && user.business.subscriptionStatus === "active" && (
        <AlertDialog
          open={showCancelSubDialog}
          onOpenChange={setShowCancelSubDialog}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to cancel the subscription for{" "}
                {user.business.name}? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCancelSubscription}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Cancel Subscription
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
