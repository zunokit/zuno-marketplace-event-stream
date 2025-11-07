"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { PonderClient } from "@/lib/services/ponder-client";

// ============================================================================
// Context
// ============================================================================

interface PonderContextValue {
  client: PonderClient;
}

const PonderContext = createContext<PonderContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

interface PonderProviderProps {
  children: ReactNode;
  baseUrl?: string;
  apiKey?: string;
  timeout?: number;
  enableCache?: boolean;
  cacheMaxAge?: number;
}

/**
 * PonderProvider
 *
 * Provides PonderClient instance to all child components via React Context.
 * This replaces the singleton pattern for better testability and flexibility.
 *
 * @example
 * ```tsx
 * <PonderProvider baseUrl="http://api.example.com">
 *   <App />
 * </PonderProvider>
 * ```
 *
 * @throws Error if NEXT_PUBLIC_PONDER_API_URL is not configured
 */
export function PonderProvider({
  children,
  baseUrl,
  apiKey,
  timeout,
  enableCache,
  cacheMaxAge,
}: PonderProviderProps) {
  // Memoize client instance to prevent unnecessary recreations
  const client = useMemo(() => {
    // Get config from props or environment variables
    const finalBaseUrl = baseUrl || process.env.NEXT_PUBLIC_PONDER_API_URL;
    const finalApiKey = apiKey || process.env.NEXT_PUBLIC_PONDER_API_KEY;

    if (!finalBaseUrl) {
      throw new Error(
        "PonderProvider: NEXT_PUBLIC_PONDER_API_URL must be configured. " +
        "See .env.example for setup instructions."
      );
    }

    // Create client instance
    return new PonderClient({
      baseUrl: finalBaseUrl,
      apiKey: finalApiKey,
      timeout,
      enableCache,
      cacheMaxAge,
    });
  }, [baseUrl, apiKey, timeout, enableCache, cacheMaxAge]);

  const value = useMemo(() => ({ client }), [client]);

  return (
    <PonderContext.Provider value={value}>
      {children}
    </PonderContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

/**
 * usePonder
 *
 * Hook to access PonderClient from context.
 * Must be used within PonderProvider.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { client } = usePonder();
 *   const events = await client.getActivity();
 *   return <div>{events.length} events</div>;
 * }
 * ```
 *
 * @throws Error if used outside PonderProvider
 */
export function usePonder(): PonderContextValue {
  const context = useContext(PonderContext);

  if (!context) {
    throw new Error("usePonder must be used within PonderProvider");
  }

  return context;
}

// ============================================================================
// Convenience Hook
// ============================================================================

/**
 * usePonderClient
 *
 * Convenience hook that returns just the client instance.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const client = usePonderClient();
 *   // use client...
 * }
 * ```
 */
export function usePonderClient(): PonderClient {
  const { client } = usePonder();
  return client;
}
