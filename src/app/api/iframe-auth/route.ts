import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { allowCorsInDev, parseRequiredParams, withinSkew } from "@/lib/iframe";

function jsonWithCors(
  body: any,
  init: { status: number },
  origin: string | null
) {
  return allowCorsInDev(NextResponse.json(body, init), origin);
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  const res = new NextResponse(null, { status: 200 });
  return allowCorsInDev(res, origin);
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");

  const params = parseRequiredParams(request.url);
  if (!params) {
    return jsonWithCors(
      { success: false, error: "missing parameters" },
      { status: 400 },
      origin
    );
  }

  const { token, nonce, timestamp } = params;

  if (!withinSkew(timestamp)) {
    return jsonWithCors(
      { success: false, error: "expired timestamp" },
      { status: 403 },
      origin
    );
  }

  const secret = process.env.IFRAME_API_SECRET;
  if (!secret) {
    return jsonWithCors(
      { success: false, error: "server not configured" },
      { status: 500 },
      origin
    );
  }

  const message = `${secret}:${nonce}:${timestamp}`;
  const expected = crypto.createHash("sha256").update(message).digest("hex");
  try {
    const ok = crypto.timingSafeEqual(
      Buffer.from(token, "hex"),
      Buffer.from(expected, "hex")
    );
    if (!ok) {
      return jsonWithCors(
        { success: false, error: "invalid token" },
        { status: 403 },
        origin
      );
    }
  } catch {
    return jsonWithCors(
      { success: false, error: "invalid token" },
      { status: 403 },
      origin
    );
  }

  return jsonWithCors({ success: true }, { status: 200 }, origin);
}
