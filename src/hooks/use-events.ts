"use client";

import { useQuery } from "@tanstack/react-query";
import {
  type PonderEvent,
  PonderClientError,
} from "@/lib/services/ponder-client";
import { usePonderClient } from "@/lib/providers/ponder-provider";

export interface UseEventsResult {
  events: PonderEvent[];
  isLoading: boolean;
  isError: boolean;
  error: PonderClientError | null;
  lastUpdated: Date | null;
  refetch: () => void;
}

export interface UseEventsOptions {
  limit?: number;
  refetchInterval?: number;
  enabled?: boolean;
}

/**
 * Hook to fetch and poll events from Ponder API
 *
 * @param options Configuration options
 * @returns Events data with loading/error states
 */
export function useEvents(options: UseEventsOptions = {}): UseEventsResult {
  const {
    limit = 50,
    refetchInterval = 30000, // 30 seconds
    enabled = true,
  } = options;

  const client = usePonderClient();

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ["events", limit],
    queryFn: () => client.getActivity(limit),
    refetchInterval,
    refetchIntervalInBackground: false,
    staleTime: 25000, // Consider data stale after 25s (slightly less than refetch)
    gcTime: 60000, // Keep cache for 60s
    enabled,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // Exponential backoff: 1s, 2s, 4s, max 10s
  });

  return {
    events: data || [],
    isLoading,
    isError,
    error: error instanceof PonderClientError ? error : null,
    lastUpdated: dataUpdatedAt ? new Date(dataUpdatedAt) : null,
    refetch,
  };
}
