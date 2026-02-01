'use client';

import { useState, useEffect, useCallback } from "react";
import { jwtDecode } from "jwt-decode";
import { useRouter } from "next/navigation";
import { setCookie, deleteCookie, getCookie } from "cookies-next/client";

type AdminTokenPayload = {
  sub: string;
  isAdmin: boolean;
  exp: number;
  email?: string;
  name?: string;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

interface UseAuthReturn {
  token: string | null;
  isAdmin: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  userData: Partial<AdminTokenPayload> | null;
  refreshToken: () => Promise<boolean>;
}

export function useAuth(): UseAuthReturn {
  const [token, setToken] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<Partial<AdminTokenPayload> | null>(null);
  const router = useRouter();

  const validateAndSetToken = useCallback((tokenString: string) => {
    try {
      const decoded = jwtDecode<AdminTokenPayload>(tokenString);
      
      if (decoded.exp * 1000 > Date.now()) {
        setToken(tokenString);
        setIsAdmin(decoded.isAdmin === true);
        setUserData({
          sub: decoded.sub,
          isAdmin: decoded.isAdmin,
          exp: decoded.exp,
          email: decoded.email,
          name: decoded.name
        });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    const tokenFromCookie = getCookie('admin_token');
    if (tokenFromCookie) {
      const isValid = validateAndSetToken(tokenFromCookie);
      if (!isValid) {
        deleteCookie('admin_token');
      }
    }
    setLoading(false);
  }, [validateAndSetToken]);

  // Auto-logout when token expires
  useEffect(() => {
    if (!userData?.exp) return;

    const expirationTime = userData.exp * 1000;
    const currentTime = Date.now();
    const timeUntilExpire = expirationTime - currentTime;

    if (timeUntilExpire > 0) {
      const timer = setTimeout(() => {
        logout();
      }, timeUntilExpire);

      return () => clearTimeout(timer);
    }
  }, [userData?.exp]);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/auth/login`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Login failed: ${res.status}`);
      }

      const { accessToken, access_token } = await res.json();
      const actualToken = accessToken || access_token;
      
      if (!actualToken) {
        throw new Error("No token received from server");
      }

      setCookie('admin_token', actualToken, { 
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
      });
      
      validateAndSetToken(actualToken);
      
      // Redirect after successful login
      setTimeout(() => router.push('/admin'), 100);
    } catch (err: any) {
      throw new Error(err.message || "Login failed");
    }
  };

  const refreshToken = async (): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/auth/refresh`, {
        method: "POST",
        credentials: 'include',
      });

      if (res.ok) {
        const { accessToken } = await res.json();
        validateAndSetToken(accessToken);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const logout = () => {
    // Optional: Call logout API
    fetch(`${API_BASE_URL}/admin/auth/logout`, {
      method: "POST",
      credentials: 'include',
    }).catch(() => {}); // Ignore errors

    // Clear local state
    deleteCookie('admin_token', { path: '/' });
    setToken(null);
    setIsAdmin(false);
    setUserData(null);
    
    // Redirect to login
    setTimeout(() => router.push('/login'), 100);
  };

  return {
    token,
    isAdmin,
    loading,
    login,
    logout,
    isAuthenticated: !!token,
    userData,
    refreshToken,
  };
}