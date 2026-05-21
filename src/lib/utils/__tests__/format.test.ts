import {
  formatAddress,
  formatAmount,
  formatEventType,
  getChainName,
  getEtherscanLink,
  getEventColor,
  getEventIcon,
} from "../format";

describe("formatAddress", () => {
  it("returns the original value when shorter than 10 chars", () => {
    expect(formatAddress("0x123")).toBe("0x123");
  });

  it("returns the original value when empty", () => {
    expect(formatAddress("")).toBe("");
  });

  it("shortens a full 0x address to 0xAAAAAA...BBBB", () => {
    const addr = "0x1234567890abcdef1234567890abcdef12345678";
    expect(formatAddress(addr)).toBe("0x1234...5678");
  });
});

describe("formatAmount", () => {
  it("converts wei (1e18) to '1.0000' ETH", () => {
    expect(formatAmount("1000000000000000000")).toBe("1.0000");
  });

  it("accepts a bigint input", () => {
    expect(formatAmount(2_000_000_000_000_000_000n)).toBe("2.0000");
  });

  it("respects a custom decimal scale", () => {
    // USDC-style: 6 decimals, 1.5 USDC
    expect(formatAmount("1500000", 6)).toBe("1.5000");
  });

  it("returns '0' on parse failure", () => {
    expect(formatAmount("not-a-number" as unknown as string)).toBe("0");
  });
});

describe("getEtherscanLink", () => {
  const tx =
    "0xabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabc";

  it.each([
    [1, "https://etherscan.io"],
    [137, "https://polygonscan.com"],
    [8453, "https://basescan.org"],
    [42161, "https://arbiscan.io"],
    [10, "https://optimistic.etherscan.io"],
  ])("returns the correct base URL for chain %i", (chainId, base) => {
    expect(getEtherscanLink(tx, chainId)).toBe(`${base}/tx/${tx}`);
  });

  it("returns '#/tx/<hash>' for Anvil (chain 31337)", () => {
    expect(getEtherscanLink(tx, 31337)).toBe(`#/tx/${tx}`);
  });

  it("falls back to etherscan.io for unknown chains", () => {
    expect(getEtherscanLink(tx, 999_999)).toBe(`https://etherscan.io/tx/${tx}`);
  });
});

describe("getChainName", () => {
  it.each([
    [1, "Ethereum"],
    [137, "Polygon"],
    [8453, "Base"],
    [42161, "Arbitrum"],
    [10, "Optimism"],
    [31337, "Anvil"],
  ])("returns canonical name for chain %i", (chainId, name) => {
    expect(getChainName(chainId)).toBe(name);
  });

  it("falls back to 'Chain <id>' for unknown chains", () => {
    expect(getChainName(424242)).toBe("Chain 424242");
  });
});

describe("formatEventType", () => {
  it("title-cases snake_case event types", () => {
    expect(formatEventType("nft_listed")).toBe("Nft Listed");
    expect(formatEventType("auction_settled")).toBe("Auction Settled");
  });

  it("returns single words capitalized", () => {
    expect(formatEventType("trade")).toBe("Trade");
  });

  it("returns an empty string unchanged", () => {
    expect(formatEventType("")).toBe("");
  });
});

describe("getEventIcon", () => {
  it.each([
    ["auction", "🔨"],
    ["offer", "💰"],
    ["trade", "🛒"],
    ["listing", "📋"],
    ["mint", "✨"],
    ["collection", "🖼️"],
  ])("returns the icon for category %s", (category, icon) => {
    expect(getEventIcon(category)).toBe(icon);
  });

  it("falls back to 📌 for unknown categories", () => {
    expect(getEventIcon("unknown")).toBe("📌");
  });
});

describe("getEventColor", () => {
  it.each([
    ["auction", "text-purple-500"],
    ["offer", "text-blue-500"],
    ["trade", "text-green-500"],
    ["listing", "text-yellow-500"],
    ["mint", "text-pink-500"],
    ["collection", "text-orange-500"],
  ])("returns the color class for category %s", (category, color) => {
    expect(getEventColor(category)).toBe(color);
  });

  it("falls back to text-gray-500 for unknown categories", () => {
    expect(getEventColor("unknown")).toBe("text-gray-500");
  });
});
