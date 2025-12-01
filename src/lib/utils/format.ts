import { formatDistanceToNow } from "date-fns";

/**
 * Format Ethereum address to shortened version
 * @example 0x1234...5678
 */
export function formatAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Format timestamp to relative time
 * @example "2 minutes ago"
 */
export function formatTimestamp(timestamp: string | number): string {
  try {
    const date = typeof timestamp === "string"
      ? new Date(Number(timestamp) * 1000)
      : new Date(timestamp * 1000);

    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return "Unknown time";
  }
}

/**
 * Format BigInt amount from wei to ETH
 */
export function formatAmount(amount: string | bigint, decimals = 18): string {
  try {
    const value = typeof amount === "string" ? BigInt(amount) : amount;
    const divisor = BigInt(10 ** decimals);
    const eth = Number(value) / Number(divisor);
    return eth.toFixed(4);
  } catch {
    return "0";
  }
}

/**
 * Get Etherscan transaction link
 */
export function getEtherscanLink(
  txHash: string,
  chainId: number
): string {
  const baseUrls: Record<number, string> = {
    1: "https://etherscan.io",
    137: "https://polygonscan.com",
    8453: "https://basescan.org",
    42161: "https://arbiscan.io",
    10: "https://optimistic.etherscan.io",
    31337: "#", // Anvil local - no explorer
  };

  const baseUrl = baseUrls[chainId] || "https://etherscan.io";
  return `${baseUrl}/tx/${txHash}`;
}

/**
 * Get chain name from chainId
 */
export function getChainName(chainId: number): string {
  const chains: Record<number, string> = {
    1: "Ethereum",
    137: "Polygon",
    8453: "Base",
    42161: "Arbitrum",
    10: "Optimism",
    31337: "Anvil",
  };

  return chains[chainId] || `Chain ${chainId}`;
}

/**
 * Get human-readable event type
 */
export function formatEventType(eventType: string): string {
  return eventType
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Get event category emoji/icon
 */
export function getEventIcon(category: string): string {
  const icons: Record<string, string> = {
    auction: "🔨",
    offer: "💰",
    trade: "🛒",
    listing: "📋",
    mint: "✨",
    collection: "🖼️",
  };

  return icons[category] || "📌";
}

/**
 * Get event category color
 */
export function getEventColor(category: string): string {
  const colors: Record<string, string> = {
    auction: "text-purple-500",
    offer: "text-blue-500",
    trade: "text-green-500",
    listing: "text-yellow-500",
    mint: "text-pink-500",
    collection: "text-orange-500",
  };

  return colors[category] || "text-gray-500";
}
