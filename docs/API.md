# API Documentation

## Authentication API

### POST `/api/iframe-auth`

Validates iframe authentication tokens.

**Request:**
```
GET /api/iframe-auth?token=TOKEN&nonce=NONCE&timestamp=TIMESTAMP
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `token` | string | Yes | HMAC SHA256 token |
| `nonce` | string | Yes | UUID v4 nonce |
| `timestamp` | number | Yes | Unix timestamp (seconds) |

**Response:**

Success (200):
```json
{
  "success": true
}
```

Error (400 - Missing Parameters):
```json
{
  "success": false,
  "error": "Missing required parameters"
}
```

Error (403 - Invalid Token):
```json
{
  "success": false,
  "error": "Invalid token"
}
```

Error (403 - Expired):
```json
{
  "success": false,
  "error": "Token expired or timestamp out of sync"
}
```

Error (429 - Rate Limit):
```json
{
  "success": false,
  "error": "Too many requests. Please try again later."
}
```

**Rate Limiting:**
- Limit: 60 requests per minute per IP
- Headers included in response:
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Requests remaining
  - `X-RateLimit-Reset`: Timestamp when limit resets
  - `Retry-After`: Seconds until retry (only on 429)

**Security:**
- Validates HMAC SHA256 token
- Checks timestamp skew (±5 minutes)
- Rate limits by IP address
- Validates origin (development only)

---

## Environment Variables

### Required

```bash
# Security - Token signing secret (minimum 32 characters)
IFRAME_API_SECRET=your-secret-key

# Ponder API base URL
NEXT_PUBLIC_PONDER_API_URL=http://localhost:42069

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Optional

```bash
# Allowed origins for CORS (comma-separated)
NEXT_PUBLIC_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Ponder API authentication key (if required)
NEXT_PUBLIC_PONDER_API_KEY=your-api-key
```

---

## Token Generation

### Algorithm

```typescript
// 1. Generate nonce (UUID v4)
const nonce = crypto.randomUUID();

// 2. Get current timestamp (seconds)
const timestamp = Math.floor(Date.now() / 1000);

// 3. Generate HMAC SHA256 token
const message = `${nonce}:${timestamp}`;
const token = crypto.createHmac("sha256", secret)
  .update(message)
  .digest("hex");
```

### Example (Node.js)

```typescript
import crypto from "crypto";

function generateAuthToken(secret: string): {
  url: string;
  token: string;
  nonce: string;
  timestamp: number;
} {
  const nonce = crypto.randomUUID();
  const timestamp = Math.floor(Date.now() / 1000);
  const message = `${nonce}:${timestamp}`;
  const token = crypto
    .createHmac("sha256", secret)
    .update(message)
    .digest("hex");

  const params = new URLSearchParams({ token, nonce, timestamp: String(timestamp) });
  const url = `https://your-domain.com?${params.toString()}`;

  return { url, token, nonce, timestamp };
}
```

### Token Expiry

Tokens are valid for **5 minutes** from generation time.

---

## Error Codes Reference

| Code | Description | Solution |
|------|-------------|----------|
| 400 | Missing required parameters | Include token, nonce, and timestamp |
| 403 | Invalid token or signature | Regenerate token with correct secret |
| 403 | Token expired | Generate new token (5 min validity) |
| 403 | Origin not allowed | Add origin to NEXT_PUBLIC_ALLOWED_ORIGINS |
| 429 | Rate limit exceeded | Wait 60 seconds and retry |
| 500 | Server configuration error | Check IFRAME_API_SECRET is set |

---

## Integration Examples

### HTML Iframe

```html
<iframe
  src="https://your-domain.com?token=TOKEN&nonce=NONCE&timestamp=TIMESTAMP"
  width="800"
  height="600"
  frameborder="0"
  sandbox="allow-same-origin allow-scripts allow-forms"
  allow="clipboard-read; clipboard-write"
></iframe>
```

### JavaScript Dynamic Loading

```javascript
async function loadEventWidget(containerId) {
  // Generate token on your backend
  const authData = await fetch("/api/generate-widget-token").then((r) =>
    r.json()
  );

  // Create iframe
  const iframe = document.createElement("iframe");
  iframe.src = authData.url;
  iframe.width = "800";
  iframe.height = "600";
  iframe.setAttribute("frameborder", "0");
  iframe.setAttribute(
    "sandbox",
    "allow-same-origin allow-scripts allow-forms"
  );

  // Mount
  document.getElementById(containerId).appendChild(iframe);
}
```

### React Component

```tsx
import { useEffect, useState } from "react";

function EventWidget() {
  const [authUrl, setAuthUrl] = useState<string | null>(null);

  useEffect(() => {
    // Fetch token from your backend
    fetch("/api/generate-widget-token")
      .then((r) => r.json())
      .then((data) => setAuthUrl(data.url));
  }, []);

  if (!authUrl) return <div>Loading...</div>;

  return (
    <iframe
      src={authUrl}
      width="800"
      height="600"
      frameBorder="0"
      sandbox="allow-same-origin allow-scripts allow-forms"
      allow="clipboard-read; clipboard-write"
    />
  );
}
```

---

## Security Best Practices

1. **Secret Management**
   - Use strong, randomly generated secrets (min 32 chars)
   - Rotate secrets periodically
   - Never commit secrets to version control
   - Use environment variables

2. **Token Handling**
   - Generate tokens server-side only
   - Never expose your secret to client-side code
   - Tokens are single-use and short-lived (5 min)

3. **Origin Whitelisting**
   - Only allow trusted domains in NEXT_PUBLIC_ALLOWED_ORIGINS
   - Use specific origins, avoid wildcards when possible
   - Keep the whitelist minimal

4. **Rate Limiting**
   - Default: 60 requests/minute per IP
   - For production, consider using Redis-based rate limiting
   - Monitor for abuse patterns

5. **HTTPS**
   - Always use HTTPS in production
   - Tokens are sensitive and should be encrypted in transit

---

## Testing

Use the included CLI tool to generate test tokens:

```bash
pnpm generate-token
```

This will output:
- Token details (nonce, timestamp, token)
- Full embed URL
- HTML iframe code

For manual testing:
```bash
pnpm test:iframe
```

This starts a test host at `http://localhost:3001` with a UI for generating and testing tokens.
