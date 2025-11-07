# Caching Strategy

## Overview

The Ponder API Client implements **ETag-based HTTP caching** to optimize bandwidth usage and improve performance. This strategy uses conditional requests to avoid re-downloading unchanged data.

## How It Works

### 1. Initial Request

```
Client                    Server
  |                         |
  |  GET /api/activity      |
  |------------------------>|
  |                         |
  |  200 OK                 |
  |  ETag: "abc123"         |
  |  Data: [...]            |
  |<------------------------|
  |                         |
  Store: ETag + Data
```

### 2. Subsequent Request (Data Unchanged)

```
Client                    Server
  |                         |
  |  GET /api/activity      |
  |  If-None-Match: "abc123"|
  |------------------------>|
  |                         |
  |  304 Not Modified       |
  |<------------------------|
  |                         |
  Return Cached Data
```

### 3. Subsequent Request (Data Changed)

```
Client                    Server
  |                         |
  |  GET /api/activity      |
  |  If-None-Match: "abc123"|
  |------------------------>|
  |                         |
  |  200 OK                 |
  |  ETag: "def456"         |
  |  Data: [new data]       |
  |<------------------------|
  |                         |
  Update Cache
```

## Benefits

### Bandwidth Savings
- **No data transfer on 304 responses** - Only headers sent
- Typical savings: 50-90% bandwidth reduction
- Example: 100KB response → 1KB when unchanged

### Performance
- **Faster response times** - No JSON parsing on cache hit
- Reduced server load
- Better user experience

### Cost Reduction
- Lower bandwidth costs (CDN, network)
- Reduced API rate limit usage
- Fewer database queries on server

## Configuration

### Enable/Disable Caching

```typescript
const client = new PonderClient({
  baseUrl: "http://api.example.com",
  enableCache: true, // default: true
  cacheMaxAge: 60000, // 60 seconds (default)
});
```

### Cache Duration

The `cacheMaxAge` determines how long cache entries are valid:

```typescript
// Short-lived cache (10 seconds)
cacheMaxAge: 10000

// Medium-lived cache (1 minute, default)
cacheMaxAge: 60000

// Long-lived cache (5 minutes)
cacheMaxAge: 300000
```

### Disable Caching

For testing or development:

```typescript
const client = new PonderClient({
  baseUrl: "http://api.example.com",
  enableCache: false, // Disable caching
});
```

## API Reference

### clearCache()

Clear all cached data:

```typescript
const client = getPonderClient();
client.clearCache();
```

Use cases:
- User logs out
- Manual refresh requested
- After critical update

### getCacheStats()

Get cache information:

```typescript
const stats = client.getCacheStats();
console.log(`Cache size: ${stats.size} entries`);
console.log(`Cached endpoints:`, stats.entries);
```

Output:
```json
{
  "size": 3,
  "entries": [
    "/api/activity?limit=50",
    "/api/events?category=auction",
    "/api/events?category=trade"
  ]
}
```

## Implementation Details

### Cache Key

Cache key = full endpoint path with query parameters:

```typescript
"/api/activity?limit=50"
"/api/events?category=auction&limit=20"
```

### Cache Storage

- **In-memory Map** - Fast access, automatic cleanup
- **Max entries**: 100 (automatic cleanup triggers)
- **Automatic expiry**: Based on `cacheMaxAge`

### Cache Cleanup

Cleanup runs automatically when:
- Cache exceeds 100 entries
- Entry is accessed but expired

### ETag Format

The server should return ETags in the response:

```http
HTTP/1.1 200 OK
ETag: "33a64df551425fcc55e4d42a148795d9f25f89d4"
Content-Type: application/json

{"success": true, "data": [...]}
```

Common ETag formats:
- **Strong**: `"abc123"` - Byte-for-byte identical
- **Weak**: `W/"abc123"` - Semantically equivalent

## Server Requirements

The Ponder API must support:

1. **ETag Header** in responses
2. **If-None-Match** header in requests
3. **304 Not Modified** response when content unchanged

### Example Server Implementation (Express)

```javascript
app.get("/api/activity", (req, res) => {
  const data = getActivityData();

  // Generate ETag (hash of data)
  const etag = generateETag(data);

  // Check If-None-Match header
  if (req.headers["if-none-match"] === etag) {
    // Data unchanged
    return res.status(304).end();
  }

  // Data changed, send full response
  res.set("ETag", etag);
  res.json({ success: true, data });
});
```

## Testing

### Test Cache Hit

```typescript
const client = getPonderClient();

// First request - Cache miss
const data1 = await client.getActivity();
console.log("First request:", data1.length);

// Second request - Cache hit (if ETag matches)
const data2 = await client.getActivity();
console.log("Second request:", data2.length);

// Should return same data
console.log("Same data:", data1 === data2);
```

### Test Cache Expiry

```typescript
const client = new PonderClient({
  baseUrl: "http://api.example.com",
  cacheMaxAge: 5000, // 5 seconds
});

await client.getActivity();
console.log("Cached");

// Wait 6 seconds
await new Promise((resolve) => setTimeout(resolve, 6000));

// Cache expired, will make fresh request
await client.getActivity();
console.log("Cache expired, fetched fresh");
```

## Monitoring

### Cache Hit Rate

Track cache effectiveness:

```typescript
let cacheHits = 0;
let cacheMisses = 0;

// Monitor network requests
// If 304 response → cache hit
// If 200 response → cache miss

const hitRate = cacheHits / (cacheHits + cacheMisses);
console.log(`Cache hit rate: ${hitRate * 100}%`);
```

Typical hit rates:
- **High (>70%)**: Excellent caching, data rarely changes
- **Medium (30-70%)**: Good caching, balanced update frequency
- **Low (<30%)**: Poor caching, data changes frequently

## Best Practices

### 1. Choose Appropriate Cache Duration

```typescript
// Real-time data (quotes, prices)
cacheMaxAge: 5000 // 5 seconds

// Activity feed (our use case)
cacheMaxAge: 30000 // 30 seconds

// Static data (NFT metadata)
cacheMaxAge: 3600000 // 1 hour
```

### 2. Clear Cache on User Actions

```typescript
// User refreshes manually
function handleRefresh() {
  client.clearCache();
  refetchData();
}

// User creates new event
async function createEvent(data) {
  await api.create(data);
  client.clearCache(); // Invalidate cache
  refetchData();
}
```

### 3. Handle Cache Errors Gracefully

```typescript
try {
  const data = await client.getActivity();
} catch (error) {
  if (error.statusCode === 304) {
    // Should not happen, but handle gracefully
    console.error("Cache error");
  }
}
```

### 4. Monitor Cache Performance

```typescript
setInterval(() => {
  const stats = client.getCacheStats();
  console.log(`Cache stats:`, stats);

  // Alert if cache grows too large
  if (stats.size > 50) {
    console.warn("Cache size approaching limit");
  }
}, 60000); // Every minute
```

## Troubleshooting

### Issue: Cache Not Working

**Symptom**: Always making full requests, never 304

**Causes**:
1. Server not sending ETag header
2. Server not handling If-None-Match
3. Caching disabled (`enableCache: false`)

**Solution**: Check server logs and enable ETag support

### Issue: Stale Data

**Symptom**: Seeing old data despite changes

**Causes**:
1. `cacheMaxAge` too high
2. ETag not changing on server

**Solution**: Reduce `cacheMaxAge` or fix server ETag generation

### Issue: Memory Growth

**Symptom**: High memory usage

**Causes**:
1. Too many unique endpoints cached
2. Large response bodies

**Solution**:
- Reduce `cacheMaxAge`
- Call `clearCache()` periodically
- Implement cache size limits

## Performance Metrics

### Bandwidth Savings Example

Without caching:
```
Request 1: 100 KB
Request 2: 100 KB
Request 3: 100 KB
Total: 300 KB
```

With caching (70% hit rate):
```
Request 1: 100 KB (miss)
Request 2: 1 KB (hit - 304)
Request 3: 1 KB (hit - 304)
Total: 102 KB (66% savings)
```

### Response Time Improvement

```
Without cache: 200ms (network + parse)
With cache hit: 50ms (memory lookup)
Improvement: 75% faster
```

## Future Enhancements

Potential improvements:

1. **Cache Versioning** - Invalidate cache on app updates
2. **Persistent Cache** - LocalStorage/IndexedDB for cross-session
3. **Smart Invalidation** - Invalidate related endpoints
4. **Cache Warming** - Pre-fetch common queries
5. **Compression** - Store compressed data in cache
6. **LRU Eviction** - Least Recently Used cache eviction

---

**Note**: This caching implementation is client-side only. For production at scale, consider:
- CDN caching (Cloudflare, CloudFront)
- Server-side caching (Redis)
- Edge caching (Vercel Edge, Cloudflare Workers)
