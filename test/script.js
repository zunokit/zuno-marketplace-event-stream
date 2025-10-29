// ============================================================================
// Token Generation (SHA256 HMAC simulation)
// ============================================================================

/**
 * Generate SHA256 hash (using Web Crypto API)
 */
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
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
 */
async function generateToken(secret, nonce, timestamp) {
  const message = `${secret}:${nonce}:${timestamp}`;
  return await sha256(message);
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

  // Calculate expiry
  const expiresAt = new Date((timestamp + 300) * 1000);

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
  document.getElementById("expires").textContent = expiresAt.toLocaleString();
  document.getElementById("embedUrl").textContent = embedUrl;

  document.getElementById("tokenSection").style.display = "block";
}

function embedIframe() {
  if (!currentData) return;

  const iframe = document.getElementById("eventIframe");
  iframe.src = currentData.embedUrl;

  document.getElementById("iframeSection").style.display = "block";

  // Check expiry
  checkExpiry();
}

function checkExpiry() {
  if (!currentData) return;

  const now = Math.floor(Date.now() / 1000);
  const timeRemaining = currentData.timestamp + 300 - now;

  if (timeRemaining <= 0) {
    alert("⚠️ Token has expired! Generate a new token.");
    return;
  }

  // Show warning at 1 minute remaining
  if (timeRemaining <= 60 && timeRemaining > 59) {
    console.warn("Token will expire in 1 minute");
  }

  // Check again in 10 seconds
  setTimeout(checkExpiry, 10000);
}

// ============================================================================
// Initialize
// ============================================================================

console.log("🎯 Zuno Event Stream - IFrame Test");
console.log("Generate a secure token to embed the event stream widget");
