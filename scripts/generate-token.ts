/**
 * Token Generator for IFrame Embedding
 *
 * Generate secure tokens for embedding the event stream widget
 *
 * Usage:
 *   tsx scripts/generate-token.ts
 */

import crypto from "crypto";
import { TIMESTAMP_SKEW_SECONDS } from "../src/lib/constants.js";

// Configuration
const SECRET = process.env.IFRAME_API_SECRET || "your-secret-here";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

function generateToken(): {
  url: string;
  nonce: string;
  timestamp: number;
  token: string;
  expiresAt: Date;
} {
  // Generate nonce (UUID v4)
  const nonce = crypto.randomUUID();

  // Current timestamp (seconds)
  const timestamp = Math.floor(Date.now() / 1000);

  // Generate token (SHA256 HMAC)
  const message = `${nonce}:${timestamp}`;
  const token = crypto.createHmac("sha256", SECRET).update(message).digest("hex");

  // Build URL
  const params = new URLSearchParams({
    token,
    nonce,
    timestamp: String(timestamp),
  });
  const url = `${APP_URL}?${params.toString()}`;

  // Calculate expiry (using TIMESTAMP_SKEW_SECONDS - effectively permanent)
  const expiresAt = new Date((timestamp + TIMESTAMP_SKEW_SECONDS) * 1000);

  return { url, nonce, timestamp, token, expiresAt };
}

function generateIframeHTML(url: string): string {
  return `<iframe
  src="${url}"
  width="800"
  height="600"
  frameborder="0"
  sandbox="allow-same-origin allow-scripts allow-forms"
  allow="clipboard-read; clipboard-write"
></iframe>`;
}

// Main
console.log("\n🔐 Zuno Marketplace Event Stream - Token Generator\n");

const result = generateToken();

console.log("📋 Token Details:");
console.log("  Nonce:     ", result.nonce);
console.log("  Timestamp: ", result.timestamp);
console.log("  Token:     ", result.token);
console.log("  Expires:   ", result.expiresAt.toISOString(), "(effectively permanent)");
console.log("\n🔗 Embed URL:");
console.log("  ", result.url);
console.log("\n📝 IFrame HTML:");
console.log(generateIframeHTML(result.url));
console.log("\n✅ Token does not expire (TIMESTAMP_SKEW_SECONDS = 100 years)\n");

// Export for programmatic use
export { generateToken, generateIframeHTML };
