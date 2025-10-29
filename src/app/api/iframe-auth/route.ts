import { NextRequest, NextResponse } from "next/server";
import {
  validateToken,
  checkRateLimit,
  getClientIP,
  parseRequiredParams,
  isOriginAllowed,
} from "@/lib/security/auth";
import { allowCorsInDev } from "@/lib/middleware/cors";

function jsonWithCors(
  body: Record<string, unknown>,
  init: { status: number; headers?: HeadersInit },
  origin: string | null
) {
  return allowCorsInDev(
    NextResponse.json(body, init),
    origin
  );
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  const res = new NextResponse(null, { status: 200 });
  return allowCorsInDev(res, origin);
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");

  // 0. Origin validation (OPTIONAL - comment out to disable)
  // Protects against token theft by checking origin
  if (!isOriginAllowed(origin)) {
    console.warn(`🚨 Blocked unauthorized origin: ${origin || 'null'}`);
    return jsonWithCors(
      {
        success: false,
        error: "Origin not allowed. Contact support to whitelist your domain.",
      },
      { status: 403 },
      origin
    );
  }

  // 1. Rate limiting
  const clientIP = getClientIP(request.headers);
  const rateLimit = checkRateLimit(clientIP);

  if (!rateLimit.allowed) {
    return jsonWithCors(
      {
        success: false,
        error: "Too many requests. Please try again later.",
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": "60",
          "X-RateLimit-Remaining": String(rateLimit.remaining),
          "X-RateLimit-Reset": String(rateLimit.resetAt),
          "Retry-After": String(
            Math.ceil((rateLimit.resetAt - Date.now()) / 1000)
          ),
        },
      },
      origin
    );
  }

  // 2. Parse parameters
  const params = parseRequiredParams(request.url);
  if (!params) {
    return jsonWithCors(
      { success: false, error: "Missing required parameters" },
      { status: 400 },
      origin
    );
  }

  // 3. Get secret
  const secret = process.env.IFRAME_API_SECRET;
  if (!secret) {
    console.error("IFRAME_API_SECRET is not configured");
    return jsonWithCors(
      { success: false, error: "Server configuration error" },
      { status: 500 },
      origin
    );
  }

  // 4. Validate token
  const validation = validateToken(params, secret);

  if (!validation.valid) {
    return jsonWithCors(
      { success: false, error: validation.error || "Authentication failed" },
      { status: 403 },
      origin
    );
  }

  // 5. Success
  return jsonWithCors(
    { success: true },
    {
      status: 200,
      headers: {
        "X-RateLimit-Limit": "60",
        "X-RateLimit-Remaining": String(rateLimit.remaining),
      },
    },
    origin
  );
}
