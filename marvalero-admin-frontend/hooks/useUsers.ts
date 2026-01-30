'use client';

// src/hooks/useUsers.ts
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { fetchWithAuth } from "@/lib/api";

export type User = {
  id: string;
  name: string;
  email: string;
  phone: string;
  userType: "consumer" | "business" | "influencer";
  status: "ACTIVE" | "DISABLED";
  lastLoginAt: string | null;
  createdAt: string;
  businessName: string | null;
};

type PaginatedResponse = {
  data: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export function useUsers() {
  const { token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    setLoading(true);

    // Use the new endpoint that returns just the array
    fetchWithAuth<User[]>(`/admin/users/all`, token)
      .then((data) => {
        setUsers(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching users:", err);
        setError(err.message);
        setLoading(false);
      });
  }, [token]);

  return { users, loading, error };
}

export function useRecentUsers(limit = 5) {
  const { token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    setLoading(true);
    fetchWithAuth<User[]>(`/admin/users/recent?limit=${limit}`, token)
      .then((data) => {
        setUsers(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  }, [token, limit]);

  console.log("Recent users: ", users);

  return { users, loading, error };
}
