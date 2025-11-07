"use client";

import { useQuery } from "@tanstack/react-query";
import {
  type PonderEvent,
  PonderClientError,
} from "@/lib/services/ponder-client";
import { usePonderClient } from "@/lib/providers/ponder-provider";
import {
  POLLING_INTERVAL_MS,
  CACHE_STALE_TIME_MS,
  CACHE_GC_TIME_MS,
  MAX_RETRY_DELAY_MS,
} from "@/lib/constants";

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
    refetchInterval = POLLING_INTERVAL_MS,
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
    staleTime: CACHE_STALE_TIME_MS,
    gcTime: CACHE_GC_TIME_MS,
    enabled,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, MAX_RETRY_DELAY_MS),
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
