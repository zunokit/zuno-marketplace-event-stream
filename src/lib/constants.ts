/**
 * Application-wide constants
 * Centralized configuration for timing, dimensions, and limits
 */

// ============================================================================
// API Configuration
// ============================================================================

/**
 * Polling interval for event updates (milliseconds)
 * @default 30000 (30 seconds)
 */
export const POLLING_INTERVAL_MS = 30_000;

/**
 * API request timeout (milliseconds)
 * @default 10000 (10 seconds)
 */
export const API_TIMEOUT_MS = 10_000;

/**
 * Stale time for cached data (milliseconds)
 * Data is considered fresh for this duration
 * @default 25000 (25 seconds)
 */
export const CACHE_STALE_TIME_MS = 25_000;

/**
 * Garbage collection time for cached data (milliseconds)
 * Unused cache entries are cleaned after this duration
 * @default 60000 (60 seconds)
 */
export const CACHE_GC_TIME_MS = 60_000;

/**
 * Maximum retry delay for exponential backoff (milliseconds)
 * @default 10000 (10 seconds)
 */
export const MAX_RETRY_DELAY_MS = 10_000;

// ============================================================================
// UI/Animation Configuration
// ============================================================================

/**
 * Event ticker scroll interval (milliseconds)
 * Time to display each event before scrolling to next
 * @default 3000 (3 seconds)
 */
export const TICKER_SCROLL_INTERVAL_MS = 3_000;

/**
 * Height of a single event item in ticker (pixels)
 * Used for smooth scroll calculations
 * @default 48
 */
export const EVENT_ITEM_HEIGHT_PX = 48;

/**
 * Total height of event ticker container (pixels)
 * Approximately shows 10 events at once (480 / 48 = 10)
 * @default 480
 */
export const TICKER_CONTAINER_HEIGHT_PX = 480;

// ============================================================================
// Security Configuration
// ============================================================================

/**
 * Rate limit window duration (milliseconds)
 * @default 60000 (1 minute)
 */
export const RATE_LIMIT_WINDOW_MS = 60_000;

/**
 * Maximum requests allowed per rate limit window
 * @default 60
 */
export const RATE_LIMIT_MAX_REQUESTS = 60;

/**
 * Maximum size of rate limit store before cleanup
 * Prevents unbounded memory growth
 * @default 10000
 */
export const RATE_LIMIT_MAX_STORE_SIZE = 10_000;

/**
 * Timestamp skew tolerance (seconds)
 * Allows ±5 minutes clock difference
 * @default 300 (5 minutes)
 */
export const TIMESTAMP_SKEW_SECONDS = 300;

/**
 * Minimum length for API secret (characters)
 * @default 32
 */
export const MIN_SECRET_LENGTH = 32;

// ============================================================================
// Development Configuration
// ============================================================================

/**
 * Default development ports
 */
export const DEV_PORTS = {
  APP: 3000,
  TEST_HOST: 3001,
  PONDER_API: 42069,
} as const;

/**
 * Default localhost URLs for development
 */
export const DEV_ORIGINS = [
  `http://localhost:${DEV_PORTS.APP}`,
  `http://localhost:${DEV_PORTS.TEST_HOST}`,
] as const;
