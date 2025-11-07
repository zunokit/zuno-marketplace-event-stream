import crypto from "crypto";

/**
 * Security utilities for iframe authentication
 */

// ============================================================================
// Types
// ============================================================================

export interface TokenParams {
  token: string;
  nonce: string;
  timestamp: number;
}

// ============================================================================
// URL Parsing
// ============================================================================

/**
 * Parse and validate required auth parameters from URL
 * Returns null if any required parameter is missing or invalid
 */
export function parseRequiredParams(url: string): TokenParams | null {
  try {
    const { searchParams } = new URL(url);
    const token = searchParams.get("token");
    const nonce = searchParams.get("nonce");
    const timestampStr = searchParams.get("timestamp");

    if (!token || !nonce || !timestampStr) {
      return null;
    }

    const timestamp = parseInt(timestampStr, 10);
    if (Number.isNaN(timestamp) || timestamp <= 0) {
      return null;
    }

    return { token, nonce, timestamp };
  } catch {
    return null;
  }
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_SKEW_SECONDS = 300; // 5 minutes
const MIN_SECRET_LENGTH = 32;

// ============================================================================
// Token Validation
// ============================================================================

/**
 * Validate iframe auth token
 */
export function validateToken(
  params: TokenParams,
  secret: string,
  skewSeconds = DEFAULT_SKEW_SECONDS
): ValidationResult {
  // 1. Check secret
  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    return {
      valid: false,
      error: "Server configuration error: invalid secret",
    };
  }

  // 2. Check timestamp
  if (!isWithinSkew(params.timestamp, skewSeconds)) {
    return {
      valid: false,
      error: "Token expired or timestamp out of sync",
    };
  }

  // 3. Validate token
  const expectedToken = generateToken(params.nonce, params.timestamp, secret);

  try {
    const isValid = crypto.timingSafeEqual(
      Buffer.from(params.token, "hex"),
      Buffer.from(expectedToken, "hex")
    );

    if (!isValid) {
      return { valid: false, error: "Invalid token" };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: "Malformed token" };
  }
}

/**
 * Generate HMAC SHA256 token
 */
export function generateToken(
  nonce: string,
  timestamp: number,
  secret: string
): string {
  const message = `${nonce}:${timestamp}`;
  return crypto.createHmac("sha256", secret).update(message).digest("hex");
}

/**
 * Check if timestamp is within allowed skew
 */
export function isWithinSkew(
  timestamp: number,
  skewSeconds = DEFAULT_SKEW_SECONDS
): boolean {
  const now = Math.floor(Date.now() / 1000);
  const diff = Math.abs(now - timestamp);
  return diff <= skewSeconds;
}

// ============================================================================
// Rate Limiting (Simple In-Memory)
// ============================================================================
//
// ⚠️  PRODUCTION WARNING: This is an in-memory rate limiter with limitations:
//
// 1. Data is lost on server restart
// 2. Does NOT work with horizontal scaling (multiple instances)
// 3. Each instance maintains its own separate counter
// 4. Memory can grow unbounded under high traffic
//
// For production deployments, consider:
// - Redis-based rate limiting (e.g., ioredis + rate-limiter-flexible)
// - Upstash Rate Limiting (@upstash/ratelimit)
// - Cloudflare Rate Limiting
// - API Gateway rate limiting (AWS, GCP, Azure)
//
// This implementation is suitable for:
// - Development environments
// - Single-instance deployments
// - Low-traffic applications
//
// ============================================================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 60; // 60 requests per minute

/**
 * Check rate limit for IP address
 */
export function checkRateLimit(identifier: string): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // Clean up expired entries periodically
  if (rateLimitStore.size > 10000) {
    for (const [key, value] of rateLimitStore.entries()) {
      if (value.resetAt < now) {
        rateLimitStore.delete(key);
      }
    }
  }

  if (!entry || entry.resetAt < now) {
    // Create new entry
    const resetAt = now + RATE_LIMIT_WINDOW;
    rateLimitStore.set(identifier, { count: 1, resetAt });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1, resetAt };
  }

  // Check if limit exceeded
  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  // Increment count
  entry.count++;
  rateLimitStore.set(identifier, entry);

  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Get client IP from request headers
 */
export function getClientIP(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

// ============================================================================
// Origin Validation (Additional Security)
// ============================================================================

/**
 * Validate origin is in allowed list
 * Add this to protect against token theft
 */
export function isOriginAllowed(origin: string | null): boolean {
  // No origin header = direct access, block
  if (!origin) {
    return false;
  }

  // Get allowed origins from env
  const allowedOrigins =
    process.env.NEXT_PUBLIC_ALLOWED_ORIGINS?.split(",").map((o) => o.trim()) ||
    [];

  // Development: Allow localhost
  if (process.env.NODE_ENV === "development") {
    if (
      origin.startsWith("http://localhost") ||
      origin.startsWith("http://127.0.0.1")
    ) {
      return true;
    }
  }

  // Check exact match
  if (allowedOrigins.includes(origin)) {
    return true;
  }

  // Check wildcard match (*.example.com)
  return allowedOrigins.some((allowed) => {
    if (allowed.startsWith("*.")) {
      const domain = allowed.slice(2);
      const originDomain = origin.replace(/^https?:\/\//, "").split(":")[0];
      return originDomain === domain || originDomain.endsWith("." + domain);
    }
    return false;
  });
}
