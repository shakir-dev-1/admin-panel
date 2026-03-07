// frontend/app/admin/users/influencer/[influencerId]/ChangePhoneDialog.tsx
import { useState, useEffect } from "react";
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
import { AlertCircle, CheckCircle } from "lucide-react";

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
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { token } = useAuth();
  const { changeInfluencerPhone, changePhone } = useUsersManagement();

  // Reset validation when dialog opens or phone changes
  useEffect(() => {
    if (open) {
      setNewPhone(currentPhone || "");
      validatePhone(currentPhone || "");
    }
  }, [open, currentPhone]);

  // Validate phone number
  const validatePhone = (phone: string): boolean => {
    // Empty is allowed (can set to empty)
    if (!phone || phone.trim() === "") {
      setPhoneError(null);
      setIsValid(true);
      return true;
    }

    // Remove all non-digit characters for validation
    const digitsOnly = phone.replace(/\D/g, "");
    
    // Check if it's a valid phone number (between 7-15 digits)
    if (digitsOnly.length < 7) {
      setPhoneError("Phone number must have at least 7 digits");
      setIsValid(false);
      return false;
    }
    
    if (digitsOnly.length > 15) {
      setPhoneError("Phone number cannot exceed 15 digits");
      setIsValid(false);
      return false;
    }

    // Check for valid characters (allow +, -, (), ., and spaces)
    const validFormat = /^[0-9+\-\s().]+$/.test(phone);
    if (!validFormat) {
      setPhoneError("Phone number contains invalid characters");
      setIsValid(false);
      return false;
    }

    setPhoneError(null);
    setIsValid(true);
    return true;
  };

  // Handle phone input change
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewPhone(value);
    validatePhone(value);
  };

  // Format phone number for display (optional helper)
  const formatPhoneDisplay = (phone: string) => {
    if (!phone) return "Not set";
    
    // Simple formatting - just show the first few and last few digits if too long
    if (phone.length > 12) {
      const start = phone.slice(0, 4);
      const end = phone.slice(-4);
      return `${start}...${end}`;
    }
    return phone;
  };

  const handleChangePhone = async () => {
    if (!token) {
      toast.error("Authentication required");
      return;
    }

    // Final validation before submission
    if (!validatePhone(newPhone)) {
      toast.error("Please enter a valid phone number");
      return;
    }

    // Check if actually changed
    if (newPhone === currentPhone) {
      toast.info("Phone number is already set to this value");
      onOpenChange(false);
      return;
    }

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

      const oldDisplay = formatPhoneDisplay(currentPhone || "");
      const newDisplay = formatPhoneDisplay(newPhone || "empty");
      
      toast.success(
        `Phone number updated successfully`,
        {
          description: currentPhone 
            ? `Changed from ${oldDisplay} to ${newDisplay}`
            : `Set to ${newDisplay}`,
        }
      );

      onSuccess?.();
      onOpenChange(false);
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Phone Number</DialogTitle>
          <DialogDescription>
            Update the phone number for <span className="font-medium">{userName}</span>.
            {currentPhone && (
              <span className="block mt-1 text-xs">
                Current: <span className="font-mono">{currentPhone}</span>
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <Label htmlFor="phone" className="text-sm font-medium">
            New Phone Number
          </Label>
          <div className="mt-1.5 relative">
            <Input
              id="phone"
              type="tel"
              value={newPhone}
              onChange={handlePhoneChange}
              className={`mt-2 pr-10 ${
                phoneError 
                  ? "border-red-500 focus-visible:ring-red-500" 
                  : newPhone && isValid
                  ? "border-green-500 focus-visible:ring-green-500"
                  : ""
              }`}
              placeholder="+1 (555) 123-4567"
              disabled={isLoading}
              autoComplete="off"
            />
            {newPhone && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {phoneError ? (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                ) : isValid ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : null}
              </div>
            )}
          </div>
          
          {/* Validation hints */}
          {phoneError && (
            <p className="text-sm text-red-500 mt-1.5 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              {phoneError}
            </p>
          )}
          
          {!newPhone && (
            <p className="text-xs text-muted-foreground mt-2">
            </p>
          )}
          
          {newPhone && !phoneError && isValid && (
            <p className="text-xs text-green-600 mt-1.5">
              ✓ Valid phone number format
            </p>
          )}
          
          {/* Quick format examples */}
          <div className="mt-3 text-xs text-muted-foreground border-t pt-2">
            <p className="font-medium mb-1">Accepted formats:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>+1 555-123-4567</li>
              <li>(555) 123-4567</li>
              <li>5551234567</li>
              <li>+44 20 1234 5678</li>
            </ul>
          </div>
        </div>
        
        <DialogFooter className="sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              onOpenChange(false);
              setNewPhone(currentPhone || "");
              setPhoneError(null);
            }}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleChangePhone}
            disabled={
              !token || 
              isLoading || 
              !isValid || 
              newPhone === currentPhone
            }
            className="min-w-[120px]"
          >
            {isLoading ? (
              <>
                <span className="mr-2">Updating</span>
                <span className="animate-spin">⚪</span>
              </>
            ) : (
              "Update Phone"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}