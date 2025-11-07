import "@testing-library/jest-dom";

// Mock environment variables for tests
process.env.NEXT_PUBLIC_PONDER_API_URL = "http://localhost:42069";
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
process.env.IFRAME_API_SECRET = "test-secret-for-testing-min-32-chars-required";
