/**
 * Environment Variables Validation
 *
 * Runtime validation of environment variables with Zod schema.
 * Provides type-safe access to env vars and helpful error messages.
 *
 * Usage:
 * - Import `serverEnv` for server-only variables (e.g., secrets)
 * - Import `clientEnv` for public variables (NEXT_PUBLIC_*)
 *
 * @module env
 */

import { z } from "zod";

// ============================================================================
// Constants
// ============================================================================

const MIN_SECRET_LENGTH = 32;

// ============================================================================
// Schema Definitions
// ============================================================================

/**
 * Server-side environment variables schema
 * These are only available on the server (not prefixed with NEXT_PUBLIC_)
 */
const serverSchema = z.object({
  IFRAME_API_SECRET: z
    .string()
    .min(
      MIN_SECRET_LENGTH,
      `IFRAME_API_SECRET must be at least ${MIN_SECRET_LENGTH} characters long for security`
    )
    .describe("HMAC secret for iframe authentication tokens"),
});

/**
 * Client-side environment variables schema
 * These are exposed to the browser (prefixed with NEXT_PUBLIC_)
 */
const clientSchema = z.object({
  NEXT_PUBLIC_PONDER_API_URL: z
    .string()
    .url("NEXT_PUBLIC_PONDER_API_URL must be a valid URL")
    .describe("Ponder indexer API base URL"),

  NEXT_PUBLIC_ALLOWED_ORIGINS: z
    .string()
    .min(1, "NEXT_PUBLIC_ALLOWED_ORIGINS cannot be empty")
    .describe("Comma-separated list of allowed CORS origins"),

  NEXT_PUBLIC_APP_URL: z
    .string()
    .url("NEXT_PUBLIC_APP_URL must be a valid URL")
    .describe("Public application URL"),

  NEXT_PUBLIC_PONDER_API_KEY: z
    .string()
    .optional()
    .describe("Optional API key for Ponder API authentication"),
});

/**
 * Combined schema for all environment variables
 */
const envSchema = z.object({
  ...serverSchema.shape,
  ...clientSchema.shape,
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development")
    .describe("Node environment"),
});

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate environment variables
 * @param throwOnError - If true, throws error on validation failure. If false, logs warning and returns process.env
 * @returns Validated environment variables
 */
function validateEnv(throwOnError = true) {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    if (!parsed.error) {
      // Fallback for unexpected parse failure without error
      const fallbackMessage =
        "❌ Environment validation failed with unknown error.\n" +
        "Please check your .env.local file.";

      if (throwOnError) {
        throw new Error(fallbackMessage);
      } else {
        console.warn(fallbackMessage);
        return process.env as z.infer<typeof envSchema>;
      }
    }

    const errors = parsed.error.issues.map((err) => {
      const path = err.path.join(".");
      return `  - ${path}: ${err.message}`;
    });

    const errorMessage =
      `❌ Environment validation failed:\n\n${errors.join("\n")}\n\n` +
      `Please check your .env.local file and ensure all required variables are set.\n` +
      `See .env.example for reference.`;

    if (throwOnError) {
      throw new Error(errorMessage);
    } else {
      console.warn(errorMessage);
      // Return process.env as fallback with type assertion
      // This allows tests and development to continue
      return process.env as z.infer<typeof envSchema>;
    }
  }

  return parsed.data;
}

// ============================================================================
// Environment Detection
// ============================================================================

const isProduction = process.env.NODE_ENV === "production";

// In production, fail fast on invalid env
// In test/development, allow graceful degradation
const env = validateEnv(isProduction);

// ============================================================================
// Exports
// ============================================================================

/**
 * Type-safe access to server-only environment variables
 * @throws {Error} If accessed on client-side in production
 */
export const serverEnv = {
  /**
   * HMAC secret for iframe authentication
   * @throws {Error} If accessed on client-side
   */
  get IFRAME_API_SECRET() {
    if (typeof window !== "undefined" && isProduction) {
      throw new Error(
        "❌ Cannot access server-only environment variable IFRAME_API_SECRET on client-side"
      );
    }
    return env.IFRAME_API_SECRET || "";
  },
} as const;

/**
 * Type-safe access to client-side environment variables
 * Safe to use in both client and server contexts
 */
export const clientEnv = {
  /** Ponder indexer API base URL */
  PONDER_API_URL: env.NEXT_PUBLIC_PONDER_API_URL || "",
  /** Optional Ponder API key */
  PONDER_API_KEY: env.NEXT_PUBLIC_PONDER_API_KEY,
  /** Comma-separated allowed CORS origins */
  ALLOWED_ORIGINS: env.NEXT_PUBLIC_ALLOWED_ORIGINS || "",
  /** Public application URL */
  APP_URL: env.NEXT_PUBLIC_APP_URL || "",
  /** Node environment */
  NODE_ENV: env.NODE_ENV,
} as const;

// ============================================================================
// Type Exports
// ============================================================================

export type ServerEnv = z.infer<typeof serverSchema>;
export type ClientEnv = z.infer<typeof clientSchema>;
export type Env = z.infer<typeof envSchema>;
