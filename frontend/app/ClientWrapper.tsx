"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/app/components/ui/tooltip";
import { Toaster } from "@/app/components/ui/sonner";
import { SideBar } from "@/app/components/admin/SideBar";

const queryClient = new QueryClient();

export default function ClientWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith("/admin");

  const Content = isAdminRoute ? (
    <SideBar>{children}</SideBar>
  ) : (
    children
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster position="top-right" richColors />
        {Content}
      </TooltipProvider>
    </QueryClientProvider>
  );
}
