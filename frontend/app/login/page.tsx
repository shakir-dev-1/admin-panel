/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Shield, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Alert, AlertDescription } from "@/app/components/ui/alert";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { z } from "zod";

// Enhanced validation schema with more specific messages
const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { message: "Email is required" })
    .email({
      message: "Please enter a valid email address (e.g., name@example.com)",
    }),
  password: z
    .string()
    .min(1, { message: "Password is required" })
    .min(6, { message: "Password must be at least 6 characters long" })
    .max(50, { message: "Password must not exceed 50 characters" }),
});

// Rate limiting helper
const RATE_LIMIT = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
};

export default function AdminLoginPage() {
  const router = useRouter();
  const { isAdmin, isAuthenticated, loading, login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    general?: string;
  }>({});
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTimeLeft, setLockoutTimeLeft] = useState(0);
  const [touchedFields, setTouchedFields] = useState<{
    email: boolean;
    password: boolean;
  }>({
    email: false,
    password: false,
  });

  // Load login attempts from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("loginAttempts");
    const storedTime = localStorage.getItem("loginAttemptsTime");

    if (stored && storedTime) {
      const attempts = parseInt(stored);
      const time = parseInt(storedTime);
      const now = Date.now();

      if (now - time < RATE_LIMIT.windowMs) {
        setLoginAttempts(attempts);
        if (attempts >= RATE_LIMIT.maxAttempts) {
          setIsLocked(true);
          const remaining = Math.ceil(
            (RATE_LIMIT.windowMs - (now - time)) / 1000,
          );
          setLockoutTimeLeft(remaining);
        }
      } else {
        // Reset if window expired
        localStorage.removeItem("loginAttempts");
        localStorage.removeItem("loginAttemptsTime");
      }
    }
  }, []);

  // Lockout countdown timer
  useEffect(() => {
    if (!isLocked || lockoutTimeLeft <= 0) return;

    const timer = setInterval(() => {
      setLockoutTimeLeft((prev) => {
        if (prev <= 1) {
          setIsLocked(false);
          setLoginAttempts(0);
          localStorage.removeItem("loginAttempts");
          localStorage.removeItem("loginAttemptsTime");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isLocked, lockoutTimeLeft]);

  // Track failed login attempts
  const trackFailedAttempt = useCallback(() => {
    const newAttempts = loginAttempts + 1;
    setLoginAttempts(newAttempts);
    localStorage.setItem("loginAttempts", newAttempts.toString());
    localStorage.setItem("loginAttemptsTime", Date.now().toString());

    if (newAttempts >= RATE_LIMIT.maxAttempts) {
      setIsLocked(true);
      setLockoutTimeLeft(RATE_LIMIT.windowMs / 1000);
      setErrors({
        general: `Too many failed attempts. Please try again in ${Math.ceil(RATE_LIMIT.windowMs / 60000)} minutes.`,
      });
    }
  }, [loginAttempts]);

  const validateForm = () => {
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: { email?: string; password?: string } = {};
      result.error.issues.forEach((err) => {
        if (err.path[0] === "email") fieldErrors.email = err.message;
        if (err.path[0] === "password") fieldErrors.password = err.message;
      });
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const handleBlur = (field: "email" | "password") => {
    setTouchedFields((prev) => ({ ...prev, [field]: true }));

    // Validate on blur
    if (field === "email" && email) {
      const emailResult = z.string().email().safeParse(email);
      if (!emailResult.success) {
        setErrors((prev) => ({
          ...prev,
          email: "Please enter a valid email address",
        }));
      }
    }

    if (field === "password" && password) {
      if (password.length < 6) {
        setErrors((prev) => ({
          ...prev,
          password: "Password must be at least 6 characters",
        }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouchedFields({ email: true, password: true });

    // Check if locked out
    if (isLocked) {
      toast.error(
        `Account temporarily locked. Please try again in ${lockoutTimeLeft} seconds.`,
      );
      return;
    }

    if (!validateForm()) return;

    // Add timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error("Request timeout. Please try again.")),
        10000,
      ); // 10 second timeout
    });

    setIsSubmitting(true);
    try {
      // Race between login and timeout
      await Promise.race([login(email, password), timeoutPromise]);

      // Clear any stored attempts on successful login
      localStorage.removeItem("loginAttempts");
      localStorage.removeItem("loginAttemptsTime");

      toast.success("Welcome back!", {
        description: "Successfully logged in to admin panel.",
      });

      router.replace("/admin");
    } catch (err: any) {
      console.error("Login error:", err);

      // Track failed attempt
      trackFailedAttempt();

      // Enhanced error messages
      let errorMessage;// = "Invalid email or password";
      let errorDescription;// = "Please check your credentials and try again.";

      if (err.message === "Request timeout. Please try again.") {
        errorMessage = "Connection Timeout";
        errorDescription =
          "The request took too long. Please check your internet connection and try again.";
      } else if (err.message.includes("Network Error")) {
        errorMessage = "Network Error";
        errorDescription =
          "Unable to connect to the server. Please check your internet connection.";
      } else if (err.message.includes("401")) {
        errorMessage = "Authentication Failed";
        errorDescription = "The email or password you entered is incorrect.";
      } else if (err.message.includes("403")) {
        errorMessage = "Access Denied";
        errorDescription =
          "You do not have admin privileges to access this panel.";
      } else if (err.message.includes("500")) {
        errorMessage = "Server Error";
        errorDescription =
          "Something went wrong on our end. Please try again later.";
      }

      toast.error(errorMessage, {
        description: errorDescription,
        duration: 5000,
      });

      setErrors({
        general: errorDescription,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const remainingAttempts = RATE_LIMIT.maxAttempts - loginAttempts;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary">
            <Shield className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="mt-4 text-2xl font-bold">Marvalero Admin</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to access the admin panel
          </p>
        </div>

        {/* Lockout Alert */}
        {isLocked && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Too many failed login attempts. Please try again in{" "}
              {lockoutTimeLeft} seconds.
            </AlertDescription>
          </Alert>
        )}

        {/* General Error Alert */}
        {errors.general && !isLocked && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errors.general}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="admin-card space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">
              Email
              {touchedFields.email && errors.email && (
                <span className="ml-2 text-xs text-destructive">*</span>
              )}
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => handleBlur("email")}
              className={errors.email ? "border-destructive" : ""}
              placeholder="admin@example.com"
              disabled={isLocked || isSubmitting}
              autoComplete="email"
              autoFocus
            />
            {errors.email && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.email}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">
              Password
              {touchedFields.password && errors.password && (
                <span className="ml-2 text-xs text-destructive">*</span>
              )}
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => handleBlur("password")}
                className={errors.password ? "border-destructive" : ""}
                placeholder="••••••"
                disabled={isLocked || isSubmitting}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.password}
              </p>
            )}
          </div>

          {/* Login attempts warning */}
          {!isLocked && loginAttempts > 0 && remainingAttempts > 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              {remainingAttempts} login{" "}
              {remainingAttempts === 1 ? "attempt" : "attempts"} remaining
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || isLocked}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>

        <div className="mt-4 rounded-lg border border-dashed p-3 text-center">
          <p className="text-xs text-muted-foreground">
            Only administrators can access this panel.
          </p>
        </div>
      </div>
    </div>
  );
}
