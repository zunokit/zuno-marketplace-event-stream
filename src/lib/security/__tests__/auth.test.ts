import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  generateToken,
  validateToken,
  parseRequiredParams,
  isWithinSkew,
  checkRateLimit,
  getClientIP,
  isOriginAllowed,
  type TokenParams,
} from "../auth";

describe("auth.ts", () => {
  describe("generateToken", () => {
    it("should generate consistent token for same inputs", () => {
      const nonce = "test-nonce";
      const timestamp = 1000000;
      const secret = "test-secret-min-32-characters-long-required";

      const token1 = generateToken(nonce, timestamp, secret);
      const token2 = generateToken(nonce, timestamp, secret);

      expect(token1).toBe(token2);
      expect(token1).toHaveLength(64); // SHA256 hex = 64 chars
    });

    it("should generate different tokens for different nonces", () => {
      const timestamp = 1000000;
      const secret = "test-secret-min-32-characters-long-required";

      const token1 = generateToken("nonce1", timestamp, secret);
      const token2 = generateToken("nonce2", timestamp, secret);

      expect(token1).not.toBe(token2);
    });

    it("should generate different tokens for different timestamps", () => {
      const nonce = "test-nonce";
      const secret = "test-secret-min-32-characters-long-required";

      const token1 = generateToken(nonce, 1000000, secret);
      const token2 = generateToken(nonce, 2000000, secret);

      expect(token1).not.toBe(token2);
    });

    it("should generate different tokens for different secrets", () => {
      const nonce = "test-nonce";
      const timestamp = 1000000;

      const token1 = generateToken(
        nonce,
        timestamp,
        "secret1-min-32-characters-long-required"
      );
      const token2 = generateToken(
        nonce,
        timestamp,
        "secret2-min-32-characters-long-required"
      );

      expect(token1).not.toBe(token2);
    });
  });

  describe("validateToken", () => {
    const secret = "test-secret-min-32-characters-long-required";

    beforeEach(() => {
      vi.useFakeTimers();
    });

    it("should validate correct token", () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const timestamp = Math.floor(now / 1000);
      const nonce = "test-nonce";
      const token = generateToken(nonce, timestamp, secret);

      const params: TokenParams = { token, nonce, timestamp };
      const result = validateToken(params, secret);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should reject invalid token", () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const timestamp = Math.floor(now / 1000);
      const nonce = "test-nonce";
      const invalidToken = "0".repeat(64);

      const params: TokenParams = { token: invalidToken, nonce, timestamp };
      const result = validateToken(params, secret);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should reject token with short secret", () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const timestamp = Math.floor(now / 1000);
      const nonce = "test-nonce";
      const token = generateToken(nonce, timestamp, "short");

      const params: TokenParams = { token, nonce, timestamp };
      const result = validateToken(params, "short");

      expect(result.valid).toBe(false);
      expect(result.error).toContain("invalid secret");
    });

    it("should reject expired token", () => {
      const oldTime = Date.now() - 400 * 1000; // 400 seconds ago (> 300s skew)
      vi.setSystemTime(oldTime);

      const timestamp = Math.floor(oldTime / 1000);
      const nonce = "test-nonce";
      const token = generateToken(nonce, timestamp, secret);

      // Move time forward
      vi.setSystemTime(Date.now());

      const params: TokenParams = { token, nonce, timestamp };
      const result = validateToken(params, secret);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("expired");
    });
  });

  describe("parseRequiredParams", () => {
    it("should parse valid URL with all params", () => {
      const url =
        "http://localhost:3000?token=abc123&nonce=xyz789&timestamp=1000000";
      const result = parseRequiredParams(url);

      expect(result).toEqual({
        token: "abc123",
        nonce: "xyz789",
        timestamp: 1000000,
      });
    });

    it("should return null for missing token", () => {
      const url = "http://localhost:3000?nonce=xyz789&timestamp=1000000";
      const result = parseRequiredParams(url);

      expect(result).toBeNull();
    });

    it("should return null for missing nonce", () => {
      const url = "http://localhost:3000?token=abc123&timestamp=1000000";
      const result = parseRequiredParams(url);

      expect(result).toBeNull();
    });

    it("should return null for missing timestamp", () => {
      const url = "http://localhost:3000?token=abc123&nonce=xyz789";
      const result = parseRequiredParams(url);

      expect(result).toBeNull();
    });

    it("should return null for invalid timestamp", () => {
      const url =
        "http://localhost:3000?token=abc123&nonce=xyz789&timestamp=invalid";
      const result = parseRequiredParams(url);

      expect(result).toBeNull();
    });
  });

  describe("isWithinSkew", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it("should accept timestamp within skew", () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const timestamp = Math.floor(now / 1000) - 100; // 100 seconds ago
      expect(isWithinSkew(timestamp)).toBe(true);
    });

    it("should reject timestamp outside skew", () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const timestamp = Math.floor(now / 1000) - 400; // 400 seconds ago
      expect(isWithinSkew(timestamp)).toBe(false);
    });

    it("should accept future timestamp within skew", () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const timestamp = Math.floor(now / 1000) + 100; // 100 seconds future
      expect(isWithinSkew(timestamp)).toBe(true);
    });
  });

  describe("checkRateLimit", () => {
    it("should allow first request", () => {
      const identifier = "test-ip";
      const result = checkRateLimit(identifier);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThan(0);
    });

    it("should track multiple requests", () => {
      const identifier = "test-ip-2";

      const result1 = checkRateLimit(identifier);
      const result2 = checkRateLimit(identifier);

      expect(result1.remaining).toBeGreaterThan(result2.remaining);
    });

    it("should reject after rate limit exceeded", () => {
      const identifier = "test-ip-3";

      // Make 60 requests (the limit)
      for (let i = 0; i < 60; i++) {
        checkRateLimit(identifier);
      }

      // 61st request should be rejected
      const result = checkRateLimit(identifier);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });
  });

  describe("getClientIP", () => {
    it("should extract IP from x-forwarded-for header", () => {
      const headers = new Headers({
        "x-forwarded-for": "192.168.1.1, 10.0.0.1",
      });

      const ip = getClientIP(headers);
      expect(ip).toBe("192.168.1.1");
    });

    it("should extract IP from x-real-ip header", () => {
      const headers = new Headers({
        "x-real-ip": "192.168.1.2",
      });

      const ip = getClientIP(headers);
      expect(ip).toBe("192.168.1.2");
    });

    it("should return unknown for missing headers", () => {
      const headers = new Headers();

      const ip = getClientIP(headers);
      expect(ip).toBe("unknown");
    });
  });

  describe("isOriginAllowed", () => {
    it("should reject null origin", () => {
      const result = isOriginAllowed(null);
      expect(result).toBe(false);
    });

    it("should allow localhost in development", () => {
      vi.stubEnv("NODE_ENV", "development");

      expect(isOriginAllowed("http://localhost:3000")).toBe(true);
      expect(isOriginAllowed("http://127.0.0.1:3000")).toBe(true);

      vi.unstubAllEnvs();
    });

    it("should check against allowed origins list", () => {
      vi.stubEnv("NEXT_PUBLIC_ALLOWED_ORIGINS", "https://example.com");

      expect(isOriginAllowed("https://example.com")).toBe(true);
      expect(isOriginAllowed("https://evil.com")).toBe(false);

      vi.unstubAllEnvs();
    });
  });
});
