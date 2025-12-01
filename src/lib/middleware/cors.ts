/**
 * CORS Middleware Utilities
 *
 * Handles Cross-Origin Resource Sharing for iframe embedding
 */

import { NextResponse } from "next/server";
import { DEV_ORIGINS } from "@/lib/constants";

/**
 * Add CORS headers in development mode
 * Allows iframe to be embedded from configured origins
 */
export function allowCorsInDev(
  response: NextResponse,
  origin: string | null
): NextResponse {
  // Only enable CORS in development
  if (process.env.NODE_ENV !== "development") {
    return response;
  }

  const allowedOrigins: string[] =
    process.env.NEXT_PUBLIC_ALLOWED_ORIGINS?.split(",").map((o) => o.trim()) ||
    [...DEV_ORIGINS];

  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
  }

  response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  response.headers.set("Access-Control-Max-Age", "86400"); // 24 hours

  return response;
}
