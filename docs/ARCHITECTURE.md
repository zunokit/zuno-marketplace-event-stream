# Architecture Documentation

## System Overview

Zuno Marketplace Event Stream is a Next.js application that provides a real-time event feed widget for NFT marketplace activities. It uses secure iframe embedding with HMAC authentication.

```
┌─────────────────────┐
│   Parent Website    │
│  (ZunoFun)          │
│                     │
│  ┌───────────────┐  │
│  │   <iframe>    │  │
│  │  Event Stream │  │
│  └───────────────┘  │
└─────────────────────┘
         ↓
    Token Auth
         ↓
┌─────────────────────┐
│  Event Stream App   │
│  (Next.js)          │
└─────────────────────┘
         ↓
    Polling (30s)
         ↓
┌─────────────────────┐
│   Ponder Indexer    │
│   (GraphQL API)     │
└─────────────────────┘
         ↓
    Blockchain Events
         ↓
┌─────────────────────┐
│  Blockchain (L2)    │
│  Smart Contracts    │
└─────────────────────┘
```

---

## Authentication Flow

### 1. Token Generation (Server-Side)

```
┌──────────────┐
│ Parent App   │
│ Backend      │
└──────┬───────┘
       │
       │ 1. Generate nonce (UUID)
       │ 2. Get timestamp
       │ 3. Create HMAC SHA256
       │    message = nonce:timestamp
       │    token = HMAC(secret, message)
       │
       ▼
┌──────────────┐
│ Token + URL  │
│ token, nonce,│
│ timestamp    │
└──────────────┘
```

### 2. Client Embedding

```
┌──────────────┐
│ Parent App   │
│ Frontend     │
└──────┬───────┘
       │
       │ 1. Receive auth URL from backend
       │ 2. Create iframe with URL
       │    ?token=XXX&nonce=YYY&timestamp=ZZZ
       │
       ▼
┌──────────────┐
│  <iframe>    │
│  loads       │
└──────────────┘
```

### 3. Validation (Event Stream App)

```
┌──────────────────────┐
│  iframe-auth API     │
│  /api/iframe-auth    │
└──────┬───────────────┘
       │
       │ 1. Parse URL params
       │ 2. Check rate limit (IP-based)
       │ 3. Validate origin (CORS)
       │ 4. Check timestamp skew (±5 min)
       │ 5. Regenerate token with secret
       │ 6. Compare tokens (timing-safe)
       │
       ├─ Valid ──────► Load Event Feed
       │
       └─ Invalid ────► Show Error
```

---

## Data Flow

### Event Fetching & Display

```
┌────────────────┐
│   EventFeed    │   React Component (Client)
│   Component    │
└────────┬───────┘
         │
         │ Uses
         ▼
┌────────────────┐
│  useEvents     │   React Hook
│  Hook          │   - TanStack Query
└────────┬───────┘   - 30s polling
         │
         │ Calls
         ▼
┌────────────────┐
│ PonderClient   │   HTTP Client
│                │   - Timeout handling
└────────┬───────┘   - Error retry (exp backoff)
         │
         │ GET /api/activity
         ▼
┌────────────────┐
│ Ponder API     │   GraphQL Indexer
│ (Port 42069)   │
└────────┬───────┘
         │
         │ Indexed Events
         ▼
┌────────────────┐
│  Event Data    │   JSON Response
│  - trades      │
│  - auctions    │
│  - offers      │
│  - mints       │
└────────────────┘
```

### Rendering Pipeline

```
Events Array
     │
     ▼
┌────────────────┐
│  EventTicker   │   Auto-scroll container
│                │   - Smooth transitions
└────────┬───────┘   - 3s per event
         │
         │ Maps
         ▼
┌────────────────┐
│  EventItem     │   Individual event card
│  (multiple)    │   - Category badge
└────────────────┘   - User addresses
                      - Timestamp
                      - Transaction link
```

---

## Component Architecture

### App Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout + QueryProvider
│   ├── page.tsx                # Main page + auth logic
│   └── api/
│       └── iframe-auth/
│           └── route.ts        # Token validation endpoint
│
├── components/
│   ├── error-boundary.tsx      # Error handling
│   ├── events/
│   │   ├── event-feed.tsx      # Main container
│   │   ├── event-ticker.tsx    # Auto-scroll logic
│   │   ├── event-item.tsx      # Event card
│   │   └── event-empty.tsx     # Empty/error states
│   └── ui/                     # shadcn/ui components
│
├── hooks/
│   └── use-events.ts           # Event polling hook
│
├── lib/
│   ├── constants.ts            # App-wide constants
│   ├── services/
│   │   └── ponder-client.ts    # API client
│   ├── security/
│   │   └── auth.ts             # Auth & rate limiting
│   ├── middleware/
│   │   └── cors.ts             # CORS handling
│   ├── providers/
│   │   └── query-provider.tsx  # TanStack Query setup
│   └── utils/
│       └── format.ts           # Formatting utilities
│
└── __tests__/                  # Test files
```

### State Management

```
┌─────────────────────────────────┐
│     TanStack Query              │
│     (React Query)               │
│                                 │
│  ┌───────────────────────────┐ │
│  │  Query Cache              │ │
│  │  - events: PonderEvent[]  │ │
│  │  - isLoading: boolean     │ │
│  │  - error: Error | null    │ │
│  └───────────────────────────┘ │
│                                 │
│  Automatic:                     │
│  - Refetch every 30s            │
│  - Retry on error (3x)          │
│  - Stale after 25s              │
│  - GC after 60s                 │
└─────────────────────────────────┘
         │
         │ Consumed by
         ▼
┌─────────────────────────────────┐
│     React Components            │
│     - EventFeed                 │
│     - EventTicker               │
└─────────────────────────────────┘
```

---

## Security Architecture

### Multi-Layer Security

```
1. Origin Validation
   └─ Check iframe parent domain
      ├─ Development: Allow localhost
      └─ Production: Whitelist only

2. Rate Limiting
   └─ In-memory store (IP-based)
      ├─ Limit: 60 req/min
      ├─ Cleanup: Auto-expire old entries
      └─ TODO: Redis for production scale

3. Token Validation
   └─ HMAC SHA256 signature
      ├─ Secret: Min 32 chars
      ├─ Nonce: UUID v4 (replay protection)
      └─ Timestamp: ±5 min skew tolerance

4. Timing Attack Prevention
   └─ crypto.timingSafeEqual()
      └─ Constant-time comparison
```

### Attack Mitigation

| Attack Type | Mitigation |
|-------------|------------|
| Token Replay | Nonce-based (UUID v4) |
| Token Theft | Origin validation + short TTL |
| Timing Attacks | Constant-time comparison |
| Brute Force | Rate limiting (60/min) |
| CSRF | Origin checking |
| XSS | Iframe sandbox |
| DoS | Rate limiting + timeout |

---

## Performance Optimization

### Caching Strategy

```
Browser
  └─ TanStack Query Cache
     ├─ Stale Time: 25s
     ├─ GC Time: 60s
     └─ Background Refetch: Disabled

API Client
  └─ Request Timeout: 10s
     ├─ Retry: 3 attempts
     └─ Backoff: Exponential (1s, 2s, 4s, max 10s)

Polling
  └─ Interval: 30s
     ├─ On Error: Retry with backoff
     └─ On Success: Continue polling
```

### Bundle Optimization

- Next.js App Router
- Turbopack for fast builds
- Tree-shaking via ES modules
- Code splitting by route
- Dynamic imports for heavy components

---

## Scalability Considerations

### Current Limitations

1. **In-Memory Rate Limiting**
   - Lost on restart
   - Doesn't work across multiple instances
   - Memory grows with unique IPs

2. **Polling vs Real-time**
   - 30s delay for new events
   - Wasted bandwidth if no changes

3. **No Persistent State**
   - Client-side only
   - No backend caching

### Scaling Recommendations

```
Current (Single Instance)
┌──────────────┐
│  Next.js App │  In-memory rate limit
│  (1 instance)│  Polling every 30s
└──────────────┘

Production (Multi-Instance)
┌──────────────┐
│  Load        │
│  Balancer    │
└──────┬───────┘
       │
       ├─────────────┬─────────────┐
       │             │             │
       ▼             ▼             ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│ Instance │  │ Instance │  │ Instance │
│    1     │  │    2     │  │    3     │
└────┬─────┘  └────┬─────┘  └────┬─────┘
     │             │             │
     └─────────────┴─────────────┘
                   │
                   ▼
          ┌──────────────┐
          │    Redis     │  Shared rate limit
          │   (Upstash)  │  Pub/Sub for real-time
          └──────────────┘
```

**For Production:**
1. Use Redis for rate limiting
2. Implement WebSocket/SSE for real-time updates
3. Add CDN for static assets
4. Use database for persistent state
5. Add monitoring (Sentry, DataDog)

---

## Testing Strategy

### Test Coverage

```
Unit Tests (Vitest)
├── lib/security/auth.ts        ✅ Critical
│   ├── Token generation
│   ├── Token validation
│   ├── Rate limiting
│   └── Origin checking
│
├── lib/services/ponder-client.ts  🔄 Planned
│   ├── API calls
│   ├── Error handling
│   └── Timeout logic
│
└── hooks/use-events.ts         🔄 Planned
    ├── Polling logic
    └── Error states

Integration Tests
└── E2E (Playwright)            📋 TODO
    ├── Full auth flow
    ├── Event display
    └── Error scenarios
```

### CI/CD Pipeline

```
GitHub Actions Workflow:

1. Lint & Type Check
   ├─ ESLint
   └─ TypeScript tsc

2. Test
   ├─ Unit tests (Vitest)
   └─ Coverage report

3. Build
   ├─ Next.js production build
   └─ Upload artifacts

4. Deploy (Manual)
   └─ Vercel / Docker
```

---

## Deployment Architecture

### Development

```
Local Machine
├─ Next.js Dev Server (Port 3000)
├─ Test Host (Port 3001)
└─ Ponder API (Port 42069)
```

### Production (Vercel)

```
Vercel Edge Network
├─ CDN for static assets
├─ Edge functions for API routes
└─ Automatic HTTPS

External Services:
├─ Ponder API (Custom domain)
└─ (Optional) Redis (Upstash)
```

### Production (Docker)

```
Docker Container
├─ Node.js 20 Alpine
├─ Next.js standalone build
└─ PM2 for process management

Environment:
├─ PORT=3000
├─ NODE_ENV=production
└─ Environment variables
```

---

## Monitoring & Observability

### Metrics to Track

1. **Performance**
   - API response time
   - Polling interval adherence
   - Client-side render time

2. **Errors**
   - Auth failures (by reason)
   - API errors (by type)
   - Component crashes

3. **Security**
   - Rate limit hits
   - Invalid token attempts
   - Origin violations

4. **Business**
   - Active widgets
   - Events displayed
   - User engagement

### Recommended Tools

- **Error Tracking**: Sentry
- **Analytics**: Vercel Analytics / Google Analytics
- **Logging**: Logtail / DataDog
- **Uptime**: Pingdom / UptimeRobot

---

## Future Improvements

1. **Real-time Updates**
   - WebSocket connection to Ponder
   - Server-Sent Events (SSE)
   - Instant event notification

2. **Enhanced Security**
   - Redis-based rate limiting
   - JWT tokens with refresh
   - Anomaly detection

3. **Performance**
   - Edge caching (Cloudflare)
   - Incremental Static Regeneration
   - Optimistic UI updates

4. **Features**
   - Event filtering by category
   - Search functionality
   - Historical event browser
   - Custom theming

5. **Scalability**
   - Multi-region deployment
   - Database for persistence
   - Message queue for events
   - Auto-scaling infrastructure
