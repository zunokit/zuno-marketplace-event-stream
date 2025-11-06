"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { PonderClient } from "@/lib/services/ponder-client";

// ============================================================================
// Context
// ============================================================================

interface PonderContextValue {
  client: PonderClient;
  isReady: boolean;
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
 */
export function PonderProvider({
  children,
  baseUrl,
  apiKey,
  timeout,
  enableCache,
  cacheMaxAge,
}: PonderProviderProps) {
  const [client, setClient] = useState<PonderClient | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Get config from props or environment variables
    const config = {
      baseUrl: baseUrl || process.env.NEXT_PUBLIC_PONDER_API_URL || "",
      apiKey: apiKey || process.env.NEXT_PUBLIC_PONDER_API_KEY,
      timeout,
      enableCache,
      cacheMaxAge,
    };

    if (!config.baseUrl) {
      console.error(
        "PonderProvider: NEXT_PUBLIC_PONDER_API_URL is not configured"
      );
      return;
    }

    // Create client instance
    const newClient = new PonderClient(config);
    setClient(newClient);
    setIsReady(true);
  }, [baseUrl, apiKey, timeout, enableCache, cacheMaxAge]);

  if (!client || !isReady) {
    return null; // or loading spinner
  }

  return (
    <PonderContext.Provider value={{ client, isReady }}>
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
