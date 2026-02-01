'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Loader2, AlertCircle, LogIn, Home } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean; // Defaults to true
  redirectUnauthenticatedTo?: string;
  redirectNonAdminTo?: string;
  showCustomUnauthorizedMessage?: boolean;
  customUnauthorizedMessage?: string;
}

export function ProtectedRoute({ 
  children, 
  requireAdmin = true,
  redirectUnauthenticatedTo = '/login',
  redirectNonAdminTo = '/access-denied',
  showCustomUnauthorizedMessage = false,
  customUnauthorizedMessage = "You don't have permission to access this page"
}: ProtectedRouteProps) {
  const { token, isAdmin, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!token) {
        router.push(redirectUnauthenticatedTo);
      } else if (requireAdmin && !isAdmin) {
        router.push(redirectNonAdminTo);
      }
    }
  }, [loading, token, isAdmin, router, requireAdmin, redirectUnauthenticatedTo, redirectNonAdminTo]);

  // Loading state with better UI
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4">
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
          <div className="relative flex flex-col items-center gap-6">
            <div className="relative">
              <div className="absolute -inset-4 rounded-full border-4 border-primary/20" />
              <Shield className="h-16 w-16 animate-pulse text-primary" />
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                Verifying Access
              </h2>
              <p className="mt-2 text-muted-foreground">
                Checking your permissions...
              </p>
            </div>
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  // Show custom unauthorized message instead of redirecting
  if (showCustomUnauthorizedMessage && requireAdmin && token && !isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border-border shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-2xl">Access Denied</CardTitle>
            <CardDescription className="text-base">
              {customUnauthorizedMessage}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground">
              You need administrator privileges to view this content.
            </p>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button 
              onClick={() => router.push('/')}
              variant="outline" 
              className="w-full"
            >
              <Home className="mr-2 h-4 w-4" />
              Go to Homepage
            </Button>
            <Button 
              onClick={() => router.push('/login')}
              className="w-full"
            >
              <LogIn className="mr-2 h-4 w-4" />
              Sign in as Admin
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Early return if not authenticated or not admin when required
  if (!token || (requireAdmin && !isAdmin)) {
    return null; // Will redirect via useEffect
  }

  return <>{children}</>;
}

// Optional: A simpler variant for inline protection
export function ProtectedContent({ 
  children, 
  requireAdmin = true,
  fallback 
}: { 
  children: ReactNode; 
  requireAdmin?: boolean;
  fallback?: ReactNode;
}) {
  const { token, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!token || (requireAdmin && !isAdmin)) {
    return fallback || null;
  }

  return <>{children}</>;
}

// Optional: Permission badge for visual feedback
export function AdminBadge() {
  const { isAdmin, loading } = useAuth();

  if (loading) return null;
  
  if (!isAdmin) return null;

  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
      <Shield className="h-3 w-3" />
      Admin
    </div>
  );
}