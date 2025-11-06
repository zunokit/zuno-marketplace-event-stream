"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import {
  CACHE_STALE_TIME_MS,
  CACHE_GC_TIME_MS,
  MAX_RETRY_DELAY_MS,
} from "@/lib/constants";

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: CACHE_STALE_TIME_MS,
            gcTime: CACHE_GC_TIME_MS,
            refetchOnWindowFocus: false,
            retry: 3,
            retryDelay: (attemptIndex) =>
              Math.min(1000 * 2 ** attemptIndex, MAX_RETRY_DELAY_MS),
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
