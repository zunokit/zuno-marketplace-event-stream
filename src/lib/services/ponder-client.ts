/**
 * Ponder API Client
 * Type-safe client for fetching events from Zuno Marketplace Indexer
 *
 * Features:
 * - ETag-based caching for bandwidth optimization
 * - Conditional GET requests (If-None-Match)
 * - Automatic 304 Not Modified handling
 */

import { API_TIMEOUT_MS } from "@/lib/constants";

// ============================================================================
// Types
// ============================================================================

interface CacheEntry<T> {
  etag: string;
  data: T;
  timestamp: number;
}

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
  enableCache?: boolean;
  cacheMaxAge?: number; // milliseconds
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
  private cache: Map<string, CacheEntry<unknown>>;

  constructor(config: PonderClientConfig) {
    this.config = {
      baseUrl: config.baseUrl,
      apiKey: config.apiKey || "",
      enableCache: config.enableCache ?? true,
      cacheMaxAge: config.cacheMaxAge || 60000, // 60 seconds default
      timeout: config.timeout || API_TIMEOUT_MS,
    };
    this.cache = new Map();
  }

  /**
   * Clear expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.config.cacheMaxAge) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cached data if available and valid
   */
  private getCached<T>(key: string): CacheEntry<T> | null {
    if (!this.config.enableCache) return null;

    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if cache is still valid
    const now = Date.now();
    if (now - entry.timestamp > this.config.cacheMaxAge) {
      this.cache.delete(key);
      return null;
    }

    return entry as CacheEntry<T>;
  }

  /**
   * Set cache entry
   */
  private setCache<T>(key: string, etag: string, data: T): void {
    if (!this.config.enableCache) return;

    this.cache.set(key, {
      etag,
      data,
      timestamp: Date.now(),
    });

    // Cleanup old entries periodically
    if (this.cache.size > 100) {
      this.cleanupCache();
    }
  }

  /**
   * Generic fetch wrapper with timeout and error handling
   * Supports ETag-based caching with conditional requests
   */
  private async fetch<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const cacheKey = `${endpoint}`;
    const cached = this.getCached<T>(cacheKey);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string>),
      };

      if (this.config.apiKey) {
        headers["Authorization"] = `Bearer ${this.config.apiKey}`;
      }

      // Add If-None-Match header if we have cached ETag
      if (cached?.etag) {
        headers["If-None-Match"] = cached.etag;
      }

      const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle 304 Not Modified - return cached data
      if (response.status === 304) {
        if (cached) {
          return cached.data;
        }
        throw new PonderClientError("304 Not Modified but no cached data", 304);
      }

      if (!response.ok) {
        throw new PonderClientError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status
        );
      }

      const data = await response.json();

      // Store ETag if present
      const etag = response.headers.get("ETag");
      if (etag) {
        this.setCache(cacheKey, etag, data);
      }

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
   * Clear all cached data
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
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
      timeout: API_TIMEOUT_MS,
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
