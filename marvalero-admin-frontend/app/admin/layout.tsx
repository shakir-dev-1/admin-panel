// app/admin/layout.tsx
import { SideBar } from "@/app/components/admin/SideBar";
import { ProtectedRoute } from "@/app/components/ProtectedRoute";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requireAdmin={true}>
      <SideBar>{children}</SideBar>
    </ProtectedRoute>
  );
}
