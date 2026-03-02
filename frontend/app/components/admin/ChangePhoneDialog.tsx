// frontend/app/admin/users/influencer/[influencerId]/ChangePhoneDialog.tsx
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useUsersManagement } from "@/hooks/useUsers";

interface ChangePhoneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  currentPhone: string | null;
  userType: string; // "INFLUENCER" | "CONSUMER" | "BUSINESS"
  onSuccess?: () => void;
}

export function ChangePhoneDialog({
  open,
  onOpenChange,
  userId,
  userName,
  currentPhone,
  userType,
  onSuccess,
}: ChangePhoneDialogProps) {
  const [newPhone, setNewPhone] = useState(currentPhone || "");
  const [isLoading, setIsLoading] = useState(false);
  const { token } = useAuth();
  const { changeInfluencerPhone, changePhone } = useUsersManagement();

  const handleChangePhone = async () => {
    if (!newPhone || !token) return;

    setIsLoading(true);
    try {
      if (userType.toLowerCase() === "influencer") {
        await changeInfluencerPhone(userId, newPhone);
      } else if (userType.toLowerCase() === "consumer") {
        await changePhone(userId, newPhone);
      } else if (userType.toLowerCase() === "business") {
        await changePhone(userId, newPhone, true);
      } else {
        throw new Error("Invalid user type");
      }

      toast.success(
        `Phone changed from ${currentPhone || "Not set"} to ${newPhone}`,
      );

      onSuccess?.();
      onOpenChange(false);
      setNewPhone(newPhone);
    } catch (error) {
      toast.error("Failed to change phone number", {
        description:
          error instanceof Error ? error.message : "An unknown error occurred",
      });
      console.error("Phone change error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Phone Number</DialogTitle>
          <DialogDescription>
            Update the phone number for {userName}.
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
            disabled={isLoading}
          />
          {currentPhone && (
            <p className="text-xs text-muted-foreground mt-2">
              Current phone: {currentPhone}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setNewPhone(currentPhone || "");
            }}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleChangePhone}
            disabled={!newPhone || newPhone === currentPhone || isLoading}
          >
            {isLoading ? "Updating..." : "Update Phone"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
