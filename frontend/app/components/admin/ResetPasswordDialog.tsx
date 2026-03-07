/* eslint-disable @typescript-eslint/no-explicit-any */
// frontend/app/admin/users/components/ResetPasswordDialog.tsx
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
import { Alert, AlertDescription } from "@/app/components/ui/alert";
import { Checkbox } from "@/app/components/ui/checkbox";
import { 
  Key, 
  Mail, 
  Copy, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  EyeOff,
  RefreshCw,
  Loader2 
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useUsersManagement } from "@/hooks/useUsers";

interface ResetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userEmail: string;
  userName: string;
  userType: "consumer" | "business" | "influencer";
  onSuccess?: () => void;
}

// Generate a secure random password
const generateRandomPassword = (length = 12): string => {
  const charset = {
    uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    lowercase: "abcdefghijklmnopqrstuvwxyz",
    numbers: "0123456789",
    special: "!@#$%^&*",
  };

  // Ensure at least one character from each set
  const getRandomChar = (set: string) => set[Math.floor(Math.random() * set.length)];
  
  let password = 
    getRandomChar(charset.uppercase) +
    getRandomChar(charset.lowercase) +
    getRandomChar(charset.numbers) +
    getRandomChar(charset.special);

  // Fill the rest randomly from all sets
  const allChars = Object.values(charset).join("");
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle the password
  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
};

// Password strength indicator
const PasswordStrength = ({ password }: { password: string }) => {
  const getStrength = (pwd: string): { score: number; label: string; color: string } => {
    if (!pwd) return { score: 0, label: "No password", color: "bg-gray-200" };
    
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    
    // Normalize to 0-4 range
    const normalized = Math.min(4, Math.floor(score / 1.5));
    
    const labels = ["Very Weak", "Weak", "Fair", "Good", "Strong"];
    const colors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-blue-500", "bg-green-500"];
    
    return {
      score: normalized,
      label: labels[normalized],
      color: colors[normalized],
    };
  };

  const strength = getStrength(password);
  
  return (
    <div className="space-y-1">
      <div className="flex h-2 gap-1">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className={`flex-1 rounded-full transition-colors ${
              i < strength.score ? strength.color : "bg-gray-200"
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Strength: <span className="font-medium">{strength.label}</span>
      </p>
    </div>
  );
};

export function ResetPasswordDialog({
  open,
  onOpenChange,
  userId,
  userEmail,
  userName,
  userType,
  onSuccess,
}: ResetPasswordDialogProps) {
  const [password, setPassword] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [sendEmail, setSendEmail] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { token } = useAuth();
  const { 
    resetPassword, 
    resetInfluencerPassword 
  } = useUsersManagement();

  // Generate new password when dialog opens
  const generateNewPassword = () => {
    const newPassword = generateRandomPassword();
    setGeneratedPassword(newPassword);
    setPassword(newPassword);
    setCopied(false);
    setError(null);
  };

  // Reset state when dialog opens/closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Reset state when closing
      setPassword("");
      setGeneratedPassword("");
      setShowPassword(false);
      setSendEmail(true);
      setCopied(false);
      setError(null);
    }
    onOpenChange(open);
  };

  // Copy password to clipboard
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Password copied to clipboard");
    } catch (err) {
      toast.error("Failed to copy password");
    }
  };

  // Handle password reset
  const handleResetPassword = async () => {
    if (!token) {
      setError("Authentication required");
      return;
    }

    if (!password) {
      setError("Please generate a password first");
      return;
    }

    // Optional: Add password strength validation
    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    setIsResetting(true);
    setError(null);

    try {
      // Call appropriate API based on user type
      if (userType === "influencer") {
        await resetInfluencerPassword(userId, password);
      } else {
        const isBusiness = userType === "business";
        await resetPassword(userId, password, isBusiness);
      }

      // Success message
      if (sendEmail) {
        toast.success(
          `Password reset successfully for ${userName}`,
          {
            description: `A new password has been sent to ${userEmail}`,
          }
        );
      } else {
        toast.success(
          `Password reset successfully for ${userName}`,
          {
            description: "Make sure to save the password before closing",
          }
        );
      }

      onSuccess?.();
      
      // Close dialog after a short delay
      setTimeout(() => {
        handleOpenChange(false);
      }, 1500);
      
    } catch (error: any) {
      setError(error.message || "Failed to reset password");
      toast.error("Failed to reset password", {
        description: error.message || "An unknown error occurred",
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Reset Password
          </DialogTitle>
          <DialogDescription>
            Reset password for <span className="font-medium">{userName}</span> ({userEmail})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Password Display Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-sm font-medium">
                New Password
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={generateNewPassword}
                disabled={isResetting}
                className="h-8 px-2 text-xs"
              >
                <RefreshCw className="mr-1 h-3 w-3" />
                Generate New
              </Button>
            </div>

            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-20 font-mono"
                placeholder="Generated password will appear here"
                disabled={isResetting}
                // readOnly
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={!password || isResetting}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={copyToClipboard}
                  disabled={!password || isResetting}
                >
                  {copied ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Password Strength Indicator */}
            {password && <PasswordStrength password={password} />}

            {/* Password Requirements */}
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium">Password requirements:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li className={password.length >= 8 ? "text-green-600" : ""}>
                  At least 8 characters
                </li>
                <li className={/[A-Z]/.test(password) ? "text-green-600" : ""}>
                  At least one uppercase letter
                </li>
                <li className={/[a-z]/.test(password) ? "text-green-600" : ""}>
                  At least one lowercase letter
                </li>
                <li className={/[0-9]/.test(password) ? "text-green-600" : ""}>
                  At least one number
                </li>
                <li className={/[^A-Za-z0-9]/.test(password) ? "text-green-600" : ""}>
                  At least one special character
                </li>
              </ul>
            </div>
          </div>

          {/* Email Option */}
          {/* <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="sendEmail"
              checked={sendEmail}
              onCheckedChange={(checked) => setSendEmail(checked as boolean)}
              disabled={isResetting}
            />
            <Label
              htmlFor="sendEmail"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-1"
            >
              <Mail className="h-4 w-4" />
              Send password to {userEmail}
            </Label>
          </div> */}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive" className="py-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Warning for manual copy */}
          {!sendEmail && password && (
            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-700 text-xs">
                Make sure to copy and save this password. It won&apos;t be shown again.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isResetting}
          >
            Cancel
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={generateNewPassword}
              disabled={isResetting}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isResetting ? "animate-spin" : ""}`} />
              Generate
            </Button>
            <Button
              type="button"
              onClick={handleResetPassword}
              disabled={!password || isResetting}
              className="min-w-[120px]"
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
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}