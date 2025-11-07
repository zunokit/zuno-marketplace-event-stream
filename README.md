# Zuno Marketplace Event Stream

![Next.js badge](https://img.shields.io/badge/Next.js-15-black?logo=nextdotjs)
![React badge](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)
![TypeScript badge](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

Live event stream widget for Zuno NFT Marketplace. Real-time display of marketplace activities (trades, auctions, offers, mints) with secure iframe embedding and auto-scrolling ticker animation.

## 🌟 Features

### Core
- **Live Event Ticker** - Auto-scrolling event feed with smooth transitions
- **Real-time Polling** - Fetches new events every 30 seconds from Ponder API
- **Event Categories** - Auction, Offer, Trade, Listing, Mint, Collection
- **Type-Safe API Client** - Full TypeScript integration with Ponder indexer

### Security
- **Secure IFrame Auth** - SHA256 HMAC token validation
- **Rate Limiting** - 60 requests/minute per IP
- **Timestamp Validation** - ±5 minute skew window
- **CORS Protection** - Configurable allowed origins

### UI/UX
- **Responsive Design** - Works in any iframe size
- **Smooth Animations** - CSS transitions for event slides
- **Error Handling** - Retry mechanism with exponential backoff
- **Last Updated Indicator** - Real-time status display

## 📋 Prerequisites

- **Node.js** 18+ (recommended 20+)
- **pnpm** 9+
- **Ponder Indexer** running on `localhost:42069` (or configured URL)

## 🚀 Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```bash
# Security - Generate a strong secret (min 32 chars)
IFRAME_API_SECRET=your-super-secret-key-here-min-32-characters

# Ponder API URL (your indexer)
NEXT_PUBLIC_PONDER_API_URL=http://localhost:42069

# CORS Origins (dev only)
NEXT_PUBLIC_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Start Development Server

```bash
pnpm dev
# App: http://localhost:3000
```

### 4. Test with IFrame

Open the test page to generate tokens and embed the widget:

```bash
pnpm test:iframe
# Test host: http://localhost:3001
```

Open browser at `http://localhost:3001`, enter your secret, and click "Generate Token & Embed".

## 📁 Project Structure

```
src/
├── app/
│   ├── page.tsx                      # Main page with auth & event feed
│   ├── layout.tsx                    # Root layout with QueryProvider
│   └── api/
│       └── iframe-auth/route.ts      # Token validation endpoint
├── components/
│   └── events/
│       ├── event-feed.tsx            # Main feed container
│       ├── event-ticker.tsx          # Auto-scroll ticker
│       ├── event-item.tsx            # Individual event card
│       └── event-empty.tsx           # Empty/error states
├── hooks/
│   └── use-events.ts                 # React Query hook for polling
├── lib/
│   ├── services/
│   │   └── ponder-client.ts          # Ponder API client
│   ├── security/
│   │   └── auth.ts                   # Token validation & rate limiting
│   ├── utils/
│   │   └── format.ts                 # Formatters (address, time, etc.)
│   ├── providers/
│   │   └── query-provider.tsx        # TanStack Query provider
│   └── iframe.ts                     # IFrame utilities
└── test/
    ├── index.html                    # Test harness
    ├── style.css                     # Test UI styles
    └── script.js                     # Token generation logic
```

## 🔐 Security & Authentication

### Token Generation

The widget uses HMAC SHA256 tokens for authentication:

```typescript
const secret = process.env.IFRAME_API_SECRET;
const nonce = crypto.randomUUID();
const timestamp = Math.floor(Date.now() / 1000);
const message = `${secret}:${nonce}:${timestamp}`;
const token = sha256(message);
```

### Embedding

```html
<iframe
  src="http://localhost:3000?token=TOKEN&nonce=NONCE&timestamp=TIMESTAMP"
  width="800"
  height="600"
  frameborder="0"
  sandbox="allow-same-origin allow-scripts allow-forms"
  allow="clipboard-read; clipboard-write"
></iframe>
```

### Token Expiry

- Tokens are valid for **5 minutes** from generation
- Timestamp validation uses ±300 second skew window
- Rate limiting: 60 requests/minute per IP

## 🛠️ Scripts

```bash
pnpm dev              # Start development server (Turbopack)
pnpm build            # Production build
pnpm start            # Start production server
pnpm lint             # Run ESLint
pnpm test:iframe      # Serve test host at :3001
pnpm generate-token   # CLI tool to generate embed tokens
```

## 🔗 API Integration

### Ponder API Endpoints Used

```
GET /api/activity?limit=50
  → Returns latest marketplace events

GET /api/events?category=auction&limit=50
  → Returns filtered events by category
```

### Event Schema

```typescript
{
  id: string;                    // tx_hash:log_index
  eventType: string;             // "auction_created", "nft_purchased", etc.
  category: string;              // "auction" | "offer" | "trade" | "mint" | "collection"
  actor: string;                 // Primary user address
  counterparty?: string;         // Secondary user (if applicable)
  collection?: string;           // NFT collection address
  tokenId?: string;              // Token ID
  data: object;                  // Event-specific JSON data
  blockTimestamp: string;        // Unix timestamp
  transactionHash: string;       // Transaction hash
  chainId: number;               // Chain ID
}
```

## 🎨 Customization

### Event Display

Edit `src/components/events/event-item.tsx` to customize how events are displayed:

- Change icons (emoji or lucide-react icons)
- Modify colors per category
- Add/remove fields

### Polling Interval

Edit `src/hooks/use-events.ts`:

```typescript
refetchInterval: 30000, // Change to your desired interval (ms)
```

### Animation Speed

Edit `src/components/events/event-ticker.tsx`:

```typescript
scrollInterval: 3000, // Time per event (ms)
```

## 🚀 Deployment

### Environment Variables (Production)

```bash
IFRAME_API_SECRET=your-production-secret-min-32-chars
NEXT_PUBLIC_PONDER_API_URL=https://your-ponder-api.com
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Vercel

```bash
pnpm build
vercel --prod
```

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install
COPY . .
RUN pnpm build
CMD ["pnpm", "start"]
```

## ⚠️ Production Considerations

### Rate Limiting

The current implementation uses **in-memory rate limiting**, which has important limitations:

**Limitations:**
- ❌ Rate limit counters reset on server restart
- ❌ Does NOT work with horizontal scaling (load balancers, multiple instances)
- ❌ Each server instance maintains separate counters
- ❌ Memory can grow under high traffic

**Suitable for:**
- ✅ Development environments
- ✅ Single-instance deployments
- ✅ Low-traffic applications (<100 req/min)

**Production Recommendations:**

For production deployments with multiple instances or high traffic, migrate to:

1. **Redis-based Rate Limiting** (recommended)
   ```bash
   npm install ioredis rate-limiter-flexible
   ```

2. **Upstash Rate Limiting** (serverless-friendly)
   ```bash
   npm install @upstash/ratelimit @upstash/redis
   ```

3. **Infrastructure-level Rate Limiting**
   - Cloudflare Rate Limiting Rules
   - AWS API Gateway throttling
   - Nginx rate limiting
   - Load balancer rate limiting

**Migration Guide:**

To migrate to Redis, update `src/lib/security/auth.ts`:

```typescript
import { Redis } from 'ioredis';
import { RateLimiterRedis } from 'rate-limiter-flexible';

const redis = new Redis(process.env.REDIS_URL);
const rateLimiter = new RateLimiterRedis({
  storeClient: redis,
  points: 60, // 60 requests
  duration: 60, // per 60 seconds
  keyPrefix: 'iframe-auth',
});

export async function checkRateLimit(identifier: string) {
  try {
    const result = await rateLimiter.consume(identifier);
    return {
      allowed: true,
      remaining: result.remainingPoints,
      resetAt: Date.now() + result.msBeforeNext,
    };
  } catch (error) {
    return { allowed: false, remaining: 0, resetAt: Date.now() + 60000 };
  }
}
```

### Other Production Best Practices

- **Monitoring**: Add logging and metrics for rate limit hits
- **Scaling**: Use Redis Cluster for high-availability rate limiting
- **Security**: Regularly rotate `IFRAME_API_SECRET`
- **Performance**: Enable CDN caching for static assets
- **Observability**: Set up error tracking (Sentry, etc.)

## 🧪 Testing

### Manual Testing

1. Start Ponder indexer: `cd ../zuno-marketplace-indexer && pnpm dev`
2. Start Next.js app: `pnpm dev`
3. Open test harness: `pnpm test:iframe`
4. Generate token and verify iframe loads

### Integration Testing

Ensure your Ponder API returns events in the expected format:

```bash
curl http://localhost:42069/api/activity?limit=10
```

## 🔧 Troubleshooting

### "Missing NEXT_PUBLIC_PONDER_API_URL"

Set the environment variable in `.env.local`:

```bash
NEXT_PUBLIC_PONDER_API_URL=http://localhost:42069
```

### "Invalid token" / "Token expired"

- Check `IFRAME_API_SECRET` matches between test page and server
- Ensure system clock is synchronized (NTP)
- Regenerate token (valid for 5 minutes only)

### No events showing

- Verify Ponder indexer is running: `curl http://localhost:42069/api/activity`
- Check browser console for API errors
- Ensure CORS is configured correctly

### Rate limit errors

- Reduce polling frequency in `use-events.ts`
- Increase rate limit in `src/lib/security/auth.ts`

## 📝 License

MIT License - see [LICENSE](LICENSE) file

## 🤝 Contributing

Contributions welcome! Please follow:

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'feat: add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📚 Documentation

- **[API Documentation](./docs/API.md)** - Complete API reference, authentication, error codes
- **[Architecture Guide](./docs/ARCHITECTURE.md)** - System design, data flow, security architecture

## 🧪 Testing

Run tests:
```bash
pnpm test              # Run all tests
pnpm test:ui           # Run with UI
pnpm test:coverage     # Generate coverage report
```

Test coverage focuses on security-critical code:
- ✅ Token generation & validation
- ✅ Rate limiting logic
- ✅ Origin checking
- ✅ Parameter parsing

---

**Built with ❤️ for Zuno Marketplace**
