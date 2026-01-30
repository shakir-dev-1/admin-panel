// app/admin/page.tsx
'use client';

import { ProtectedRoute } from '@/app/components/ProtectedRoute';
import Dashboard from '@/app/components/admin/Dashboard';

export default function AdminPage() {
  return (
    // <ProtectedRoute>
      <Dashboard />
    // </ProtectedRoute>
  );
}