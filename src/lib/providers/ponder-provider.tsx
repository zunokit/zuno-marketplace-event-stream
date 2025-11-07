"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { PonderClient } from "@/lib/services/ponder-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
 * Configuration Error UI Component
 * Displays a user-friendly error message when NEXT_PUBLIC_PONDER_API_URL is missing
 */
function ConfigurationError({ message }: { message: string }) {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-3">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle className="text-base">Configuration Error</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-3 py-6">
            <p className="text-sm font-medium text-destructive">{message}</p>
            <p className="text-sm text-muted-foreground text-center">
              Please configure NEXT_PUBLIC_PONDER_API_URL in your .env.local
              file. See .env.example for setup instructions.
            </p>
            <Button size="sm" onClick={() => window.location.reload()}>
              Reload
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
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
 * If NEXT_PUBLIC_PONDER_API_URL is not configured, renders an error UI
 */
export function PonderProvider({
  children,
  baseUrl,
  apiKey,
  timeout,
  enableCache,
  cacheMaxAge,
}: PonderProviderProps) {
  // Check configuration before creating client
  const finalBaseUrl = baseUrl || process.env.NEXT_PUBLIC_PONDER_API_URL;
  const finalApiKey = apiKey || process.env.NEXT_PUBLIC_PONDER_API_KEY;

  // Memoize client instance to prevent unnecessary recreations
  // Always call hooks, but conditionally create client
  const client = useMemo(() => {
    // If configuration is missing, return null (will be handled in render)
    if (!finalBaseUrl) {
      return null;
    }

    // Create client instance
    return new PonderClient({
      baseUrl: finalBaseUrl,
      apiKey: finalApiKey,
      timeout,
      enableCache,
      cacheMaxAge,
    });
  }, [finalBaseUrl, finalApiKey, timeout, enableCache, cacheMaxAge]);

  const value = useMemo(() => {
    if (!client) {
      return null;
    }
    return { client };
  }, [client]);

  // If configuration is missing, render error UI instead of throwing
  if (!finalBaseUrl || !client || !value) {
    return (
      <ConfigurationError message="NEXT_PUBLIC_PONDER_API_URL must be configured" />
    );
  }

  return (
    <PonderContext.Provider value={value}>{children}</PonderContext.Provider>
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
