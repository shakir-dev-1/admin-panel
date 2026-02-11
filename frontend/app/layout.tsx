"use client";
import "./globals.css";
import { TooltipProvider } from "@/app/components/ui/tooltip";
import { Toaster } from "@/app/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ReactNode, useState } from "react";
import { usePathname } from "next/navigation";
import { SideBar } from "@/app/components/admin/SideBar";
import { ProtectedRoute } from "./components/ProtectedRoute";

export default function RootLayout({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            gcTime: 30 * 60 * 1000, // 30 minutes
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );
  const pathname = usePathname();

  // const isAdminRoute = pathname?.startsWith("/admin");

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
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      </body>
    </html>
  );
}
