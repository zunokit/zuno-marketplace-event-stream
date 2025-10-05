export function parseRequiredParams(url: string): {
  token: string;
  nonce: string;
  timestamp: number;
} | null {
  const { searchParams } = new URL(url);
  const token = searchParams.get("token");
  const nonce = searchParams.get("nonce");
  const timestampStr = searchParams.get("timestamp");
  if (!token || !nonce || !timestampStr) return null;
  const timestamp = parseInt(timestampStr, 10);
  if (Number.isNaN(timestamp)) return null;
  return { token, nonce, timestamp };
}

export function withinSkew(timestamp: number, skewSeconds = 300): boolean {
  const now = Math.floor(Date.now() / 1000);
  return Math.abs(now - timestamp) <= skewSeconds;
}

export function allowCorsInDev(
  response: Response,
  origin: string | null
): Response {
  if (process.env.NODE_ENV === "development") {
    const allowedOrigins = process.env.NEXT_PUBLIC_ALLOWED_ORIGINS?.split(
      ","
    ) || ["http://localhost:3000", "http://localhost:8080"];
    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set("Access-Control-Allow-Origin", origin);
    }
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
  }
  return response;
}
