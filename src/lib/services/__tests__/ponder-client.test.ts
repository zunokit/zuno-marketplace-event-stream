import { PonderClient, PonderClientError } from "../ponder-client";
import { HTTP_CACHE_MAX_ENTRIES } from "@/lib/constants";
global.fetch = jest.fn();

describe("PonderClient", () => {
  let client: PonderClient;
  const mockBaseUrl = "http://localhost:42069";

  beforeEach(() => {
    jest.clearAllMocks();
    client = new PonderClient({
      baseUrl: mockBaseUrl,
      enableCache: true,
      cacheMaxAge: 5000,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("Constructor", () => {
    it("should create client with default config", () => {
      const defaultClient = new PonderClient({
        baseUrl: mockBaseUrl,
      });

      expect(defaultClient).toBeInstanceOf(PonderClient);
    });

    it("should accept custom configuration", () => {
      const customClient = new PonderClient({
        baseUrl: mockBaseUrl,
        apiKey: "test-key",
        timeout: 5000,
        enableCache: false,
        cacheMaxAge: 30000,
      });

      expect(customClient).toBeInstanceOf(PonderClient);
    });
  });

  describe("Caching", () => {
    const mockData = {
      success: true,
      data: [{ id: "1", eventType: "test" }],
    };

    beforeEach(() => {
      client.clearCache();
    });

    it("should cache response with ETag on first request", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => (name === "ETag" ? '"abc123"' : null),
        },
        json: async () => mockData,
      });

      await client.getActivity(50);

      const stats = client.getCacheStats();
      expect(stats.size).toBe(1);
      expect(stats.metrics.misses).toBe(1);
      expect(stats.metrics.hits).toBe(0);
    });

    it("should return cached data on 304 response", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => (name === "ETag" ? '"abc123"' : null),
        },
        json: async () => mockData,
      });

      await client.getActivity(50);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 304,
        headers: {
          get: () => null,
        },
        json: async () => ({}),
      });

      const result = await client.getActivity(50);

      expect(result).toEqual(mockData.data);
      expect(global.fetch).toHaveBeenCalledTimes(2);

      const secondCall = (global.fetch as jest.Mock).mock.calls[1];
      expect(secondCall[1].headers["If-None-Match"]).toBe('"abc123"');

      const stats = client.getCacheStats();
      expect(stats.metrics.hits).toBe(1);
      expect(stats.metrics.misses).toBe(1);
      expect(stats.hitRate).toBe(0.5);
    });

    it("should update cache when ETag changes", async () => {
      const updatedData = {
        success: true,
        data: [{ id: "2", eventType: "updated" }],
      };


      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => (name === "ETag" ? '"abc123"' : null),
        },
        json: async () => mockData,
      });

      await client.getActivity(50);


      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => (name === "ETag" ? '"def456"' : null),
        },
        json: async () => updatedData,
      });

      const result = await client.getActivity(50);

      expect(result).toEqual(updatedData.data);
      const stats = client.getCacheStats();
      expect(stats.size).toBe(1);
    });

    it("should handle requests without ETag gracefully", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: () => null,
        },
        json: async () => mockData,
      });

      const result = await client.getActivity(50);

      expect(result).toEqual(mockData.data);
      const stats = client.getCacheStats();
      expect(stats.size).toBe(0);
    });

    it("should expire cache after cacheMaxAge", async () => {
      jest.useFakeTimers();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => (name === "ETag" ? '"abc123"' : null),
        },
        json: async () => mockData,
      });

      await client.getActivity(50);


      jest.advanceTimersByTime(6000);


      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => (name === "ETag" ? '"abc123"' : null),
        },
        json: async () => mockData,
      });

      await client.getActivity(50);

      const stats = client.getCacheStats();
      expect(stats.metrics.misses).toBe(2);
      expect(stats.metrics.evictions).toBe(1);

      jest.useRealTimers();
    });

    it("should cleanup cache when exceeding max entries", async () => {
      jest.useFakeTimers();
      const now = Date.now();
      jest.setSystemTime(now);


      for (let i = 0; i < 20; i++) {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: {
            get: (name: string) =>
              name === "ETag" ? `"etag${i}"` : null,
          },
          json: async () => ({
            success: true,
            data: [{ id: `${i}` }],
          }),
        });

        await client.getActivity(i);

        jest.advanceTimersByTime(6000);
      }


      for (let i = 20; i < HTTP_CACHE_MAX_ENTRIES + 10; i++) {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: {
            get: (name: string) =>
              name === "ETag" ? `"etag${i}"` : null,
          },
          json: async () => ({
            success: true,
            data: [{ id: `${i}` }],
          }),
        });

        await client.getActivity(i);
      }

      const stats = client.getCacheStats();

      expect(stats.size).toBeLessThanOrEqual(HTTP_CACHE_MAX_ENTRIES);
      expect(stats.metrics.evictions).toBeGreaterThan(0);

      jest.useRealTimers();
    });

    it("should handle 304 without cached data gracefully", async () => {
      // Mock a 304 response without any prior cache
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 304,
        headers: {
          get: () => null,
        },
        json: async () => ({}),
      });

      const warnSpy = jest.spyOn(console, "warn").mockImplementation();



      await expect(client.getActivity(50)).rejects.toThrow();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("304 Not Modified without cached data")
      );

      warnSpy.mockRestore();
    });

    it("should generate different cache keys for different methods", async () => {
      const getResponse = {
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => (name === "ETag" ? '"get-etag"' : null),
        },
        json: async () => mockData,
      };

      // GET request
      (global.fetch as jest.Mock).mockResolvedValueOnce(getResponse);
      await client.getActivity(50);

      const stats = client.getCacheStats();
      expect(stats.size).toBe(1);
      expect(stats.entries[0]).toContain("GET:");
    });
  });

  describe("clearCache", () => {
    it("should clear all cached data and reset metrics", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => (name === "ETag" ? '"abc123"' : null),
        },
        json: async () => ({ success: true, data: [] }),
      });

      await client.getActivity(50);

      let stats = client.getCacheStats();
      expect(stats.size).toBe(1);
      expect(stats.metrics.misses).toBe(1);

      client.clearCache();

      stats = client.getCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.metrics.hits).toBe(0);
      expect(stats.metrics.misses).toBe(0);
      expect(stats.metrics.evictions).toBe(0);
    });
  });

  describe("getCacheStats", () => {
    it("should return accurate cache statistics", async () => {
      // Make several requests
      for (let i = 0; i < 3; i++) {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: {
            get: (name: string) => (name === "ETag" ? `"etag${i}"` : null),
          },
          json: async () => ({ success: true, data: [] }),
        });

        await client.getActivity(10 + i);
      }

      // Make a cached request
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 304,
        headers: { get: () => null },
        json: async () => ({}),
      });

      await client.getActivity(10);

      const stats = client.getCacheStats();
      expect(stats.size).toBe(3);
      expect(stats.entries.length).toBe(3);
      expect(stats.metrics.hits).toBe(1);
      expect(stats.metrics.misses).toBe(3);
      expect(stats.hitRate).toBe(0.25); // 1 hit / 4 total = 0.25
    });

    it("should calculate hit rate correctly with no requests", () => {
      const stats = client.getCacheStats();
      expect(stats.hitRate).toBe(0);
    });
  });

  describe("Disabled Cache", () => {
    beforeEach(() => {
      client = new PonderClient({
        baseUrl: mockBaseUrl,
        enableCache: false,
      });
    });

    it("should not cache when caching is disabled", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => (name === "ETag" ? '"abc123"' : null),
        },
        json: async () => ({ success: true, data: [] }),
      });

      await client.getActivity(50);

      const stats = client.getCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.metrics.hits).toBe(0);
      expect(stats.metrics.misses).toBe(0);
    });

    it("should make fresh requests every time", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => (name === "ETag" ? '"abc123"' : null),
        },
        json: async () => ({ success: true, data: [] }),
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(mockResponse)
        .mockResolvedValueOnce(mockResponse);

      await client.getActivity(50);
      await client.getActivity(50);

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("Error Handling", () => {
    it("should throw PonderClientError on HTTP error", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        headers: { get: () => null },
        json: async () => ({}),
      });

      await expect(client.getActivity(50)).rejects.toThrow(
        PonderClientError
      );


      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        headers: { get: () => null },
        json: async () => ({}),
      });

      await expect(client.getActivity(50)).rejects.toThrow(
        "HTTP 500: Internal Server Error"
      );
    });

    it("should throw PonderClientError on network error", async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Network failed")
      );

      await expect(client.getActivity(50)).rejects.toThrow(
        PonderClientError
      );
    });

    it.skip("should throw PonderClientError on timeout", async () => {
    });
  });
});
