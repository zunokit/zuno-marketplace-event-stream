// ============================================================================
// Token Generation (HMAC-SHA256 using Web Crypto API)
// ============================================================================

/**
 * Generate HMAC-SHA256 token (matching server-side implementation)
 */
async function generateHmacSha256(secret, message) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);

  // Import secret as HMAC key
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  // Sign the message
  const signature = await crypto.subtle.sign("HMAC", key, messageData);

  // Convert to hex string
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Generate UUID v4 (nonce)
 */
function generateUUID() {
  return crypto.randomUUID();
}

/**
 * Generate iframe token
 * Format: HMAC-SHA256(secret, "nonce:timestamp")
 */
async function generateToken(secret, nonce, timestamp) {
  const message = `${nonce}:${timestamp}`;
  return await generateHmacSha256(secret, message);
}

// ============================================================================
// UI State
// ============================================================================

let currentData = null;

// ============================================================================
// Event Handlers
// ============================================================================

document.getElementById("generateBtn").addEventListener("click", async () => {
  const appUrl = document.getElementById("appUrl").value.trim();
  const secret = document.getElementById("secret").value.trim();

  if (!appUrl || !secret) {
    alert("Please fill in all fields");
    return;
  }

  if (secret.length < 32) {
    alert("Secret must be at least 32 characters for security");
    return;
  }

  // Generate token
  const nonce = generateUUID();
  const timestamp = Math.floor(Date.now() / 1000);
  const token = await generateToken(secret, nonce, timestamp);

  // Build URL
  const params = new URLSearchParams({
    token,
    nonce,
    timestamp: String(timestamp),
  });
  const embedUrl = `${appUrl}?${params.toString()}`;

  // Calculate expiry (100 years - effectively permanent)
  const TIMESTAMP_SKEW_SECONDS = 3153600000;
  const expiresAt = new Date((timestamp + TIMESTAMP_SKEW_SECONDS) * 1000);

  // Store data
  currentData = { embedUrl, nonce, timestamp, token, expiresAt };

  // Update UI
  displayToken();
  embedIframe();
});

document.getElementById("copyBtn").addEventListener("click", () => {
  const embedUrl = document.getElementById("embedUrl").textContent;
  navigator.clipboard
    .writeText(embedUrl)
    .then(() => {
      const btn = document.getElementById("copyBtn");
      const originalText = btn.textContent;
      btn.textContent = "✅ Copied!";
      setTimeout(() => {
        btn.textContent = originalText;
      }, 2000);
    })
    .catch((err) => {
      alert("Failed to copy: " + err.message);
    });
});

document.getElementById("refreshBtn").addEventListener("click", () => {
  if (currentData) {
    embedIframe();
  }
});

document.getElementById("newTokenBtn").addEventListener("click", () => {
  document.getElementById("generateBtn").click();
});

// ============================================================================
// UI Rendering
// ============================================================================

function displayToken() {
  if (!currentData) return;

  const { nonce, timestamp, token, expiresAt, embedUrl } = currentData;

  document.getElementById("nonce").textContent = nonce;
  document.getElementById("timestamp").textContent = `${timestamp} (${new Date(
    timestamp * 1000
  ).toLocaleString()})`;
  document.getElementById("token").textContent = token;
  document.getElementById("expires").textContent = `${expiresAt.toLocaleString()} (effectively permanent)`;
  document.getElementById("embedUrl").textContent = embedUrl;

  document.getElementById("tokenSection").style.display = "block";
}

function embedIframe() {
  if (!currentData) return;

  const iframe = document.getElementById("eventIframe");
  iframe.src = currentData.embedUrl;

  document.getElementById("iframeSection").style.display = "block";

  // Tokens do not expire (TIMESTAMP_SKEW_SECONDS = 100 years)
  // No need to check expiry
}

// ============================================================================
// Initialize
// ============================================================================

console.log("🎯 Zuno Event Stream - IFrame Test");
console.log("Generate a secure token to embed the event stream widget");
