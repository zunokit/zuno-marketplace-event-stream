/**
 * Ponder API Client
 * Type-safe client for fetching events from Zuno Marketplace Indexer
 */

// ============================================================================
// Types
// ============================================================================

export interface PonderEvent {
  id: string;
  eventType: string;
  category: "auction" | "offer" | "trade" | "mint" | "collection" | "listing";
  actor: string;
  counterparty?: string;
  collection?: string;
  tokenId?: string;
  data: Record<string, unknown>;
  contractAddress: string;
  contractName?: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
  logIndex: number;
  chainId: number;
  processedAt: string;
  version: string;
}

export interface PonderEventsResponse {
  success: boolean;
  data: PonderEvent[];
  pagination?: {
    page: number;
    limit: number;
  };
  note?: string;
}

export interface PonderActivityResponse {
  success: boolean;
  data: PonderEvent[];
}

export interface PonderClientConfig {
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
}

export interface FetchEventsOptions {
  eventType?: string;
  category?: string;
  collection?: string;
  actor?: string;
  page?: number;
  limit?: number;
}

// ============================================================================
// Error Classes
// ============================================================================

export class PonderClientError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public cause?: unknown
  ) {
    super(message);
    this.name = "PonderClientError";
  }
}

// ============================================================================
// Client
// ============================================================================

export class PonderClient {
  private config: Required<PonderClientConfig>;

  constructor(config: PonderClientConfig) {
    this.config = {
      baseUrl: config.baseUrl,
      apiKey: config.apiKey || "",
      timeout: config.timeout || 10000,
    };
  }

  /**
   * Generic fetch wrapper with timeout and error handling
   */
  private async fetch<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...options.headers,
      };

      if (this.config.apiKey) {
        headers["Authorization"] = `Bearer ${this.config.apiKey}`;
      }

      const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new PonderClientError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status
        );
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof DOMException && error.name === "AbortError") {
        throw new PonderClientError("Request timeout", 408, error);
      }

      if (error instanceof PonderClientError) {
        throw error;
      }

      throw new PonderClientError(
        "Network error",
        undefined,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Fetch events with filtering
   */
  async getEvents(options: FetchEventsOptions = {}): Promise<PonderEvent[]> {
    const params = new URLSearchParams();

    if (options.eventType) params.set("eventType", options.eventType);
    if (options.category) params.set("category", options.category);
    if (options.collection) params.set("collection", options.collection);
    if (options.actor) params.set("actor", options.actor);
    if (options.page) params.set("page", String(options.page));
    if (options.limit) params.set("limit", String(options.limit));

    const query = params.toString();
    const endpoint = `/api/events${query ? `?${query}` : ""}`;

    const response = await this.fetch<PonderEventsResponse>(endpoint);

    if (!response.success || !response.data) {
      throw new PonderClientError("Invalid response from Ponder API");
    }

    return response.data;
  }

  /**
   * Fetch latest activity feed
   */
  async getActivity(limit = 50): Promise<PonderEvent[]> {
    const params = new URLSearchParams({ limit: String(limit) });
    const endpoint = `/api/activity?${params.toString()}`;

    const response = await this.fetch<PonderActivityResponse>(endpoint);

    if (!response.success || !response.data) {
      throw new PonderClientError("Invalid response from Ponder API");
    }

    return response.data;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.fetch("/");
      return true;
    } catch {
      return false;
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let clientInstance: PonderClient | null = null;

export function getPonderClient(): PonderClient {
  if (!clientInstance) {
    const baseUrl = process.env.NEXT_PUBLIC_PONDER_API_URL;

    if (!baseUrl) {
      throw new Error(
        "NEXT_PUBLIC_PONDER_API_URL environment variable is not set"
      );
    }

    clientInstance = new PonderClient({
      baseUrl,
      apiKey: process.env.NEXT_PUBLIC_PONDER_API_KEY,
      timeout: 10000,
    });
  }

  return clientInstance;
}

// ============================================================================
// Convenience Functions
// ============================================================================

export async function fetchLatestEvents(
  limit = 50
): Promise<PonderEvent[]> {
  const client = getPonderClient();
  return client.getActivity(limit);
}

export async function fetchEventsByCategory(
  category: PonderEvent["category"],
  limit = 50
): Promise<PonderEvent[]> {
  const client = getPonderClient();
  return client.getEvents({ category, limit });
}
