"use client";
import "./globals.css";
import { TooltipProvider } from "@/app/components/ui/tooltip";
import { Toaster } from "@/app/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";
import { usePathname } from "next/navigation";
import { SideBar } from "@/app/components/admin/SideBar";
import { ProtectedRoute } from "./components/ProtectedRoute";

export default function RootLayout({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const pathname = usePathname();

  // const isAdminRoute = pathname?.startsWith("/admin");

  // const Content = isAdminRoute ? (
  //   <AdminLayout>{children}</AdminLayout>
  // ) : (
  //   children
  // );

  return (
    <html lang="en" className="font-sans">
      <body>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster position="top-right" richColors />
            {/* <ProtectedRoute> */}
              {/* {Content} */}
              {children}
            {/* </ProtectedRoute> */}
          </TooltipProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
