# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Zuno Marketplace Event Stream is a Next.js 15 application that provides a secure, embeddable widget displaying real-time NFT marketplace events. It uses HMAC-based iframe authentication and polls a Ponder indexer API for blockchain events.

## Development Commands

### Setup and Installation
```bash
pnpm install                    # Install dependencies
cp .env.example .env.local      # Create environment file (edit with your values)
```

### Development
```bash
pnpm dev                        # Start dev server (localhost:3000) with Turbopack
pnpm test:iframe                # Start test iframe host (localhost:3001) to test embedding
```

### Testing
```bash
pnpm test                       # Run all tests with Jest
pnpm test:watch                 # Run tests in watch mode
pnpm test:coverage              # Generate coverage report
```

Jest configuration is located in `tests/setup/jest.config.ts` (note: NOT in project root).

### Code Quality
```bash
pnpm lint                       # Run ESLint
pnpm build                      # Production build with Turbopack (runs type checking)
```

**Pre-commit workflow**: Always run `pnpm lint` and `pnpm build` before committing to catch issues early.

### Utilities
```bash
pnpm generate-token             # CLI tool to generate iframe auth tokens (scripts/generate-token.ts)
```

## Architecture Overview

### Core Data Flow
```
Parent Website (with HMAC token)
    ↓ iframe embed with token
Next.js App (page.tsx validates token via /api/iframe-auth)
    ↓ useEvents hook (TanStack Query, 30s polling)
PonderClient (src/lib/services/ponder-client.ts)
    ↓ HTTP GET /api/activity?limit=50
Ponder Indexer API (localhost:42069 in dev)
    ↓ indexed blockchain events
Event Components (EventFeed → EventTicker → EventItem)
```

### Security Architecture (Multi-Layer)
1. **Token Authentication** (HMAC SHA256): `src/lib/security/auth.ts`
   - Token = HMAC(secret, nonce:timestamp)
   - 5-minute expiry window (TIMESTAMP_SKEW_SECONDS = 300)
   - Nonce prevents replay attacks

2. **Rate Limiting**: In-memory store (60 req/min per IP)
   - **Important**: In-memory = lost on restart, doesn't work with horizontal scaling
   - For production: migrate to Redis (see README.md "Production Considerations")

3. **Origin Validation**: CORS checking against NEXT_PUBLIC_ALLOWED_ORIGINS
   - Enforced in `src/app/api/iframe-auth/route.ts`

4. **Timing-Safe Comparison**: Uses `crypto.timingSafeEqual()` to prevent timing attacks

### State Management
- **TanStack Query** (`@tanstack/react-query`): Handles all server state, caching, and polling
- **No global state library**: Component state only (React useState/useEffect)
- **Query Configuration** (from `src/lib/constants.ts`):
  - `POLLING_INTERVAL_MS`: 30000 (30 seconds)
  - `CACHE_STALE_TIME_MS`: 25000 (25 seconds - data considered fresh)
  - `CACHE_GC_TIME_MS`: 60000 (60 seconds - unused cache cleanup)

### HTTP Caching (ETag-Based)
- **PonderClient** implements ETag-based conditional requests (If-None-Match headers)
- Handles 304 Not Modified responses to reduce bandwidth
- See `docs/CACHING.md` for detailed implementation
- Cache configuration in `src/lib/constants.ts`:
  - `HTTP_CACHE_ENABLED`: true
  - `HTTP_CACHE_MAX_AGE_MS`: 60000 (1 minute)
  - `HTTP_CACHE_MAX_ENTRIES`: 100

### Key Files and Their Responsibilities

**Authentication & Security:**
- `src/lib/security/auth.ts`: Token generation, validation, rate limiting, origin checking
- `src/app/api/iframe-auth/route.ts`: API endpoint that validates tokens (GET /api/iframe-auth)

**Data Fetching:**
- `src/lib/services/ponder-client.ts`: PonderClient class for HTTP requests to Ponder API
  - Singleton pattern: use `getPonderClient()` function
  - Methods: `getActivity(limit)`, `getEvents(options)`, `healthCheck()`
  - Built-in timeout, retry, and ETag caching
- `src/hooks/use-events.ts`: React hook wrapping TanStack Query for event polling

**UI Components:**
- `src/app/page.tsx`: Main page with auth logic (validates token on mount)
- `src/components/events/event-feed.tsx`: Container that uses `useEvents()` hook
- `src/components/events/event-ticker.tsx`: Auto-scrolling ticker (3s per event)
- `src/components/events/event-item.tsx`: Individual event card rendering

**Configuration:**
- `src/lib/constants.ts`: All timing, caching, and security constants (single source of truth)
- `.env.local`: Environment variables (not committed, copy from `.env.example`)

## Path Aliases

TypeScript path alias `@/*` maps to `src/*` (configured in `tsconfig.json`).

Example:
```typescript
import { getPonderClient } from '@/lib/services/ponder-client';
import { POLLING_INTERVAL_MS } from '@/lib/constants';
```

## Important Patterns

### Adding New Constants
Always add to `src/lib/constants.ts` with:
- JSDoc comment explaining usage
- `@default` annotation showing default value
- Grouped by category (API, Security, UI, etc.)

### Error Handling
- Use `PonderClientError` class for API errors (includes statusCode and cause)
- All API errors bubble up to `useEvents` hook, which exposes `isError` and `error` states
- Components should handle loading and error states explicitly

### Modifying Polling Behavior
1. Adjust `POLLING_INTERVAL_MS` in `src/lib/constants.ts`
2. Query refetch config in `src/hooks/use-events.ts` uses this constant
3. Do NOT use hardcoded values in components

### Token Generation (For Testing)
Two methods:
1. CLI: `pnpm generate-token` (requires IFRAME_API_SECRET in .env.local)
2. Browser: `pnpm test:iframe` → visit localhost:3001 → enter secret → generate token

## Testing Guidelines

### Test Location
All tests use Jest (NOT Vitest). Configuration: `tests/setup/jest.config.ts`

Test files should be placed in `src/**/__tests__/*.test.ts` or next to source files as `*.test.ts`.

### Current Test Coverage
- **Security utilities** (`src/lib/security/auth.ts`): Comprehensive coverage
  - Token generation and validation
  - Rate limiting logic
  - Timestamp skew validation
  - Origin checking
- **API client** (`src/lib/services/ponder-client.ts`): Partial coverage (ETag caching tests exist)

### Writing Tests
```typescript
// Example: Testing a utility function
import { validateToken } from '@/lib/security/auth';

describe('validateToken', () => {
  it('should validate correct tokens', () => {
    const result = validateToken({ token, nonce, timestamp }, secret);
    expect(result.valid).toBe(true);
  });
});
```

## Environment Variables

Required variables (must be set in `.env.local`):
- `IFRAME_API_SECRET`: Min 32 characters, used for HMAC token signing
- `NEXT_PUBLIC_PONDER_API_URL`: Ponder indexer URL (e.g., http://localhost:42069)
- `NEXT_PUBLIC_ALLOWED_ORIGINS`: Comma-separated origins allowed to embed widget
- `NEXT_PUBLIC_APP_URL`: Public URL of this app (for embed URL generation)

Optional:
- `NEXT_PUBLIC_PONDER_API_KEY`: Bearer token for Ponder API (if authentication enabled)

## Known Limitations and Production Considerations

### Rate Limiting (Critical for Production)
The current implementation uses **in-memory rate limiting**, which:
- Resets on server restart
- Does NOT work with multiple instances (load balancing)
- Can grow unbounded with unique IPs

**For production deployment**, migrate to Redis-based rate limiting. See README.md "Production Considerations" section for migration guide.

### Polling vs Real-time
- Current: 30-second polling with HTTP requests
- No WebSocket or Server-Sent Events (SSE)
- Future enhancement: Real-time updates via WebSocket to Ponder

### No Backend State
- All state is client-side (TanStack Query cache)
- No server-side caching layer (consider adding Redis/CDN for production)

## Additional Documentation

- `README.md`: Comprehensive setup, usage, and deployment guide
- `docs/API.md`: Complete API reference and error codes
- `docs/ARCHITECTURE.md`: Detailed system architecture and data flow diagrams
- `docs/CACHING.md`: ETag-based HTTP caching implementation details

## Common Development Tasks

### Adding a New Event Type
1. Update `PonderEvent` type in `src/lib/services/ponder-client.ts` (add to `category` union)
2. Update event rendering in `src/components/events/event-item.tsx` (add category badge, icon, color)
3. Add tests for new event type parsing

### Modifying Authentication Logic
1. Update validation in `src/lib/security/auth.ts`
2. Add corresponding tests in `src/lib/security/__tests__/auth.test.ts`
3. Update API route if needed: `src/app/api/iframe-auth/route.ts`

### Changing Cache Behavior
1. Modify constants in `src/lib/constants.ts`
2. Review impact on `src/hooks/use-events.ts` (TanStack Query config)
3. Review impact on `src/lib/services/ponder-client.ts` (HTTP cache config)

### Debugging Tips
- Check browser console for API errors (PonderClientError messages)
- Use React Query DevTools (add `<ReactQueryDevtools />` to layout.tsx)
- Check rate limit headers in Network tab: `X-RateLimit-Limit`, `X-RateLimit-Remaining`
- Validate token generation: Use `pnpm generate-token` to test auth flow
